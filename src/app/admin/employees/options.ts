import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadOptions(orgId: string) {
  const db = createAdminClient();
  const [d, b, s] = await Promise.all([
    db.from("departments").select("id, name").eq("organization_id", orgId).order("name"),
    db.from("branches").select("id, name").eq("organization_id", orgId).order("name"),
    db.from("schedules").select("id, name, kind").eq("organization_id", orgId).order("name"),
  ]);
  return { departments: d.data ?? [], branches: b.data ?? [], schedules: s.data ?? [] };
}
