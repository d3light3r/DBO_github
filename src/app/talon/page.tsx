import { redirect } from "next/navigation";
import { requireTalonApp } from "@/lib/auth";
import { can, talonHome } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLabel, fmtMoney, TALON_TYPES } from "@/lib/talon";
import { customerIdsFor, parseFilters, talonQuery, type TalonRow } from "@/lib/talon-query";
import { fmtDate, fmtDateTime, todayUB } from "@/lib/time";

const PAGE = 100;

type Summary = { denomination: number; sold_cnt: number; redeemed_cnt: number; outstanding_cnt: number };
type BranchSum = { branch_id: string | null; denomination: number; cnt: number };

export default async function TalonsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTalonApp();
  if (!can(me, "talon.list")) redirect(talonHome(me) ?? "/app");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const page = Math.max(1, Math.trunc(Number(sp.page)) || 1);
  const today = todayUB();
  // Огноо сонгоогүй бол нэгтгэл бүх хугацааг харуулна
  const sumFrom = f.from || "2000-01-01";
  const sumTo = f.to || today;
  const period = f.from || f.to ? `${f.from ? fmtDate(f.from) : "эхнээс"} – ${fmtDate(sumTo)}` : "бүх хугацаа";
  const db = createAdminClient();
  const org = me.organization_id;

  const ids = await customerIdsFor(org, f.cq);
  const [list, branches, picked, summary, bsum] = await Promise.all([
    talonQuery(org, f, true, ids).range((page - 1) * PAGE, page * PAGE - 1),
    db.from("units").select("id, name").eq("organization_id", org).eq("is_station", true).order("name"),
    f.customer ? db.from("customers").select("name, register").eq("id", f.customer).maybeSingle() : Promise.resolve({ data: null }),
    db.rpc("talon_summary", { p_org: org, p_from: sumFrom, p_to: sumTo }),
    db.rpc("talon_branch_summary", { p_org: org, p_from: sumFrom, p_to: sumTo }),
  ]);
  const rows = (list.data ?? []) as unknown as TalonRow[];
  const total = list.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const branchList = (branches.data ?? []) as { id: string; name: string }[];
  const sums = (summary.data ?? []) as Summary[];
  const bsums = (bsum.data ?? []) as BranchSum[];

  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };
  const exportHref = `/talon/export${qs({ page: "" })}`;

  const sumOf = (k: "sold_cnt" | "redeemed_cnt" | "outstanding_cnt") =>
    sums.reduce((t, s) => ({ cnt: t.cnt + Number(s[k]), amt: t.amt + Number(s[k]) * s.denomination }), { cnt: 0, amt: 0 });
  const cols = [
    { k: "sold_cnt", label: "Зарсан" },
    { k: "redeemed_cnt", label: "Салбараас бүртгэсэн" },
    { k: "outstanding_cnt", label: "Ашиглагдаагүй үлдэгдэл" },
  ] as const;
  const tiles = [
    { label: `Зарсан (${period})`, ...sumOf("sold_cnt") },
    { label: `Салбараас бүртгэсэн (${period})`, ...sumOf("redeemed_cnt") },
    { label: "Ашиглагдаагүй үлдэгдэл (нийт)", ...sumOf("outstanding_cnt") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Талоны бүртгэл</h1>
        <div className="flex gap-2">
          <a href="/talon/sell" className="btn-primary">+ Талон зарах</a>
          <a href={exportHref} className="btn-ghost">⬇ Excel</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="card">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className="mt-1 text-xl font-bold">{fmtMoney(t.amt)}</p>
            <p className="text-xs text-gray-500">{t.cnt} ширхэг</p>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Талоны төрөл</th>
              {cols.map((c) => <th key={c.k} className="text-right">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {TALON_TYPES.map((t) => {
              const s = sums.find((x) => x.denomination === t.amount);
              return (
                <tr key={t.prefix}>
                  <td className="font-medium">{t.prefix} · {fmtMoney(t.amount)}</td>
                  {cols.map((c) => {
                    const n = Number(s?.[c.k] ?? 0);
                    return (
                      <td key={c.k} className="text-right">
                        <span className="block font-semibold">{n || "—"}</span>
                        {n > 0 && <span className="block text-xs text-gray-500">{fmtMoney(n * t.amount)}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="bg-gray-50">
              <td className="font-semibold">Нийт</td>
              {cols.map((c) => {
                const t = sumOf(c.k);
                return (
                  <td key={c.k} className="text-right">
                    <span className="block font-bold">{t.cnt || "—"}</span>
                    {t.cnt > 0 && <span className="block text-xs text-gray-500">{fmtMoney(t.amt)}</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Салбараас бүртгэсэн ({period})</th>
              {TALON_TYPES.map((t) => <th key={t.prefix} className="text-right">{fmtMoney(t.amount)}</th>)}
              <th className="text-right">Нийт дүн</th>
            </tr>
          </thead>
          <tbody>
            {branchList.map((b) => {
              const mine = bsums.filter((x) => x.branch_id === b.id);
              const amt = mine.reduce((t, x) => t + Number(x.cnt) * x.denomination, 0);
              return (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  {TALON_TYPES.map((t) => (
                    <td key={t.prefix} className="text-right">{Number(mine.find((x) => x.denomination === t.amount)?.cnt ?? 0) || "—"}</td>
                  ))}
                  <td className="text-right font-medium">{amt ? fmtMoney(amt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="min-w-0 space-y-3">
          <form className="card grid grid-cols-2 gap-2 md:grid-cols-4">
            <div>
              <label className="label">Төрөл</label>
              <select name="type" defaultValue={f.type} className="input">
                <option value="">Бүгд</option>
                {TALON_TYPES.map((t) => <option key={t.prefix} value={t.prefix}>{t.prefix} · {fmtMoney(t.amount)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Төлөв</label>
              <select name="status" defaultValue={f.status} className="input">
                <option value="">Бүгд</option>
                <option value="sold">Зарагдсан, ашиглаагүй</option>
                <option value="redeemed">Салбараас бүртгэсэн</option>
              </select>
            </div>
            <div>
              <label className="label">Салбар</label>
              <select name="branch" defaultValue={f.branch} className="input">
                <option value="">Бүгд</option>
                {branchList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Харилцагч (нэр эсвэл регистр)</label>
              <input name="cq" defaultValue={f.cq} className="input" placeholder="Эс Ти Юу эсвэл 6000001" />
              {f.customer && (
                <p className="mt-1 text-xs text-gray-500">
                  <input type="hidden" name="customer" value={f.customer} />
                  Сонгосон: <b>{customerLabel(picked.data)}</b> · <a className="text-brand underline" href={qs({ customer: "", page: "" })}>болих</a>
                </p>
              )}
            </div>
            <div>
              <label className="label">Огноо</label>
              <select name="field" defaultValue={f.field} className="input">
                <option value="redeemed">Оруулсан огноо</option>
                <option value="sold">Зарсан огноо</option>
              </select>
            </div>
            <div><label className="label">Эхлэх</label><input type="date" name="from" defaultValue={f.from} className="input" /></div>
            <div><label className="label">Дуусах</label><input type="date" name="to" defaultValue={f.to} className="input" /></div>
            <div><label className="label">Сериал</label><input name="serial" defaultValue={f.serial} className="input font-mono uppercase" placeholder="AB00012" /></div>
            <div className="col-span-2 flex gap-2 md:col-span-4">
              <button className="btn-primary">Шүүх</button>
              <a href="/talon" className="btn-ghost">Цэвэрлэх</a>
              <span className="ml-auto self-center text-xs text-gray-500">{total} талон</span>
            </div>
          </form>

          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr><th>Төрөл</th><th>Сериал</th><th>Харилцагч</th><th>Зарсан огноо</th><th>Оруулсан огноо</th><th>Салбар</th><th>Ажилтан</th><th>Бүртгэсэн</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{fmtMoney(r.denomination)}</td>
                    <td className="font-mono text-xs">{r.serial}</td>
                    <td>{customerLabel(r.customer)}{r.customer?.name && r.customer.register && <span className="block text-[11px] text-gray-400">{r.customer.register}</span>}</td>
                    <td className="text-xs">{fmtDate(r.sold_date)}</td>
                    <td className="text-xs">{r.redeemed_date ? fmtDate(r.redeemed_date) : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">ашиглаагүй</span>}</td>
                    <td className="text-xs">{r.branch?.name ?? "—"}</td>
                    <td className="text-xs">{r.redeemer?.full_name ?? "—"}</td>
                    <td className="whitespace-nowrap text-xs text-gray-500">
                      {r.redeemed_recorded_at ? fmtDateTime(r.redeemed_recorded_at) : "—"}
                      {r.redeemed_date && r.redeemed_recorded_at && !fmtDateTime(r.redeemed_recorded_at).startsWith(fmtDate(r.redeemed_date)) && (
                        <span className="ml-1 rounded bg-gray-100 px-1 text-gray-600" title="Өмнөх өдрөөр нөхөж оруулсан">нөхөж</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">Талон алга</td></tr>}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              {page > 1 && <a className="btn-ghost" href={qs({ page: page - 1 })}>← Өмнөх</a>}
              <span className="text-gray-500">{page} / {pages}</span>
              {page < pages && <a className="btn-ghost" href={qs({ page: page + 1 })}>Дараах →</a>}
            </div>
          )}
        </div>

    </div>
  );
}
