import Link from "next/link";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadStationSetup, tankStatuses, type TankStatus } from "@/lib/station";
import { fmtLiters, fmtMoney, round2, round3 } from "@/lib/station-calc";
import { addDays, fmtDateTime, reportRange } from "@/lib/time";
import type { FuelReceipt, StationShift } from "@/lib/types";
import { Kpi } from "@/app/admin/kpi";

type ReadingRow = { shift_id: string; liters: number | null; amount: number | null; nozzle: { tank: { fuel_type_id: string } | null } | null };

export default async function StationReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id: stationId } = await params;
  const { emp: me, station } = await requireStationPage(stationId);
  const sp = await searchParams;
  const { from, to } = reportRange(sp.from, sp.to);
  const org = me.organization_id;
  const db = createAdminClient();

  const ids = [station.id];
  const stationName = new Map([[station.id, station.name]]);

  const fromTs = `${from}T00:00:00+08:00`;
  const toTs = `${addDays(to, 1)}T00:00:00+08:00`;
  const [{ data: sh }, { data: openSh }, { data: rc }, { data: fu }, { data: emps }] = await Promise.all([
    db.from("station_shifts").select("*").in("branch_id", ids).eq("status", "closed").gte("closed_at", fromTs).lt("closed_at", toTs).order("closed_at", { ascending: false }),
    db.from("station_shifts").select("*").in("branch_id", ids).eq("status", "open"),
    db.from("fuel_receipts").select("*").in("branch_id", ids).gte("received_at", fromTs).lt("received_at", toTs).order("received_at", { ascending: false }),
    db.from("fuel_types").select("id, name").eq("organization_id", org),
    db.from("employees").select("id, full_name").eq("organization_id", org),
  ]);
  const shifts = (sh ?? []) as StationShift[];
  const openShifts = (openSh ?? []) as StationShift[];
  const receipts = (rc ?? []) as FuelReceipt[];
  const fuelName = new Map((fu ?? []).map((f) => [f.id, f.name as string]));
  const empName = new Map((emps ?? []).map((e) => [e.id, e.full_name as string]));

  // Шатахууны төрлөөр борлуулалт
  const { data: rd } = shifts.length
    ? await db
        .from("shift_readings")
        .select("shift_id, liters, amount, nozzle:station_nozzles(tank:station_tanks(fuel_type_id))")
        .in("shift_id", shifts.map((s) => s.id))
    : { data: [] };
  const byFuel = new Map<string, { liters: number; amount: number }>();
  for (const r of (rd ?? []) as unknown as ReadingRow[]) {
    const fid = r.nozzle?.tank?.fuel_type_id ?? "?";
    const cur = byFuel.get(fid) ?? { liters: 0, amount: 0 };
    byFuel.set(fid, { liters: round3(cur.liters + Number(r.liters ?? 0)), amount: round2(cur.amount + Number(r.amount ?? 0)) });
  }

  // Савны төлөв
  const tankRows: { station: string; s: TankStatus; lastBook: number | null }[] = [];
  for (const id of ids) {
    const { tanks } = await loadStationSetup(org, id);
    const statuses = await tankStatuses(id, tanks);
    const { data: lastM } = tanks.length
      ? await db.from("tank_measurements").select("tank_id, book_liters, measured_at").in("tank_id", tanks.map((t) => t.id)).order("measured_at", { ascending: false }).limit(tanks.length * 3)
      : { data: [] };
    for (const st of statuses) {
      const m = (lastM ?? []).find((x) => x.tank_id === st.tank.id);
      tankRows.push({ station: stationName.get(id) ?? "", s: st, lastBook: m?.book_liters != null ? Number(m.book_liters) : null });
    }
  }

  const sum = (k: keyof StationShift) => round2(shifts.reduce((a, s) => a + Number(s[k] ?? 0), 0));
  const shortage = round2(shifts.reduce((a, s) => a + Math.min(0, Number(s.difference ?? 0)), 0));
  const qs = new URLSearchParams({ from, to }).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold">Тайлан</h2>
        <form className="flex flex-wrap items-end gap-2">
          <div><label className="label">Эхлэх</label><input type="date" name="from" defaultValue={from} className="input" /></div>
          <div><label className="label">Дуусах</label><input type="date" name="to" defaultValue={to} className="input" /></div>
          <button className="btn-ghost">Харах</button>
        </form>
      </div>

      {(
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Борлуулалт" value={fmtMoney(sum("sales_amount"))} />
            <Kpi label="Литр" value={fmtLiters(sum("sales_liters"))} />
            <Kpi label="Бэлэн" value={fmtMoney(sum("pay_cash"))} tone="text-gray-700" />
            <Kpi label="Карт" value={fmtMoney(sum("pay_card"))} tone="text-gray-700" />
            <Kpi label="Талон / Зээл" value={fmtMoney(round2(sum("pay_coupon") + sum("pay_credit")))} tone="text-gray-700" />
            <Kpi label="Нийт дутагдал" value={fmtMoney(Math.abs(shortage))} tone={shortage < 0 ? "text-brand" : "text-emerald-600"} hint={`${shifts.length} ээлж`} />
          </div>

          {openShifts.length > 0 && (
            <div className="card text-sm">
              <b>Нээлттэй ээлж:</b>{" "}
              {openShifts.map((s) => `${fmtDateTime(s.opened_at)}-аас, ${empName.get(s.opened_by) ?? ""}`).join(" · ")}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card overflow-x-auto p-0">
              <h2 className="px-3 pt-3 font-semibold">Шатахууны төрлөөр</h2>
              <table className="table">
                <thead><tr><th>Шатахуун</th><th className="text-right">Литр</th><th className="text-right">Дүн</th></tr></thead>
                <tbody>
                  {[...byFuel].map(([fid, v]) => (
                    <tr key={fid}><td>{fuelName.get(fid) ?? "—"}</td><td className="text-right tabular-nums">{fmtLiters(v.liters)}</td><td className="text-right tabular-nums">{fmtMoney(v.amount)}</td></tr>
                  ))}
                  {byFuel.size === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Хаагдсан ээлж алга</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="card overflow-x-auto p-0">
              <h2 className="px-3 pt-3 font-semibold">Савны үлдэгдэл</h2>
              <table className="table">
                <thead><tr><th>Сав</th><th className="text-right">Дансаар одоо</th><th className="text-right">Сүүлийн хэмжилт</th><th className="text-right">Хэмжилтийн зөрүү</th></tr></thead>
                <tbody>
                  {tankRows.map(({ station, s, lastBook }) => {
                    const diff = s.lastMeasured && lastBook != null ? round3(s.lastMeasured.liters - lastBook) : null;
                    return (
                      <tr key={s.tank.id}>
                        <td>{s.tank.name} <span className="text-xs text-gray-400">· {s.tank.fuel.name}{ids.length > 1 ? ` · ${station}` : ""}</span></td>
                        <td className="text-right tabular-nums">{fmtLiters(s.book)}</td>
                        <td className="text-right tabular-nums">
                          {s.lastMeasured ? <>{fmtLiters(s.lastMeasured.liters)}<span className="block text-[11px] text-gray-400">{fmtDateTime(s.lastMeasured.at)}</span></> : "—"}
                        </td>
                        <td className={`text-right tabular-nums ${diff != null && diff < 0 ? "text-brand" : ""}`}>{diff == null ? "—" : fmtLiters(diff)}</td>
                      </tr>
                    );
                  })}
                  {tankRows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Сав тохируулаагүй</td></tr>}
                </tbody>
              </table>
              <p className="px-3 pb-3 text-[11px] text-gray-400">Хэмжилтийн зөрүү = бодит хэмжилт − тухайн үеийн дансны үлдэгдэл (хасах бол дутагдал)</p>
            </section>
          </div>

          <section className="card overflow-x-auto p-0">
            <h2 className="px-3 pt-3 font-semibold">Ээлжүүд</h2>
            <table className="table">
              <thead>
                <tr><th>Нээсэн</th><th>Хаасан</th><th className="text-right">Литр</th><th className="text-right">Борлуулалт</th><th className="text-right">Орлого</th><th className="text-right">Зөрүү</th><th></th></tr>
              </thead>
              <tbody>
                {shifts.map((s) => {
                  const paid = round2(Number(s.pay_cash ?? 0) + Number(s.pay_card ?? 0) + Number(s.pay_coupon ?? 0) + Number(s.pay_credit ?? 0));
                  const d = Number(s.difference ?? 0);
                  return (
                    <tr key={s.id}>
                      <td className="text-xs">{fmtDateTime(s.opened_at)}<span className="block text-gray-400">{empName.get(s.opened_by)}</span></td>
                      <td className="text-xs">{s.closed_at ? fmtDateTime(s.closed_at) : ""}<span className="block text-gray-400">{s.closed_by ? empName.get(s.closed_by) : ""}</span></td>
                      <td className="text-right tabular-nums">{fmtLiters(Number(s.sales_liters))}</td>
                      <td className="text-right tabular-nums">{fmtMoney(Number(s.sales_amount))}</td>
                      <td className="text-right tabular-nums">{fmtMoney(paid)}</td>
                      <td className={`text-right tabular-nums ${d < 0 ? "font-semibold text-brand" : d > 0 ? "text-amber-600" : "text-gray-400"}`}>{d === 0 ? "—" : fmtMoney(d)}</td>
                      <td><Link href={`/station/${station.id}/shift/${s.id}?${qs}`} className="text-sm text-brand">Дэлгэрэнгүй</Link></td>
                    </tr>
                  );
                })}
                {shifts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Энэ хугацаанд хаагдсан ээлж алга</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="card overflow-x-auto p-0">
            <h2 className="px-3 pt-3 font-semibold">Түлш хүлээн авалт</h2>
            <table className="table">
              <thead><tr><th>Огноо</th><th>Сав</th><th className="text-right">Литр</th><th>Падаан</th><th>Нийлүүлэгч</th><th>Хүлээн авсан</th></tr></thead>
              <tbody>
                {receipts.map((r) => {
                  const tank = tankRows.find((t) => t.s.tank.id === r.tank_id)?.s.tank;
                  return (
                    <tr key={r.id}>
                      <td className="text-xs">{fmtDateTime(r.received_at)}</td>
                      <td>{tank ? `${tank.name} · ${tank.fuel.name}` : "—"}</td>
                      <td className="text-right tabular-nums">{fmtLiters(Number(r.liters))}</td>
                      <td>{r.doc_no ?? "—"}</td>
                      <td>{r.supplier ?? "—"}</td>
                      <td className="text-xs">{empName.get(r.received_by)}</td>
                    </tr>
                  );
                })}
                {receipts.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Хүлээн авалт алга</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
