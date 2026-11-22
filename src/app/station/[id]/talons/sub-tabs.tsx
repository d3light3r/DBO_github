"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Талон таб дотор: Ашигласан талон бүртгэх / Талон шүүх */
export function TalonSubTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/station/${id}/talons`;
  const tabs = [
    { href: base, label: "🎫 Ашигласан талон бүртгэх", active: path === base },
    {
      href: `${base}/search`,
      label: "🔍 Талон шүүх",
      active: path.startsWith(`${base}/search`),
    },
  ];
  return (
    <div className="card p-2">
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
    </div>
  );
}
