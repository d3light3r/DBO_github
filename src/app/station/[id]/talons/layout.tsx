import { notFound } from "next/navigation";
import { can } from "@/lib/permissions";
import { requireStationPage } from "@/lib/station-access";

export default async function TalonsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp } = await requireStationPage(id);
  const entry = can(emp, "station.talon.redeem") || can(emp, "station.talon.import");
  if (!entry && !can(emp, "station.talon.search")) notFound();
  return <>{children}</>;
}
