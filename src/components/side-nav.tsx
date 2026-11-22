"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Зөвхөн яг энэ хаяг дээр идэвхтэй (үндсэн хуудас) */
  exact?: boolean;
  /** Эдгээрээр эхэлсэн хаяг дээр ч идэвхтэй */
  also?: string[];
  /** Эдгээрээр эхэлсэн хаяг дээр идэвхгүй (тусдаа цэстэй дэд хуудас) */
  exclude?: string[];
};

/** Удирдлагын загварын хажуугийн цэс (утсанд дээд талд хэвтээ гүйлгэнэ) */
export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const isActive = (i: NavItem) => {
    if (i.exclude?.some((x) => path.startsWith(x))) return false;
    if (i.exact) return path === i.href;
    return path.startsWith(i.href) || !!i.also?.some((x) => path.startsWith(x));
  };
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
      {items.map((i) => {
        const active = isActive(i);
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
            {(i.badge ?? 0) > 0 && <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
