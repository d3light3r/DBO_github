"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeRanges, parseTalonForm, talonDbError } from "@/lib/talon";
import { talonRpc } from "@/lib/talon-db";
import { todayUB } from "@/lib/time";
import { MAX_IMPORT, nameKey, parseCustomerPaste, registerKey } from "@/lib/customer-import";
import { customerMatcher, MAX_TALON_IMPORT, newCustomerKey, parseTalonPaste, type CustomerRef } from "@/lib/talon-import";

export type FormState = { ok: boolean; message: string } | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---------------- Харилцагч ----------------
export async function saveCustomer(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaffAdmin();
  if (!s(f, "name") && !s(f, "register")) return { ok: false, message: "Нэр эсвэл регистрийн аль нэгийг оруулна уу." };
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
  return { ok: true, message: `${row.name || row.register} нэмэгдлээ.` };
}

// ---------------- Давхардсан харилцагчдыг нэгтгэх ----------------
// Сонгосон харилцагчдын талоныг «үлдэх» харилцагч руу шилжүүлж, бусдыг устгана.
export async function mergeCustomers(f: FormData): Promise<void> {
  const me = await requireStaffAdmin();
  const target = s(f, "target");
  const ids = [...new Set(f.getAll("ids").map(String))];
  if (!target || !ids.includes(target)) redirect("/talon/customers?merge=err");
  const sources = ids.filter((x) => x !== target);
  if (!sources.length) redirect("/talon/customers?merge=err");

  const db = createAdminClient();
  const { data: list } = await db.from("customers").select("*").eq("organization_id", me.organization_id).in("id", ids);
  if (!list || list.length !== ids.length) redirect("/talon/customers?merge=err");
  const keep = list.find((c) => c.id === target)!;

  // 1) Талоныг шилжүүлнэ (алдаа гарвал юу ч устгахгүй)
  const { error, count } = await db.from("talons").update({ customer_id: target }, { count: "exact" })
    .eq("organization_id", me.organization_id).in("customer_id", sources);
  if (error) redirect(`/talon/customers?merge=err`);

  // 2) Бусдыг устгана
  await db.from("customers").delete().eq("organization_id", me.organization_id).in("id", sources);

  // 3) Үлдэх харилцагчийн хоосон талбарыг бусдаас нөхнө
  const pick = (k: "register" | "phone" | "note") => keep[k] || list.find((c) => c[k])?.[k] || null;
  await db.from("customers").update({ register: pick("register"), phone: pick("phone"), note: pick("note") }).eq("id", target);

  revalidatePath("/talon", "layout");
  redirect(`/talon/customers?merge=${sources.length}-${count ?? 0}`);
}

// ---------------- Харилцагч импортлох (Excel-ээс хуулж буулгах) ----------------
export async function importCustomers(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaffAdmin();
  // Алдаатай (регистр/нэр олдоогүй) мөрийг алгасаж, зөвийг нь импортлоно
  const { rows, errors } = parseCustomerPaste(String(f.get("data") ?? ""));
  if (!rows.length) return { ok: false, message: "Импортлох мөр алга. Мөр бүрт нэр эсвэл регистр байх ёстой." };
  if (rows.length > MAX_IMPORT) return { ok: false, message: `Нэг удаад ${MAX_IMPORT} хүртэл мөр импортлоно.` };

  // Системд аль хэдийн байгаа харилцагчийг алгасна: ижил регистр, эсвэл ижил нэр (аль нэг нь регистргүй бол)
  const db = createAdminClient();
  const regKeys = new Set<string>();
  const names = new Map<string, boolean>(); // nameKey -> регистртэй эсэх
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.from("customers").select("name, register").eq("organization_id", me.organization_id).order("id").range(off, off + 999);
    if (error) return { ok: false, message: error.message };
    for (const c of data ?? []) {
      if (c.register) regKeys.add(registerKey(c.register));
      const k = nameKey(c.name ?? "");
      if (k) names.set(k, (names.get(k) ?? false) || !!c.register);
    }
    if (!data || data.length < 1000) break;
  }
  const fresh = rows.filter((r) => {
    if (r.register && regKeys.has(registerKey(r.register))) return false;
    const k = nameKey(r.name);
    if (k && names.has(k) && (!r.register || !names.get(k))) return false;
    return true;
  });
  if (fresh.length) {
    const { error } = await db.from("customers").insert(
      fresh.map((r) => ({ organization_id: me.organization_id, name: r.name, register: r.register, phone: r.phone, note: r.note })),
    );
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath("/talon", "layout");
  const skipped = rows.length - fresh.length;
  return {
    ok: true,
    message: `${fresh.length} харилцагч нэмэгдлээ.${skipped ? ` ${skipped} нь аль хэдийн бүртгэлтэй (регистр эсвэл нэрээр) тул алгаслаа.` : ""}${errors.length ? ` ${errors.length} алдаатай мөр алгасагдлаа.` : ""}`,
  };
}

