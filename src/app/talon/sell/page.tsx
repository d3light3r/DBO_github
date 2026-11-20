import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney, groupRuns } from "@/lib/talon";
import { addDays, fmtDate, fmtDateTime, todayUB } from "@/lib/time";
import { SellForm } from "../talon-forms";

type Row = { serial: string; sold_date: string; sold_recorded_at: string; customer: { name: string } | null; seller: { full_name: string } | null };

export default async function SellPage() {
  const me = await requireStaffAdmin();
  const db = createAdminClient();
  const today = todayUB();
  const [customers, recent] = await Promise.all([
    db.from("customers").select("id, name, register").eq("organization_id", me.organization_id).eq("is_active", true).order("name").limit(1000),
    db.from("talons")
      .select("serial, sold_date, sold_recorded_at, customer:customers(name), seller:employees!talons_sold_by_fkey(full_name)")
      .eq("organization_id", me.organization_id)
      .gte("sold_recorded_at", `${addDays(today, -29)}T00:00:00+08:00`)
      .order("sold_recorded_at", { ascending: false })
      .limit(1000),
  ]);
  const rows = (recent.data ?? []) as unknown as Row[];
  // Нэг удаад зарсан дараалсан сериалуудыг нэг мөр болгоно
  const runs = groupRuns(rows, (r) => r.sold_recorded_at).sort((a, b) => b.first.sold_recorded_at.localeCompare(a.first.sold_recorded_at));

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <SellForm customers={(customers.data ?? []) as { id: string; name: string; register: string | null }[]} today={today} />
      <section className="card min-w-0">
        <h2 className="mb-2 font-semibold">Сүүлийн 30 хоногт зарсан</h2>
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Борлуулалт алга</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Сериал</th><th>Харилцагч</th><th className="text-right">Тоо</th><th className="text-right">Дүн</th><th>Зарсан огноо</th><th>Бүртгэсэн</th></tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.from + r.first.sold_recorded_at}>
                    <td className="whitespace-nowrap font-mono text-xs">{r.from}{r.count > 1 && ` – ${r.to}`}</td>
                    <td>{r.first.customer?.name ?? "—"}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.amount)} × {r.count}</td>
                    <td className="text-right font-medium tabular-nums">{fmtMoney(r.amount * r.count)}</td>
                    <td className="text-xs">{fmtDate(r.first.sold_date)}</td>
                    <td className="whitespace-nowrap text-xs text-gray-500">{fmtDateTime(r.first.sold_recorded_at)} · {r.first.seller?.full_name ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
