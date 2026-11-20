import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setStationImport } from "../actions";
import { SettingsForm, UndoForm } from "../talon-forms";

export default async function TalonSettingsPage() {
  const me = await requireAdmin();
  const db = createAdminClient();
  const [{ data }, imp] = await Promise.all([
    db.from("talon_settings").select("backdate_days").eq("organization_id", me.organization_id).maybeSingle(),
    db.from("talon_settings").select("station_import").eq("organization_id", me.organization_id).maybeSingle(),
  ]);
  const needsMigration = !!imp.error;
  const on = !!imp.data?.station_import;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SettingsForm backdateDays={data?.backdate_days ?? null} />
      <section className={`card space-y-3 ${on ? "ring-amber-300" : ""}`}>
        <h2 className="font-semibold">ШТС-д талон импорт (түр)</h2>
        <p className="text-xs text-gray-500">
          Нээлттэй үед ШТС апп → 🎫 Талон табд «Excel-ээс импортлох» гарч, тухайн станцад ашигласан талоныг <b>Огноо · AB · 1234567</b> хэлбэрээр
          огнооны хязгааргүй оруулна. Өмнөх өгөгдлөө оруулж дуусаад хаана уу.
        </p>
        {needsMigration ? (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Supabase дээр 0008_talon_station_import.sql-ийг ажиллуулна уу.</p>
        ) : (
          <form action={setStationImport} className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium ${on ? "text-amber-700" : "text-gray-500"}`}>{on ? "● Нээлттэй" : "○ Хаалттай"}</span>
            <input type="hidden" name="on" value={on ? "0" : "1"} />
            <button className={on ? "btn-ghost" : "btn-primary"}>{on ? "Хаах" : "Нээх"}</button>
          </form>
        )}
      </section>
      <UndoForm />
    </div>
  );
}
