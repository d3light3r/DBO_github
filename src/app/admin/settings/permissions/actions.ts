"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { APPS, appMarker, assignedStations, configuredApps, permsOf, stationMarker } from "@/lib/permissions";
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
  // ШТС апп: ажилтан бүрийн «Хандах станц» багана (зөвхөн байгууллагын ШТС)
  let orgStations: Set<string> | null = null;
  if (app.key === "station") {
    const { data: st } = await db.from("units").select("id").eq("organization_id", me.organization_id).eq("is_station", true);
    orgStations = new Set((st ?? []).map((x) => x.id as string));
  }

  // Ижил эрхтэй ажилтнуудыг нэг update-ээр хадгална
  const groups = new Map<string, string[]>();
  for (const e of (data ?? []) as { id: string; role: Role; permissions: string[] | null }[]) {
    if (e.role === "admin") continue; // админ үргэлж бүх эрхтэй
    // Одоогийн бүх эрх (тохируулаагүй апп-д анхдагч) + энэ апп-ын сонголт; тохируулсан апп-ууд «@апп» тэмдэгтэй
    const current = [...permsOf(e)] as string[];
    const checked = f.getAll(`p:${e.id}`).map(String).filter((p) => appPerms.includes(p));
    const marks = [...new Set([...configuredApps(e.permissions), app.key])].map(appMarker);
    // Оноосон ШТС-ууд: ШТС апп-д маягтын сонголтоор, бусад апп-д хэвээр (ШТС-ын бүх цэсийг арилгавал хамт хасна)
    const st = orgStations
      ? f.getAll(`s:${e.id}`).map(String).filter((id) => orgStations.has(id))
      : assignedStations(e.permissions);
    if (app.key !== "station" || checked.length) marks.push(...st.map(stationMarker));
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

/** Ажилтнаар: нэг ажилтны бүх апп-ын эрхийг хадгална (апп-ын бүх цэсийг арилгавал тухайн апп-аас хасагдана) */
export async function saveEmployeePermissions(f: FormData) {
  const me = await requireAdmin();
  const id = String(f.get("emp") ?? "");
  const q = String(f.get("q") ?? "");
  const back = (extra: string) => `/admin/settings/employees?emp=${encodeURIComponent(id)}${q ? `&q=${encodeURIComponent(q)}` : ""}&${extra}`;
  if (!id) redirect("/admin/settings/employees");

  const db = createAdminClient();
  const { data: emp, error } = await db.from("employees").select("id, role").eq("organization_id", me.organization_id).eq("id", id).maybeSingle();
  if (error) redirect(back(`err=${/permissions/.test(error.message) ? "migration" : "db"}`));
  if (!emp) redirect("/admin/settings/employees");
  if ((emp.role as Role) === "admin") redirect(back("saved=0")); // админ үргэлж бүх эрхтэй

  // Зөвхөн асаалттай («Нэмэгдсэн») апп-уудын сонгосон цэс
  const onApps = new Set(f.getAll("app").map(String));
  const valid = new Set<string>(APPS.filter((a) => onApps.has(a.key)).flatMap((a) => a.perms.map((p) => p.key)));
  const checked = f.getAll("perm").map(String).filter((p) => valid.has(p));
  // Оноосон ШТС-ууд (зөвхөн байгууллагын идэвхтэй ШТС; ШТС апп хаалттай бол хадгалахгүй)
  const wanted = [...new Set(f.getAll("station").map(String))];
  let stations: string[] = [];
  if (wanted.length && checked.some((p) => p.startsWith("station."))) {
    const { data: st } = await db.from("units").select("id").eq("organization_id", me.organization_id).eq("is_station", true).in("id", wanted);
    stations = (st ?? []).map((x) => stationMarker(x.id as string));
  }
  const next = [...new Set([...checked, ...APPS.map((a) => appMarker(a.key)), ...stations])].sort();
  const { error: upErr } = await db.from("employees").update({ permissions: next }).eq("organization_id", me.organization_id).eq("id", id);
  if (upErr) redirect(back("err=db"));
  revalidatePath("/", "layout");
  redirect(back("saved=1"));
}
