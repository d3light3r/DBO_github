"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/settings/permissions", label: "Аппаар", icon: "list" },
  { href: "/admin/settings/employees", label: "Ажилтнаар", icon: "users" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-brand font-semibold text-brand" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
