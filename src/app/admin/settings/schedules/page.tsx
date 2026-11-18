import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEEKDAY_SHORT } from "@/lib/time";
import type { Schedule } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteSchedule } from "../../actions";
import { ScheduleForm } from "./schedule-form";

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await requireAdmin();
  const { edit } = await searchParams;
  const db = createAdminClient();
  const [{ data }, { data: emps }] = await Promise.all([
    db.from("schedules").select("*").eq("organization_id", me.organization_id).order("name"),
    db.from("employees").select("schedule_id").eq("organization_id", me.organization_id).eq("is_active", true),
  ]);
  const schedules = (data ?? []) as Schedule[];
  const editing = schedules.find((s) => s.id === edit);
  const count = (id: string) => (emps ?? []).filter((e) => e.schedule_id === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Нэр</th><th>Төрөл</th><th>Цаг</th><th>Хоцролт тооцох</th><th>Ажилтан</th><th></th></tr></thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-xs">
                  {s.kind === "fixed"
                    ? `Тогтмол: ${s.work_weekdays.map((d) => WEEKDAY_SHORT[d]).join(",")}`
                    : `Ээлж: ${s.cycle_length_days} хоногт ${s.work_days_in_cycle} өдөр, ${s.shift_hours} цаг`}
                </td>
                <td>{s.start_time.slice(0, 5)}{s.kind === "fixed" && ` – ${s.end_time.slice(0, 5)}`}</td>
                <td>{s.late_grace_minutes} минутаас</td>
                <td>{count(s.id)}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <a className="text-sm text-brand" href={`?edit=${s.id}`}>Засах</a>
                    <form action={deleteSchedule}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton message={`«${s.name}» хуваарийг устгах уу? ${count(s.id)} ажилтны хуваарь хоосон болно.`}>Устгах</ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Хуваарь нэмээгүй байна</td></tr>}
          </tbody>
        </table>
      </div>
      <ScheduleForm key={editing?.id ?? "new"} schedule={editing} />
    </div>
  );
}
