"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSchedule } from "../../actions";
import { FormMessage } from "@/components/form-message";
import { WEEKDAY_SHORT } from "@/lib/time";
import type { Schedule } from "@/lib/types";

export function ScheduleForm({ schedule }: { schedule?: Schedule }) {
  const [state, action, pending] = useActionState(saveSchedule, null);
  const [kind, setKind] = useState<"fixed" | "cycle">(schedule?.kind ?? "fixed");
  const days = schedule?.work_weekdays ?? [1, 2, 3, 4, 5];

  return (
    <form action={action} className="space-y-3">
      <h2 className="font-semibold">{schedule ? "Хуваарь засах" : "Шинэ хуваарь"}</h2>
      {schedule && <input type="hidden" name="id" value={schedule.id} />}
      <div><label className="label">Нэр</label><input name="name" className="input" defaultValue={schedule?.name} placeholder="Оффис 09-18" required /></div>
      <div>
        <label className="label">Төрөл</label>
        <select name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "fixed" | "cycle")}>
          <option value="fixed">Тогтмол (долоо хоногийн өдрүүдээр)</option>
          <option value="cycle">Ээлжийн мөчлөг (жнь 24/48)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Эхлэх цаг</label><input type="time" name="start_time" className="input" defaultValue={schedule?.start_time.slice(0, 5) ?? "09:00"} /></div>
        {kind === "fixed" && <div><label className="label">Дуусах цаг</label><input type="time" name="end_time" className="input" defaultValue={schedule?.end_time.slice(0, 5) ?? "18:00"} /></div>}
      </div>
      {kind === "fixed" ? (
        <div>
          <label className="label">Ажлын өдрүүд</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <label key={d} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="work_weekdays" value={d} defaultChecked={days.includes(d)} className="accent-brand" />
                {WEEKDAY_SHORT[d]}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div><label className="label">Мөчлөг (хоног)</label><input type="number" name="cycle_length_days" className="input" defaultValue={schedule?.cycle_length_days ?? 3} min={1} /></div>
          <div><label className="label">Ажиллах өдөр</label><input type="number" name="work_days_in_cycle" className="input" defaultValue={schedule?.work_days_in_cycle ?? 1} min={1} /></div>
          <div><label className="label">Ээлж (цаг)</label><input type="number" name="shift_hours" className="input" defaultValue={schedule?.shift_hours ?? 24} min={1} max={48} /></div>
          <p className="col-span-3 text-xs text-gray-500">24/48 гэвэл: 3 хоногийн мөчлөгт 1 өдөр, 24 цаг ажиллана. Ажилтан бүрийн мөчлөг эхлэх өдрийг ажилтны мэдээлэлд тохируулна.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Завсарлага (минут)</label><input type="number" name="break_minutes" className="input" defaultValue={schedule?.break_minutes ?? (kind === "fixed" ? 60 : 0)} min={0} /></div>
        <div><label className="label">Хоцролт тооцохгүй (минут)</label><input type="number" name="late_grace_minutes" className="input" defaultValue={schedule?.late_grace_minutes ?? 5} min={0} /></div>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>Хадгалах</button>
        {schedule && <Link href="/admin/settings/schedules" className="btn-ghost">Болих</Link>}
      </div>
    </form>
  );
}
