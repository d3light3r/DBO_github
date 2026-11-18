import { test } from "node:test";
import assert from "node:assert/strict";
import { bookBalance, readingSales, shiftTotals, validateReading } from "../src/lib/station-calc";

test("хошууны борлуулалт: литр ба дүн", () => {
  assert.deepEqual(readingSales({ start: 1000, end: 1250.5, price: 2850 }), { liters: 250.5, amount: 713925 });
});

test("хөвөгч таслалын алдаа гарахгүй", () => {
  // 0.1 + 0.2 маягийн алдаанаас сэргийлнэ
  assert.deepEqual(readingSales({ start: 100.1, end: 100.3, price: 3 }), { liters: 0.2, amount: 0.6 });
});

test("ээлжийн нэгтгэл ба дутагдал", () => {
  const t = shiftTotals(
    [
      { start: 0, end: 100, price: 2850 }, // 285,000
      { start: 50, end: 70, price: 3200 }, // 64,000
    ],
    { cash: 200000, card: 140000, coupon: 5000, credit: 0 },
  );
  assert.deepEqual(t, { liters: 120, amount: 349000, paid: 345000, difference: -4000 });
});

test("тоолуурын заалт шалгах", () => {
  assert.equal(validateReading(100, 150), null);
  assert.equal(validateReading(100, 100), null);
  assert.match(validateReading(100, 90)!, /бага/);
  assert.match(validateReading(100, null)!, /оруулаагүй/);
});

test("савны дансны үлдэгдэл", () => {
  assert.equal(bookBalance(5000, 10000, 3500.25), 11499.75);
  assert.equal(bookBalance(0, 0, 0), 0);
});
