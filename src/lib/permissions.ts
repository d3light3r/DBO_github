/**
 * Апп доторх эрх. Ажилтан бүрт Тохиргоо → Апп эрх-ээс онооно.
 * employees.permissions = null бол албан тушаалын анхдагч эрх; админ үргэлж бүх эрхтэй.
 */
import type { Role } from "./types";

export const APPS = [
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
  manager: ["talon.list", "talon.sell", "talon.customers", "station.talon.redeem", "station.talon.search"],
  employee: ["station.talon.redeem", "station.talon.search"],
};

type WithPerms = { role: Role; permissions?: string[] | null };

export function permsOf(emp: WithPerms): Set<Perm> {
  if (emp.role === "admin") return new Set(ALL_PERMS);
  const list = emp.permissions ?? ROLE_DEFAULTS[emp.role] ?? [];
  return new Set(list.filter((p): p is Perm => (ALL_PERMS as string[]).includes(p)));
}

export const can = (emp: WithPerms, perm: Perm) => permsOf(emp).has(perm);

/** Талон апп-ын аль нэг эрх байгаа эсэх */
export const canTalonApp = (emp: WithPerms) => [...permsOf(emp)].some((p) => p.startsWith("talon."));

/** Талон апп-д нэвтэрсэн хэрэглэгчийн очих эхний хуудас */
export function talonHome(emp: WithPerms): string | null {
  const p = permsOf(emp);
  if (p.has("talon.list")) return "/talon";
  if (p.has("talon.sell")) return "/talon/sell";
  if (p.has("talon.customers")) return "/talon/customers";
  if (p.has("talon.backdate") || p.has("talon.undo")) return "/talon/settings";
  return null;
}
