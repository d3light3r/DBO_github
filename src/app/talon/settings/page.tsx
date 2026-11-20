import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm, UndoForm } from "../talon-forms";

export default async function TalonSettingsPage() {
  const me = await requireAdmin();
  const { data } = await createAdminClient().from("talon_settings").select("backdate_days").eq("organization_id", me.organization_id).maybeSingle();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SettingsForm backdateDays={data?.backdate_days ?? null} />
      <UndoForm />
    </div>
  );
}
