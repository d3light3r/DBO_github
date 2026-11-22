"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { APPS, appMarker, configuredApps, permsOf } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

/** Нэг апп-ын эрхийг маягтад байгаа ажилтнуудад хадгална (бусад апп-ын эрх хэвээр) */
export async function saveAppPermissions(f: FormData) {
  const me = await requireAdmin();
  const app = APPS.find((a) => a.key === f.get("app"));
  if (!app) redirect("/admin/settings/permissions");
  const base = `/admin/settings/permissions/${app.key}`;
  const appPerms: string[] = app.perms.map((p) => p.key);
  const ids = [...new Set(f.getAll("emp").map(String))];
  if (!ids.length) redirect(base);

  const db = createAdminClient();
  const { data, error } = await db.from("employees").select("id, role, permissions").eq("organization_id", me.organization_id).in("id", ids);
  if (error) redirect(`${base}?err=${/permissions/.test(error.message) ? "migration" : "db"}`);

  // Ижил эрхтэй ажилтнуудыг нэг update-ээр хадгална
  const groups = new Map<string, string[]>();
  for (const e of (data ?? []) as { id: string; role: Role; permissions: string[] | null }[]) {
    if (e.role === "admin") continue; // админ үргэлж бүх эрхтэй
    // Одоогийн бүх эрх (тохируулаагүй апп-д анхдагч) + энэ апп-ын сонголт; тохируулсан апп-ууд «@апп» тэмдэгтэй
    const current = [...permsOf(e)] as string[];
    const checked = f.getAll(`p:${e.id}`).map(String).filter((p) => appPerms.includes(p));
    const marks = [...new Set([...configuredApps(e.permissions), app.key])].map(appMarker);
    const next = [...new Set([...current.filter((p) => !appPerms.includes(p)), ...checked, ...marks])].sort();
    if (e.permissions && [...e.permissions].sort().join() === next.join()) continue;
    const key = next.join(",");
    groups.set(key, [...(groups.get(key) ?? []), e.id]);
  }
  let changed = 0;
  for (const [key, empIds] of groups) {
    const { error: upErr } = await db
      .from("employees")
      .update({ permissions: key ? key.split(",") : [] })
      .eq("organization_id", me.organization_id)
      .in("id", empIds);
    if (upErr) redirect(`${base}?err=db`);
    changed += empIds.length;
  }
  revalidatePath("/", "layout");
  redirect(`${base}?saved=${changed}`);
}
