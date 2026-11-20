"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeRanges, parseTalonForm, talonDbError } from "@/lib/talon";
import { talonRpc } from "@/lib/talon-db";
import { todayUB } from "@/lib/time";

export type FormState = { ok: boolean; message: string } | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---------------- Харилцагч ----------------
export async function saveCustomer(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaffAdmin();
  if (!s(f, "name")) return { ok: false, message: "Харилцагчийн нэр оруулна уу." };
  const row = {
    organization_id: me.organization_id,
    name: s(f, "name"),
    register: s(f, "register") || null,
    phone: s(f, "phone") || null,
    note: s(f, "note") || null,
    is_active: s(f, "id") ? f.get("is_active") === "on" : true,
  };
  const db = createAdminClient();
  const id = s(f, "id");
  const { error } = id
    ? await db.from("customers").update(row).eq("id", id).eq("organization_id", me.organization_id)
    : await db.from("customers").insert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/talon/customers");
  if (id) redirect("/talon/customers");
  return { ok: true, message: `${row.name} нэмэгдлээ.` };
}

// ---------------- Талон зарах ----------------
export async function sellTalons(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaffAdmin();
  const parsed = parseTalonForm((k) => s(f, k));
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const customer = s(f, "customer_id");
  if (!customer) return { ok: false, message: "Харилцагч сонгоно уу." };
  const soldDate = isDate(s(f, "sold_date")) ? s(f, "sold_date") : todayUB();

  const { data, error } = await talonRpc("sell", parsed.ranges, {
    p_org: me.organization_id,
    p_customer: customer,
    p_sold_date: soldDate,
    p_by: me.id,
  });
  if (error) return { ok: false, message: talonDbError(error) };
  revalidatePath("/talon", "layout");
  return {
    ok: true,
    message: `${data} талон зарагдсанаар бүртгэгдлээ: ${describeRanges(parsed.ranges)}`,
  };
}

// ---------------- Тохиргоо (зөвхөн админ) ----------------
export async function saveTalonSettings(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const raw = s(f, "backdate_days");
  const days = raw === "" ? null : Math.trunc(Number(raw));
  if (days != null && (!Number.isFinite(days) || days < 0 || days > 365))
    return { ok: false, message: "0–365 хоорондох тоо оруулна уу (хоосон бол зөвхөн тухайн өдөр)." };
  const { error } = await createAdminClient()
    .from("talon_settings")
    .upsert({ organization_id: me.organization_id, backdate_days: days, updated_by: me.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/talon", "layout");
  revalidatePath("/station", "layout");
  return {
    ok: true,
    message: days ? `Ажилтнууд ${days} хоног хүртэл нөхөж оруулах боломжтой боллоо.` : "Зөвхөн тухайн өдрөөр оруулна.",
  };
}

// ---------------- Алдаа засах (зөвхөн админ) ----------------
export async function undoTalons(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = parseTalonForm((k) => s(f, k));
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const mode = s(f, "mode") === "sale" ? "sale" : "redeem";
  const { data, error } = await talonRpc("undo", parsed.ranges, {
    p_org: me.organization_id,
    p_mode: mode,
  });
  if (error) return { ok: false, message: talonDbError(error) };
  revalidatePath("/talon", "layout");
  if (!data) return { ok: false, message: "Тохирох бүртгэл олдсонгүй." };
  return {
    ok: true,
    message: mode === "sale" ? `${data} талоны борлуулалтыг устгалаа.` : `${data} талоны оруулалтыг цуцаллаа (дахин оруулах боломжтой).`,
  };
}
