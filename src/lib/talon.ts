/** Талоны сериал: 2 үсэг (төрөл) + 7 оронтой тоо. Жнь: AB0001234 */

export { fmtMoney } from "./station-calc";

export const TALON_TYPES = [
  { prefix: "AB", amount: 50000 },
  { prefix: "AA", amount: 20000 },
  { prefix: "AC", amount: 10000 },
] as const;

export type TalonPrefix = (typeof TALON_TYPES)[number]["prefix"];

export const MAX_RANGE = 10000;

const PREFIX_AMOUNT: Record<string, number> = Object.fromEntries(TALON_TYPES.map((t) => [t.prefix, t.amount]));

// Монгол гарнаас кирилл үсгээр бичсэн ч танина (А→A, В→B, С→C)
const CYR: Record<string, string> = { А: "A", В: "B", С: "C", а: "A", в: "B", с: "C" };

export function normalizeSerial(raw: string): string {
  return raw
    .replace(/[АВСавс]/g, (c) => CYR[c])
    .toUpperCase()
    .replace(/[\s\-_.]/g, "");
}

export function talonAmount(prefixOrSerial: string): number | null {
  return PREFIX_AMOUNT[prefixOrSerial.slice(0, 2)] ?? null;
}

export function fmtSerial(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(7, "0")}`;
}


export type TalonRange = {
  from: string;
  to: string;
  prefix: TalonPrefix;
  count: number;
  amount: number; // нэг талоны үнэ
  total: number;
};

/**
 * "Эхний" ба "Сүүлийн" сериалаас мужийг задлана.
 * Сүүлийнх хоосон бол ганц талон. Сүүлийнхийг зөвхөн тоогоор (жнь "50") бичиж болно —
 * эхнийхийн үсгийг авч 7 орон болгоно.
 */
export function parseRange(fromRaw: string, toRaw = ""): TalonRange | { error: string } {
  const from = normalizeSerial(fromRaw);
  let to = normalizeSerial(toRaw) || from;
  const m = /^(A[ABC])(\d{7})$/.exec(from);
  if (!m) return { error: `"${fromRaw.trim() || "—"}" сериал буруу. Жишээ: AB0001234 (AA, AB, AC + 7 оронтой тоо).` };
  if (/^\d{1,7}$/.test(to)) to = fmtSerial(m[1], Number(to));
  const m2 = /^(A[ABC])(\d{7})$/.exec(to);
  if (!m2) return { error: `"${toRaw.trim()}" сериал буруу. Жишээ: ${m[1]}0001250.` };
  if (m[1] !== m2[1]) return { error: "Эхний ба сүүлийн сериалын төрөл (үсэг) ижил байх ёстой." };
  const a = Number(m[2]);
  const b = Number(m2[2]);
  if (b < a) return { error: "Сүүлийн сериал эхнийхээсээ бага байна." };
  const count = b - a + 1;
  if (count > MAX_RANGE) return { error: `Нэг удаад хамгийн ихдээ ${MAX_RANGE} талон бүртгэнэ.` };
  const amount = PREFIX_AMOUNT[m[1]];
  return { from, to, prefix: m[1] as TalonPrefix, count, amount, total: amount * count };
}

/** Дараалсан сериалуудыг (ижил key-тэй) "AA0000001 – AA0000050" хэлбэрийн мужид нэгтгэнэ */
export function groupRuns<T extends { serial: string }>(rows: T[], key: (r: T) => string) {
  const sorted = [...rows].sort((a, b) => (key(a) + a.serial).localeCompare(key(b) + b.serial));
  const runs: { first: T; from: string; to: string; count: number; amount: number }[] = [];
  for (const r of sorted) {
    const last = runs.at(-1);
    const n = Number(r.serial.slice(2));
    if (last && key(last.first) === key(r) && last.to.slice(0, 2) === r.serial.slice(0, 2) && Number(last.to.slice(2)) + 1 === n) {
      last.to = r.serial;
      last.count++;
    } else {
      runs.push({ first: r, from: r.serial, to: r.serial, count: 1, amount: talonAmount(r.serial) ?? 0 });
    }
  }
  return runs;
}

/** Postgres функцийн алдааг ойлгомжтой мессеж болгоно */
export function talonDbError(err: { message: string; details?: string | null }): string {
  const code = err.message.match(/TALON_[A-Z_]+/)?.[0];
  const [cnt, list] = (err.details ?? "").split("|");
  const more = (n: string) => (Number(n) > 10 ? ` ... (нийт ${n})` : "");
  switch (code) {
    case "TALON_FORMAT":
      return "Сериал буруу форматтай.";
    case "TALON_PREFIX":
      return "Эхний ба сүүлийн сериалын төрөл ижил байх ёстой.";
    case "TALON_ORDER":
      return "Сүүлийн сериал эхнийхээсээ бага байна.";
    case "TALON_TOO_MANY":
      return `Нэг удаад хамгийн ихдээ ${MAX_RANGE} талон бүртгэнэ.`;
    case "TALON_CUSTOMER":
      return "Харилцагч олдсонгүй.";
    case "TALON_FUTURE":
      return "Ирээдүйн огноогоор бүртгэх боломжгүй.";
    case "TALON_BRANCH":
      return "ШТС салбар олдсонгүй.";
    case "TALON_DATE": {
      const [min, max] = (err.details ?? "").split("|");
      return min === max ? "Зөвхөн өнөөдрийн огноогоор оруулна." : `Огноо ${min.replace(/-/g, ".")} – ${max.replace(/-/g, ".")} хооронд байх ёстой.`;
    }
    case "TALON_EXISTS":
      return `Дараах талон аль хэдийн зарагдсан бүртгэлтэй: ${list}${more(cnt)}`;
    case "TALON_NOT_SOLD":
      return `Дараах талон зарагдаагүй (бүртгэлгүй) тул оруулах боломжгүй: ${list}${more(cnt)}`;
    case "TALON_USED":
      return `Дараах талон өмнө нь оруулсан байна: ${list}${more(cnt)}`;
    case "TALON_BEFORE_SALE":
      return `Дараах талоныг зарсан огнооноос өмнөх өдрөөр оруулах боломжгүй: ${list}${more(cnt)}`;
    default:
      return err.message;
  }
}
