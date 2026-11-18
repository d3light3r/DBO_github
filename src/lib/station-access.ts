import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentEmployee } from "./auth";
import { createAdminClient } from "./supabase/admin";
import type { Employee, Unit } from "./types";

/** ШТС = "ШТС" гэж тэмдэглэсэн салбар (units) */
export type Station = Unit & { department_name: string; company_name: string };

/**
 * ШТС апп-д хандах эрх:
 * - Админ, менежер: байгууллагын бүх станц
 * - Ажилтан: зөвхөн өөрийн салбар (ШТС бол)
 */
export const stationContext = cache(async () => {
  const emp = await getCurrentEmployee();
  const isStaffAdmin = emp.role === "admin" || emp.role === "manager";
  let q = createAdminClient()
    .from("units")
    .select("*, department:departments(name, company:companies(name))")
    .eq("organization_id", emp.organization_id)
    .eq("is_station", true)
    .order("name");
  if (!isStaffAdmin) q = q.eq("id", emp.unit_id ?? "00000000-0000-0000-0000-000000000000").eq("is_active", true);
  const { data } = await q;
  type Row = Unit & { department: { name: string; company: { name: string } | null } | null };
  const stations: Station[] = ((data ?? []) as unknown as Row[]).map(({ department, ...u }) => ({
    ...u,
    department_name: department?.name ?? "",
    company_name: department?.company?.name ?? "",
  }));
  return { emp, isStaffAdmin, isAdmin: emp.role === "admin", stations };
});

/** Тухайн станцад хандах эрхтэй эсэх (эрхгүй бол 404) */
export async function requireStationPage(stationId: string): Promise<{ emp: Employee; station: Station; isAdmin: boolean; isStaffAdmin: boolean }> {
  const ctx = await stationContext();
  const station = ctx.stations.find((s) => s.id === stationId);
  if (!station) notFound();
  return { emp: ctx.emp, station, isAdmin: ctx.isAdmin, isStaffAdmin: ctx.isStaffAdmin };
}

/** Ажилтны апп болон удирдлагад ШТС апп-ын холбоос харуулах эсэх */
export async function canUseStationApp(emp: Pick<Employee, "role" | "unit_id">): Promise<boolean> {
  if (emp.role === "admin" || emp.role === "manager") return true;
  if (!emp.unit_id) return false;
  const { data } = await createAdminClient().from("units").select("is_station, is_active").eq("id", emp.unit_id).maybeSingle();
  return !!data?.is_station && !!data.is_active;
}
