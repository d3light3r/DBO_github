import { requirePerm } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addHoliday, deleteHoliday } from "@/app/admin/actions";
import { CalendarList } from "@/app/app/calendar-list";

export default async function HolidaysPage() {
  const me = await requirePerm("attendance.calendar", "/app");
  const { data } = await createAdminClient().from("holidays").select("id, date, name").eq("organization_id", me.organization_id).order("date");
  return (
    <CalendarList
      title="Баярын, амралтын өдрүүд"
      description="Тогтмол хуваарьтай ажилтнуудад эдгээр өдөр ажлын өдөрт тооцогдохгүй (тасалсанд орохгүй). Ээлжийн ажилтнуудад нөлөөлөхгүй."
      placeholder="Цагаан сар, Наадам..."
      items={data ?? []}
      addAction={addHoliday}
      deleteAction={deleteHoliday}
    />
  );
}
