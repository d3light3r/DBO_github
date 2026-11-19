import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { Employee } from "./types";

/**
 * Хүсэлт батлах эрх:
 * - Алба хэлтсийн батлагч: тухайн хэлтсийн ажилтнуудын хүсэлт
 * - Админ: бүх хүсэлт (батлагчгүй хэлтсийнх ч)
 * - Өөрийнхөө хүсэлтийг хэн ч өөрөө батлахгүй
 */

/** Миний батлагч болсон алба хэлтсүүд */
export async function myApproverDepartments(me: Pick<Employee, "id" | "organization_id">): Promise<string[]> {
  const { data } = await createAdminClient().from("departments").select("id").eq("organization_id", me.organization_id).eq("approver_id", me.id);
  return (data ?? []).map((d) => d.id as string);
}

/** Миний батлах боломжтой ажилтнуудын id. null = бүгд (админ) */
export async function reviewableEmployeeIds(me: Pick<Employee, "id" | "organization_id" | "role">): Promise<string[] | null> {
  if (me.role === "admin") return null;
  const depts = await myApproverDepartments(me);
  if (depts.length === 0) return [];
  const { data } = await createAdminClient().from("employees").select("id").eq("organization_id", me.organization_id).in("department_id", depts);
  return (data ?? []).map((e) => e.id as string).filter((id) => id !== me.id);
}

/** Энэ ажилтны хүсэлтийг батлах хүний нэр (батлагчгүй бол null = админ) */
export async function approverNameFor(emp: Pick<Employee, "department_id">): Promise<string | null> {
  if (!emp.department_id) return null;
  const { data } = await createAdminClient()
    .from("departments")
    .select("approver:employees!departments_approver_id_fkey(full_name)")
    .eq("id", emp.department_id)
    .maybeSingle();
  const a = (data as unknown as { approver: { full_name: string } | null } | null)?.approver;
  return a?.full_name ?? null;
}
