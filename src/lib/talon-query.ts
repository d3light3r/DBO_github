import "server-only";
import { createAdminClient } from "./supabase/admin";
import { fmtSerial, normalizeSerial } from "./talon";

export type TalonFilters = {
  type: string; // AA | AB | AC | ""
  status: string; // sold | redeemed | ""
  branch: string;
  customer: string;
  cq: string; // харилцагчийн нэр эсвэл регистрээр хайх текст
  field: "sold" | "redeemed";
  from: string;
  to: string;
  serial: string;
};

const isDate = (v?: string) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
const isUuid = (v?: string) => /^[0-9a-f-]{36}$/i.test(v ?? "");

export function parseFilters(sp: Record<string, string | undefined>): TalonFilters {
  return {
    type: ["AA", "AB", "AC"].includes(sp.type ?? "") ? sp.type! : "",
    status: ["sold", "redeemed"].includes(sp.status ?? "") ? sp.status! : "",
    branch: isUuid(sp.branch) ? sp.branch! : "",
    customer: isUuid(sp.customer) ? sp.customer! : "",
    // PostgREST-ийн or() шүүлтүүрийг эвдэх тэмдэгтүүдийг хасна
    cq: (sp.cq ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 100),
    field: sp.field === "sold" ? "sold" : "redeemed",
    from: isDate(sp.from) ? sp.from! : "",
    to: isDate(sp.to) ? sp.to! : "",
    serial: normalizeSerial(sp.serial ?? "").replace(/[^A-Z0-9]/g, "").slice(0, 9),
  };
}

export type TalonRow = {
  id: string;
  serial: string;
  denomination: number;
  sold_date: string;
  sold_recorded_at: string;
  redeemed_date: string | null;
  redeemed_recorded_at: string | null;
  customer: { name: string; register: string | null } | null;
  branch: { name: string } | null;
  redeemer: { full_name: string } | null;
};

/** Харилцагчийн хайлтын текстэд (нэр эсвэл регистр) тохирох харилцагчдын id. Хайлтгүй бол null. */
export async function customerIdsFor(org: string, cq: string): Promise<string[] | null> {
  if (!cq) return null;
  const { data } = await createAdminClient()
    .from("customers")
    .select("id")
    .eq("organization_id", org)
    .or(`name.ilike.%${cq}%,register.ilike.%${cq}%`)
    .limit(1000);
  return (data ?? []).map((c) => c.id as string);
}

const FULL_COLUMNS =
  "id, serial, denomination, sold_date, sold_recorded_at, redeemed_date, redeemed_recorded_at, customer:customers(name, register), branch:units!talons_redeemed_branch_id_fkey(name), redeemer:employees!talons_redeemed_by_fkey(full_name)";

export function talonQuery(org: string, f: TalonFilters, count = false, customerIds: string[] | null = null, columns = FULL_COLUMNS) {
  let q = createAdminClient()
    .from("talons")
    .select(columns, count ? { count: "exact" } : undefined)
    .eq("organization_id", org);
  if (f.type) q = q.like("serial", `${f.type}%`);
  if (f.serial) {
    // «2065» → AA/AB/AC0002065; «AB2065» → AB0002065 эсвэл AB2065…-аар эхэлсэн; бүтэн сериал → яг тэр
    const digits = /^\d{1,7}$/.exec(f.serial);
    const typed = /^(A[ABC])(\d{1,7})$/.exec(f.serial);
    if (digits) q = q.like("serial", `${f.type || "A_"}${f.serial.padStart(7, "0")}`);
    else if (typed && typed[2].length < 7) q = q.or(`serial.eq.${fmtSerial(typed[1], Number(typed[2]))},serial.like.${f.serial}*`);
    else q = q.like("serial", `${f.serial}%`);
  }
  if (f.status === "sold") q = q.is("redeemed_date", null);
  if (f.status === "redeemed") q = q.not("redeemed_date", "is", null);
  if (f.branch) q = q.eq("redeemed_branch_id", f.branch);
  if (f.customer) q = q.eq("customer_id", f.customer);
  if (customerIds) q = q.in("customer_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
  const col = f.field === "sold" ? "sold_date" : "redeemed_date";
  if (f.from) q = q.gte(col, f.from);
  if (f.to) q = q.lte(col, f.to);
  return q.order(f.field === "sold" ? "sold_recorded_at" : "redeemed_recorded_at", { ascending: false, nullsFirst: false }).order("serial");
}
