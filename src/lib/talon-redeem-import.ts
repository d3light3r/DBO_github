/**
 * ШТС-д ашигласан талоныг Excel-ээс импортлох: мөр бүр  Огноо | AB | 1234567  (эсвэл Огноо | AB1234567).
 * Огноо (2026.05.08) эхний эсвэл сүүлийн баганад; огноогүй бол формын огноо.
 * Сериал + огноо ижил давхар мөрийг хасна; ижил сериал өөр огноотой бол зөрчил.
 */
import { fmtSerial, normalizeSerial, talonAmount } from "./talon";

export const MAX_REDEEM_IMPORT = 20000;

export type RedeemImportRow = { line: number; serial: string; amount: number; date: string | null };
export type RedeemImportResult = {
  rows: RedeemImportRow[];
  errors: { line: number; text: string; message: string }[];
  duplicates: { line: number; serial: string; firstLine: number; text: string; firstText: string }[];
  removed: { line: number; serial: string; firstLine: number }[];
};

const DATE = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/;
const SERIAL = /^(A[ABC])(\d{1,7})$/;

function validDate(d: string): boolean {
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export function parseRedeemPaste(text: string): RedeemImportResult {
  const res: RedeemImportResult = { rows: [], errors: [], duplicates: [], removed: [] };
  const seen = new Map<string, { line: number; text: string; date: string | null }>();

  text.replace(/\r/g, "").split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    // Excel-ийн таб, эсвэл хоосон зай / таслал / цэгтэй таслалаар тусгаарласан мөр
    let cells = raw.split(/[\s;,]+/).map((c) => c.replace(/^"|"$/g, "").trim()).filter(Boolean);
    const shown = cells.join(" | ").slice(0, 60);

    let date: string | null = null;
    for (const pos of [0, cells.length - 1]) {
      const dm = DATE.exec(cells[pos] ?? "");
      if (!dm || date) continue;
      const d = `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
      if (!validDate(d)) return res.errors.push({ line, text: shown, message: `огноо буруу: ${cells[pos]}` });
      date = d;
      cells = pos === 0 ? cells.slice(1) : cells.slice(0, -1);
    }

    // Үлдсэн нүднүүд: «AB», «1234567» эсвэл «AB1234567»
    const m = SERIAL.exec(normalizeSerial(cells.join("")).replace(/[^A-Z0-9]/g, ""));
    if (!m) {
      if (res.rows.length === 0 && res.errors.length === 0 && /огноо|сериал|serial|date|төрөл/i.test(raw)) return; // гарчиг
      return res.errors.push({ line, text: shown, message: "сериал олдсонгүй (AA/AB/AC + 7 хүртэл оронтой тоо)" });
    }
    const serial = fmtSerial(m[1], Number(m[2]));
    const first = seen.get(serial);
    if (first) {
      if (first.date === date) return res.removed.push({ line, serial, firstLine: first.line });
      return res.duplicates.push({ line, serial, firstLine: first.line, text: shown, firstText: first.text });
    }
    seen.set(serial, { line, text: shown, date });
    res.rows.push({ line, serial, amount: talonAmount(serial) ?? 0, date });
  });
  return res;
}
