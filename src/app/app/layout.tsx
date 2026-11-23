import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { reviewableEmployeeIds } from "@/lib/approvals";
import { ATTENDANCE_TABS, hasApp, homeFor, permsOf } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/side-nav";

/** Цаг бүртгэл апп: ирц бүртгүүлэх + (эрхтэй бол) ирц хянах, хүсэлт, тайлан, ажилтан, хуваарь */
export default async function AttendanceAppLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  // Цаг бүртгэл апп-д нэмэгдээгүй ажилтан (Тохиргоо → Ажилтнаар) энэ апп руу орохгүй
  if (!hasApp(emp, "attendance")) redirect(homeFor(emp));
  const perms = permsOf(emp);

  // Цэсний тэмдэг: хүлээгдэж буй хүсэлт, утас
  const db = createAdminClient();
  const org = emp.organization_id;
  const badges: Record<string, number> = {};
  if (perms.has("attendance.approvals")) {
    const allowed = await reviewableEmployeeIds(emp);
    let q = db.from("requests").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "pending");
    if (allowed !== null) q = q.in("employee_id", allowed.length ? allowed : ["00000000-0000-0000-0000-000000000000"]);
    badges["/app/approvals"] = (await q).count ?? 0;
  }
  if (perms.has("attendance.devices")) {
    const { count } = await db.from("devices").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "pending");
    badges["/app/devices"] = count ?? 0;
  }

  const items: NavItem[] = ATTENDANCE_TABS.filter((t) => perms.has(t.perm)).map(({ href, label, icon, exact }) => ({
    href,
    label,
    icon,
    exact,
    badge: badges[href],
  }));

  return (
    <AppShell me={emp} app="attendance" title="🕒 Цаг бүртгэл апп" items={items}>
      {children}
    </AppShell>
  );
}
