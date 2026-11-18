"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

export type FormState = { ok: boolean; message: string } | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = s(f, k);
  return v === "" ? null : Number(v);
};

// ---------------- Салбар ----------------
export async function saveBranch(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const lat = n(f, "latitude");
  const lng = n(f, "longitude");
  if (!s(f, "name") || lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng))
    return { ok: false, message: "Нэр, өргөрөг, уртрагаа зөв оруулна уу." };
  const row = {
    organization_id: me.organization_id,
    name: s(f, "name"),
    latitude: lat,
    longitude: lng,
    radius_meters: n(f, "radius_meters") ?? 100,
    allowed_ips: s(f, "allowed_ips").split(/[\s,]+/).filter(Boolean),
    is_active: f.get("is_active") === "on",
  };
  const db = createAdminClient();
  const id = s(f, "id");
  const { error } = id
    ? await db.from("branches").update(row).eq("id", id).eq("organization_id", me.organization_id)
    : await db.from("branches").insert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings/branches");
  if (id) redirect("/admin/settings/branches");
  return { ok: true, message: "Хадгаллаа." };
}

// ---------------- Хуваарь ----------------
export async function saveSchedule(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const kind = s(f, "kind") === "cycle" ? "cycle" : "fixed";
  if (!s(f, "name")) return { ok: false, message: "Нэр оруулна уу." };
  const row = {
    organization_id: me.organization_id,
    name: s(f, "name"),
    kind,
    start_time: s(f, "start_time") || "09:00",
    end_time: s(f, "end_time") || "18:00",
    break_minutes: n(f, "break_minutes") ?? 0,
    late_grace_minutes: n(f, "late_grace_minutes") ?? 0,
    work_weekdays: f.getAll("work_weekdays").map(Number),
    cycle_length_days: kind === "cycle" ? n(f, "cycle_length_days") : null,
    work_days_in_cycle: kind === "cycle" ? n(f, "work_days_in_cycle") : null,
    shift_hours: kind === "cycle" ? n(f, "shift_hours") : null,
  };
  if (kind === "cycle" && (!row.cycle_length_days || !row.work_days_in_cycle || !row.shift_hours))
    return { ok: false, message: "Ээлжийн мөчлөг, ажлын өдөр, ээлжийн цагийг бөглөнө үү." };
  const db = createAdminClient();
  const id = s(f, "id");
  const { error } = id
    ? await db.from("schedules").update(row).eq("id", id).eq("organization_id", me.organization_id)
    : await db.from("schedules").insert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings/schedules");
  if (id) redirect("/admin/settings/schedules");
  return { ok: true, message: "Хадгаллаа." };
}

// ---------------- Хэлтэс ----------------
export async function addDepartment(f: FormData) {
  const me = await requireAdmin();
  const name = s(f, "name");
  if (name) await createAdminClient().from("departments").insert({ organization_id: me.organization_id, name });
  revalidatePath("/admin/settings/departments");
}

export async function renameDepartment(f: FormData) {
  const me = await requireAdmin();
  const name = s(f, "name");
  if (name) await createAdminClient().from("departments").update({ name }).eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/departments");
}

export async function deleteDepartment(f: FormData) {
  const me = await requireAdmin();
  // Ажилтнуудын хэлтэс хоосон болно (on delete set null)
  await createAdminClient().from("departments").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/departments");
  revalidatePath("/admin/employees");
}

// ---------------- Салбар, хуваарь устгах ----------------
export async function deleteBranch(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("branches").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/branches");
  redirect("/admin/settings/branches");
}

export async function deleteSchedule(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("schedules").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/schedules");
  redirect("/admin/settings/schedules");
}

// ---------------- Баярын өдөр ----------------
export async function addHoliday(f: FormData) {
  const me = await requireAdmin();
  const date = s(f, "date");
  const name = s(f, "name");
  if (date && name) await createAdminClient().from("holidays").upsert({ organization_id: me.organization_id, date, name }, { onConflict: "organization_id,date" });
  revalidatePath("/admin/settings/holidays");
}

export async function deleteHoliday(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("holidays").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/holidays");
}

