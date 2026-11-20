/**
 * Excel-ээс хуулж буулгасан зарагдсан талоны жагсаалтыг задлана.
 * Мөр бүр: Харилцагч | AB | 1234567   эсвэл   Харилцагч | AB1234567   (сүүлд нь огноо байж болно)
 * Харилцагч нь нэр, регистр эсвэл «2026813-Тэс Ойл ХХК» хэлбэртэй байж болно.
 */
import { nameKey, registerKey, splitRegisterName } from "./customer-import";
import { fmtSerial, normalizeSerial, talonAmount } from "./talon";

export const MAX_TALON_IMPORT = 5000;

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
  duplicates: { line: number; serial: string; firstLine: number }[];
};

// "AB" + 1–7 оронтой тоо (зай, зураастай байж болно). Кирилл А/В/С-г normalizeSerial засна.
const SERIAL = /(?:^|[^A-Z0-9])(A[ABC])[\s\-_.]*(\d{1,7})(?![0-9])/;
const DATE = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/;

export function parseTalonPaste(text: string): TalonImportResult {
  const rows: TalonImportRow[] = [];
  const errors: TalonImportResult["errors"] = [];
  const duplicates: TalonImportResult["duplicates"] = [];
  const seen = new Map<string, number>();

  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    let cells = raw.split("\t").map((c) => c.trim().replace(/^"|"$/g, "").trim());
    const shown = cells.filter(Boolean).join(" | ").slice(0, 90);

    // Сүүлийн нүд огноо бол салгана
    let date: string | null = null;
    const last = cells.at(-1) ?? "";
    const dm = DATE.exec(last);
    if (dm) {
      date = `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
      cells = cells.slice(0, -1);
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

    const first = seen.get(serial);
    if (first) return duplicates.push({ line, serial, firstLine: first });
    seen.set(serial, line);
    rows.push({ line, customerText, customerName: cust.name, customerRegister: cust.register, serial, amount: talonAmount(serial) ?? 0, date });
  });
  return { rows, errors, duplicates };
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
