"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TalonTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/talon", label: "📋 Бүртгэл", active: path === "/talon" },
    { href: "/talon/sell", label: "💵 Зарах", active: path.startsWith("/talon/sell") },
    { href: "/talon/customers", label: "🏢 Харилцагч", active: path.startsWith("/talon/customers") },
    ...(isAdmin ? [{ href: "/talon/settings", label: "⚙️ Тохиргоо", active: path.startsWith("/talon/settings") }] : []),
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
