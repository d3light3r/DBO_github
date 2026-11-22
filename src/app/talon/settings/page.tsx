import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTalonApp } from "@/lib/auth";
import { can, talonHome } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm, UndoForm } from "../talon-forms";

export default async function TalonSettingsPage() {
  const me = await requireTalonApp();
  const backdate = can(me, "talon.backdate");
  const undo = can(me, "talon.undo");
  if (!backdate && !undo) redirect(talonHome(me) ?? "/app");
  const { data } = await createAdminClient().from("talon_settings").select("backdate_days").eq("organization_id", me.organization_id).maybeSingle();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {backdate && <SettingsForm backdateDays={data?.backdate_days ?? null} />}
      {undo && <UndoForm />}
      {me.role === "admin" && (
        <section className="card space-y-2 md:col-span-2">
          <h2 className="font-semibold">Хэн юу хийх эрхтэй вэ?</h2>
          <p className="text-xs text-gray-500">
            Талон апп болон ШТС апп-ын цэс бүрийг (ШТС талон импорт, бүртгэлд оруулах, шүүх, зарах, харилцагч г.м.) ажилтан бүрт
            Удирдлага → Тохиргоо → <b>Апп эрх</b>-ээс ононо.
          </p>
          <Link href="/admin/settings/permissions" className="btn-ghost inline-block">Апп эрх рүү очих →</Link>
        </section>
      )}
    </div>
  );
}
