export const TZ = "Asia/Ulaanbaatar";

/** Огноог Улаанбаатарын цагаар задлана */
export function zoned(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: weekdayMap[get("weekday")],
  };
}

export function todayUB(): string {
  return zoned(new Date()).date;
}

/** "YYYY-MM-DD" + "HH:MM[:SS]" (УБ цаг) -> Date */
export function ubDateTime(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return new Date(`${date}T${t}+08:00`);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function weekdayOf(date: string): number {
  const w = new Date(`${date}T00:00:00Z`).getUTCDay();
  return w === 0 ? 7 : w;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function fmtDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}.${m}.${d}`;
}

export function fmtMinutes(min: number | null | undefined): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}ц ${m}м` : `${m}м`;
}

export const WEEKDAY_SHORT = ["", "Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

export function fmtDateTime(iso: string): string {
  return `${fmtDate(zoned(new Date(iso)).date)} ${fmtTime(iso)}`;
}
