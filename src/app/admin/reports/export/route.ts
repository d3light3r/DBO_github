import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { requireStaffAdmin } from "@/lib/auth";
import { buildReport, reportRange } from "@/lib/report";
import { fmtTime } from "@/lib/time";

const h = (min: number | null | undefined) => (min == null ? null : Math.round((min / 60) * 100) / 100);

export async function GET(req: NextRequest) {
  const me = await requireStaffAdmin();
  const sp = req.nextUrl.searchParams;
  const { from, to } = reportRange(sp.get("from"), sp.get("to"));
  const { rows, logs } = await buildReport(me.organization_id, from, to);

  const wb = new ExcelJS.Workbook();
  const sum = wb.addWorksheet("Нэгтгэл");
  sum.columns = [
    { header: "Код", key: "code", width: 10 },
    { header: "Овог нэр", key: "name", width: 24 },
    { header: "Компани", key: "company", width: 16 },
    { header: "Алба хэлтэс", key: "dept", width: 16 },
    { header: "Салбар", key: "unit", width: 14 },
    { header: "Координат", key: "coord", width: 14 },
    { header: "Ажлын өдөр", key: "sched", width: 11 },
    { header: "Ирсэн өдөр", key: "present", width: 11 },
    { header: "Тасалсан", key: "absent", width: 10 },
    { header: "Чөлөөтэй өдөр", key: "leave", width: 12 },
    { header: "Ажилласан цаг", key: "worked", width: 13 },
    { header: "Хоцорсон удаа", key: "lateN", width: 12 },
    { header: "Хоцорсон минут", key: "lateM", width: 13 },
    { header: "Илүү цаг (тооцоолсон)", key: "ot", width: 18 },
    { header: "Илүү цаг (батлагдсан)", key: "otA", width: 18 },
    { header: "Чөлөөний цаг", key: "leaveH", width: 12 },
    { header: "Томилолт", key: "trip", width: 10 },
    { header: "Явсан бүртгэлгүй", key: "miss", width: 14 },
  ];
  for (const r of rows) {
    sum.addRow({
      code: r.employee.emp_code, name: r.employee.full_name, company: r.company, dept: r.department, unit: r.unit, coord: r.coordinate,
      sched: r.scheduledDays, present: r.presentDays, absent: r.absentDays, leave: r.leaveDays,
      worked: h(r.workedMinutes), lateN: r.lateCount, lateM: r.lateMinutes, ot: h(r.overtimeMinutes),
      otA: r.approvedOvertimeHours, leaveH: r.leaveHours, trip: r.tripCount, miss: r.missingCheckout,
    });
  }

  const det = wb.addWorksheet("Дэлгэрэнгүй");
  det.columns = [
    { header: "Огноо", key: "date", width: 12 },
    { header: "Ажилтан", key: "name", width: 24 },
    { header: "Координат", key: "branch", width: 16 },
    { header: "Арга", key: "method", width: 8 },
    { header: "Ирсэн", key: "in", width: 8 },
    { header: "Явсан", key: "out", width: 8 },
    { header: "Ажилласан цаг", key: "worked", width: 13 },
    { header: "Хоцорсон минут", key: "late", width: 13 },
    { header: "Илүү цаг", key: "ot", width: 10 },
    { header: "Зай (м)", key: "dist", width: 8 },
    { header: "Тайлбар", key: "note", width: 30 },
  ];
  for (const l of logs) {
    det.addRow({
      date: l.work_date, name: l.employee_name, branch: l.branch_name, method: l.verify_method,
      in: fmtTime(l.check_in_at), out: l.check_out_at ? fmtTime(l.check_out_at) : "", worked: h(l.worked_minutes),
      late: l.late_minutes, ot: h(l.overtime_minutes), dist: l.in_distance, note: l.note ?? "",
    });
  }
  for (const ws of [sum, det]) {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD40404" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="irts_${from}_${to}.xlsx"`,
    },
  });
}
