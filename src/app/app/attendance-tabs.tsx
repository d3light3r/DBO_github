"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; mine: boolean };

/** Цаг бүртгэл апп-ын табууд (эрхтэй цэсүүд) */
export function AttendanceTabs({ tabs, badges }: { tabs: Tab[]; badges: Record<string, number> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  // Талон апп шиг нэг мөр таб
  return (
    <nav className="flex overflow-x-auto rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm ${active(t.href) ? "bg-white font-semibold shadow-sm" : "text-gray-500"}`}
        >
          {t.label}
          {(badges[t.href] ?? 0) > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs text-white">{badges[t.href]}</span>}
        </Link>
      ))}
    </nav>
  );
}
