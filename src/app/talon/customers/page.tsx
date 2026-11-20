import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney } from "@/lib/talon";
import { CustomerForm, type Customer } from "./customer-form";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ edit?: string; q?: string }> }) {
  const me = await requireStaffAdmin();
  const { edit, q } = await searchParams;
  const db = createAdminClient();
  let query = db.from("customers").select("*").eq("organization_id", me.organization_id).order("name").limit(500);
  const term = (q ?? "").trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`name.ilike.%${term}%,register.ilike.%${term}%,phone.ilike.%${term}%`);
  const [{ data }, { data: stats }] = await Promise.all([
    query,
    db.rpc("talon_customer_summary", { p_org: me.organization_id }),
  ]);
  const customers = (data ?? []) as Customer[];
  const editing = edit ? (customers.find((c) => c.id === edit) ??
    ((await db.from("customers").select("*").eq("id", edit).eq("organization_id", me.organization_id).maybeSingle()).data as Customer | null) ?? undefined) : undefined;

  type Agg = { customer_id: string; sold_cnt: number; redeemed_cnt: number; sold_amount: number; outstanding_amount: number };
  const agg = new Map(((stats ?? []) as Agg[]).map((a) => [a.customer_id, a]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Харилцагч</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Нэр, регистр, утсаар хайх" />
            <button className="btn-ghost">Хайх</button>
          </form>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>Нэр</th><th>Регистр</th><th>Утас</th><th>Талон (зарсан / ашигласан)</th><th>Ашиглаагүй үлдэгдэл</th><th></th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const a = agg.get(c.id);
                  return (
                    <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                      <td className="font-medium">{c.name}{c.note && <p className="text-xs font-normal text-gray-500">{c.note}</p>}</td>
                      <td>{c.register ?? "—"}</td>
                      <td>{c.phone ?? "—"}</td>
                      <td>
                        {a ? (
                          <a className="text-brand underline" href={`/talon?customer=${c.id}`}>{a.sold_cnt} / {a.redeemed_cnt}</a>
                        ) : "—"}
                      </td>
                      <td>{a ? fmtMoney(Number(a.outstanding_amount)) : "—"}</td>
                      <td><a href={`?edit=${c.id}`} className="text-sm text-brand">Засах</a></td>
                    </tr>
                  );
                })}
                {customers.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Харилцагч алга</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <CustomerForm key={editing?.id ?? "new"} customer={editing} />
      </div>
    </div>
  );
}
