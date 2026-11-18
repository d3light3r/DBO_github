import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWorkDay } from "@/lib/schedule";
import { fmtDate, fmtTime, todayUB } from "@/lib/time";
import { loadCalendar } from "@/lib/calendar";
import { REQUEST_LABELS, type AttendanceLog, type Employee, type RequestType, type Schedule } from "@/lib/types";
import { Icon, type IconName } from "@/components/icons";
import { Donut } from "./donut";

/** Статистик: өнөөдрийн ирц */
export async function StatsToday({ orgId }: { orgId: string }) {
  const db = createAdminClient();
  const today = todayUB();
  const [emps, scheds, logs, branches, leaves, cal, pendingReq] = await Promise.all([
    db.from("employees").select("*").eq("organization_id", orgId).eq("is_active", true).order("full_name"),
    db.from("schedules").select("*").eq("organization_id", orgId),
    db.from("attendance_logs").select("*").eq("organization_id", orgId).or(`work_date.eq.${today},status.eq.working`),
    db.from("branches").select("id, name").eq("organization_id", orgId),
    db.from("requests").select("employee_id").eq("organization_id", orgId).eq("status", "approved")
      .in("type", ["paid_leave", "unpaid_leave", "sick_leave", "outside_work"])
      .lte("start_at", `${today}T23:59:59+08:00`).gte("end_at", `${today}T00:00:00+08:00`),
    loadCalendar(orgId, today, today),
    db.from("requests").select("id, employee_id, type, start_at, end_at, created_at").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }).limit(20),
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
    const late = (log?.late_minutes ?? 0) > 0;
    if (log?.status === "working") status = late
      ? { label: `Ажиллаж байна (${log.late_minutes}м хоцорсон)`, cls: "bg-amber-100 text-amber-800", key: "late" }
      : { label: "Ажиллаж байна", cls: "bg-emerald-100 text-emerald-700", key: "present" };
    else if (log) status = late
      ? { label: `Ажлаа дууссан (${log.late_minutes}м хоцорсон)`, cls: "bg-amber-50 text-amber-800", key: "late" }
      : { label: "Ажлаа дууссан", cls: "bg-gray-100 text-gray-700", key: "present" };
    else if (onLeave.has(e.id)) status = { label: "Чөлөөтэй", cls: "bg-sky-100 text-sky-700", key: "leave" };
    else if (!workDay) status = { label: "Амралт", cls: "bg-gray-50 text-gray-400", key: "off" };
    else status = { label: "Ирээгүй", cls: "bg-red-100 text-brand", key: "absent" };
    return { e, log, status, sched };
  });
  const count = (k: string) => rows.filter((r) => r.status.key === k).length;

  const arrived = rows.filter((r) => r.log).sort((x, y) => (y.log!.check_in_at > x.log!.check_in_at ? 1 : -1));
  const absent = rows.filter((r) => r.status.key === "absent");
  const empName = new Map(rows.map((r) => [r.e.id, r.e.full_name]));
  const requests = pendingReq.data ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{fmtDate(today)}{cal.workDays.has(today) ? " · нэмэлт ажлын өдөр" : cal.holidays.has(today) ? " · баярын өдөр" : ""}</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Widget icon="report" title="Ирц" tone="bg-emerald-100 text-emerald-700">
          <Donut
            centerLabel="ажилтан"
            slices={[
              { key: "present", label: "Цагтаа ирсэн", value: count("present"), color: "#059669" },
              { key: "late", label: "Хоцорсон", value: count("late"), color: "#d97706" },
              { key: "absent", label: "Ирээгүй", value: count("absent"), color: "#d40404" },
              { key: "off", label: "Чөлөө, амралт", value: count("leave") + count("off"), color: "#9ca3af" },
            ]}
          />
        </Widget>

        <Widget icon="clock" title="Ирсэн ажилчид" tone="bg-sky-100 text-sky-700" count={arrived.length}>
          <PersonList
            empty="Одоогоор ирсэн хүн алга"
            items={arrived.map(({ e, log }) => ({
              id: e.id,
              name: e.full_name,
              right: (
                <span className="flex items-center gap-1.5 text-xs tabular-nums text-gray-500">
                  {fmtTime(log!.check_in_at)}
                  {log!.late_minutes > 0 ? (
                    <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800" title="Хоцорсон">{log!.late_minutes}м</span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" title="Цагтаа" />
                  )}
                </span>
              ),
            }))}
          />
        </Widget>

        <Widget icon="users" title="Ирээгүй ажилчид" tone="bg-red-100 text-brand" count={absent.length}>
          <PersonList
            empty="Бүгд ирсэн 👏"
            items={absent.map(({ e, sched }) => ({
              id: e.id,
              name: e.full_name,
              right: <span className="text-xs text-gray-400">{sched ? sched.start_time.slice(0, 5) : ""}</span>,
            }))}
          />
        </Widget>

        <Widget icon="send" title="Хүсэлтүүд" tone="bg-amber-100 text-amber-700" count={requests.length} href="/admin/requests">
          <PersonList
            empty="Хүсэлт алга"
            items={requests.map((r) => ({
              id: r.id,
              name: empName.get(r.employee_id) ?? "—",
              sub: REQUEST_LABELS[r.type as RequestType],
              right: <Link href="/admin/requests" className="text-xs text-brand">Шийдэх ›</Link>,
            }))}
          />
        </Widget>
      </div>

      <details className="card p-0" open>
        <summary className="cursor-pointer px-4 py-3 font-semibold">Өнөөдрийн ирц (бүх ажилтан)</summary>
      <div className="overflow-x-auto border-t border-gray-100">
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
      </details>
    </div>
  );
}

function Widget({ icon, title, tone, count, href, children }: { icon: IconName; title: string; tone: string; count?: number; href?: string; children: React.ReactNode }) {
  return (
    <section className="card flex h-80 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}><Icon name={icon} className="h-4 w-4" /></span>
        <h2 className="flex-1 truncate font-semibold">{title}</h2>
        {count != null && <span className="rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">{count}</span>}
        {href && <Link href={href} className="text-xs text-gray-400 hover:text-brand">Бүгд ›</Link>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function PersonList({ items, empty }: { items: { id: string; name: string; sub?: string; right?: React.ReactNode }[]; empty: string }) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
            {initials(it.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{it.name}</span>
            {it.sub && <span className="block truncate text-xs text-gray-500">{it.sub}</span>}
          </span>
          {it.right}
        </li>
      ))}
    </ul>
  );
}

function initials(name: string) {
  const parts = name.replace(/./g, " ").trim().split(/s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}
