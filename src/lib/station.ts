import "server-only";
import { createAdminClient } from "./supabase/admin";
import { bookBalance } from "./station-calc";
import type { FuelType, Nozzle, Tank } from "./types";

export type NozzleInfo = Nozzle & { tank: Tank; fuel: FuelType };
export type TankInfo = Tank & { fuel: FuelType };

/** Станцын сав, хошуу, шатахууны төрөл (идэвхтэй) */
export async function loadStationSetup(orgId: string, branchId: string) {
  const db = createAdminClient();
  const [fuels, tanks, nozzles] = await Promise.all([
    db.from("fuel_types").select("*").eq("organization_id", orgId),
    db.from("station_tanks").select("*").eq("organization_id", orgId).eq("branch_id", branchId).eq("is_active", true).order("name"),
    db.from("station_nozzles").select("*").eq("organization_id", orgId).eq("branch_id", branchId).eq("is_active", true).order("name"),
  ]);
  const fuelMap = new Map(((fuels.data ?? []) as FuelType[]).map((f) => [f.id, { ...f, price: Number(f.price) }]));
  const tankList: TankInfo[] = ((tanks.data ?? []) as Tank[])
    .filter((t) => fuelMap.has(t.fuel_type_id))
    .map((t) => ({ ...t, fuel: fuelMap.get(t.fuel_type_id)! }));
  const tankMap = new Map(tankList.map((t) => [t.id, t]));
  const nozzleList: NozzleInfo[] = ((nozzles.data ?? []) as Nozzle[])
    .filter((n) => tankMap.has(n.tank_id))
    .map((n) => {
      const tank = tankMap.get(n.tank_id)!;
      return { ...n, tank, fuel: tank.fuel };
    });
  return { tanks: tankList, nozzles: nozzleList };
}

/** Хошуу бүрийн сүүлийн хаагдсан ээлжийн дуусах заалт (дараагийн ээлжийн эхлэх заалт) */
export async function lastReadings(branchId: string): Promise<Map<string, number>> {
  const db = createAdminClient();
  const { data: shifts } = await db
    .from("station_shifts")
    .select("id")
    .eq("branch_id", branchId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(30);
  const order = (shifts ?? []).map((x) => x.id as string);
  if (order.length === 0) return new Map();
  const { data } = await db.from("shift_readings").select("shift_id, nozzle_id, end_reading").in("shift_id", order).not("end_reading", "is", null);
  const rank = new Map(order.map((id, i) => [id, i]));
  const best = new Map<string, { v: number; r: number }>();
  for (const r of data ?? []) {
    const rk = rank.get(r.shift_id)!;
    const prev = best.get(r.nozzle_id);
    if (!prev || rk < prev.r) best.set(r.nozzle_id, { v: Number(r.end_reading), r: rk });
  }
  return new Map([...best].map(([k, v]) => [k, v.v]));
}

export type TankStatus = {
  tank: TankInfo;
  lastMeasured: { liters: number; at: string } | null;
  book: number; // дансны үлдэгдэл одоогийн байдлаар
};

/** Сав бүрийн дансны үлдэгдэл: сүүлийн хэмжилт + түүнээс хойш хүлээн авсан − борлуулсан */
export async function tankStatuses(branchId: string, tanks: TankInfo[]): Promise<TankStatus[]> {
  if (tanks.length === 0) return [];
  const db = createAdminClient();
  const ids = tanks.map((t) => t.id);
  // Сав бүрийн сүүлийн хэмжилт
  const lastMeas = new Map<string, { liters: number; at: string }>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await db.from("tank_measurements").select("liters, measured_at").eq("tank_id", id).order("measured_at", { ascending: false }).limit(1).maybeSingle();
      if (data) lastMeas.set(id, { liters: Number(data.liters), at: data.measured_at });
    }),
  );
  // Бүх сав хэмжигдсэн бол хамгийн эртний хэмжилтээс хойших өгөгдлийг л татна
  const minSince = ids.every((id) => lastMeas.has(id)) ? [...lastMeas.values()].map((m) => m.at).sort()[0] : null;
  let recQ = db.from("fuel_receipts").select("tank_id, liters, received_at").in("tank_id", ids);
  let soldQ = db
    .from("shift_readings")
    .select("liters, nozzle:station_nozzles!inner(tank_id), shift:station_shifts!inner(branch_id, status, closed_at)")
    .eq("shift.branch_id", branchId)
    .eq("shift.status", "closed")
    .not("liters", "is", null);
  if (minSince) {
    recQ = recQ.gt("received_at", minSince);
    soldQ = soldQ.gt("shift.closed_at", minSince);
  }
  const [recs, sold] = await Promise.all([recQ, soldQ]);

  return tanks.map((tank) => {
    const lm = lastMeas.get(tank.id) ?? null;
    const since = lm?.at ?? "";
    const received = (recs.data ?? [])
      .filter((r) => r.tank_id === tank.id && r.received_at > since)
      .reduce((a, r) => a + Number(r.liters), 0);
    const soldLiters = ((sold.data ?? []) as unknown as { liters: number; nozzle: { tank_id: string }; shift: { closed_at: string } }[])
      .filter((r) => r.nozzle.tank_id === tank.id && r.shift.closed_at > since)
      .reduce((a, r) => a + Number(r.liters), 0);
    return { tank, lastMeasured: lm, book: bookBalance(lm?.liters ?? 0, received, soldLiters) };
  });
}
