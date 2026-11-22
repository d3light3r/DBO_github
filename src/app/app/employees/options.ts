import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Options = Awaited<ReturnType<typeof loadOptions>>;

export async function loadOptions(orgId: string) {
  const db = createAdminClient();
  const [c, d, u, b, s] = await Promise.all([
    db.from("companies").select("id, name").eq("organization_id", orgId).order("created_at"),
    db.from("departments").select("id, name, company_id").eq("organization_id", orgId).order("name"),
    db.from("units").select("id, name, department_id, is_station, is_active").eq("organization_id", orgId).order("name"),
    db.from("branches").select("id, name").eq("organization_id", orgId).order("name"),
    db.from("schedules").select("id, name, kind").eq("organization_id", orgId).order("name"),
  ]);
  return {
    companies: (c.data ?? []) as { id: string; name: string }[],
    departments: (d.data ?? []) as { id: string; name: string; company_id: string | null }[],
    units: (u.data ?? []) as { id: string; name: string; department_id: string; is_station: boolean; is_active: boolean }[],
    branches: (b.data ?? []) as { id: string; name: string }[], // координат
    schedules: (s.data ?? []) as { id: string; name: string; kind?: string }[],
  };
}
