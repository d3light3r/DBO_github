import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import type { NavItem } from "@/components/side-nav";

/** Удирдлага: «Миний» (профайл) хэнд ч; Апп-ууд, Алба хэлтэс, Тохиргоо зөвхөн админд */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentEmployee();
  const isAdmin = me.role === "admin";
  const items: NavItem[] = [
    ...(isAdmin
      ? ([
          { href: "/admin", label: "Апп-ууд", icon: "home", exact: true },
          { href: "/admin/settings/structure", label: "Алба хэлтэс", icon: "tree" },
          { href: "/admin/settings", label: "Тохиргоо", icon: "settings", exclude: ["/admin/settings/structure"] },
        ] as NavItem[])
      : []),
    { href: "/admin/profile", label: "Миний", icon: "user" },
  ];

  let widget: React.ReactNode = null;
  if (isAdmin) {
    const db = createAdminClient();
    const org = me.organization_id;
    const [active, total] = await Promise.all([
      db.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("is_active", true),
      db.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", org),
    ]);
    const a = active.count ?? 0;
    const t = total.count ?? 0;
    widget = (
      <div className="rounded-xl bg-white/5 p-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Icon name="users" className="h-3.5 w-3.5" /> Ажилтны тоо</span>
          <span className="font-semibold text-white">{a}<span className="text-gray-500"> / {t}</span></span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand" style={{ width: `${t ? Math.round((a / t) * 100) : 0}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">идэвхтэй / нийт</p>
      </div>
    );
  }

  return (
    <AppShell me={me} app="admin" title="Удирдлага" items={items} widget={widget}>
      {children}
    </AppShell>
  );
}
