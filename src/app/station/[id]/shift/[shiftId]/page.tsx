import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtLiters, fmtMoney, round3 } from "@/lib/station-calc";
import { fmtDateTime } from "@/lib/time";
import type { FuelReceipt, StationShift } from "@/lib/types";

type Reading = {
  id: string;
  start_reading: number;
  end_reading: number | null;
  price: number | null;
  liters: number | null;
  amount: number | null;
  nozzle: { name: string; tank: { name: string; fuel: { name: string } | null } | null } | null;
};
type Measure = { id: string; liters: number; book_liters: number | null; tank: { name: string; fuel: { name: string } | null } | null };

export default async function ShiftDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; shiftId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id: stationId, shiftId: id } = await params;
  const { emp: me, station } = await requireStationPage(stationId);
  const back = new URLSearchParams(await searchParams).toString();
  const db = createAdminClient();
  const { data } = await db.from("station_shifts").select("*").eq("id", id).eq("branch_id", station.id).maybeSingle();
  const s = data as StationShift | null;
  if (!s) notFound();

  const [{ data: rd }, { data: ms }, { data: rc }, { data: emps }] = await Promise.all([
    db.from("shift_readings").select("id, start_reading, end_reading, price, liters, amount, nozzle:station_nozzles(name, tank:station_tanks(name, fuel:fuel_types(name)))").eq("shift_id", id),
    db.from("tank_measurements").select("id, liters, book_liters, tank:station_tanks(name, fuel:fuel_types(name))").eq("shift_id", id),
    db.from("fuel_receipts").select("*").eq("shift_id", id).order("received_at"),
    db.from("employees").select("id, full_name").eq("organization_id", me.organization_id),
  ]);
  const readings = ((rd ?? []) as unknown as Reading[]).sort((a, b) => (a.nozzle?.name ?? "").localeCompare(b.nozzle?.name ?? ""));
  const measures = (ms ?? []) as unknown as Measure[];
  const receipts = (rc ?? []) as FuelReceipt[];
  const name = (eid: string | null) => (emps ?? []).find((e) => e.id === eid)?.full_name ?? "";
  const d = Number(s.difference ?? 0);
  const handDiff = Number(s.handover_received) - Number(s.handover_expected);

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={`/station/${station.id}/report?${back}`} className="text-sm text-brand">← Тайлан</Link>
      <div>
        <h2 className="text-lg font-bold">Ээлжийн дэлгэрэнгүй</h2>
        <p className="text-sm text-gray-500">
          Нээсэн: {fmtDateTime(s.opened_at)} ({name(s.opened_by)}) · {s.closed_at ? `Хаасан: ${fmtDateTime(s.closed_at)} (${name(s.closed_by)})` : "Нээлттэй"}
        </p>
      </div>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-3 pt-3 font-semibold">Тоолуур</h2>
        <table className="table">
          <thead><tr><th>Хошуу</th><th className="text-right">Эхлэх</th><th className="text-right">Дуусах</th><th className="text-right">Литр</th><th className="text-right">Үнэ</th><th className="text-right">Дүн</th></tr></thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{r.nozzle?.name} <span className="text-xs text-gray-400">· {r.nozzle?.tank?.fuel?.name}</span></td>
                <td className="text-right tabular-nums">{Number(r.start_reading)}</td>
                <td className="text-right tabular-nums">{r.end_reading ?? "—"}</td>
                <td className="text-right tabular-nums">{fmtLiters(r.liters)}</td>
                <td className="text-right tabular-nums">{fmtMoney(r.price)}</td>
                <td className="text-right tabular-nums">{fmtMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card text-sm">
          <h2 className="mb-2 font-semibold">Орлого</h2>
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-gray-500">Тоолуураар борлуулалт</dt><dd className="text-right font-semibold tabular-nums">{fmtMoney(s.sales_amount)}</dd>
            <dt className="text-gray-500">Бэлэн</dt><dd className="text-right tabular-nums">{fmtMoney(s.pay_cash)}</dd>
            <dt className="text-gray-500">Карт</dt><dd className="text-right tabular-nums">{fmtMoney(s.pay_card)}</dd>
            <dt className="text-gray-500">Талон</dt><dd className="text-right tabular-nums">{fmtMoney(s.pay_coupon)}</dd>
            <dt className="text-gray-500">Зээл</dt><dd className="text-right tabular-nums">{fmtMoney(s.pay_credit)}</dd>
            <dt className="border-t border-gray-100 pt-1">{d < 0 ? "Дутагдал" : d > 0 ? "Илүүдэл" : "Зөрүү"}</dt>
            <dd className={`border-t border-gray-100 pt-1 text-right font-semibold tabular-nums ${d < 0 ? "text-brand" : d > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmtMoney(Math.abs(d))}</dd>
          </dl>
        </section>
        <section className="card text-sm">
          <h2 className="mb-2 font-semibold">Ээлж хүлээлцэх (бэлэн мөнгө)</h2>
          <dl className="grid grid-cols-2 gap-y-1">
            <dt className="text-gray-500">Өмнөх ээлж шилжүүлсэн</dt><dd className="text-right tabular-nums">{fmtMoney(s.handover_expected)}</dd>
            <dt className="text-gray-500">Тоолж хүлээн авсан</dt><dd className="text-right tabular-nums">{fmtMoney(s.handover_received)}</dd>
            <dt className="text-gray-500">Хүлээн авахад зөрүү</dt><dd className={`text-right tabular-nums ${handDiff < 0 ? "text-brand" : ""}`}>{handDiff === 0 ? "—" : fmtMoney(handDiff)}</dd>
            <dt className="text-gray-500">Дараагийн ээлжид үлдээсэн</dt><dd className="text-right tabular-nums">{fmtMoney(s.handover_cash)}</dd>
          </dl>
          {s.note && <p className="mt-3 rounded-lg bg-gray-50 p-2 text-gray-700">📝 {s.note}</p>}
        </section>
      </div>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-3 pt-3 font-semibold">Савны хэмжилт</h2>
        <table className="table">
          <thead><tr><th>Сав</th><th className="text-right">Дансаар</th><th className="text-right">Бодит</th><th className="text-right">Зөрүү</th></tr></thead>
          <tbody>
            {measures.map((m) => {
              const diff = m.book_liters == null ? null : round3(Number(m.liters) - Number(m.book_liters));
              return (
                <tr key={m.id}>
                  <td>{m.tank?.name} <span className="text-xs text-gray-400">· {m.tank?.fuel?.name}</span></td>
                  <td className="text-right tabular-nums">{fmtLiters(m.book_liters)}</td>
                  <td className="text-right tabular-nums">{fmtLiters(Number(m.liters))}</td>
                  <td className={`text-right tabular-nums ${diff != null && diff < 0 ? "text-brand" : ""}`}>{diff == null ? "—" : fmtLiters(diff)}</td>
                </tr>
              );
            })}
            {measures.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Хэмжилт алга</td></tr>}
          </tbody>
        </table>
      </section>

      {receipts.length > 0 && (
        <section className="card text-sm">
          <h2 className="mb-2 font-semibold">Энэ ээлжид хүлээн авсан түлш</h2>
          <ul className="divide-y divide-gray-100">
            {receipts.map((r) => (
              <li key={r.id} className="flex justify-between py-1.5">
                <span>{fmtDateTime(r.received_at)} · №{r.doc_no ?? "—"} · {r.supplier ?? ""} · {name(r.received_by)}</span>
                <b className="tabular-nums">{fmtLiters(Number(r.liters))}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
