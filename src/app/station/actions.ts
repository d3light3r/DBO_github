"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { ok: boolean; message: string } | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[\s,]/g, "");
  if (v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/** Станц нь энэ байгууллагынх эсэх */
async function ownStation(orgId: string, id: string) {
  const { data } = await createAdminClient().from("branches").select("id").eq("id", id).eq("organization_id", orgId).eq("is_station", true).maybeSingle();
  return !!data;
}

// ---------------- Станц (нэр, ирц бүртгэх байршил) ----------------
export async function saveStation(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const name = s(f, "name");
  const lat = num(f, "latitude");
  const lng = num(f, "longitude");
  const radius = num(f, "radius_meters") ?? 100;
  if (!name) return { ok: false, message: "Станцын нэрээ оруулна уу." };
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return { ok: false, message: "Байршлаа оруулна уу («📍 Одоогийн байршлаа авах» товч дарж болно)." };
  if (radius < 20 || radius > 2000) return { ok: false, message: "Радиус 20–2000 метр байна." };
  const row = { name, latitude: lat, longitude: lng, radius_meters: Math.round(radius) };
  const db = createAdminClient();
  const id = s(f, "id");
  if (id) {
    if (!(await ownStation(me.organization_id, id))) return { ok: false, message: "Станц олдсонгүй." };
    const { error } = await db.from("branches").update({ ...row, is_active: f.get("is_active") === "on" }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath(`/station/${id}`, "layout");
    revalidatePath("/station");
    return { ok: true, message: "Хадгаллаа." };
  }
  const { data, error } = await db
    .from("branches")
    .insert({ ...row, organization_id: me.organization_id, is_station: true, is_active: true, allowed_ips: [] })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "Үүсгэж чадсангүй." };
  revalidatePath("/station");
  redirect(`/station/${data.id}/settings`);
}

// ---------------- Ажилтан оноох ----------------
export async function assignStaff(f: FormData) {
  const me = await requireAdmin();
  const stationId = s(f, "station_id");
  if (!(await ownStation(me.organization_id, stationId))) return;
  await createAdminClient().from("employees").update({ branch_id: stationId }).eq("id", s(f, "employee_id")).eq("organization_id", me.organization_id);
  revalidatePath(`/station/${stationId}/settings`);
  revalidatePath("/station");
}

export async function unassignStaff(f: FormData) {
  const me = await requireAdmin();
  const stationId = s(f, "station_id");
  await createAdminClient()
    .from("employees")
    .update({ branch_id: null })
    .eq("id", s(f, "employee_id"))
    .eq("organization_id", me.organization_id)
    .eq("branch_id", stationId);
  revalidatePath(`/station/${stationId}/settings`);
  revalidatePath("/station");
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
