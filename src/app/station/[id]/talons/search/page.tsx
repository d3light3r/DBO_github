import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { requireStationPage } from "@/lib/station-access";
import { customerLabel, fmtMoney, FORM_PREFIXES, serialSortKey, talonAmount } from "@/lib/talon";
import { customerIdsFor, parseFilters, talonQuery, type TalonFilters, type TalonRow } from "@/lib/talon-query";
import { addDays, daysBetween, fmtDate, fmtDateTime, todayUB } from "@/lib/time";
import { TalonFilter, ViewSwitch } from "../talon-filter";

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

/** Хуудаслалт: Эхэнд · Өмнөх · n / N · Дараах · Сүүлд */
function Pager({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-sm">
      {page > 1 && (
        <>
          <a className="btn-ghost" href={href(1)}>« Эхэнд</a>
          <a className="btn-ghost" href={href(page - 1)}>← Өмнөх</a>
        </>
      )}
      <span className="px-1 text-gray-500">{page} / {pages}</span>
      {page < pages && (
        <>
          <a className="btn-ghost" href={href(page + 1)}>Дараах →</a>
          <a className="btn-ghost" href={href(pages)}>Сүүлд »</a>
        </>
      )}
    </div>
  );
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


export default async function StationTalonSearch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { emp, station } = await requireStationPage(id);
  if (!can(emp, "station.talon.search")) redirect(`/station/${id}/talons`);
  const org = emp.organization_id;
  const today = todayUB();

  // ---------- Шүүлт: анх нээхэд өнөөдөр; хамгийн ихдээ 31 хоног ----------
  const yesterday = addDays(today, -1);
  const pf = parseFilters(sp);
  const from = pf.from || today;
  // Дуусах огноо сонгоогүй бол эхлэх огнооны сарын сүүлийн өдөр (өнөөдрөөс хэтрэхгүй)
  const monthEnd = addDays(`${addDays(`${from.slice(0, 8)}28`, 4).slice(0, 8)}01`, -1);
  let to = pf.to || (monthEnd > today ? today : monthEnd);
  let notice = "";
  const days = daysBetween(from, to) + 1;
  if (days < 1 || days > MAX_DAYS) {
    // Дуусах огноо эхлэхээс өмнө, эсвэл 31 хоногоос урт бол эхлэх огнооноос 31 хоногоор (өнөөдрөөс хэтрэхгүй)
    const end = addDays(from, MAX_DAYS - 1);
    to = end > today ? today : end;
    notice = `${days < 1 ? "Дуусах огноо эхлэх огнооноос өмнө байсан" : `Хугацаа ${days} хоног байсан`} тул эхлэх огнооноос хамгийн ихдээ ${MAX_DAYS} хоногоор (${fmtDate(from)} – ${fmtDate(to)}) харууллаа.`;
  }
  // Сериалаар хайхад огноогоор хязгаарлахгүй (тухайн талоныг хэзээ оруулсан нь мэдэгдэхгүй)
  const bySerial = !!pf.serial;
  if (bySerial) notice = "";
  const f: TalonFilters = { ...pf, status: "redeemed", field: "redeemed", branch: station.id, from: bySerial ? "" : from, to: bySerial ? "" : to };
  const period = bySerial ? `сериал «${pf.serial}» · бүх огноо` : `${fmtDate(from)} – ${fmtDate(to)}`;
  const view = sp.view === "talon" ? "talon" : "customer";
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
  // Харилцагчийн жагсаалт: 50-аар хуудаслана (Нийт мөр хуудас бүрт)
  const cpages = Math.max(1, Math.ceil(custRows.length / PAGE));
  const cpage = Math.min(cpages, Math.max(1, Math.trunc(Number(sp.cpage)) || 1));
  const custPage = custRows.slice((cpage - 1) * PAGE, cpage * PAGE);
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };

  return (
    <>
      <section className="card space-y-3">
        <TalonFilter key={`${from}|${to}|${f.customer}`} type={f.type} cq={f.cq} serial={f.serial} from={from} to={to} today={today} yesterday={yesterday} />
        <p className="text-xs text-gray-500">Оруулсан огноогоор, хамгийн ихдээ {MAX_DAYS} хоногоор шүүнэ. Сериалаар хайвал бүх огноогоос хайна. Дуусах огноо сонгоогүй бол эхлэх огнооны сарын сүүлийн өдөр хүртэл.</p>
        {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ {notice}</p>}
      </section>

      <>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Нийлбэр · {period}</h2>
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

          <ViewSwitch
            key={`${view}|${f.customer}`}
            initial={view}
            customers={
          <section className="card overflow-x-auto">
            <h2 className="mb-2 text-sm font-semibold">Харилцагчаар · {period}</h2>
            <p className="mb-1 text-xs text-gray-500">Харилцагч дээр дарвал энэ хугацааны талоны жагсаалт гарна.</p>
            {custRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Энэ хугацаанд оруулсан талон алга</p>
            ) : (
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th className="w-8">№</th>
                    <th>Харилцагч</th>
                    {types.map((x) => <th key={x} className="text-right">{x}<span className="block text-[10px] font-normal normal-case">{fmtMoney(amt(x))}</span></th>)}
                    <th className="text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {custPage.map((c, i) => (
                    <tr key={c.id}>
                      <td className="text-xs text-gray-400 tabular-nums">{(cpage - 1) * PAGE + i + 1}</td>
                      <td className="font-medium">
                        <a className="text-brand hover:underline" href={qs({ view: "talon", customer: c.id, page: "", cpage: "" })}>{c.label}</a>
                      </td>
                      {types.map((x) => <CntCell key={x} cnt={c.cnt.get(x) ?? 0} amount={(c.cnt.get(x) ?? 0) * amt(x)} />)}
                      <CntCell cnt={c.n} amount={c.sum} bold />
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200">
                    <td></td>
                    <td className="font-bold">Нийт</td>
                    {byType.map((x) => <CntCell key={x.prefix} cnt={x.cnt} amount={x.cnt * x.amount} bold />)}
                    <CntCell cnt={sumCnt} amount={sumAmt} bold />
                  </tr>
                </tbody>
              </table>
            )}
            <Pager page={cpage} pages={cpages} href={(n) => qs({ cpage: n, view: "customer" })} />
          </section>
            }
            talons={
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Оруулсан талон ({total}) · {period}</h2>
            {f.customer && (
              <p className="mb-2 text-xs">
                Харилцагч: <b>{customerLabel(all[0]?.customer ?? null)}</b> ·{" "}
                <a className="text-brand underline" href={qs({ view: "talon", customer: "", page: "" })}>бүх харилцагч</a>
              </p>
            )}
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Энэ хугацаанд оруулсан талон алга</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {rows.map((r, i) => (
                  <li key={r.id} className="py-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-xs"><span className="mr-2 inline-block min-w-6 font-sans text-gray-400 tabular-nums">{(page - 1) * PAGE + i + 1}.</span>{r.serial}</span>
                      <b className="tabular-nums">{fmtMoney(r.denomination)}</b>
                    </div>
                    <p className="text-xs text-gray-500">{customerLabel(r.customer)} · огноо {r.redeemed_date && fmtDate(r.redeemed_date)}</p>
                    <p className="text-[11px] text-gray-400">{r.redeemer?.full_name} · {r.redeemed_recorded_at && fmtDateTime(r.redeemed_recorded_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} pages={pages} href={(n) => qs({ page: n, view: "talon" })} />
          </section>
            }
          />
      </>
    </>
  );
}
