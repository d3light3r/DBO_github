import Link from "next/link";
import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS } from "@/lib/types";
import { Icon } from "@/components/icons";
import { AdminNav } from "./admin-nav";
import { reviewableEmployeeIds } from "@/lib/approvals";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaffAdmin();
  const db = createAdminClient();
  const org = me.organization_id;
  const allowed = await reviewableEmployeeIds(me);
  let reqQ = db.from("requests").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "pending");
  if (allowed !== null) reqQ = reqQ.in("employee_id", allowed.length ? allowed : ["00000000-0000-0000-0000-000000000000"]);
  const [active, total, requests, devices] = await Promise.all([
    db.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("is_active", true),
    db.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", org),
    reqQ,
    me.role === "admin"
      ? db.from("devices").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  const a = active.count ?? 0;
  const t = total.count ?? 0;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="bg-gray-900 text-gray-200 md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:block md:space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand px-2 py-1 text-xs font-bold tracking-wider text-white">DB</span>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium">{me.full_name}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[me.role]}</p>
            </div>
          </div>
          <div className="hidden rounded-xl bg-white/5 p-3 md:block">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><Icon name="users" className="h-3.5 w-3.5" /> Ажилтны тоо</span>
              <span className="font-semibold text-white">{a}<span className="text-gray-500"> / {t}</span></span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${t ? Math.round((a / t) * 100) : 0}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">идэвхтэй / нийт</p>
          </div>
          <div className="flex gap-3 text-xs text-gray-400 md:hidden">
            <Link href="/app">Ажилтны апп</Link>
            <Link href="/station">⛽ ШТС</Link>
          </div>
        </div>
        <AdminNav isAdmin={me.role === "admin"} counts={{ requests: requests.count ?? 0, devices: devices.count ?? 0 }} />
        <div className="mt-auto hidden space-y-1 border-t border-white/10 px-3 py-3 text-xs md:block">
          <Link href="/app" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <Icon name="clock" className="h-4 w-4" /> Ажилтны апп
          </Link>
          <Link href="/station" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <Icon name="fuel" className="h-4 w-4" /> ШТС апп
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
