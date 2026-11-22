import { requirePerm } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "../talon-forms";

/** Нөхөж оруулах хязгаар: ШТС хэдэн хоног хойш талон оруулж болох */
export default async function TalonBackdatePage() {
  const me = await requirePerm("talon.backdate", "/talon");
  const { data } = await createAdminClient().from("talon_settings").select("backdate_days").eq("organization_id", me.organization_id).maybeSingle();
  return (
    <div className="max-w-xl">
      <SettingsForm backdateDays={data?.backdate_days ?? null} />
    </div>
  );
}
