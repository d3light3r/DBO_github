import "server-only";
import { createAdminClient } from "./supabase/admin";
import { isWorkDay } from "./schedule";
import { addDays, todayUB, zoned } from "./time";
import type { AttendanceLog, Employee, Schedule } from "./types";

export type ReportRow = {
  employee: Employee;
  department: string;
  branch: string;
  scheduledDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  workedMinutes: number;
  lateCount: number;
  lateMinutes: number;
  overtimeMinutes: number;
  approvedOvertimeHours: number;
  leaveHours: number;
  tripCount: number;
  missingCheckout: number;
};

export type ReportData = {
  rows: ReportRow[];
  logs: (AttendanceLog & { employee_name: string; branch_name: string })[];
};

export { reportRange } from "./time";

type Req = { employee_id: string; type: string; start_at: string; end_at: string; total_hours: number };

export async function buildReport(orgId: string, from: string, to: string): Promise<ReportData> {
  const db = createAdminClient();
  const [emps, scheds, branches, depts, logs, reqs, hols] = await Promise.all([
    db.from("employees").select("*").eq("organization_id", orgId).order("full_name"),
    db.from("schedules").select("*").eq("organization_id", orgId),
    db.from("branches").select("id, name").eq("organization_id", orgId),
    db.from("departments").select("id, name").eq("organization_id", orgId),
    db.from("attendance_logs").select("*").eq("organization_id", orgId).gte("work_date", from).lte("work_date", to).order("check_in_at"),
    db.from("requests").select("employee_id, type, start_at, end_at, total_hours").eq("organization_id", orgId).eq("status", "approved")
      .lte("start_at", `${addDays(to, 1)}T00:00:00+08:00`).gte("end_at", `${from}T00:00:00+08:00`),
    db.from("holidays").select("date").eq("organization_id", orgId).gte("date", from).lte("date", to),
  ]);

  const schedMap = new Map((scheds.data as Schedule[] ?? []).map((x) => [x.id, x]));
  const branchMap = new Map((branches.data ?? []).map((x) => [x.id, x.name as string]));
  const deptMap = new Map((depts.data ?? []).map((x) => [x.id, x.name as string]));
  const holidays = new Set((hols.data ?? []).map((h) => h.date as string));
  const allLogs = ((logs.data ?? []) as AttendanceLog[]).filter((l) => l.review_status !== "rejected");
  const requests = (reqs.data ?? []) as Req[];
  const lastDay = to < todayUB() ? to : todayUB();

  const rows: ReportRow[] = [];
  for (const emp of (emps.data ?? []) as Employee[]) {
    const sched = emp.schedule_id ? schedMap.get(emp.schedule_id) ?? null : null;
    const myLogs = allLogs.filter((l) => l.employee_id === emp.id);
    const myReqs = requests.filter((r) => r.employee_id === emp.id);
    if (!emp.is_active && myLogs.length === 0) continue;

    const presentDates = new Set(myLogs.map((l) => l.work_date));
    const leaveReqs = myReqs.filter((r) => ["paid_leave", "unpaid_leave", "sick_leave", "outside_work"].includes(r.type));
    const leaveDates = new Set<string>();
    for (const r of leaveReqs) {
      let d = zoned(new Date(r.start_at)).date;
      const end = zoned(new Date(r.end_at)).date;
      while (d <= end) {
        leaveDates.add(d);
        d = addDays(d, 1);
      }
    }

    let scheduled = 0;
    let absent = 0;
    let leaveDays = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!isWorkDay(sched, emp, d, holidays)) continue;
      scheduled++;
      if (d > lastDay || presentDates.has(d)) continue;
      if (leaveDates.has(d)) leaveDays++;
      else absent++;
    }

    rows.push({
      employee: emp,
      department: emp.department_id ? deptMap.get(emp.department_id) ?? "" : "",
      branch: emp.branch_id ? branchMap.get(emp.branch_id) ?? "" : "",
      scheduledDays: scheduled,
      presentDays: presentDates.size,
      absentDays: absent,
      leaveDays,
      workedMinutes: myLogs.reduce((a, l) => a + (l.worked_minutes ?? 0), 0),
      lateCount: myLogs.filter((l) => l.late_minutes > 0).length,
      lateMinutes: myLogs.reduce((a, l) => a + l.late_minutes, 0),
      overtimeMinutes: myLogs.reduce((a, l) => a + l.overtime_minutes, 0),
      approvedOvertimeHours: myReqs.filter((r) => r.type === "overtime").reduce((a, r) => a + Number(r.total_hours), 0),
      leaveHours: leaveReqs.reduce((a, r) => a + Number(r.total_hours), 0),
      tripCount: myLogs.filter((l) => l.verify_method === "TRIP").length,
      missingCheckout: myLogs.filter((l) => l.status === "completed" && !l.check_out_at).length,
    });
  }

  const empName = new Map(((emps.data ?? []) as Employee[]).map((e) => [e.id, e.full_name]));
  return {
    rows,
    logs: allLogs.map((l) => ({
      ...l,
      employee_name: empName.get(l.employee_id) ?? "",
      branch_name: l.branch_id ? branchMap.get(l.branch_id) ?? "" : l.verify_method === "TRIP" ? "Томилолт" : "",
    })),
  };
}
