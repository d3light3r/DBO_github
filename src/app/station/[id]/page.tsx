import Link from "next/link";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { lastReadings, loadStationSetup, tankStatuses } from "@/lib/station";
import { fmtLiters, fmtMoney } from "@/lib/station-calc";
import { fmtDateTime } from "@/lib/time";
import type { FuelReceipt, ShiftReading, StationShift } from "@/lib/types";
import { CloseShiftForm, OpenShiftForm, ReceiptForm } from "./forms";

export default async function StationShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station, isAdmin } = await requireStationPage(id);
  const db = createAdminClient();

  const [{ tanks, nozzles }, { data: openRow }, { data: recent }, { data: lastClosed }] = await Promise.all([
    loadStationSetup(emp.organization_id, station.id),
    db.from("station_shifts").select("*").eq("branch_id", station.id).eq("status", "open").maybeSingle(),
    db.from("station_shifts").select("*").eq("branch_id", station.id).eq("status", "closed").order("closed_at", { ascending: false }).limit(5),
    db.from("station_shifts").select("handover_cash").eq("branch_id", station.id).eq("status", "closed").order("closed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const open = openRow as StationShift | null;
  const statuses = await tankStatuses(station.id, tanks);

  const nozzleViews = nozzles.map((n) => ({ id: n.id, name: n.name, fuelName: n.fuel.name, price: n.fuel.price, tankId: n.tank_id }));
  const tankViews = statuses.map((s) => ({ id: s.tank.id, name: s.tank.name, fuelName: s.tank.fuel.name, book: s.book }));

  // Нээлттэй ээлжийн мэдээлэл
  let starts: Record<string, number> = {};
  let receipts: FuelReceipt[] = [];
  let openerName = "";
  if (open) {
    const [{ data: rs }, { data: rc }, { data: opener }] = await Promise.all([
      db.from("shift_readings").select("*").eq("shift_id", open.id),
      db.from("fuel_receipts").select("*").eq("shift_id", open.id).order("received_at"),
      db.from("employees").select("full_name").eq("id", open.opened_by).maybeSingle(),
    ]);
    starts = Object.fromEntries(((rs ?? []) as ShiftReading[]).map((r) => [r.nozzle_id, Number(r.start_reading)]));
    receipts = (rc ?? []) as FuelReceipt[];
    openerName = opener?.full_name ?? "";
  }
  const lastEnd = open ? {} : Object.fromEntries(await lastReadings(station.id));
  const tankName = new Map(tanks.map((t) => [t.id, `${t.name} · ${t.fuel.name}`]));

  return (
    <>
      <section className="card">
        {open ? (
          <>
            <h1 className="text-lg font-bold text-emerald-700">Ээлж нээлттэй</h1>
            <p className="text-sm text-gray-500">{fmtDateTime(open.opened_at)} · {openerName}</p>
            {Number(open.handover_received) !== Number(open.handover_expected) && (
              <p className="mt-1 text-xs text-amber-700">
                Хүлээн авахад мөнгөний зөрүү: {fmtMoney(Number(open.handover_received) - Number(open.handover_expected))}
              </p>
            )}
          </>
        ) : (
          <h1 className="text-lg font-bold text-gray-700">Ээлж хаалттай</h1>
        )}
      </section>

      {nozzles.length === 0 ? (
        <section className="card text-sm text-gray-500">
          Энэ станцад сав, хошуу тохируулаагүй байна.{" "}
          {isAdmin ? <Link href={`/station/${station.id}/settings`} className="text-brand underline">Тохиргоо → Сав, хошуу нэмэх</Link> : "Админд хандана уу."}
        </section>
      ) : open ? (
        <>
          <section className="card space-y-3">
            <h2 className="font-semibold">Түлш хүлээн авах</h2>
            <ReceiptForm stationId={station.id} tanks={tankViews} />
            {receipts.length > 0 && (
              <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
                {receipts.map((r) => (
                  <li key={r.id} className="flex justify-between py-1.5">
                    <span>{tankName.get(r.tank_id)}{r.doc_no && <span className="text-xs text-gray-400"> · №{r.doc_no}</span>}</span>
                    <b className="tabular-nums">{fmtLiters(Number(r.liters))}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <CloseShiftForm stationId={station.id} nozzles={nozzleViews} starts={starts} tanks={tankViews} />
        </>
      ) : (
        <OpenShiftForm stationId={station.id} nozzles={nozzleViews} lastEnd={lastEnd} handoverExpected={Number(lastClosed?.handover_cash ?? 0)} />
      )}

      {tankViews.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold">Савны үлдэгдэл (дансаар)</h2>
          <ul className="space-y-1 text-sm">
            {statuses.map((s) => (
              <li key={s.tank.id} className="flex justify-between">
                <span>{s.tank.name} <span className="text-xs text-gray-400">· {s.tank.fuel.name}</span></span>
                <span className="tabular-nums">
                  {fmtLiters(s.book)}
                  {s.tank.capacity_liters ? <span className="text-xs text-gray-400"> / {fmtLiters(Number(s.tank.capacity_liters))}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-gray-400">Сүүлийн хэмжилт + хүлээн авсан − хаагдсан ээлжүүдийн борлуулалт</p>
        </section>
      )}

      {(recent ?? []).length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold">Сүүлийн ээлжүүд</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {((recent ?? []) as StationShift[]).map((s) => (
              <li key={s.id}>
                <Link href={`/station/${station.id}/shift/${s.id}`} className="flex justify-between py-2">
                <span className="text-xs text-gray-500">{s.closed_at ? fmtDateTime(s.closed_at) : ""} ›</span>
                <span className="text-right">
                  <b className="tabular-nums">{fmtMoney(Number(s.sales_amount))}</b>
                  {Number(s.difference) !== 0 && (
                    <span className={`block text-xs ${Number(s.difference) < 0 ? "text-brand" : "text-amber-600"}`}>
                      {Number(s.difference) < 0 ? "Дутагдал" : "Илүүдэл"} {fmtMoney(Math.abs(Number(s.difference)))}
                    </span>
                  )}
                </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
