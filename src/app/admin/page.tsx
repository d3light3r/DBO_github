import Link from "next/link";
import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayUB } from "@/lib/time";
import { StatsToday } from "./stats-today";
import { StatsMonth } from "./stats-month";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const me = await requireStaffAdmin();
  const sp = await searchParams;
  const view = sp.view === "month" ? "month" : "today";
  const currentMonth = todayUB().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") && sp.month! <= currentMonth ? sp.month! : currentMonth;

  const db = createAdminClient();
  const [pendingReq, pendingDev] = await Promise.all([
    db.from("requests").select("id", { count: "exact", head: true }).eq("organization_id", me.organization_id).eq("status", "pending"),
    me.role === "admin"
      ? db.from("devices").select("id", { count: "exact", head: true }).eq("organization_id", me.organization_id).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  const tab = (v: "today" | "month", label: string, href: string) => (
    <Link
      href={href}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Статистик</h1>
          <div className="flex rounded-xl bg-gray-200/70 p-1">
            {tab("today", "Өнөөдөр", "/admin")}
            {tab("month", "Сараар", `/admin?view=month&month=${month}`)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(pendingDev.count ?? 0) > 0 && (
            <Link href="/admin/settings/devices" className="btn-ghost">📱 {pendingDev.count} утас батлах</Link>
          )}
          {(pendingReq.count ?? 0) > 0 && (
            <Link href="/admin/requests" className="btn-primary">{pendingReq.count} хүсэлт хүлээгдэж байна →</Link>
          )}
        </div>
      </div>
      {view === "today" ? (
        <StatsToday orgId={me.organization_id} />
      ) : (
        <StatsMonth orgId={me.organization_id} month={month} currentMonth={currentMonth} />
      )}
    </div>
  );
}
