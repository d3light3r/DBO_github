import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtMinutes, fmtTime, todayUB } from "@/lib/time";
import type { AttendanceLog } from "@/lib/types";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const emp = await getCurrentEmployee();
  const { month: m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : todayUB().slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  const prev = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;

  const { data } = await createAdminClient()
    .from("attendance_logs")
    .select("*")
    .eq("employee_id", emp.id)
    .gte("work_date", `${month}-01`)
    .lt("work_date", `${next}-01`)
    .order("check_in_at", { ascending: false });
  const logs = (data ?? []) as AttendanceLog[];
  const total = logs.reduce((s, l) => s + (l.worked_minutes ?? 0), 0);

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <a href={`?month=${prev}`} className="btn-ghost px-3 py-1">‹</a>
        <h2 className="font-semibold">{month.replace("-", " оны ")} сар</h2>
        <a href={`?month=${next}`} className="btn-ghost px-3 py-1">›</a>
      </div>
      <p className="mb-2 text-sm text-gray-500">Нийт: <b className="text-gray-900">{fmtMinutes(total)}</b>, {logs.length} бүртгэл</p>
      {logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Бүртгэл алга</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="py-2">
              <div className="flex justify-between">
                <span className="font-medium">{fmtDate(l.work_date)}</span>
                <span>{fmtMinutes(l.worked_minutes)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {fmtTime(l.check_in_at)} – {fmtTime(l.check_out_at)} · {l.verify_method === "TRIP" ? "Томилолт" : l.verify_method}
                </span>
                <span>
                  {l.late_minutes > 0 && <span className="text-brand">хоцролт {l.late_minutes}м </span>}
                  {l.overtime_minutes > 0 && <span className="text-emerald-600">илүү {fmtMinutes(l.overtime_minutes)}</span>}
                </span>
              </div>
              {l.note && <p className="text-xs text-amber-700">{l.note}</p>}
              {l.review_status === "pending" && <p className="text-xs text-amber-700">Менежерийн баталгаа хүлээгдэж байна</p>}
              {l.review_status === "rejected" && <p className="text-xs text-brand">Татгалзсан</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
