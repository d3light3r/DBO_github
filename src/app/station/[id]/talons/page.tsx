import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLabel, fmtMoney, FORM_PREFIXES, talonAmount } from "@/lib/talon";
import { customerIdsFor, parseFilters, talonQuery, type TalonFilters, type TalonRow } from "@/lib/talon-query";
import { addDays, daysBetween, fmtDate, fmtDateTime, todayUB } from "@/lib/time";
import { RedeemForm } from "./redeem-form";
import { RedeemImportForm } from "./redeem-import-form";

const PAGE = 50;
const MAX_DAYS = 31;

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

  // ---------- Шүүлт: «Шүүх» дарсны дараа л жагсаалт гарна (хамгийн ихдээ 31 хоног) ----------
  const searched = sp.from !== undefined || sp.to !== undefined;
  const pf = parseFilters(sp);
  const from = pf.from || `${today.slice(0, 8)}01`;
  const to = pf.to || today;
  const f: TalonFilters = { ...pf, status: "redeemed", field: "redeemed", branch: station.id, customer: "", from, to };
  const days = daysBetween(from, to) + 1;
  const rangeError = !searched
    ? ""
    : days < 1
      ? "Эхлэх огноо дуусах огнооноос хойш байна."
      : days > MAX_DAYS
        ? `Хамгийн ихдээ ${MAX_DAYS} хоногоор шүүнэ (одоо ${days} хоног).`
        : "";
  const run = searched && !rangeError;
  const page = Math.max(1, Math.trunc(Number(sp.page)) || 1);

  let rows: TalonRow[] = [];
  let total = 0;
  let byType: { prefix: string; amount: number; cnt: number }[] = [];
  if (run) {
    const ids = await customerIdsFor(org, f.cq);
    const types = FORM_PREFIXES.filter((p) => !f.type || p === f.type);
    const [list, ...counts] = await Promise.all([
      talonQuery(org, f, true, ids).range((page - 1) * PAGE, page * PAGE - 1),
      ...types.map((p) => talonQuery(org, { ...f, type: p }, true, ids).range(0, 0)),
    ]);
    rows = (list.data ?? []) as unknown as TalonRow[];
    total = list.count ?? 0;
    byType = types.map((p, i) => ({ prefix: p, amount: talonAmount(p) ?? 0, cnt: counts[i].count ?? 0 }));
  }
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
        <form className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <label className="label">Төрөл</label>
            <select name="type" defaultValue={f.type} className="input">
              <option value="">Бүгд</option>
              {FORM_PREFIXES.map((p) => <option key={p} value={p}>{p} · {fmtMoney(talonAmount(p) ?? 0)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Харилцагч (нэр / регистр)</label>
            <input name="cq" defaultValue={f.cq} className="input" placeholder="Хайх" />
          </div>
          <div>
            <label className="label">Сериал</label>
            <input name="serial" defaultValue={f.serial} className="input font-mono" placeholder="AB0001…" />
          </div>
          <div>
            <label className="label">Эхлэх огноо</label>
            <input type="date" name="from" defaultValue={from} max={today} className="input" required />
          </div>
          <div>
            <label className="label">Дуусах огноо</label>
            <input type="date" name="to" defaultValue={to} max={today} className="input" required />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Шүүх</button>
          </div>
        </form>
        <p className="text-xs text-gray-500">Оруулсан огноогоор, хамгийн ихдээ {MAX_DAYS} хоногоор шүүнэ.</p>
        {rangeError && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{rangeError}</p>}
      </section>

      {run && (
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
      )}
    </>
  );
}
