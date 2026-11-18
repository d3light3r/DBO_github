import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMinutes, fmtTime, todayUB, WEEKDAY_SHORT } from "@/lib/time";
import { isWorkDay } from "@/lib/schedule";
import type { AttendanceLog, Schedule } from "@/lib/types";
import { PunchCard } from "./punch-card";
import { DeviceCard } from "./device-card";
import { deviceState } from "@/lib/device";
import { loadCalendar } from "@/lib/calendar";

export default async function EmployeeHome() {
  const emp = await getCurrentEmployee();
  const db = createAdminClient();
  const today = todayUB();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [{ data: open }, { data: todayLogs }, { data: month }, { data: schedule }, { data: branch }, cal, device] = await Promise.all([
    db.from("attendance_logs").select("*").eq("employee_id", emp.id).eq("status", "working").maybeSingle(),
    db.from("attendance_logs").select("*").eq("employee_id", emp.id).eq("work_date", today).order("check_in_at"),
    db.from("attendance_logs").select("worked_minutes, late_minutes, overtime_minutes").eq("employee_id", emp.id).gte("work_date", monthStart),
    emp.schedule_id ? db.from("schedules").select("*").eq("id", emp.schedule_id).maybeSingle() : Promise.resolve({ data: null }),
    emp.branch_id ? db.from("branches").select("name").eq("id", emp.branch_id).maybeSingle() : Promise.resolve({ data: null }),
    loadCalendar(emp.organization_id, today, today),
    deviceState(emp),
  ]);
  const sched = schedule as Schedule | null;
  const openLog = open as AttendanceLog | null;
  const workToday = isWorkDay(sched, emp, today, cal.holidays, cal.workDays);
  const totals = (month ?? []).reduce(
    (a, r) => ({
      worked: a.worked + (r.worked_minutes ?? 0),
      late: a.late + (r.late_minutes ?? 0),
      overtime: a.overtime + (r.overtime_minutes ?? 0),
    }),
    { worked: 0, late: 0, overtime: 0 },
  );

  return (
    <>
      <PunchCard
        isWorking={!!openLog}
        checkInAt={openLog?.check_in_at ?? null}
        allowTrip={emp.allow_trip}
      />
      {device.kind !== "approved" && device.kind !== "not_required" && <DeviceCard kind={device.kind} />}

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold">Өнөөдөр</h2>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-gray-500">Хуваарь</dt>
          <dd className="text-right">
            {sched ? `${sched.name} (${sched.start_time.slice(0, 5)})` : "Тохируулаагүй"}
          </dd>
          <dt className="text-gray-500">Ажлын өдөр</dt>
          <dd className="text-right">{sched ? (workToday ? "Тийм" : "Амралт") : "—"}</dd>
          {branch && (
            <>
              <dt className="text-gray-500">Салбар</dt>
              <dd className="text-right">{branch.name}</dd>
            </>
          )}
        </dl>
        {(todayLogs ?? []).length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100 text-sm">
            {(todayLogs as AttendanceLog[]).map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span>
                  {fmtTime(l.check_in_at)} – {fmtTime(l.check_out_at)}
                  {l.verify_method === "TRIP" && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">Томилолт</span>}
                </span>
                {l.late_minutes > 0 && <span className="text-brand">{l.late_minutes}м хоцорсон</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Энэ сард ажилласан" value={fmtMinutes(totals.worked)} />
        <Stat label="Хоцролт" value={fmtMinutes(totals.late)} tone="red" />
        <Stat label="Илүү цаг" value={fmtMinutes(totals.overtime)} tone="green" />
      </section>
      {sched?.kind === "fixed" && (
        <p className="text-center text-xs text-gray-400">
          Ажлын өдрүүд: {sched.work_weekdays.map((d) => WEEKDAY_SHORT[d]).join(", ")}
        </p>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-brand" : tone === "green" ? "text-emerald-600" : "text-gray-900";
  return (
    <div className="card p-3 text-center">
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{label}</p>
    </div>
  );
}
