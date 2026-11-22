import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLabel, fmtMoney } from "@/lib/talon";
import { nameKey, registerKey } from "@/lib/customer-import";
import { mergeCustomers } from "../actions";
import { CustomerForm, type Customer } from "./customer-form";
import { ImportForm } from "./import-form";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ edit?: string; q?: string; merge?: string }> }) {
  const me = await requireStaffAdmin();
  const { edit, q, merge } = await searchParams;
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

  // Давхардсан харилцагч: нэр (том/жижиг, зай, зураас ялгахгүй) эсвэл регистр ижил
  const all: Customer[] = [];
  for (let off = 0; ; off += 1000) {
    const { data: page } = await db.from("customers").select("*").eq("organization_id", me.organization_id).order("id").range(off, off + 999);
    all.push(...((page ?? []) as Customer[]));
    if (!page || page.length < 1000) break;
  }
  const parent = new Map<string, string>();
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const firstBy = new Map<string, string>();
  for (const c of all) {
    parent.set(c.id, c.id);
    for (const k of [c.name && nameKey(c.name) ? `n:${nameKey(c.name)}` : "", c.register ? `r:${registerKey(c.register)}` : ""]) {
      if (!k) continue;
      const other = firstBy.get(k);
      if (other) parent.set(find(c.id), find(other));
      else firstBy.set(k, c.id);
    }
  }
  const groupsMap = new Map<string, Customer[]>();
  for (const c of all) {
    const r = find(c.id);
    groupsMap.set(r, [...(groupsMap.get(r) ?? []), c]);
  }
  const sold = (c: Customer) => Number(agg.get(c.id)?.sold_cnt ?? 0);
  const groups = [...groupsMap.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => sold(b) - sold(a)));
  const [mergedCnt, movedCnt] = (merge ?? "").split("-").map(Number);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Харилцагч</h1>
      {merge === "err" && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Нэгтгэж чадсангүй. Үлдэх харилцагчийг сонгоод дор хаяж 2-ыг чагтална уу.</p>}
      {mergedCnt > 0 && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mergedCnt} харилцагчийг нэгтгэж, {movedCnt} талоныг шилжүүллээ.</p>}
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
                      <td className="font-medium">{c.name || <span className="text-gray-400">—</span>}{c.note && <p className="text-xs font-normal text-gray-500">{c.note}</p>}</td>
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
        <div className="space-y-6">
          <CustomerForm key={editing?.id ?? "new"} customer={editing} />
          {!editing && <ImportForm />}
          {groups.length > 0 && (
            <section className="card space-y-3 ring-amber-300">
              <div>
                <h2 className="font-semibold">Давхардсан харилцагч нэгтгэх ({groups.length})</h2>
                <p className="text-xs text-gray-500">
                  Нэр (том/жижиг үсэг, зай, зураас ялгахгүй) эсвэл регистр ижил. <b>Үлдэх</b>-ийг сонгоод «Нэгтгэх» дарвал чагталсан
                  бусдын бүх талон түүн рүү шилжиж, бусад нь устана. Хоосон регистр, утас, тэмдэглэлийг бусдаас нөхнө.
                </p>
              </div>
              {groups.map((g) => (
                <form key={g[0].id} action={mergeCustomers} className="space-y-1 rounded-lg border border-gray-200 p-2 text-sm">
                  <div className="flex gap-2 px-1 text-[11px] uppercase text-gray-400"><span className="w-9">Үлдэх</span><span className="w-12">Нэгтгэх</span><span>Харилцагч · талон (зарсан / ашигласан)</span></div>
                  {g.map((c, i) => {
                    const a = agg.get(c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-1">
                        <span className="w-9"><input type="radio" name="target" value={c.id} defaultChecked={i === 0} /></span>
                        <span className="w-12"><input type="checkbox" name="ids" value={c.id} defaultChecked /></span>
                        <span className="min-w-0 flex-1">
                          <b>{customerLabel(c)}</b>
                          <span className="text-xs text-gray-500"> · {c.register ?? "регистргүй"} · {a ? `${a.sold_cnt} / ${a.redeemed_cnt}` : "0 / 0"}</span>
                        </span>
                      </div>
                    );
                  })}
                  <button className="btn-primary mt-1 w-full">Нэгтгэх</button>
                </form>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
