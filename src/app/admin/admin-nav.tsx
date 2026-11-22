"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

type Item = { href: string; label: string; icon: IconName; admin: boolean; badge?: "requests" | "devices" };

const items: Item[] = [
  { href: "/admin", label: "Апп-ууд", icon: "home", admin: true },
  { href: "/admin/settings/structure", label: "Алба хэлтэс", icon: "tree", admin: true },
  { href: "/admin/settings", label: "Тохиргоо", icon: "settings", admin: true },
];

// Дээрх цэсэнд тусдаа байгаа тохиргооны дэд хуудсууд "Тохиргоо"-г идэвхжүүлэхгүй
const OWN = ["/admin/settings/structure"];

export function AdminNav({ isAdmin, counts }: { isAdmin: boolean; counts: { requests: number; devices: number } }) {
  const path = usePathname();
  const isActive = (href: string) => {
    if (href === "/admin") return path === "/admin";
    if (href === "/admin/settings") return path.startsWith(href) && !OWN.some((o) => path.startsWith(o));
    return path.startsWith(href);
  };
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
      {items
        .filter((i) => isAdmin || !i.admin)
        .map((i) => {
          const active = isActive(i.href);
          const n = i.badge ? counts[i.badge] : 0;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-white/10 font-semibold text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-brand md:block" />}
              <Icon name={i.icon} className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{i.label}</span>
              {n > 0 && <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{n}</span>}
            </Link>
          );
        })}
    </nav>
  );
}
