import "server-only";
import { createAdminClient } from "./supabase/admin";

/** Тухайн хугацааны баярын болон нэмэлт ажлын өдрүүд */
export async function loadCalendar(orgId: string, from: string, to: string) {
  const db = createAdminClient();
  const [hols, works] = await Promise.all([
    db.from("holidays").select("date").eq("organization_id", orgId).gte("date", from).lte("date", to),
    db.from("work_days").select("date").eq("organization_id", orgId).gte("date", from).lte("date", to),
  ]);
  return {
    holidays: new Set((hols.data ?? []).map((h) => h.date as string)),
    workDays: new Set((works.data ?? []).map((w) => w.date as string)),
  };
}
