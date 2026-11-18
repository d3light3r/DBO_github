import Link from "next/link";
import { requireStationPage, stationContext } from "@/lib/station-access";
import { StationTabs } from "./station-tabs";

export default async function StationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { station, isAdmin } = await requireStationPage(id);
  const { stations, isStaffAdmin } = await stationContext();
  return (
    <>
      <section className="card -mt-8 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">⛽ {station.name}</h2>
            <p className="text-xs text-gray-500">
              📍 Ирц бүртгэх байршил:{" "}
              <a className="text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${station.latitude},${station.longitude}`}>
                газрын зураг
              </a>{" "}
              · {station.radius_meters}м радиус
            </p>
          </div>
          {isStaffAdmin && stations.length > 1 && (
            <Link href="/station" className="whitespace-nowrap text-xs text-gray-500 underline">Бусад станц</Link>
          )}
        </div>
        <StationTabs id={id} isAdmin={isAdmin} />
      </section>
      {children}
    </>
  );
}