// ---------------- Ажилтан ----------------
export async function saveEmployee(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = s(f, "id");
  const phone = normalizePhone(s(f, "phone"));
  const password = s(f, "password");
  if (!s(f, "full_name") || !s(f, "emp_code") || phone.length < 8)
    return { ok: false, message: "Нэр, код, утасны дугаараа зөв оруулна уу." };
  const role = ["admin", "manager", "employee"].includes(s(f, "role")) ? s(f, "role") : "employee";
  if (id === me.id && role !== "admin") return { ok: false, message: "Өөрийнхөө админ эрхийг хасах боломжгүй." };

  const row = {
    organization_id: me.organization_id,
    emp_code: s(f, "emp_code"),
    full_name: s(f, "full_name"),
    phone,
    role,
    department_id: s(f, "department_id") || null,
    branch_id: s(f, "branch_id") || null,
    schedule_id: s(f, "schedule_id") || null,
    cycle_anchor_date: s(f, "cycle_anchor_date") || null,
    allow_trip: f.get("allow_trip") === "on",
    is_active: id ? f.get("is_active") === "on" : true,
  };

  // Хэлтэс, салбар, хуваарь нь заавал өөрийн байгууллагынх байх ёстой
  const refs = [
    ["departments", row.department_id],
    ["branches", row.branch_id],
    ["schedules", row.schedule_id],
  ] as const;
  for (const [table, refId] of refs) {
    if (!refId) continue;
    const { data: ok } = await db.from(table).select("id").eq("id", refId).eq("organization_id", me.organization_id).maybeSingle();
    if (!ok) return { ok: false, message: "Сонгосон хэлтэс, салбар эсвэл хуваарь буруу байна." };
  }

  if (password && password.length < 8) return { ok: false, message: "Нууц үг хамгийн багадаа 8 тэмдэгт." };

  if (!id) {
    if (!password) return { ok: false, message: "Анхны нууц үг оруулна уу." };
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email: phoneToEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { full_name: row.full_name },
    });
    if (authErr || !created.user)
      return { ok: false, message: authErr?.message.includes("already") ? "Энэ утасны дугаар бүртгэлтэй байна." : "Хэрэглэгч үүсгэж чадсангүй." };
    const { error } = await db.from("employees").insert({ ...row, user_id: created.user.id });
    if (error) {
      await db.auth.admin.deleteUser(created.user.id);
      return { ok: false, message: error.message.includes("duplicate") ? "Код эсвэл утас давхардсан байна." : error.message };
    }
    revalidatePath("/admin/employees");
    return { ok: true, message: `${row.full_name} нэмэгдлээ. Нэвтрэх: ${phone} / таны оруулсан нууц үг.` };
  }

  const { data: existing } = await db.from("employees").select("user_id, phone").eq("id", id).eq("organization_id", me.organization_id).maybeSingle();
  if (!existing) return { ok: false, message: "Ажилтан олдсонгүй." };
  if (existing.user_id && (existing.phone !== phone || password)) {
    const { error: authErr } = await db.auth.admin.updateUserById(existing.user_id, {
      ...(existing.phone !== phone ? { email: phoneToEmail(phone), email_confirm: true } : {}),
      ...(password ? { password } : {}),
    });
    if (authErr) return { ok: false, message: "Нэвтрэх мэдээллийг шинэчилж чадсангүй." };
  }
  const { error } = await db.from("employees").update(row).eq("id", id).eq("organization_id", me.organization_id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

// ---------------- Хүсэлт батлах ----------------
export async function reviewRequest(f: FormData) {
  const me = await requireStaffAdmin();
  const decision = s(f, "decision") === "approved" ? "approved" : "rejected";
  await createAdminClient()
    .from("requests")
    .update({ status: decision, reviewed_by: me.id, reviewed_at: new Date().toISOString(), review_note: s(f, "review_note").slice(0, 1000) || null })
    .eq("id", s(f, "id"))
    .eq("organization_id", me.organization_id)
    .eq("status", "pending")
    .neq("employee_id", me.id); // өөрийнхөө хүсэлтийг өөрөө батлахгүй
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

// ---------------- Томилолтын ирц батлах ----------------
export async function reviewAttendance(f: FormData) {
  const me = await requireStaffAdmin();
  const decision = s(f, "decision") === "approved" ? "approved" : "rejected";
  await createAdminClient()
    .from("attendance_logs")
    .update({ review_status: decision, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", s(f, "id"))
    .eq("organization_id", me.organization_id)
    .eq("review_status", "pending")
    .neq("employee_id", me.id); // өөрийнхөө томилолтыг өөрөө батлахгүй
  revalidatePath("/admin/attendance");
}


// ---------------- Нэмэлт ажлын өдөр ----------------
export async function addWorkDay(f: FormData) {
  const me = await requireAdmin();
  const date = s(f, "date");
  const name = s(f, "name");
  if (date && name)
    await createAdminClient().from("work_days").upsert({ organization_id: me.organization_id, date, name }, { onConflict: "organization_id,date" });
  revalidatePath("/admin/settings/workdays");
}

export async function deleteWorkDay(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("work_days").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/workdays");
}

// ---------------- Утас бүртгэл ----------------
export async function approveDevice(f: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const { data: dev } = await db
    .from("devices")
    .select("id, employee_id")
    .eq("id", s(f, "id"))
    .eq("organization_id", me.organization_id)
    .eq("status", "pending")
    .maybeSingle();
  if (!dev) return;
  // Нэг ажилтан нэг утастай: өмнөх батлагдсан утсыг цуцална
  await db.from("devices").delete().eq("employee_id", dev.employee_id).eq("status", "approved");
  await db
    .from("devices")
    .update({ status: "approved", approved_by: me.id, approved_at: new Date().toISOString() })
    .eq("id", dev.id);
  revalidatePath("/admin/settings/devices");
}

/** Хүсэлтээс татгалзах эсвэл батлагдсан утсыг цуцлах (утсыг дахин бүртгүүлэх боломжтой болно) */
export async function removeDevice(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("devices").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/settings/devices");
}

export async function setRequireDevice(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient()
    .from("organizations")
    .update({ require_device: f.get("require_device") === "on" })
    .eq("id", me.organization_id);
  revalidatePath("/admin/settings/devices");
}

// ---------------- ШТС тохиргоо ----------------
const STATION_PATH = "/admin/settings/station";
const numOrNull = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[\s,]/g, "");
  if (v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export async function setStationBranch(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient()
    .from("branches")
    .update({ is_station: f.get("is_station") === "on" })
    .eq("id", s(f, "id"))
    .eq("organization_id", me.organization_id);
  revalidatePath(STATION_PATH);
}

export async function saveFuelType(f: FormData) {
  const me = await requireAdmin();
  const name = s(f, "name");
  const price = numOrNull(f, "price");
  if (!name || price == null || price < 0) return;
  const db = createAdminClient();
  const id = s(f, "id");
  const row = { name, price, is_active: id ? f.get("is_active") === "on" : true };
  if (id) await db.from("fuel_types").update(row).eq("id", id).eq("organization_id", me.organization_id);
  else await db.from("fuel_types").insert({ ...row, organization_id: me.organization_id });
  revalidatePath(STATION_PATH);
}

/** Сав, хошуу нь ээлжийн түүхэнд холбогдсон тул устгахгүй, идэвхгүй болгоно */
async function stationBranchOf(orgId: string, branchId: string) {
  const { data } = await createAdminClient().from("branches").select("id").eq("id", branchId).eq("organization_id", orgId).eq("is_station", true).maybeSingle();
  return !!data;
}

export async function saveTank(f: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = s(f, "id");
  const name = s(f, "name");
  const fuelId = s(f, "fuel_type_id");
  if (!name || !fuelId) return;
  const { data: fuel } = await db.from("fuel_types").select("id").eq("id", fuelId).eq("organization_id", me.organization_id).maybeSingle();
  if (!fuel) return;
  const row = { name, fuel_type_id: fuelId, capacity_liters: numOrNull(f, "capacity_liters"), is_active: id ? f.get("is_active") === "on" : true };
  if (id) {
    await db.from("station_tanks").update(row).eq("id", id).eq("organization_id", me.organization_id);
  } else {
    const branchId = s(f, "branch_id");
    if (!(await stationBranchOf(me.organization_id, branchId))) return;
    await db.from("station_tanks").insert({ ...row, organization_id: me.organization_id, branch_id: branchId });
  }
  revalidatePath(STATION_PATH);
}

export async function saveNozzle(f: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = s(f, "id");
  const name = s(f, "name");
  const tankId = s(f, "tank_id");
  if (!name || !tankId) return;
  const { data: tank } = await db.from("station_tanks").select("id, branch_id").eq("id", tankId).eq("organization_id", me.organization_id).maybeSingle();
  if (!tank) return;
  const row = { name, tank_id: tankId, is_active: id ? f.get("is_active") === "on" : true };
  if (id) await db.from("station_nozzles").update(row).eq("id", id).eq("organization_id", me.organization_id).eq("branch_id", tank.branch_id);
  else await db.from("station_nozzles").insert({ ...row, organization_id: me.organization_id, branch_id: tank.branch_id });
  revalidatePath(STATION_PATH);
}
