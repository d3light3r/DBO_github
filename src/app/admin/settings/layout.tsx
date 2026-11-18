import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const { count } = await createAdminClient()
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", me.organization_id)
    .eq("status", "pending");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Тохиргоо</h1>
      <SettingsTabs pendingDevices={count ?? 0} />
      {children}
    </div>
  );
}
