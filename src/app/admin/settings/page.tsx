import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon, type IconName } from "@/components/icons";
import { APPS } from "@/lib/permissions";

export default async function SettingsHome() {
  const me = await requireAdmin();
  const db = createAdminClient();
  const org = me.organization_id;
  const head = { count: "exact" as const, head: true };
  const [companies, depts, units] = await Promise.all([
    db.from("companies").select("id", head).eq("organization_id", org),
    db.from("departments").select("id", head).eq("organization_id", org),
    db.from("units").select("id", head).eq("organization_id", org),
  ]);

  const cards: { href: string; icon: IconName; title: string; desc: string; stat: string }[] = [
    { href: "/admin/settings/structure", icon: "tree", title: "Компани, алба хэлтэс", desc: "Компани → Алба хэлтэс → Салбар, ⛽ ШТС", stat: `${companies.count ?? 0} компани · ${depts.count ?? 0} хэлтэс · ${units.count ?? 0} салбар` },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Апп эрх — апп сонгоод цэс бүрийг хэн харахыг ажилтан бүрт ононо</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {APPS.map((a) => (
            <Link key={a.key} href={`/admin/settings/permissions/${a.key}`} className="card block transition hover:ring-brand">
              <span className="block font-semibold">{a.title}</span>
              <span className="block text-xs text-gray-500">{a.desc}</span>
              <span className="mt-1 block text-xs font-medium text-gray-700">{a.perms.map((p) => p.label).join(" · ")}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Ерөнхий тохиргоо</h2>
        <SettingsCards cards={cards} />
      </section>
    </div>
  );
}

function SettingsCards({ cards }: { cards: { href: string; icon: IconName; title: string; desc: string; stat: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.href} href={c.href} className="card flex gap-3 transition hover:ring-brand">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon name={c.icon} className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{c.title}</span>
            <span className="block text-xs text-gray-500">{c.desc}</span>
            <span className="mt-1 block text-xs font-medium text-gray-700">{c.stat}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
