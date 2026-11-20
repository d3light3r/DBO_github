/**
 * Excel-ээс хуулж буулгасан харилцагчийн жагсаалтыг задлана.
 *
 * Мөр бүрээс регистрийг хэлбэрээр нь танина:
 *   - 7 оронтой тоо                 → байгууллагын регистр (жнь 2026813)
 *   - 2 үсэг + 8 оронтой тоо        → хүний регистр (жнь УУ89021223)
 * Регистрийг (ба түүний хажуугийн зураас/зай) хассан үлдсэн хэсэг нь нэр. Нэр, регистрийн аль нэг нь байхад хангалттай.
 * Том/жижиг үсэг, зай, зураасаар л ялгаатай нэрс ("эс ти юу", "Эс-Ти-Юу") нэг харилцагч.
 * Тиймээс "УУ89021223-ЧАНДМАНЬ БАТЦОГТ", "2026813 - Тэс-Ойл ХХК" аль аль нь зөв задарна,
 * нэр доторх зураас ("Тэс-Ойл") хадгалагдана.
 *
 * Tab-аар тусгаарласан олон баганатай бол: эхний 2 баганаас нэр, регистр;
 * 3 дахь багана утас, үлдсэн нь тэмдэглэл.
 */

export const MAX_IMPORT = 2000;

export type ImportRow = { line: number; name: string; register: string | null; kind: "org" | "person" | null; phone: string | null; note: string | null };
/** Давхар мөр: аль мөр, ямар регистр, аль мөртэй давхцсан */
export type DuplicateRow = { line: number; name: string; register: string | null; firstLine: number; firstName: string };
export type ImportResult = { rows: ImportRow[]; errors: { line: number; text: string; message: string }[]; duplicates: DuplicateRow[] };

const L = "А-ЯЁӨҮа-яёөүA-Za-z";
// Хүний регистрийг түрүүлж шалгана (8 оронтой тоо дотор 7 оронтой тоо таарахаас сэргийлнэ)
const REGISTER_SRC = `(?<![${L}\\d])(?:([${L}]{2})\\s?(\\d{8})|(\\d{7}))(?!\\d)`;
const REGISTER = new RegExp(REGISTER_SRC, "g");
const HAS_REGISTER = new RegExp(REGISTER_SRC);

/** Регистрийг харьцуулахад: хоосон зай, жижиг/том үсгийн ялгааг арилгана */
export const registerKey = (r: string) => r.replace(/\s+/g, "").toUpperCase();

/** Нэрийг харьцуулахад: том/жижиг үсэг, зай, зураасыг үл тооцно ("Эс-Ти Юу" = "эстиюу") */
export const nameKey = (n: string) => n.toLowerCase().replace(/[\s\-–—_]+/g, "");

// Хуулийн этгээдийн товчлолыг томоор нь үлдээнэ
const ABBR = new Set(["ХХК", "ХК", "ТӨХК", "ТӨҮГ", "ОНӨҮГ", "ХЗХ", "ББСБ", "ТББ", "НҮТББ", "ҮЦК", "ЗГ", "ЛЛС", "LLC", "ХШХ", "АН", "СӨХ"]);

/**
 * Нэрийг "Эхний Үсэг Том" болгоно: мөрийн эхэнд, зайны дараа, зураасны дараа том үсэг.
 * Жнь "ЧАНДМАНЬ БАТЦОГТ" → "Чандмань Батцогт", "тэс-ойл ххк" → "Тэс-Ойл ХХК".
 */
export function titleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s-])([^\s-])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/[^\s-]+/g, (w) => (ABBR.has(w.toUpperCase().replace(/[.,"«»()]/g, "")) ? w.toUpperCase() : w));
}

/** Нэг мөрийн текстээс регистр, нэрийг салгана */
export function splitRegisterName(text: string): { register: string | null; kind: "org" | "person" | null; name: string } {
  const matches = [...text.matchAll(REGISTER)];
  if (!matches.length) return { register: null, kind: null, name: titleCase(cleanEdges(text)) };
  const m = matches[0];
  const register = m[3] ?? `${m[1].toUpperCase()}${m[2]}`;
  const key = registerKey(register);
  // Ижил регистр давтагдсан бол бүгдийг нь хасна ("УС85010410 УС85010410")
  let rest = text;
  for (const x of matches.filter((x) => registerKey(x[3] ?? `${x[1]}${x[2]}`) === key).reverse()) {
    rest = rest.slice(0, x.index) + " " + rest.slice(x.index! + x[0].length);
  }
  // Регистрийн хажууд үлдсэн салгагч зураас, зай, цэг, таслалыг цэвэрлэнэ (нэр доторх зураас үлдэнэ)
  rest = rest.replace(/\s+-\s+|\s+-|-\s+/g, " ");
  return { register, kind: m[3] ? "org" : "person", name: titleCase(cleanEdges(rest)) };
}

const cleanEdges = (s: string) => s.replace(/^[\s\-–—,.;:|/]+|[\s\-–—,.;:|/]+$/g, "");

const HEADER = /нэр|name|регистр|register/i;

export function parseCustomerPaste(text: string): ImportResult {
  const lines = text.replace(/\r/g, "").split("\n");
  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  const duplicates: DuplicateRow[] = [];
  const byReg = new Map<string, ImportRow>();
  const byName = new Map<string, ImportRow>();

  lines.forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    const cells = raw.split("\t").map((c) => c.trim().replace(/^"|"$/g, "").trim());
    // Эхний мөр гарчиг бол алгасна
    if (rows.length === 0 && errors.length === 0 && HEADER.test(cells.join(" ")) && !HAS_REGISTER.test(raw)) return;
    const [c0 = "", c1 = "", phone = "", ...rest] = cells;
    const shown = cells.filter(Boolean).join(" | ").slice(0, 80);
    // Хоёр баганад ижил текст байвал нэгийг нь авна
    const same = c0.replace(/\s+/g, " ").toUpperCase() === c1.replace(/\s+/g, " ").toUpperCase();
    const parsed = splitRegisterName(c1 && !same ? `${c0} - ${c1}` : c0 || c1);
    if (!parsed.name && !parsed.register) return errors.push({ line, text: shown, message: "нэр, регистр хоёулаа хоосон" });
    const nk = nameKey(parsed.name);
    // Ижил регистр, эсвэл ижил нэр (аль нэг нь регистргүй бол) → нэг харилцагч
    const sameReg = parsed.register ? byReg.get(registerKey(parsed.register)) : undefined;
    const sameName = nk ? byName.get(nk) : undefined;
    const first = sameReg ?? (sameName && (!parsed.register || !sameName.register) ? sameName : undefined);
    if (first) {
      // Эхнийх нь регистргүй байсан бол энэ мөрийн регистрийг нөхнө
      if (!first.register && parsed.register) {
        first.register = parsed.register;
        first.kind = parsed.kind;
        byReg.set(registerKey(parsed.register), first);
      }
      return duplicates.push({ line, name: parsed.name, register: parsed.register, firstLine: first.line, firstName: first.name });
    }
    const row: ImportRow = {
      line,
      name: parsed.name.slice(0, 200),
      register: parsed.register,
      kind: parsed.kind,
      phone: phone.slice(0, 50) || null,
      note: rest.filter(Boolean).join(" ").slice(0, 500) || null,
    };
    if (row.register) byReg.set(registerKey(row.register), row);
    if (nk && !byName.has(nk)) byName.set(nk, row);
    rows.push(row);
  });
  return { rows, errors, duplicates };
}
