import "server-only";
import { createAdminClient } from "./supabase/admin";
import { normalizeSerial } from "./talon";

export type TalonFilters = {
  type: string; // AA | AB | AC | ""
  status: string; // sold | redeemed | ""
  branch: string;
  customer: string;
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
  customer: { name: string } | null;
  branch: { name: string } | null;
  redeemer: { full_name: string } | null;
};

export function talonQuery(org: string, f: TalonFilters, count = false) {
  let q = createAdminClient()
    .from("talons")
    .select(
      "id, serial, denomination, sold_date, sold_recorded_at, redeemed_date, redeemed_recorded_at, customer:customers(name), branch:units!talons_redeemed_branch_id_fkey(name), redeemer:employees!talons_redeemed_by_fkey(full_name)",
      count ? { count: "exact" } : undefined,
    )
    .eq("organization_id", org);
  if (f.type) q = q.like("serial", `${f.type}%`);
  if (f.serial) q = q.like("serial", `${f.serial}%`);
  if (f.status === "sold") q = q.is("redeemed_date", null);
  if (f.status === "redeemed") q = q.not("redeemed_date", "is", null);
  if (f.branch) q = q.eq("redeemed_branch_id", f.branch);
  if (f.customer) q = q.eq("customer_id", f.customer);
  const col = f.field === "sold" ? "sold_date" : "redeemed_date";
  if (f.from) q = q.gte(col, f.from);
  if (f.to) q = q.lte(col, f.to);
  return q.order(f.field === "sold" ? "sold_recorded_at" : "redeemed_recorded_at", { ascending: false, nullsFirst: false }).order("serial");
}
