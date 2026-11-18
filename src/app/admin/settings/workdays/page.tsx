import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addWorkDay, deleteWorkDay } from "../../actions";
import { CalendarList } from "../calendar-list";

export default async function WorkDaysPage() {
  const me = await requireAdmin();
  const { data } = await createAdminClient().from("work_days").select("id, date, name").eq("organization_id", me.organization_id).order("date");
  return (
    <CalendarList
      title="Нэмэлт ажлын өдрүүд"
      description="Бямба, Ням эсвэл баярын өдөр байсан ч ажиллах өдөр (нөхөж ажиллах өдөр г.м.). Тогтмол хуваарьтай ажилтнуудад ажлын өдөрт тооцогдож, ирээгүй бол тасалсанд орно. Ээлжийн ажилтнуудад нөлөөлөхгүй."
      placeholder="Нөхөж ажиллах өдөр..."
      items={data ?? []}
      addAction={addWorkDay}
      deleteAction={deleteWorkDay}
    />
  );
}
