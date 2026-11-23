import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { APPS, hasApp, permsOf } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { EmployeeAppsForm } from "./employee-apps-form";

type Emp = {
  id: string;
  full_name: string;
  role: Role;
  permissions?: string[] | null;
  unit: { name: string; is_station: boolean } | null;
};

const SHORT: Record<string, string> = { attendance: "🕒", talon: "🎫", station: "⛽" };

/** Ажилтнаар: ажилтан сонгоод бүх апп-д нэмэх / хасах, цэсийн эрх оноох */
export default async function EmployeePermissions({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; emp?: string; saved?: string; err?: string }>;
}) {
  const { q = "", emp: empId, saved, err } = await searchParams;
  const me = await requireAdmin();
  let query = createAdminClient()
    .from("employees")
    .select("id, full_name, role, permissions, unit:units(name, is_station)")
    .eq("organization_id", me.organization_id)
    .eq("is_active", true)
    .order("full_name");
  const term = q.replace(/[%,()*\\]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,emp_code.ilike.%${term}%`);
  const { data, error } = await query;
  const emps = (data ?? []) as unknown as Emp[];
  const selected = emps.find((e) => e.id === empId) ?? null;
  const href = (id: string) => `/admin/settings/employees?emp=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const notes: Record<string, string> = {};
  if (selected && selected.role === "employee" && !selected.unit?.is_station) {
    notes.station = "Ажилтны салбар ⛽ ШТС биш тул ШТС апп-д хандахгүй. «Алба хэлтэс»-ээс ШТС салбарт оноогоорой.";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="card space-y-3 p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto">
        <form className="flex gap-2">
          {empId && <input type="hidden" name="emp" value={empId} />}
          <input name="q" defaultValue={q} className="input" placeholder="Нэр, кодоор хайх" />
          <button className="btn-ghost px-3">Хайх</button>
        </form>
        <ul className="space-y-1">
          {emps.map((e) => {
            const apps = APPS.filter((a) => e.role === "admin" || hasApp(e, a.key)).map((a) => SHORT[a.key]);
            return (
              <li key={e.id}>
                <Link
                  href={href(e.id)}
                  scroll={false}
                  className={`block rounded-xl px-3 py-2 text-sm transition ${e.id === selected?.id ? "bg-brand-soft ring-1 ring-brand" : "hover:bg-gray-50"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{e.full_name}</span>
                    <span className="shrink-0 text-xs" title="Нэмэгдсэн апп-ууд">{apps.join(" ") || "—"}</span>
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {ROLE_LABELS[e.role]}
                    {e.unit?.name ? ` · ${e.unit.name}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
          {emps.length === 0 && <li className="py-6 text-center text-sm text-gray-400">Ажилтан олдсонгүй</li>}
        </ul>
      </aside>

      <div className="min-w-0 space-y-3">
        {(err === "migration" || (error && /permissions/.test(error.message))) && (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Supabase дээр 0009_app_permissions.sql-ийг ажиллуулна уу.</p>
        )}
        {err === "db" && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Хадгалж чадсангүй. Дахин оролдоно уу.</p>}
        {saved === "1" && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Хадгаллаа.</p>}

        {selected ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">{selected.full_name}</h2>
              <p className="text-xs text-gray-500">
                {ROLE_LABELS[selected.role]}
                {selected.unit?.name ? ` · ${selected.unit.name}` : ""} — апп-д нэмэх / хасах, цэсийн эрх
              </p>
            </div>
            <EmployeeAppsForm
              key={`${selected.id}:${(selected.permissions ?? []).join()}`}
              empId={selected.id}
              role={selected.role}
              q={q}
              initial={[...permsOf(selected)]}
              notes={notes}
            />
          </>
        ) : (
          <div className="card py-12 text-center text-sm text-gray-500">
            Зүүн талаас ажилтан сонгоод 🕒 Цаг бүртгэл, 🎫 Талон, ⛽ ШТС апп-д нэмэх / хасах, цэс бүрийн эрхийг тохируулна.
            <br />
            Нэмэгдсэн ажилтнууд «Аппаар» табын тухайн апп дотор харагдаж, тэндээс цэсийн эрхийг нь засна.
          </div>
        )}
      </div>
    </div>
  );
}
