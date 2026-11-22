/**
 * Апп доторх эрх. Ажилтан бүрт Тохиргоо → Апп эрх-ээс онооно.
 * employees.permissions = null бол албан тушаалын анхдагч эрх; админ үргэлж бүх эрхтэй.
 */
import type { IconName } from "@/components/icons";
import type { Role } from "./types";

export const APPS = [
  {
    key: "attendance",
    title: "🕒 Цаг бүртгэл апп",
    desc: "Ирц бүртгүүлэх, ирц хянах, хүсэлт, тайлан, ажилтан, хуваарь, баярын өдөр",
    perms: [
      { key: "attendance.punch", label: "Ирц бүртгүүлэх", desc: "Ирлээ / Явлаа, түүх, хүсэлт илгээх, профайл" },
      { key: "attendance.dashboard", label: "Самбар", desc: "Өнөөдрийн болон сарын ирцийн тойм" },
      { key: "attendance.log", label: "Ирцийн бүртгэл", desc: "Бүх ажилтны ирц харах, шалгах" },
      { key: "attendance.approvals", label: "Цагийн хүсэлт", desc: "Хүсэлт шийдэх (алба хэлтсийн батлагчийн хүрээнд)" },
      { key: "attendance.reports", label: "Тайлан", desc: "Ирцийн тайлан, Excel татах" },
      { key: "attendance.employees", label: "Ажилтан", desc: "Ажилтан нэмэх, засах (админ эрх оноож чадахгүй)" },
      { key: "attendance.schedules", label: "Хуваарь", desc: "Ажлын хуваарь" },
      { key: "attendance.locations", label: "Байршил", desc: "Ирц бүртгэх цэг, радиус, Wi-Fi" },
      { key: "attendance.devices", label: "Утас бүртгэл", desc: "Утас батлах, утас шаардах эсэх" },
      { key: "attendance.calendar", label: "Баярын / ажлын өдөр", desc: "Баярын өдөр, амралтын өдөр ажиллах нэмэлт өдөр" },
    ],
  },
  {
    key: "talon",
    title: "🎫 Талон апп",
    desc: "Талон зарах, бүртгэл хянах, харилцагч, тохиргоо",
    perms: [
      { key: "talon.list", label: "Бүртгэл", desc: "Талоны жагсаалт, нэгтгэл, Excel татах" },
      { key: "talon.sell", label: "Зарах", desc: "Талон зарах, Excel-ээс импортлох" },
      { key: "talon.customers", label: "Харилцагч", desc: "Нэмэх, засах, импорт, нэгтгэх" },
      { key: "talon.backdate", label: "Нөхөж оруулах хязгаар", desc: "ШТС хэдэн хоног хойш нөхөж оруулахыг тохируулах" },
      { key: "talon.undo", label: "Алдаа засах", desc: "Зарсан / оруулсан бүртгэлийг буцаах" },
    ],
  },
  {
    key: "station",
    title: "⛽ ШТС апп",
    desc: "Станцын талон бүртгэл (ажилтан зөвхөн өөрийн салбарт)",
    perms: [
      { key: "station.talon.redeem", label: "Ашигласан талон бүртгэх", desc: "Талоныг бүртгэлд оруулах" },
      { key: "station.talon.import", label: "ШТС талон импорт", desc: "Ашигласан талоныг Excel-ээс огнооны хязгааргүй оруулах" },
      { key: "station.talon.search", label: "Талон шүүх", desc: "Оруулсан талоныг шүүж, харилцагчаар тайлан харах" },
    ],
  },
] as const;

export type AppKey = (typeof APPS)[number]["key"];
export type Perm = (typeof APPS)[number]["perms"][number]["key"];

export const ALL_PERMS: Perm[] = APPS.flatMap((a) => a.perms.map((p) => p.key));

/** Эрх оноогоогүй (null) үеийн анхдагч — өмнөх ажиллагаатай ижил */
export const ROLE_DEFAULTS: Record<Role, Perm[]> = {
  admin: ALL_PERMS,
  manager: [
    "attendance.punch", "attendance.dashboard", "attendance.log", "attendance.approvals", "attendance.reports",
    "talon.list", "talon.sell", "talon.customers", "station.talon.redeem", "station.talon.search",
  ],
  employee: ["attendance.punch", "station.talon.redeem", "station.talon.search"],
};

