import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentEmployee } from "./auth";
import { createAdminClient } from "./supabase/admin";
import type { Branch, Employee } from "./types";

export type Station = Branch & { is_station: true };

/**
 * ШТС апп-д хандах эрх:
 * - Админ, менежер: байгууллагын бүх станц
 * - Ажилтан: зөвхөн өөрийн оноогдсон станц
 */
export const stationContext = cache(async () => {
  const emp = await getCurrentEmployee();
  const isStaffAdmin = emp.role === "admin" || emp.role === "manager";
  let q = createAdminClient().from("branches").select("*").eq("organization_id", emp.organization_id).eq("is_station", true).order("name");
  if (!isStaffAdmin) q = q.eq("id", emp.branch_id ?? "00000000-0000-0000-0000-000000000000");
  const { data } = await q;
  return { emp, isStaffAdmin, isAdmin: emp.role === "admin", stations: (data ?? []) as Station[] };
});

/** Тухайн станцад хандах эрхтэй эсэх (эрхгүй бол 404) */
export async function requireStationPage(stationId: string): Promise<{ emp: Employee; station: Station; isAdmin: boolean; isStaffAdmin: boolean }> {
  const ctx = await stationContext();
  const station = ctx.stations.find((s) => s.id === stationId);
  if (!station) notFound();
  return { emp: ctx.emp, station, isAdmin: ctx.isAdmin, isStaffAdmin: ctx.isStaffAdmin };
}

/** Ажилтны апп болон удирдлагад ШТС апп-ын холбоос харуулах эсэх */
export async function canUseStationApp(emp: Pick<Employee, "role" | "branch_id">): Promise<boolean> {
  if (emp.role === "admin" || emp.role === "manager") return true;
  if (!emp.branch_id) return false;
  const { data } = await createAdminClient().from("branches").select("is_station").eq("id", emp.branch_id).maybeSingle();
  return !!data?.is_station;
}
