import Link from "next/link";
import { buildReport } from "@/lib/report";
import { fmtMinutes } from "@/lib/time";
import { Kpi } from "./kpi";

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Статистик: сарын нэгтгэл */
export async function StatsMonth({ orgId, month, currentMonth }: { orgId: string; month: string; currentMonth: string }) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01`;
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const { rows } = await buildReport(orgId, from, to);

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const present = sum((r) => r.presentDays);
  const absent = sum((r) => r.absentDays);
  const leave = sum((r) => r.leaveDays);
  const expected = present + absent + leave;
  const rate = expected > 0 ? Math.round((present / expected) * 100) : null;
  const sorted = [...rows].sort((a, b) => b.absentDays - a.absentDays || b.lateMinutes - a.lateMinutes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`?view=month&month=${shiftMonth(month, -1)}`} className="btn-ghost px-3 py-1">←</Link>
        <span className="min-w-36 text-center font-semibold">{y} оны {MONTHS[m - 1]}-р сар</span>
        {month < currentMonth ? (
          <Link href={`?view=month&month=${shiftMonth(month, 1)}`} className="btn-ghost px-3 py-1">→</Link>
        ) : (
          <span className="btn-ghost px-3 py-1 opacity-30">→</span>
        )}
        <Link href={`/app/reports?from=${from}&to=${to}`} className="ml-auto text-sm text-brand underline">Дэлгэрэнгүй тайлан, Excel →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Ирцийн хувь" value={rate == null ? "—" : `${rate}%`} tone="text-emerald-600" hint={`${present} / ${expected} ажлын өдөр`} />
        <Kpi label="Ажилласан нийт" value={fmtMinutes(sum((r) => r.workedMinutes))} />
        <Kpi label="Тасалсан өдөр" value={absent} tone="text-brand" />
        <Kpi label="Хоцорсон удаа" value={sum((r) => r.lateCount)} tone="text-amber-600" hint={fmtMinutes(sum((r) => r.lateMinutes))} />
        <Kpi label="Илүү цаг" value={fmtMinutes(sum((r) => r.overtimeMinutes))} tone="text-emerald-600" />
        <Kpi label="Чөлөөтэй өдөр" value={leave} tone="text-sky-600" />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Ажилтан</th><th>Ирсэн / ажлын өдөр</th><th>Тасалсан</th><th>Чөлөө</th><th>Хоцорсон</th><th>Ажилласан</th><th>Илүү цаг</th><th>Явсан бүртгэлгүй</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.employee.id}>
                <td><div className="font-medium">{r.employee.full_name}</div><div className="text-xs text-gray-400">{r.department || r.employee.emp_code}</div></td>
                <td className="tabular-nums">{r.presentDays} / {r.scheduledDays}</td>
                <td className={r.absentDays ? "font-semibold text-brand" : "text-gray-400"}>{r.absentDays || "—"}</td>
                <td className={r.leaveDays ? "text-sky-700" : "text-gray-400"}>{r.leaveDays || "—"}</td>
                <td className={r.lateCount ? "text-amber-700" : "text-gray-400"}>{r.lateCount ? `${r.lateCount} удаа · ${fmtMinutes(r.lateMinutes)}` : "—"}</td>
                <td className="tabular-nums">{fmtMinutes(r.workedMinutes)}</td>
                <td className={r.overtimeMinutes ? "text-emerald-700" : "text-gray-400"}>{r.overtimeMinutes ? fmtMinutes(r.overtimeMinutes) : "—"}</td>
                <td className={r.missingCheckout ? "text-amber-700" : "text-gray-400"}>{r.missingCheckout || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Энэ сард мэдээлэл алга</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Тасалсан, хоцорсон ихтэй ажилтан эхэнд харагдана. Ирээдүйн өдрүүдийг тасалсанд тооцохгүй.</p>
    </div>
  );
}
