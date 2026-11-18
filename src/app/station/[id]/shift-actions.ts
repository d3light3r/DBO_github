"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEVICE_MESSAGES, deviceState } from "@/lib/device";
import { stationContext } from "@/lib/station-access";
import { loadStationSetup, tankStatuses } from "@/lib/station";
import { round2, round3, shiftTotals, validateReading } from "@/lib/station-calc";
import type { Employee, ShiftReading, StationShift } from "@/lib/types";

export type StationState = { ok: boolean; message: string } | null;

const num = (f: FormData, k: string): number | null => {
  const v = String(f.get(k) ?? "").replace(/[\s,]/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (f: FormData, k: string) => Math.max(0, round2(num(f, k) ?? 0));

/** Станцад хандах эрхтэй (өөрийн станц эсвэл админ/менежер), бүртгэлтэй утаснаас орсон ажилтан */
async function requireStation(f: FormData): Promise<{ emp: Employee; branchId: string } | { error: string }> {
  const { emp, stations } = await stationContext();
  const branchId = String(f.get("station_id") ?? "");
  if (!stations.some((x) => x.id === branchId)) return { error: "Энэ ШТС-д хандах эрхгүй байна." };
  const dev = await deviceState(emp);
  if (dev.kind !== "approved" && dev.kind !== "not_required") return { error: DEVICE_MESSAGES[dev.kind] };
  return { emp, branchId };
}

const stationPath = (id: string) => `/station/${id}`;

// ---------------- Ээлж нээх ----------------
export async function openShift(_prev: StationState, f: FormData): Promise<StationState> {
  const ctx = await requireStation(f);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const { emp, branchId } = ctx;
  const db = createAdminClient();
  const { nozzles } = await loadStationSetup(emp.organization_id, branchId);
  if (nozzles.length === 0) return { ok: false, message: "Энэ станцад хошуу тохируулаагүй байна. Админд хандана уу." };

  const starts: { nozzle_id: string; start_reading: number }[] = [];
  for (const n of nozzles) {
    const v = num(f, `start_${n.id}`);
    if (v == null || v < 0) return { ok: false, message: `${n.name}: эхлэх заалтаа зөв оруулна уу.` };
    starts.push({ nozzle_id: n.id, start_reading: round3(v) });
  }
  const received = num(f, "handover_received");
  if (received == null || received < 0) return { ok: false, message: "Хүлээн авсан бэлэн мөнгөө тоолж оруулна уу." };

  const { data: last } = await db
    .from("station_shifts")
    .select("handover_cash")
    .eq("branch_id", branchId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: shift, error } = await db
    .from("station_shifts")
    .insert({
      organization_id: emp.organization_id,
      branch_id: branchId,
      opened_by: emp.id,
      handover_expected: Number(last?.handover_cash ?? 0),
      handover_received: round2(received),
    })
    .select("id")
    .single();
  if (error || !shift) {
    return { ok: false, message: error?.code === "23505" ? "Энэ станцад нээлттэй ээлж аль хэдийн байна." : "Ээлж нээж чадсангүй." };
  }
  const { error: rErr } = await db.from("shift_readings").insert(starts.map((s) => ({ ...s, shift_id: shift.id })));
  if (rErr) {
    await db.from("station_shifts").delete().eq("id", shift.id);
    return { ok: false, message: "Тоолуурын заалт хадгалж чадсангүй. Дахин оролдоно уу." };
  }
  revalidatePath(stationPath(branchId));
  return { ok: true, message: "Ээлж нээгдлээ. Амжилт!" };
}

// ---------------- Түлш хүлээн авах ----------------
export async function addReceipt(_prev: StationState, f: FormData): Promise<StationState> {
  const ctx = await requireStation(f);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const { emp, branchId } = ctx;
  const db = createAdminClient();
  const tankId = String(f.get("tank_id") ?? "");
  const liters = num(f, "liters");
  if (liters == null || liters <= 0) return { ok: false, message: "Литрээ зөв оруулна уу." };
  const { data: tank } = await db.from("station_tanks").select("id").eq("id", tankId).eq("branch_id", branchId).maybeSingle();
  if (!tank) return { ok: false, message: "Саваа сонгоно уу." };
  const { data: open } = await db.from("station_shifts").select("id").eq("branch_id", branchId).eq("status", "open").maybeSingle();
  const { error } = await db.from("fuel_receipts").insert({
    organization_id: emp.organization_id,
    branch_id: branchId,
    tank_id: tankId,
    shift_id: open?.id ?? null,
    liters: round3(liters),
    doc_no: String(f.get("doc_no") ?? "").trim().slice(0, 100) || null,
    supplier: String(f.get("supplier") ?? "").trim().slice(0, 100) || null,
    received_by: emp.id,
  });
  if (error) return { ok: false, message: "Хадгалж чадсангүй." };
  revalidatePath(stationPath(branchId));
  return { ok: true, message: `${round3(liters)} литр хүлээн авснаа бүртгэлээ.` };
}

// ---------------- Ээлж хаах ----------------
export async function closeShift(_prev: StationState, f: FormData): Promise<StationState> {
  const ctx = await requireStation(f);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const { emp, branchId } = ctx;
  const db = createAdminClient();

  const { data: shiftRow } = await db.from("station_shifts").select("*").eq("branch_id", branchId).eq("status", "open").maybeSingle();
  const shift = shiftRow as StationShift | null;
  if (!shift) return { ok: false, message: "Нээлттэй ээлж алга." };

  const [{ tanks, nozzles }, { data: readingRows }] = await Promise.all([
    loadStationSetup(emp.organization_id, branchId),
    db.from("shift_readings").select("*").eq("shift_id", shift.id),
  ]);
  const readings = (readingRows ?? []) as ShiftReading[];
  const nozzleMap = new Map(nozzles.map((n) => [n.id, n]));

  // Тоолуурын дуусах заалт
  const updates: { id: string; nozzle_id: string; start: number; end: number; price: number }[] = [];
  for (const r of readings) {
    const n = nozzleMap.get(r.nozzle_id);
    const name = n?.name ?? "Хошуу";
    const end = num(f, `end_${r.nozzle_id}`);
    const err = validateReading(Number(r.start_reading), end);
    if (err) return { ok: false, message: `${name}: ${err}.` };
    // Хошуу идэвхгүй болсон бол үнийг шатахууны төрлөөс нь авна, олдохгүй бол 0
    const price = n?.fuel.price ?? 0;
    updates.push({ id: r.id, nozzle_id: r.nozzle_id, start: Number(r.start_reading), end: round3(end!), price });
  }

  const pay = { cash: money(f, "pay_cash"), card: money(f, "pay_card"), coupon: money(f, "pay_coupon"), credit: money(f, "pay_credit") };
  const handover = num(f, "handover_cash");
  if (handover == null || handover < 0) return { ok: false, message: "Дараагийн ээлжид шилжүүлэх бэлэн мөнгөө оруулна уу." };

  // Савны хэмжилт заавал
  const measures: { tank_id: string; liters: number }[] = [];
  for (const t of tanks) {
    const v = num(f, `tank_${t.id}`);
    if (v == null || v < 0) return { ok: false, message: `${t.name} (${t.fuel.name}): савны хэмжилтээ оруулна уу.` };
    measures.push({ tank_id: t.id, liters: round3(v) });
  }

  const totals = shiftTotals(updates, pay);

  // Дансны үлдэгдэл = хаагдсан ээлжүүдээр тооцсон үлдэгдэл − энэ ээлжийн борлуулалт
  const statuses = await tankStatuses(branchId, tanks);
  const soldThisShift = new Map<string, number>();
  for (const u of updates) {
    const tankId = nozzleMap.get(u.nozzle_id)?.tank_id;
    if (tankId) soldThisShift.set(tankId, (soldThisShift.get(tankId) ?? 0) + (u.end - u.start));
  }
  const bookByTank = new Map(statuses.map((s) => [s.tank.id, round3(s.book - (soldThisShift.get(s.tank.id) ?? 0))]));

  // Хэмжилт ба хаалтын цаг ижил байх ёстой: дараагийн тооцоонд энэ ээлжийн борлуулалт
  // хэмжилтийн "дараа" гэж давхар хасагдахгүй (closed_at > measured_at нөхцөл)
  const closedAt = new Date().toISOString();

  // 1) Заалт
  for (const u of updates) {
    const liters = round3(u.end - u.start);
    const { error } = await db
      .from("shift_readings")
      .update({ end_reading: u.end, price: u.price, liters, amount: round2(liters * u.price) })
      .eq("id", u.id);
    if (error) return { ok: false, message: "Заалт хадгалж чадсангүй. Дахин оролдоно уу." };
  }
  // 2) Савны хэмжилт
  const { data: inserted, error: mErr } = await db
    .from("tank_measurements")
    .insert(
      measures.map((m) => ({
        organization_id: emp.organization_id,
        branch_id: branchId,
        tank_id: m.tank_id,
        shift_id: shift.id,
        liters: m.liters,
        book_liters: bookByTank.get(m.tank_id) ?? null,
        measured_by: emp.id,
        measured_at: closedAt,
      })),
    )
    .select("id");
  if (mErr) return { ok: false, message: "Савны хэмжилт хадгалж чадсангүй." };

  // 3) Ээлж хаах (өөр хүн зэрэг хаасан бол цуцална)
  const { data: closed } = await db
    .from("station_shifts")
    .update({
      status: "closed",
      closed_by: emp.id,
      closed_at: closedAt,
      sales_liters: totals.liters,
      sales_amount: totals.amount,
      pay_cash: pay.cash,
      pay_card: pay.card,
      pay_coupon: pay.coupon,
      pay_credit: pay.credit,
      difference: totals.difference,
      handover_cash: round2(handover),
      note: String(f.get("note") ?? "").trim().slice(0, 1000) || null,
    })
    .eq("id", shift.id)
    .eq("status", "open")
    .select("id");
  if (!closed?.length) {
    if (inserted?.length) await db.from("tank_measurements").delete().in("id", inserted.map((x) => x.id));
    return { ok: false, message: "Энэ ээлж аль хэдийн хаагдсан байна." };
  }

  revalidatePath(stationPath(branchId));
  const diff =
    totals.difference === 0
      ? "Зөрүүгүй."
      : totals.difference < 0
        ? `Дутагдал: ${Math.abs(totals.difference).toLocaleString("en-US")}₮.`
        : `Илүүдэл: ${totals.difference.toLocaleString("en-US")}₮.`;
  return { ok: true, message: `Ээлж хаагдлаа. Борлуулалт ${totals.amount.toLocaleString("en-US")}₮ (${totals.liters}л). ${diff}` };
}
