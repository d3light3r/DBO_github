"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StationTabs({ id, isAdmin, talon }: { id: string; isAdmin: boolean; talon: boolean }) {
  const path = usePathname();
  const base = `/station/${id}`;
  const tabs = [
    { href: base, label: "🕒 Ээлж", active: path === base },
    ...(talon ? [{ href: `${base}/talons`, label: "🎫 Талон", active: path.startsWith(`${base}/talons`) }] : []),
    { href: `${base}/report`, label: "📊 Тайлан", active: path.startsWith(`${base}/report`) || path.startsWith(`${base}/shift`) },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "⚙️ Тохиргоо", active: path.startsWith(`${base}/settings`) }] : []),
  ];
  return (
    <nav className="flex overflow-x-auto rounded-xl bg-gray-100 p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm ${t.active ? "bg-white font-semibold shadow-sm" : "text-gray-500"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
