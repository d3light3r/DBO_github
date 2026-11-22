import { requireTalonApp } from "@/lib/auth";
import { permsOf } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/side-nav";

/** Талон апп: эрх оноосон ажилтан талон зарах, бүртгэл хянах, харилцагч, нөхөж оруулах, алдаа засах */
export default async function TalonAppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireTalonApp();
  const p = permsOf(me);
  const all: [boolean, NavItem][] = [
    [p.has("talon.list"), { href: "/talon", label: "Бүртгэл", icon: "list", exact: true }],
    [p.has("talon.sell"), { href: "/talon/sell", label: "Зарах", icon: "cash" }],
    [p.has("talon.customers"), { href: "/talon/customers", label: "Харилцагч", icon: "building" }],
    [p.has("talon.backdate"), { href: "/talon/backdate", label: "Нөхөж оруулах", icon: "calendar" }],
    [p.has("talon.undo"), { href: "/talon/undo", label: "Алдаа засах", icon: "undo" }],
  ];
  const items = all.filter(([ok]) => ok).map(([, i]) => i);

  return (
    <AppShell me={me} app="talon" title="🎫 Талон апп" items={items}>
      {children}
    </AppShell>
  );
}
