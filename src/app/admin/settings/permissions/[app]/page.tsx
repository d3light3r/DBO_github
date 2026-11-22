import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { APPS, isConfigured, permsOf } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { saveAppPermissions } from "../actions";
import { ColumnToggle } from "./column-toggle";

type Emp = { id: string; full_name: string; role: Role; permissions?: string[] | null; unit: { name: string } | null };

export default async function AppPermissions({
  params,
  searchParams,
}: {
  params: Promise<{ app: string }>;
  searchParams: Promise<{ q?: string; saved?: string; err?: string }>;
}) {
  const { app: key } = await params;
  const { q, saved, err } = await searchParams;
  const app = APPS.find((a) => a.key === key);
  if (!app) notFound();
  const me = await requireAdmin();

  const db = createAdminClient();
  let query = db.from("employees").select("*, unit:units(name)").eq("organization_id", me.organization_id).eq("is_active", true).order("full_name");
  const term = (q ?? "").replace(/[%,()*\\]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,emp_code.ilike.%${term}%`);
  const { data } = await query;
  const emps = (data ?? []) as unknown as Emp[];
  const migrated = emps.length === 0 || "permissions" in emps[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/admin/settings/permissions" className="text-xs text-brand">← Апп жагсаалт</Link>
          <h2 className="text-lg font-semibold">{app.title} — эрх</h2>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Ажилтны нэр, кодоор хайх" />
          <button className="btn-ghost">Хайх</button>
        </form>
      </div>

      {(!migrated || err === "migration") && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
          Supabase дээр 0009_app_permissions.sql-ийг ажиллуулна уу. Тэр хүртэл албан тушаалын анхдагч эрх үйлчилнэ.
        </p>
      )}
      {err === "db" && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Хадгалж чадсангүй. Дахин оролдоно уу.</p>}
      {saved !== undefined && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Хадгаллаа ({saved} ажилтны эрх өөрчлөгдсөн).</p>
      )}

      <form action={saveAppPermissions} className="card overflow-x-auto p-0">
        <input type="hidden" name="app" value={app.key} />
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Ажилтан</th>
              {app.perms.map((p) => (
                <th key={p.key} className="min-w-28 text-center align-top normal-case">
                  <span className="block font-semibold">{p.label}</span>
                  <span className="block text-[10px] font-normal text-gray-400">{p.desc}</span>
                  <ColumnToggle perm={p.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emps.map((e) => {
              const has = permsOf(e);
              const isAdmin = e.role === "admin";
              return (
                <tr key={e.id}>
                  <td>
                    <input type="hidden" name="emp" value={e.id} />
                    <span className="font-medium">{e.full_name}</span>
                    <span className="block text-xs text-gray-500">
                      {ROLE_LABELS[e.role]}
                      {e.unit?.name ? ` · ${e.unit.name}` : ""}
                      {isAdmin && " · бүх эрх"}
                      {!isAdmin && !isConfigured(e, app.key) && <span className="ml-1 rounded bg-gray-100 px-1 text-[10px]">анхдагч</span>}
                    </span>
                  </td>
                  {app.perms.map((p) => (
                    <td key={p.key} className="text-center">
                      <input
                        type="checkbox"
                        name={`p:${e.id}`}
                        value={p.key}
                        data-perm={p.key}
                        defaultChecked={has.has(p.key)}
                        disabled={isAdmin}
                        className="h-4 w-4"
                        title={isAdmin ? "Админ үргэлж бүх эрхтэй" : p.label}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            {emps.length === 0 && (
              <tr>
                <td colSpan={app.perms.length + 1} className="py-6 text-center text-gray-400">Ажилтан олдсонгүй</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
          <p className="text-xs text-gray-500">
            «анхдагч» = эрх оноогоогүй, албан тушаалаар нь (менежер / ажилтан) өгсөн эрх. ШТС апп-д ажилтан зөвхөн өөрийн салбарт хандана.
          </p>
          <button className="btn-primary">Хадгалах</button>
        </div>
      </form>
    </div>
  );
}
