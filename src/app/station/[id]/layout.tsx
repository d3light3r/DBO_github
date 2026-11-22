import Link from "next/link";
import { can } from "@/lib/permissions";
import { requireStationPage, stationContext } from "@/lib/station-access";
import { StationTabs } from "./station-tabs";

export default async function StationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station, isAdmin } = await requireStationPage(id);
  const talon = can(emp, "station.talon.redeem") || can(emp, "station.talon.import") || can(emp, "station.talon.search");
  const { stations, isStaffAdmin } = await stationContext();
  return (
    <>
      <section className="card -mt-8 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">⛽ {station.name}</h2>
            <p className="text-xs text-gray-500">
              🏢 {station.company_name} · {station.department_name}
              {!station.is_active && <span className="ml-1 text-brand">(идэвхгүй)</span>}
            </p>
          </div>
          {isStaffAdmin && stations.length > 1 && (
            <Link href="/station" className="whitespace-nowrap text-xs text-gray-500 underline">Бусад станц</Link>
          )}
        </div>
        <StationTabs id={id} isAdmin={isAdmin} talon={talon} />
      </section>
      {children}
    </>
  );
}
