import { stationContext } from "@/lib/station-access";

/** ШТС апп: цэс, загварыг станцын жагсаалт (page) болон станц бүрийн layout өөрөө зурна */
export default async function StationAppLayout({ children }: { children: React.ReactNode }) {
  await stationContext(); // нэвтрээгүй бол /login
  return <>{children}</>;
}
