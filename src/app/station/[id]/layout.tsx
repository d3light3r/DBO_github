import { can } from "@/lib/permissions";
import { requireStationPage, stationContext } from "@/lib/station-access";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/side-nav";

/** Нэг станцын цэс: Ээлж, талон бүртгэх / шүүх, Тайлан, Тохиргоо */
export default async function StationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station, isAdmin } = await requireStationPage(id);
  const { stations, isStaffAdmin } = await stationContext();
  const base = `/station/${id}`;
  const entry = can(emp, "station.talon.redeem") || can(emp, "station.talon.import");
  const all: [boolean, NavItem][] = [
    [true, { href: base, label: "Ээлж", icon: "clock", exact: true }],
    [entry, { href: `${base}/talons`, label: "Ашигласан талон бүртгэх", icon: "ticket", exact: true }],
    [can(emp, "station.talon.search"), { href: `${base}/talons/search`, label: "Талон шүүх", icon: "search" }],
    [true, { href: `${base}/report`, label: "Тайлан", icon: "report", also: [`${base}/shift`] }],
    [isAdmin, { href: `${base}/settings`, label: "Тохиргоо", icon: "settings" }],
    [isStaffAdmin && stations.length > 1, { href: "/station", label: "Бусад станц", icon: "fuel", exact: true }],
  ];

  return (
    <AppShell
      me={emp}
      app="station"
      title={`⛽ ${station.name}`}
      items={all.filter(([ok]) => ok).map(([, i]) => i)}
      widget={
        <div className="rounded-xl bg-white/5 p-3 text-xs text-gray-400">
          <p>⛽ ШТС апп</p>
          <p className="mt-1 text-gray-300">🏢 {station.company_name} · {station.department_name}</p>
          {!station.is_active && <p className="mt-1 text-brand">(идэвхгүй)</p>}
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
