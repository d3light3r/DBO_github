import Link from "next/link";
import { canTalonApp, hasApp } from "@/lib/permissions";
import { canUseStationApp } from "@/lib/station-access";
import { ROLE_LABELS, type Employee } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { SideNav, type NavItem } from "./side-nav";

export type AppKey = "admin" | "attendance" | "station" | "talon";

const APP_LINKS: { key: AppKey; href: string; label: string; short: string; icon: IconName }[] = [
  { key: "attendance", href: "/app", label: "Цаг бүртгэл апп", short: "🕒 Цаг бүртгэл", icon: "clock" },
  { key: "station", href: "/station", label: "ШТС апп", short: "⛽ ШТС", icon: "fuel" },
  { key: "talon", href: "/talon", label: "Талон апп", short: "🎫 Талон", icon: "ticket" },
  { key: "admin", href: "/admin", label: "Удирдлага", short: "Удирдлага", icon: "settings" },
];

/**
 * Бүх апп-ын нийтлэг загвар (Удирдлагын загвар): зүүн талд хар цэс, утсанд дээд талд.
 * Цэсийн доор бусад апп руу шилжих холбоос (эрхтэй апп-ууд).
 */
export async function AppShell({
  me,
  app,
  title,
  items,
  widget,
  children,
}: {
  me: Employee;
  app: AppKey;
  title: string;
  items: NavItem[];
  widget?: React.ReactNode;
  children: React.ReactNode;
}) {
  const allowed: Record<AppKey, boolean> = {
    attendance: hasApp(me, "attendance"),
    station: hasApp(me, "station") && (await canUseStationApp(me)),
    talon: canTalonApp(me),
    admin: true, // Удирдлага: «Миний» хэнд ч, бусад цэс зөвхөн админд
  };
  const others = APP_LINKS.filter((a) => a.key !== app && allowed[a.key]).map((a) =>
    a.key === "admin" && me.role !== "admin" ? { ...a, href: "/admin/profile" } : a,
  );

  return (
    <div className="min-h-dvh md:flex">
      <aside className="bg-gray-900 text-gray-200 md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:block md:space-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-lg bg-brand px-2 py-1 text-xs font-bold tracking-wider text-white">DB</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="hidden truncate text-xs text-gray-400 md:block">
                {me.full_name} · {ROLE_LABELS[me.role]}
              </p>
            </div>
          </div>
          {widget && <div className="hidden md:block">{widget}</div>}
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-gray-400 md:hidden">
            {others.map((a) => (
              <Link key={a.key} href={a.href}>{a.short}</Link>
            ))}
          </div>
        </div>
        <SideNav items={items} />
        <div className="mt-auto hidden space-y-1 border-t border-white/10 px-3 py-3 text-xs md:block">
          {others.map((a) => (
            <Link key={a.key} href={a.href} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
              <Icon name={a.icon} className="h-4 w-4" /> {a.label}
            </Link>
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1 space-y-4 p-4 md:p-8">{children}</main>
    </div>
  );
}
