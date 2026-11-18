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
  revalidatePath("/admin/branches");
  if (id) redirect("/admin/branches");
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
  revalidatePath("/admin/schedules");
  if (id) redirect("/admin/schedules");
  return { ok: true, message: "Хадгаллаа." };
}

// ---------------- Хэлтэс ----------------
export async function addDepartment(f: FormData) {
  const me = await requireAdmin();
  const name = s(f, "name");
  if (name) await createAdminClient().from("departments").insert({ organization_id: me.organization_id, name });
  revalidatePath("/admin/employees");
}

// ---------------- Баярын өдөр ----------------
export async function addHoliday(f: FormData) {
  const me = await requireAdmin();
  const date = s(f, "date");
  const name = s(f, "name");
  if (date && name) await createAdminClient().from("holidays").upsert({ organization_id: me.organization_id, date, name }, { onConflict: "organization_id,date" });
  revalidatePath("/admin/schedules");
}

export async function deleteHoliday(f: FormData) {
  const me = await requireAdmin();
  await createAdminClient().from("holidays").delete().eq("id", s(f, "id")).eq("organization_id", me.organization_id);
  revalidatePath("/admin/schedules");
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
