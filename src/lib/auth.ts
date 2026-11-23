import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { Employee } from "./types";
import { can, canTalonApp, type Perm } from "./permissions";

/** Нэвтэрсэн ажилтан (байхгүй бол /login руу) */
export const getCurrentEmployee = cache(async (): Promise<Employee> => {
  const supabase = await createClient();
  // getClaims: JWT-г локалаар шалгана (Auth сервер рүү хүсэлт явуулахгүй) — хуудас бүр хурдан
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");
  const { data } = await createAdminClient()
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) redirect("/login?error=inactive");
  return data as Employee;
});

export async function requireStaffAdmin(): Promise<Employee> {
  const emp = await getCurrentEmployee();
  if (emp.role !== "admin" && emp.role !== "manager") redirect("/app");
  return emp;
}

export async function requireAdmin(): Promise<Employee> {
  const emp = await getCurrentEmployee();
  if (emp.role !== "admin") redirect("/app");
  return emp;
}

/** Апп доторх эрх шаардана (эрхгүй бол fallback руу) */
export async function requirePerm(perm: Perm, fallback = "/app"): Promise<Employee> {
  const emp = await getCurrentEmployee();
  if (!can(emp, perm)) redirect(fallback);
  return emp;
}

/** Талон апп-ын аль нэг эрх шаардана */
export async function requireTalonApp(): Promise<Employee> {
  const emp = await getCurrentEmployee();
  if (!canTalonApp(emp)) redirect("/app");
  return emp;
}