// ---------------- Зарагдсан талон импортлох (Excel-ээс хуулж буулгах) ----------------
export async function importTalons(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaffAdmin();
  const org = me.organization_id;
  const today = todayUB();
  const defaultDate = isDate(s(f, "sold_date")) ? s(f, "sold_date") : today;
  const createMissing = f.get("create_missing") === "on";
  const { rows, errors, duplicates, removed } = parseTalonPaste(String(f.get("data") ?? ""));

  // Мөнгөн бүртгэл тул алдаатай, давхар мөртэй бол юу ч оруулахгүй
  if (errors.length) return { ok: false, message: `Алдаатай ${errors.length} мөр байна (${errors.slice(0, 5).map((e) => `${e.line}-р мөр`).join(", ")}${errors.length > 5 ? " ..." : ""}). Засаад дахин буулгана уу.` };
  if (duplicates.length) return { ok: false, message: `Нэг сериал өөр харилцагч/огноотой давхар орсон ${duplicates.length} мөр байна (${duplicates.slice(0, 5).map((d) => `${d.line}-р мөр ${d.serial}`).join(", ")}). Засаад дахин буулгана уу.` };
  if (!rows.length) return { ok: false, message: "Импортлох мөр алга." };
  if (rows.length > MAX_TALON_IMPORT) return { ok: false, message: `Нэг удаад ${MAX_TALON_IMPORT} хүртэл талон импортлоно.` };
  const future = rows.find((r) => (r.date ?? defaultDate) > today);
  if (future) return { ok: false, message: `${future.line}-р мөр: ирээдүйн огноогоор бүртгэх боломжгүй.` };

  const db = createAdminClient();
  // Харилцагчдыг таних
  const customers: CustomerRef[] = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db.from("customers").select("id, name, register").eq("organization_id", org).order("id").range(off, off + 999);
    if (error) return { ok: false, message: error.message };
    customers.push(...((data ?? []) as CustomerRef[]));
    if (!data || data.length < 1000) break;
  }
  const find = customerMatcher(customers);
  const missing = new Map<string, { name: string; register: string | null }>();
  for (const r of rows) {
    if (!find(r.customerName, r.customerRegister)) missing.set(newCustomerKey(r.customerName, r.customerRegister), { name: r.customerName, register: r.customerRegister });
  }

  // Системд аль хэдийн байгаа сериал
  const serials = rows.map((r) => r.serial);
  const taken: string[] = [];
  // Cloudflare-ийн нэг хүсэлтэд дуудах тооны хязгаараас болж том багцаар шалгана
  for (let i = 0; i < serials.length; i += 800) {
    const { data, error } = await db.from("talons").select("serial").eq("organization_id", org).in("serial", serials.slice(i, i + 800));
    if (error) return { ok: false, message: error.message };
    taken.push(...(data ?? []).map((t) => t.serial as string));
  }
  if (taken.length) return { ok: false, message: `${taken.length} талон аль хэдийн зарагдсан бүртгэлтэй: ${taken.sort().slice(0, 10).join(", ")}${taken.length > 10 ? " ..." : ""}. Тэдгээр мөрийг хасаад дахин оруулна уу.` };

  if (missing.size) {
    if (!createMissing) {
      const names = [...missing.values()].map((m) => m.name || m.register);
      return { ok: false, message: `${missing.size} харилцагч бүртгэлгүй байна: ${names.slice(0, 10).join(", ")}${names.length > 10 ? " ..." : ""}. «Олдоогүй харилцагчийг шинээр үүсгэх»-ийг чагтлах эсвэл эхлээд Харилцагч хэсэгт нэмнэ үү.` };
    }
    const { data, error } = await db
      .from("customers")
      .insert([...missing.values()].map((m) => ({ organization_id: org, name: m.name, register: m.register })))
      .select("id, name, register");
    if (error) return { ok: false, message: error.message };
    customers.push(...((data ?? []) as CustomerRef[]));
  }
  const find2 = customerMatcher(customers);

  // Бүгдийг нэг хүсэлтээр: аль нэг нь алдаатай бол бүгд буцна
  const { error } = await db.from("talons").insert(
    rows.map((r) => ({ organization_id: org, serial: r.serial, customer_id: find2(r.customerName, r.customerRegister)!.id, sold_date: r.date ?? defaultDate, sold_by: me.id })),
  );
  if (error) return { ok: false, message: error.message.includes("duplicate") ? "Зарим сериал энэ хооронд бүртгэгдсэн байна. Дахин оролдоно уу." : error.message };

  revalidatePath("/talon", "layout");
  const total = rows.reduce((t, r) => t + r.amount, 0);
  return {
    ok: true,
    message: `${rows.length} талон зарагдсанаар бүртгэгдлээ, нийт ${new Intl.NumberFormat("en-US").format(total)}₮.${missing.size ? ` ${missing.size} шинэ харилцагч үүсгэлээ.` : ""}${removed.length ? ` ${removed.length} яг ижил давхар мөрийг хассан.` : ""}`,
  };
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

// ---------------- ШТС-д талон импорт түр нээх/хаах (зөвхөн админ) ----------------
export async function setStationImport(f: FormData) {
  const me = await requireAdmin();
  const on = f.get("on") === "1";
  const { error } = await createAdminClient()
    .from("talon_settings")
    .upsert({ organization_id: me.organization_id, station_import: on, updated_by: me.id, updated_at: new Date().toISOString() });
  if (error) throw new Error(/station_import/.test(error.message) ? "Supabase дээр 0008_talon_station_import.sql-ийг ажиллуулна уу." : error.message);
  revalidatePath("/talon", "layout");
  revalidatePath("/station", "layout");
}
