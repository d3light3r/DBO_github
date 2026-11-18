import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addHoliday, deleteHoliday } from "../../actions";
import { CalendarList } from "../calendar-list";

export default async function HolidaysPage() {
  const me = await requireAdmin();
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
