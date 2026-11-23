import { redirect } from "next/navigation";
import { hasApp, homeFor } from "@/lib/permissions";
import { stationContext } from "@/lib/station-access";

/** ШТС апп: цэс, загварыг станцын жагсаалт (page) болон станц бүрийн layout өөрөө зурна */
export default async function StationAppLayout({ children }: { children: React.ReactNode }) {
  const { emp } = await stationContext(); // нэвтрээгүй бол /login
  // ШТС апп-д нэмэгдээгүй ажилтан (Тохиргоо → Ажилтнаар) энэ апп руу орохгүй
  if (!hasApp(emp, "station")) redirect(homeFor(emp));
  return <>{children}</>;
}