/**
 * Хадгалсан жагсаалтад апп бүрийг тохируулсан эсэхийг «@апп» тэмдгээр тэмдэглэнэ.
 * Тохируулаагүй апп-д албан тушаалын анхдагч үйлчилнэ (шинэ апп нэмэгдэхэд эрх алдагдахгүй).
 * Тэмдэггүй хуучин жагсаалт = Талон, ШТС апп-ыг тохируулсан.
 */
const LEGACY_APPS: AppKey[] = ["talon", "station"];
export const appMarker = (app: AppKey) => `@${app}`;

export function configuredApps(list: string[] | null | undefined): Set<AppKey> {
  if (!list) return new Set();
  const marks = list.filter((p) => p.startsWith("@")).map((p) => p.slice(1) as AppKey);
  return new Set(marks.length || !list.length ? marks : LEGACY_APPS);
}

type WithPerms = { role: Role; permissions?: string[] | null };

export function permsOf(emp: WithPerms): Set<Perm> {
  if (emp.role === "admin") return new Set(ALL_PERMS);
  const list = emp.permissions ?? [];
  const done = configuredApps(emp.permissions);
  const defaults = ROLE_DEFAULTS[emp.role] ?? [];
  const out = new Set<Perm>();
  for (const app of APPS) {
    const src: string[] = done.has(app.key) ? list : defaults;
    for (const p of app.perms) if (src.includes(p.key)) out.add(p.key);
  }
  return out;
}

/** Энэ апп-ыг ажилтанд тусгайлан тохируулсан эсэх (эсвэл анхдагч) */
export const isConfigured = (emp: WithPerms, app: AppKey) => configuredApps(emp.permissions).has(app);

export const can = (emp: WithPerms, perm: Perm) => permsOf(emp).has(perm);

/** Талон апп-ын аль нэг эрх байгаа эсэх */
export const canTalonApp = (emp: WithPerms) => [...permsOf(emp)].some((p) => p.startsWith("talon."));

/** Талон апп-д нэвтэрсэн хэрэглэгчийн очих эхний хуудас */
export function talonHome(emp: WithPerms): string | null {
  const p = permsOf(emp);
  if (p.has("talon.list")) return "/talon";
  if (p.has("talon.sell")) return "/talon/sell";
  if (p.has("talon.customers")) return "/talon/customers";
  if (p.has("talon.backdate")) return "/talon/backdate";
  if (p.has("talon.undo")) return "/talon/undo";
  return null;
}

/** Цаг бүртгэл апп-ын цэсүүд (хаяг, эрх) — табын дараалал */
export const ATTENDANCE_TABS: { href: string; label: string; icon: IconName; perm: Perm; exact?: boolean }[] = [
  { href: "/app", label: "Ирц бүртгүүлэх", icon: "clock", perm: "attendance.punch", exact: true },
  { href: "/app/history", label: "Түүх", icon: "history", perm: "attendance.punch" },
  { href: "/app/requests", label: "Миний хүсэлт", icon: "send", perm: "attendance.punch" },
  { href: "/app/dashboard", label: "Самбар", icon: "chart", perm: "attendance.dashboard" },
  { href: "/app/attendance", label: "Ирцийн бүртгэл", icon: "list", perm: "attendance.log" },
  { href: "/app/approvals", label: "Цагийн хүсэлт", icon: "check", perm: "attendance.approvals" },
  { href: "/app/reports", label: "Тайлан", icon: "report", perm: "attendance.reports" },
  { href: "/app/employees", label: "Ажилтан", icon: "users", perm: "attendance.employees" },
  { href: "/app/schedules", label: "Хуваарь", icon: "calendar", perm: "attendance.schedules" },
  { href: "/app/locations", label: "Байршил", icon: "pin", perm: "attendance.locations" },
  { href: "/app/devices", label: "Утас бүртгэл", icon: "phone", perm: "attendance.devices" },
  { href: "/app/holidays", label: "Баярын өдөр", icon: "calendar", perm: "attendance.calendar" },
  { href: "/app/workdays", label: "Ажлын өдөр", icon: "calendar", perm: "attendance.calendar" },
];

/** Нэвтэрсний дараа очих хуудас: Цаг бүртгэл апп-ын эхний эрхтэй цэс, үгүй бол ШТС / Талон */
export function homeFor(emp: WithPerms): string {
  const p = permsOf(emp);
  const tab = ATTENDANCE_TABS.find((t) => p.has(t.perm));
  if (tab) return tab.href;
  if ([...p].some((x) => x.startsWith("station."))) return "/station";
  return talonHome(emp) ?? "/admin/profile";
}
