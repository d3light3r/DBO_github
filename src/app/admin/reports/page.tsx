import { requireStaffAdmin } from "@/lib/auth";
import { buildReport } from "@/lib/report";
import { fmtMinutes, todayUB } from "@/lib/time";

const isDate = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const me = await requireStaffAdmin();
  const sp = await searchParams;
  const today = todayUB();
  const from = isDate(sp.from) ? sp.from! : `${today.slice(0, 7)}-01`;
  const to = isDate(sp.to) ? sp.to! : today;
  const { rows } = await buildReport(me.organization_id, from, to);
  const qs = `from=${from}&to=${to}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Ирцийн тайлан</h1>
        <form className="flex flex-wrap items-end gap-2">
          <div><label className="label">Эхлэх</label><input type="date" name="from" defaultValue={from} className="input" /></div>
          <div><label className="label">Дуусах</label><input type="date" name="to" defaultValue={to} className="input" /></div>
          <button className="btn-ghost">Харах</button>
          <a href={`/admin/reports/export?${qs}`} className="btn-primary">⬇ Excel татах</a>
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Ажилтан</th><th>Хэлтэс</th><th>Ажлын өдөр</th><th>Ирсэн</th><th>Тасалсан</th><th>Чөлөө</th>
              <th>Ажилласан</th><th>Хоцорсон</th><th>Илүү цаг (тооцоолсон)</th><th>Илүү цаг (батлагдсан)</th><th>Томилолт</th><th>Явсан бүртгэлгүй</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employee.id}>
                <td className="font-medium">{r.employee.full_name}</td>
                <td className="text-xs">{r.department}</td>
                <td>{r.scheduledDays}</td>
                <td>{r.presentDays}</td>
                <td className={r.absentDays ? "font-semibold text-brand" : ""}>{r.absentDays}</td>
                <td>{r.leaveDays}</td>
                <td>{fmtMinutes(r.workedMinutes)}</td>
                <td className={r.lateCount ? "text-brand" : ""}>{r.lateCount ? `${r.lateCount} удаа, ${r.lateMinutes}м` : "—"}</td>
                <td>{fmtMinutes(r.overtimeMinutes)}</td>
                <td>{r.approvedOvertimeHours ? `${r.approvedOvertimeHours} цаг` : "—"}</td>
                <td>{r.tripCount || "—"}</td>
                <td className={r.missingCheckout ? "text-amber-700" : ""}>{r.missingCheckout || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Татгалзсан томилолтын бүртгэлийг тооцохгүй. &quot;Тасалсан&quot; нь хуваарийн ажлын өдөр ирц ч, батлагдсан чөлөө ч байхгүй өдөр.
      </p>
    </div>
  );
}
