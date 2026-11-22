import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { can, homeFor } from "@/lib/permissions";

/** Ирц бүртгүүлэх хэсэг (Нүүр, Түүх, Хүсэлт): табтай ижил өргөнтэй (ШТС апп шиг) */
export default async function MyAttendanceLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  // Ирц бүртгүүлэх эрхгүй бол эхний эрхтэй хуудас руу (Профайл хэнд ч нээлттэй)
  if (!can(emp, "attendance.punch")) redirect(homeFor(emp));
  return <div className="space-y-4">{children}</div>;
}
