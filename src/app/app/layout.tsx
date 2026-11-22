import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth";
import { reviewableEmployeeIds } from "@/lib/approvals";
import { ATTENDANCE_TABS, canTalonApp, permsOf } from "@/lib/permissions";
import { canUseStationApp } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS } from "@/lib/types";
import { AttendanceTabs } from "./attendance-tabs";

/** Цаг бүртгэл апп: ажилтны ирц бүртгүүлэх + (эрхтэй бол) ирц хянах, хүсэлт, тайлан, ажилтан, хуваарь */
export default async function AttendanceAppLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  const perms = permsOf(emp);
  const tabs = ATTENDANCE_TABS.filter((t) => perms.has(t.perm)).map(({ href, label, mine }) => ({ href, label, mine: !!mine }));
  const showStation = await canUseStationApp(emp);

  // Табын тэмдэг: хүлээгдэж буй хүсэлт, утас
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <header className="rounded-b-3xl bg-gray-900 px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" className="min-w-0">
            <p className="text-xs opacity-70">{emp.full_name} · {ROLE_LABELS[emp.role]}</p>
            <h1 className="text-lg font-bold">🕒 Цаг бүртгэл апп</h1>
          </Link>
          <div className="flex flex-wrap justify-end gap-2 text-xs">
            {showStation && <Link href="/station" className="rounded-full bg-white/15 px-3 py-1">⛽ ШТС</Link>}
            {canTalonApp(emp) && <Link href="/talon" className="rounded-full bg-white/15 px-3 py-1">🎫 Талон</Link>}
            {!perms.has("attendance.punch") && <Link href="/app/profile" className="rounded-full bg-white/15 px-3 py-1">👤 Миний</Link>}
            {emp.role === "admin" && <Link href="/admin" className="rounded-full bg-white/15 px-3 py-1">Удирдлага</Link>}
          </div>
        </div>
      </header>
      {tabs.length > 0 && (
        <div className="-mt-7 px-4">
          <div className="card p-2">
            <AttendanceTabs tabs={tabs} badges={badges} />
          </div>
        </div>
      )}
      <main className="flex-1 space-y-4 px-4 py-4 pb-12">{children}</main>
    </div>
  );
}
