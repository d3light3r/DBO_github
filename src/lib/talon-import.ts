/**
 * Excel-ээс хуулж буулгасан зарагдсан талоны жагсаалтыг задлана.
 * Мөр бүр: [Огноо |] Харилцагч | AB | 1234567   эсвэл   [Огноо |] Харилцагч | AB1234567
 * Огноо (2026.05.08) эхний эсвэл сүүлийн баганад байж болно.
 * Харилцагч нь нэр, регистр эсвэл «2026813-Тэс Ойл ХХК» хэлбэртэй байж болно.
 */
import { nameKey, registerKey, splitRegisterName } from "./customer-import";
import { fmtSerial, normalizeSerial, talonAmount } from "./talon";

export const MAX_TALON_IMPORT = 20000;

export type TalonImportRow = {
  line: number;
  customerText: string;
  customerName: string;
  customerRegister: string | null;
  serial: string;
  amount: number;
  date: string | null; // YYYY-MM-DD
};
export type TalonImportResult = {
  rows: TalonImportRow[];
  errors: { line: number; text: string; message: string }[];
  /** Ижил сериал, гэхдээ харилцагч эсвэл огноо өөр — зөрчил, импортлохгүй */
  duplicates: { line: number; serial: string; firstLine: number; text: string; firstText: string }[];
  /** Сериал, харилцагч, огноо гурвуулаа ижил — нэгийг нь үлдээж бусдыг хассан */
  removed: { line: number; serial: string; firstLine: number }[];
};

// "AB" + 1–7 оронтой тоо (зай, зураастай байж болно). Кирилл А/В/С-г normalizeSerial засна.
const SERIAL = /(?:^|[^A-Z0-9])(A[ABC])[\s\-_.]*(\d{1,7})(?![0-9])/;
const DATE = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/;

/** Жинхэнэ огноо эсэх (2026-02-30 гэх мэтийг хасна) */
function validDate(d: string): boolean {
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export function parseTalonPaste(text: string): TalonImportResult {
  const rows: TalonImportRow[] = [];
  const errors: TalonImportResult["errors"] = [];
  const duplicates: TalonImportResult["duplicates"] = [];
  const removed: TalonImportResult["removed"] = [];
  const seen = new Map<string, { line: number; text: string; key: string }>();

  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    let cells = raw.split("\t").map((c) => c.trim().replace(/^"|"$/g, "").trim());
    const shown = cells.filter(Boolean).join(" | ").slice(0, 90);

    // Эхний эсвэл сүүлийн нүд огноо (2026.05.08) бол салгана
    let date: string | null = null;
    for (const pos of [0, cells.length - 1]) {
      const dm = DATE.exec(cells[pos] ?? "");
      if (!dm || date) continue;
      const d = `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
      if (!validDate(d)) return errors.push({ line, text: shown, message: `огноо буруу: ${cells[pos]}` });
      date = d;
      cells = pos === 0 ? cells.slice(1) : cells.slice(0, -1);
    }

    // Харилцагчийн нүднүүдийн дараах хэсгээс сериалыг хайна (сүүлээс нь)
    let serial: string | null = null;
    let custCells = cells;
    for (let k = cells.length - 1; k >= 0 && !serial; k--) {
      const tail = normalizeSerial(cells.slice(k).join(" ")).replace(/[^A-Z0-9]/g, " ");
      const m = SERIAL.exec(` ${tail}`);
      if (m && k > 0) {
        serial = fmtSerial(m[1], Number(m[2]));
        custCells = cells.slice(0, k);
      }
    }
    // Нэг нүдэнд бүгд байвал: «Тэс ХХК AB1234567»
    if (!serial && cells.length === 1) {
      const m = /(?:^|[\s\-–—|,;])([AaАа][AaBbCcАаВвСс])[\s\-_.]*(\d{1,7})\s*$/.exec(cells[0]);
      if (m) {
        serial = fmtSerial(normalizeSerial(m[1]), Number(m[2]));
        custCells = [cells[0].slice(0, m.index).replace(/[\s\-–—|,;]+$/, "")];
      }
    }
    if (!serial) {
      // Эхний мөр гарчиг бол алгасна
      if (rows.length === 0 && errors.length === 0 && /харилцагч|сериал|serial|customer|талон/i.test(raw)) return;
      return errors.push({ line, text: shown, message: "сериал олдсонгүй (AA/AB/AC + 7 хүртэл оронтой тоо)" });
    }
    const customerText = custCells.filter(Boolean).join(" ").trim();
    if (!customerText) return errors.push({ line, text: shown, message: "харилцагч хоосон" });
    const cust = splitRegisterName(customerText);
    if (!cust.name && !cust.register) return errors.push({ line, text: shown, message: "харилцагч хоосон" });

    // Харилцагч + огноо: ижил бол бүрэн давхардал (хасна), өөр бол зөрчил
    const key = `${newCustomerKey(cust.name, cust.register)}|${date ?? ""}`;
    const first = seen.get(serial);
    if (first) {
      if (first.key === key) return removed.push({ line, serial, firstLine: first.line });
      return duplicates.push({ line, serial, firstLine: first.line, text: shown, firstText: first.text });
    }
    seen.set(serial, { line, text: shown, key });
    rows.push({ line, customerText, customerName: cust.name, customerRegister: cust.register, serial, amount: talonAmount(serial) ?? 0, date });
  });
  return { rows, errors, duplicates, removed };
}

export type CustomerRef = { id: string; name: string; register: string | null };

/** Харилцагчийг регистрээр, олдохгүй бол нэрээр (том/жижиг үсэг, зай, зураас хамаарахгүй) олно */
export function customerMatcher(customers: CustomerRef[]) {
  const byReg = new Map<string, CustomerRef>();
  const byName = new Map<string, CustomerRef>();
  for (const c of customers) {
    if (c.register) byReg.set(registerKey(c.register), c);
    const k = nameKey(c.name ?? "");
    if (k && !byName.has(k)) byName.set(k, c);
  }
  return (name: string, register: string | null): CustomerRef | null =>
    (register ? byReg.get(registerKey(register)) : undefined) ?? (nameKey(name) ? byName.get(nameKey(name)) : undefined) ?? null;
}

/** Шинэ харилцагчийг давхардуулахгүйн тулд түлхүүр: регистр, эсвэл нэр */
export const newCustomerKey = (name: string, register: string | null) => (register ? `r:${registerKey(register)}` : `n:${nameKey(name)}`);
