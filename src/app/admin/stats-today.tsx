import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWorkDay } from "@/lib/schedule";
import { fmtDate, fmtTime, todayUB } from "@/lib/time";
import { loadCalendar } from "@/lib/calendar";
import type { AttendanceLog, Employee, Schedule } from "@/lib/types";
import { Kpi } from "./kpi";

/** Статистик: өнөөдрийн ирц */
export async function StatsToday({ orgId }: { orgId: string }) {
  const db = createAdminClient();
  const today = todayUB();
  const [emps, scheds, logs, branches, leaves, cal] = await Promise.all([
    db.from("employees").select("*").eq("organization_id", orgId).eq("is_active", true).order("full_name"),
    db.from("schedules").select("*").eq("organization_id", orgId),
    db.from("attendance_logs").select("*").eq("organization_id", orgId).or(`work_date.eq.${today},status.eq.working`),
    db.from("branches").select("id, name").eq("organization_id", orgId),
    db.from("requests").select("employee_id").eq("organization_id", orgId).eq("status", "approved")
      .in("type", ["paid_leave", "unpaid_leave", "sick_leave", "outside_work"])
      .lte("start_at", `${today}T23:59:59+08:00`).gte("end_at", `${today}T00:00:00+08:00`),
    loadCalendar(orgId, today, today),
  ]);
  const schedMap = new Map(((scheds.data ?? []) as Schedule[]).map((s) => [s.id, s]));
  const branchMap = new Map((branches.data ?? []).map((b) => [b.id, b.name as string]));
  const onLeave = new Set((leaves.data ?? []).map((l) => l.employee_id as string));
  const allLogs = (logs.data ?? []) as AttendanceLog[];

  const rows = ((emps.data ?? []) as Employee[]).map((e) => {
    const myLogs = allLogs.filter((l) => l.employee_id === e.id);
    const log = myLogs.find((l) => l.status === "working") ?? myLogs.find((l) => l.work_date === today);
    const sched = e.schedule_id ? schedMap.get(e.schedule_id) ?? null : null;
    const workDay = isWorkDay(sched, e, today, cal.holidays, cal.workDays);
    let status: { label: string; cls: string; key: string };
    if (log?.status === "working") status = log.late_minutes > 0
      ? { label: `Ажиллаж байна (${log.late_minutes}м хоцорсон)`, cls: "bg-amber-100 text-amber-800", key: "late" }
      : { label: "Ажиллаж байна", cls: "bg-emerald-100 text-emerald-700", key: "present" };
    else if (log) status = { label: "Ажлаа дууссан", cls: "bg-gray-100 text-gray-700", key: "present" };
    else if (onLeave.has(e.id)) status = { label: "Чөлөөтэй", cls: "bg-sky-100 text-sky-700", key: "leave" };
    else if (!workDay) status = { label: "Амралт", cls: "bg-gray-50 text-gray-400", key: "off" };
    else status = { label: "Ирээгүй", cls: "bg-red-100 text-brand", key: "absent" };
    return { e, log, status, sched };
  });
  const count = (k: string) => rows.filter((r) => r.status.key === k).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{fmtDate(today)}{cal.workDays.has(today) ? " · нэмэлт ажлын өдөр" : cal.holidays.has(today) ? " · баярын өдөр" : ""}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Нийт ажилтан" value={rows.length} />
        <Kpi label="Ирсэн" value={count("present") + count("late")} tone="text-emerald-600" />
        <Kpi label="Хоцорсон" value={count("late")} tone="text-amber-600" />
        <Kpi label="Ирээгүй" value={count("absent")} tone="text-brand" />
        <Kpi label="Чөлөөтэй / амралт" value={count("leave") + count("off")} tone="text-gray-500" />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>Ажилтан</th><th>Хуваарь</th><th>Ирсэн</th><th>Явсан</th><th>Байршил</th><th>Төлөв</th></tr>
          </thead>
          <tbody>
            {rows.map(({ e, log, status, sched }) => (
              <tr key={e.id}>
                <td><div className="font-medium">{e.full_name}</div><div className="text-xs text-gray-400">{e.emp_code}</div></td>
                <td className="text-xs">{sched?.name ?? "—"}</td>
                <td>{fmtTime(log?.check_in_at)}</td>
                <td>{fmtTime(log?.check_out_at)}</td>
                <td className="text-xs">
                  {log ? (log.verify_method === "TRIP" ? "Томилолт" : `${branchMap.get(log.branch_id ?? "") ?? ""} · ${log.verify_method}${log.in_distance != null ? ` ${log.in_distance}м` : ""}`) : "—"}
                </td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs ${status.cls}`}>{status.label}</span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Ажилтан бүртгэгдээгүй. <Link className="text-brand underline" href="/admin/employees">Ажилтан нэмэх</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
