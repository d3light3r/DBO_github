"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Талон таб дотор: Ашигласан талон бүртгэх / Талон шүүх */
export function TalonSubTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/station/${id}/talons`;
  const tabs = [
    { href: base, label: "🎫 Ашигласан талон бүртгэх", active: path === base },
    { href: `${base}/search`, label: "🔍 Талон шүүх", active: path.startsWith(`${base}/search`) },
  ];
  return (
    <nav className="flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm ${t.active ? "border-brand bg-brand-soft font-semibold text-brand" : "border-gray-200 bg-white text-gray-600"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
