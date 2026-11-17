import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, WEEKDAY_SHORT } from "@/lib/time";
import type { Schedule } from "@/lib/types";
import { addHoliday, deleteHoliday } from "../actions";
import { ScheduleForm } from "./schedule-form";

export default async function SchedulesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await requireAdmin();
  const { edit } = await searchParams;
  const db = createAdminClient();
  const [{ data }, { data: hols }] = await Promise.all([
    db.from("schedules").select("*").eq("organization_id", me.organization_id).order("name"),
    db.from("holidays").select("*").eq("organization_id", me.organization_id).order("date"),
  ]);
  const schedules = (data ?? []) as Schedule[];
  const editing = schedules.find((s) => s.id === edit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ажлын хуваарь</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>Нэр</th><th>Төрөл</th><th>Цаг</th><th>Хоцролт тооцох</th><th></th></tr></thead>
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
                    <td><a className="text-sm text-brand" href={`?edit=${s.id}`}>Засах</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card space-y-3">
            <h2 className="font-semibold">Баярын, амралтын өдрүүд</h2>
            <p className="text-xs text-gray-500">Тогтмол хуваарьтай ажилтнуудад эдгээр өдөр ажлын өдөрт тооцогдохгүй. Ээлжийн ажилтнуудад нөлөөлөхгүй.</p>
            <form action={addHoliday} className="flex flex-wrap gap-2">
              <input type="date" name="date" className="input w-auto" required />
              <input name="name" className="input w-auto flex-1" placeholder="Цагаан сар" required />
              <button className="btn-primary">Нэмэх</button>
            </form>
            <ul className="divide-y divide-gray-100 text-sm">
              {(hols ?? []).map((h) => (
                <li key={h.id} className="flex items-center justify-between py-1.5">
                  <span>{fmtDate(h.date)} · {h.name}</span>
                  <form action={deleteHoliday}><input type="hidden" name="id" value={h.id} /><button className="text-xs text-gray-400 hover:text-brand">Устгах</button></form>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ScheduleForm key={editing?.id ?? "new"} schedule={editing} />
      </div>
    </div>
  );
}
