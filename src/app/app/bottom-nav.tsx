"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Нүүр", icon: "⏱" },
  { href: "/app/history", label: "Түүх", icon: "📅" },
  { href: "/app/requests", label: "Хүсэлт", icon: "📝" },
  { href: "/app/profile", label: "Миний", icon: "👤" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/app" ? path === "/app" : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "font-semibold text-brand" : "text-gray-500"}`}
              >
                <span className="text-lg leading-none">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
