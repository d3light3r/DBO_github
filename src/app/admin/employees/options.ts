import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadOptions(orgId: string) {
  const db = createAdminClient();
  const [d, b, s] = await Promise.all([
    db.from("departments").select("id, name").eq("organization_id", orgId).order("name"),
    db.from("branches").select("id, name, is_station").eq("organization_id", orgId).order("is_station").order("name"),
    db.from("schedules").select("id, name, kind").eq("organization_id", orgId).order("name"),
  ]);
  // Станцыг ⛽ тэмдгээр ялгана
  const branches = (b.data ?? []).map((x) => ({ id: x.id as string, name: x.is_station ? `⛽ ${x.name}` : (x.name as string) }));
  return { departments: d.data ?? [], branches, schedules: s.data ?? [] };
}
