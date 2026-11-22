"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TalonTabs({ perms }: { perms: string[] }) {
  const has = (p: string) => perms.includes(p);
  const path = usePathname();
  const tabs = [
    { href: "/talon", label: "📋 Бүртгэл", active: path === "/talon", show: has("talon.list") },
    { href: "/talon/sell", label: "💵 Зарах", active: path.startsWith("/talon/sell"), show: has("talon.sell") },
    { href: "/talon/customers", label: "🏢 Харилцагч", active: path.startsWith("/talon/customers"), show: has("talon.customers") },
    { href: "/talon/settings", label: "⚙️ Тохиргоо", active: path.startsWith("/talon/settings"), show: has("talon.backdate") || has("talon.undo") },
  ].filter((t) => t.show);
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
