"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[\s,]/g, "");
  if (v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** Станц (ШТС салбар) нь энэ байгууллагынх эсэх */
async function ownStation(orgId: string, id: string) {
  const { data } = await createAdminClient().from("units").select("id").eq("id", id).eq("organization_id", orgId).eq("is_station", true).maybeSingle();
  return !!data;
}

// ---------------- Шатахууны төрөл, үнэ (бүх станцад нийтлэг) ----------------
export async function saveFuelType(f: FormData) {
  const me = await requireAdmin();
  const name = s(f, "name");
  const price = num(f, "price");
  if (!name || price == null || price < 0) return;
  const db = createAdminClient();
  const id = s(f, "id");
  const row = { name, price, is_active: id ? f.get("is_active") === "on" : true };
  if (id) await db.from("fuel_types").update(row).eq("id", id).eq("organization_id", me.organization_id);
  else await db.from("fuel_types").insert({ ...row, organization_id: me.organization_id });
  revalidatePath("/station", "layout");
}

// ---------------- Сав, хошуу (ээлжийн түүхэнд холбогдсон тул устгахгүй, идэвхгүй болгоно) ----------------
export async function saveTank(f: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const stationId = s(f, "station_id");
  if (!(await ownStation(me.organization_id, stationId))) return;
  const id = s(f, "id");
  const name = s(f, "name");
  const fuelId = s(f, "fuel_type_id");
  if (!name || !fuelId) return;
  const { data: fuel } = await db.from("fuel_types").select("id").eq("id", fuelId).eq("organization_id", me.organization_id).maybeSingle();
  if (!fuel) return;
  const row = { name, fuel_type_id: fuelId, capacity_liters: num(f, "capacity_liters"), is_active: id ? f.get("is_active") === "on" : true };
  if (id) await db.from("station_tanks").update(row).eq("id", id).eq("branch_id", stationId);
  else await db.from("station_tanks").insert({ ...row, organization_id: me.organization_id, branch_id: stationId });
  revalidatePath(`/station/${stationId}`, "layout");
}

export async function saveNozzle(f: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const stationId = s(f, "station_id");
  if (!(await ownStation(me.organization_id, stationId))) return;
  const id = s(f, "id");
  const name = s(f, "name");
  const tankId = s(f, "tank_id");
  if (!name || !tankId) return;
  const { data: tank } = await db.from("station_tanks").select("id").eq("id", tankId).eq("branch_id", stationId).maybeSingle();
  if (!tank) return;
  const row = { name, tank_id: tankId, is_active: id ? f.get("is_active") === "on" : true };
  if (id) await db.from("station_nozzles").update(row).eq("id", id).eq("branch_id", stationId);
  else await db.from("station_nozzles").insert({ ...row, organization_id: me.organization_id, branch_id: stationId });
  revalidatePath(`/station/${stationId}`, "layout");
}
