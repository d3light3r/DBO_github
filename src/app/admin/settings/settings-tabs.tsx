"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/settings/devices", label: "📱 Утас бүртгэл" },
  { href: "/admin/settings/departments", label: "Хэлтэс" },
  { href: "/admin/settings/branches", label: "Салбар, байршил" },
  { href: "/admin/settings/schedules", label: "Ажлын хуваарь" },
  { href: "/admin/settings/holidays", label: "Баярын өдөр" },
  { href: "/admin/settings/workdays", label: "Ажлын өдөр" },
  { href: "/admin/settings/station", label: "⛽ ШТС" },
];

export function SettingsTabs({ pendingDevices }: { pendingDevices: number }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-brand font-semibold text-brand" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            {t.href.endsWith("/devices") && pendingDevices > 0 && (
              <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs text-white">{pendingDevices}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
