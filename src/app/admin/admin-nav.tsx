"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Статистик", admin: false },
  { href: "/admin/attendance", label: "Ирцийн бүртгэл", admin: false },
  { href: "/admin/requests", label: "Хүсэлт батлах", admin: false },
  { href: "/admin/reports", label: "Тайлан", admin: false },
  { href: "/admin/station", label: "⛽ ШТС", admin: false },
  { href: "/admin/employees", label: "Ажилтан", admin: true },
  { href: "/admin/settings", label: "Тохиргоо", admin: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-2">
      {items
        .filter((i) => isAdmin || !i.admin)
        .map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-brand text-white" : "hover:bg-gray-800"}`}
            >
              {i.label}
            </Link>
          );
        })}
    </nav>
  );
}
