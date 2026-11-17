import type { Employee, Schedule } from "./types";
import { daysBetween, timeToMinutes, ubDateTime, weekdayOf } from "./time";

/** Тухайн өдөр ажилтны хувиарт ажлын өдөр мөн эсэх */
export function isWorkDay(schedule: Schedule | null, emp: Pick<Employee, "cycle_anchor_date">, date: string, holidays: Set<string> = new Set()): boolean {
  if (!schedule) return false;
  if (schedule.kind === "fixed") {
    if (holidays.has(date)) return false;
    return schedule.work_weekdays.includes(weekdayOf(date));
  }
  // Ээлжийн мөчлөг: баярын өдөр ч ажиллана
  const anchor = emp.cycle_anchor_date;
  const len = schedule.cycle_length_days ?? 0;
  const work = schedule.work_days_in_cycle ?? 0;
  if (!anchor || len <= 0) return false;
  const idx = ((daysBetween(anchor, date) % len) + len) % len;
  return idx < work;
}

/** Хуваарийн дагуу нэг өдрийн/ээлжийн ажиллах ёстой минут */
export function scheduledMinutes(schedule: Schedule): number {
  if (schedule.kind === "cycle") {
    return (schedule.shift_hours ?? 24) * 60 - schedule.break_minutes;
  }
  let span = timeToMinutes(schedule.end_time) - timeToMinutes(schedule.start_time);
  if (span <= 0) span += 24 * 60; // шөнийн ээлж
  return span - schedule.break_minutes;
}

/** Хоцролт (минут) */
export function lateMinutes(schedule: Schedule | null, workDate: string, checkIn: Date): number {
  if (!schedule) return 0;
  const start = ubDateTime(workDate, schedule.start_time);
  const diff = Math.floor((checkIn.getTime() - start.getTime()) / 60000);
  return diff > schedule.late_grace_minutes ? diff : 0;
}

/** Ажилласан минут, илүү цаг */
export function workedAndOvertime(schedule: Schedule | null, checkIn: Date, checkOut: Date) {
  const raw = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000));
  if (!schedule) return { worked: raw, overtime: 0 };
  const planned = scheduledMinutes(schedule);
  // Завсарлагааг зөвхөн бүтэн ажилласан үед хасна
  const worked = raw > planned / 2 ? Math.max(0, raw - schedule.break_minutes) : raw;
  return { worked, overtime: Math.max(0, worked - planned) };
}

/** Нээлттэй ирцийг "мартсан" гэж үзэх хугацаа (минут) */
export function staleAfterMinutes(schedule: Schedule | null): number {
  const planned = schedule ? scheduledMinutes(schedule) + schedule.break_minutes : 9 * 60;
  return planned + 6 * 60;
}
