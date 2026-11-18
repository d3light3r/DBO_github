// ШТС-ийн тооцоолол (цэвэр функц, сервер болон клиент хоёуланд ашиглана)

/** Мөнгийг 2, литрийг 3 оронгоор бөөрөнхийлнө (хөвөгч таслалын алдаанаас сэргийлнэ) */
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

export type ReadingInput = { start: number; end: number; price: number };

/** Нэг хошууны борлуулалт: литр = дуусах − эхлэх, дүн = литр × үнэ */
export function readingSales(r: ReadingInput): { liters: number; amount: number } {
  const liters = round3(r.end - r.start);
  return { liters, amount: round2(liters * r.price) };
}

export type Payments = { cash: number; card: number; coupon: number; credit: number };

/** Ээлжийн нэгтгэл. difference < 0 бол дутагдал, > 0 бол илүүдэл. */
export function shiftTotals(readings: ReadingInput[], pay: Payments) {
  let liters = 0;
  let amount = 0;
  for (const r of readings) {
    const s = readingSales(r);
    liters += s.liters;
    amount += s.amount;
  }
  liters = round3(liters);
  amount = round2(amount);
  const paid = round2(pay.cash + pay.card + pay.coupon + pay.credit);
  return { liters, amount, paid, difference: round2(paid - amount) };
}

/** Тоолуурын заалтыг шалгана. Алдаатай бол мессеж буцаана. */
export function validateReading(start: number, end: number | null): string | null {
  if (end == null || !Number.isFinite(end)) return "дуусах заалт оруулаагүй";
  if (end < start) return `дуусах заалт (${end}) эхлэхээс (${start}) бага байна`;
  return null;
}

/**
 * Савны дансны үлдэгдэл: сүүлийн хэмжилт + түүнээс хойш хүлээн авсан − түүнээс хойш борлуулсан.
 * Хэмжилт хийгээгүй бол 0-ээс эхэлж тооцно.
 */
export function bookBalance(base: number, receivedSince: number, soldSince: number): number {
  return round3(base + receivedSince - soldSince);
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}₮`;
}

export function fmtLiters(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)}л`;
}
