import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLabel, fmtMoney, FORM_PREFIXES, serialSortKey, talonAmount } from "@/lib/talon";
import { customerIdsFor, parseFilters, talonQuery, type TalonFilters, type TalonRow } from "@/lib/talon-query";
import { addDays, daysBetween, fmtDate, fmtDateTime, todayUB } from "@/lib/time";
import { RedeemForm } from "./redeem-form";
import { RedeemImportForm } from "./redeem-import-form";
import { TalonFilter } from "./talon-filter";

const PAGE = 50;
const MAX_DAYS = 31;

type LightRow = { serial: string; customer_id: string; customer: { name: string; register: string | null } | null };

/** Шүүлтэд тохирох бүх талоныг (нэгтгэлд) 1000-аар хуудаслан уншина */
async function loadAll(org: string, f: TalonFilters, ids: string[] | null): Promise<LightRow[]> {
  const out: LightRow[] = [];
  for (let off = 0; off < 40000; off += 1000) {
    const { data } = await talonQuery(org, f, false, ids, "serial, customer_id, customer:customers(name, register)").range(off, off + 999);
    out.push(...((data ?? []) as unknown as LightRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Тоо ширхэг (том) + дүн (доор нь жижгээр) */
function CntCell({ cnt, amount, bold }: { cnt: number; amount: number; bold?: boolean }) {
  return (
    <td className="text-right tabular-nums">
      <span className={bold ? "font-bold" : cnt ? "font-medium" : "text-gray-300"}>{cnt}</span>
      <span className="block text-[11px] text-gray-500">{fmtMoney(amount)}</span>
    </td>
  );
}

type Totals = { today_cnt: number; today_amount: number; shift_cnt: number; shift_amount: number };

export default async function StationTalons({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { emp, station } = await requireStationPage(id);
  const org = emp.organization_id;
  const db = createAdminClient();
  const today = todayUB();

  const [settings, open] = await Promise.all([
    db.from("talon_settings").select("*").eq("organization_id", org).maybeSingle(),
    db.from("station_shifts").select("id").eq("branch_id", station.id).eq("status", "open").maybeSingle(),
  ]);
  const { data: totalsRow } = await db.rpc("talon_station_totals", { p_unit: station.id, p_shift: open.data?.id ?? null }).maybeSingle<Totals>();
  const back = settings.data?.backdate_days ?? 0;
  const stationImport = !!(settings.data as { station_import?: boolean } | null)?.station_import;

  // ---------- Шүүлт: анх нээхэд өнөөдөр; хамгийн ихдээ 31 хоног ----------
  const yesterday = addDays(today, -1);
  const pf = parseFilters(sp);
  const from = pf.from || today;
  let to = pf.to || from;
  let notice = "";
  const days = daysBetween(from, to) + 1;
  if (days < 1 || days > MAX_DAYS) {
    // Дуусах огноо эхлэхээс өмнө, эсвэл 31 хоногоос урт бол эхлэх огнооноос 31 хоногоор (өнөөдрөөс хэтрэхгүй)
    const end = addDays(from, MAX_DAYS - 1);
    to = end > today ? today : end;
    notice = `${days < 1 ? "Дуусах огноо эхлэх огнооноос өмнө байсан" : `Хугацаа ${days} хоног байсан`} тул эхлэх огнооноос хамгийн ихдээ ${MAX_DAYS} хоногоор (${fmtDate(from)} – ${fmtDate(to)}) харууллаа.`;
  }
  const f: TalonFilters = { ...pf, status: "redeemed", field: "redeemed", branch: station.id, customer: "", from, to };
  const page = Math.max(1, Math.trunc(Number(sp.page)) || 1);
  const types = FORM_PREFIXES.filter((x) => !f.type || x === f.type);

  const ids = await customerIdsFor(org, f.cq);
  const [list, all] = await Promise.all([
    talonQuery(org, f, true, ids).range((page - 1) * PAGE, page * PAGE - 1),
    loadAll(org, f, ids),
  ]);
  const rows = ((list.data ?? []) as unknown as TalonRow[]).sort(
    (a, b) => (b.redeemed_recorded_at ?? "").localeCompare(a.redeemed_recorded_at ?? "") || serialSortKey(a.serial).localeCompare(serialSortKey(b.serial)),
  );
  const total = list.count ?? 0;

  // Төрлөөр болон харилцагчаар нэгтгэнэ
  const typeCnt = new Map<string, number>();
  const byCust = new Map<string, { id: string; label: string; cnt: Map<string, number> }>();
  for (const r of all) {
    const t = r.serial.slice(0, 2);
    typeCnt.set(t, (typeCnt.get(t) ?? 0) + 1);
    const c = byCust.get(r.customer_id) ?? { id: r.customer_id, label: customerLabel(r.customer), cnt: new Map<string, number>() };
    c.cnt.set(t, (c.cnt.get(t) ?? 0) + 1);
    byCust.set(r.customer_id, c);
  }
  const amt = (x: string) => talonAmount(x) ?? 0;
  const byType = types.map((x) => ({ prefix: x, amount: amt(x), cnt: typeCnt.get(x) ?? 0 }));
  const custRows = [...byCust.values()]
    .map((c) => ({ ...c, n: types.reduce((s, x) => s + (c.cnt.get(x) ?? 0), 0), sum: types.reduce((s, x) => s + (c.cnt.get(x) ?? 0) * amt(x), 0) }))
    .sort((a, b) => b.sum - a.sum || a.label.localeCompare(b.label));
  const sumCnt = byType.reduce((t, x) => t + x.cnt, 0);
  const sumAmt = byType.reduce((t, x) => t + x.cnt * x.amount, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };

  return (
    <>
      <RedeemForm stationId={station.id} today={today} minDate={addDays(today, -back)} />
      {stationImport && <RedeemImportForm stationId={station.id} stationName={station.name} today={today} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500">Өнөөдөр оруулсан</p>
          <p className="text-lg font-bold tabular-nums">{fmtMoney(Number(totalsRow?.today_amount ?? 0))}</p>
          <p className="text-xs text-gray-500">{Number(totalsRow?.today_cnt ?? 0)} ширхэг</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Нээлттэй ээлжинд</p>
          {open.data ? (
            <>
              <p className="text-lg font-bold tabular-nums">{fmtMoney(Number(totalsRow?.shift_amount ?? 0))}</p>
              <p className="text-xs text-gray-500">{Number(totalsRow?.shift_cnt ?? 0)} ширхэг · ээлж хаахад «Талон»-д орно</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Ээлж хаалттай</p>
          )}
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">Оруулсан талон шүүх</h2>
        <TalonFilter key={`${from}|${to}`} type={f.type} cq={f.cq} serial={f.serial} from={from} to={to} today={today} yesterday={yesterday} />
        <p className="text-xs text-gray-500">Оруулсан огноогоор, хамгийн ихдээ {MAX_DAYS} хоногоор шүүнэ.</p>
        {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ {notice}</p>}
      </section>

      <>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Нийлбэр · {fmtDate(from)} – {fmtDate(to)}</h2>
            <table className="table text-sm">
              <thead><tr><th>Төрөл</th><th className="text-right">Ширхэг</th><th className="text-right">Дүн</th></tr></thead>
              <tbody>
                {byType.map((t) => (
                  <tr key={t.prefix}>
                    <td>{t.prefix} · {fmtMoney(t.amount)}</td>
                    <td className="text-right tabular-nums">{t.cnt}</td>
                    <td className="text-right tabular-nums">{fmtMoney(t.cnt * t.amount)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td>Нийт</td>
                  <td className="text-right tabular-nums">{sumCnt}</td>
                  <td className="text-right tabular-nums">{fmtMoney(sumAmt)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card overflow-x-auto">
            <h2 className="mb-2 text-sm font-semibold">Харилцагчаар · {fmtDate(from)} – {fmtDate(to)}</h2>
            {custRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Энэ хугацаанд оруулсан талон алга</p>
            ) : (
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Харилцагч</th>
                    {types.map((x) => <th key={x} className="text-right">{x}<span className="block text-[10px] font-normal normal-case">{fmtMoney(amt(x))}</span></th>)}
                    <th className="text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {custRows.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.label}</td>
                      {types.map((x) => <CntCell key={x} cnt={c.cnt.get(x) ?? 0} amount={(c.cnt.get(x) ?? 0) * amt(x)} />)}
                      <CntCell cnt={c.n} amount={c.sum} bold />
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200">
                    <td className="font-bold">Нийт</td>
                    {byType.map((x) => <CntCell key={x.prefix} cnt={x.cnt} amount={x.cnt * x.amount} bold />)}
                    <CntCell cnt={sumCnt} amount={sumAmt} bold />
                  </tr>
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Оруулсан талон ({total})</h2>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Энэ хугацаанд оруулсан талон алга</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="py-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-xs">{r.serial}</span>
                      <b className="tabular-nums">{fmtMoney(r.denomination)}</b>
                    </div>
                    <p className="text-xs text-gray-500">{customerLabel(r.customer)} · огноо {r.redeemed_date && fmtDate(r.redeemed_date)}</p>
                    <p className="text-[11px] text-gray-400">{r.redeemer?.full_name} · {r.redeemed_recorded_at && fmtDateTime(r.redeemed_recorded_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                {page > 1 && <a className="btn-ghost" href={qs({ page: page - 1 })}>← Өмнөх</a>}
                <span className="text-gray-500">{page} / {pages}</span>
                {page < pages && <a className="btn-ghost" href={qs({ page: page + 1 })}>Дараах →</a>}
              </div>
            )}
          </section>
      </>
    </>
  );
}
