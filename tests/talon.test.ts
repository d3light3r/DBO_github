import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtMoney, normalizeSerial, parseRange, talonAmount, talonDbError } from "../src/lib/talon";

test("сериалаас төрөл: AA=20000, AB=50000, AC=10000", () => {
  assert.equal(talonAmount("AA0000001"), 20000);
  assert.equal(talonAmount("AB0000001"), 50000);
  assert.equal(talonAmount("AC0000001"), 10000);
  assert.equal(talonAmount("AD0000001"), null);
});

test("кирилл үсэг, жижиг үсэг, хоосон зайг засна", () => {
  assert.equal(normalizeSerial(" ав 000-1234 "), "AB0001234");
  assert.equal(normalizeSerial("АС0000009"), "AC0000009");
});

test("ганц талон", () => {
  const r = parseRange("AB0000010");
  assert.ok(!("error" in r));
  assert.deepEqual([r.from, r.to, r.count, r.total], ["AB0000010", "AB0000010", 1, 50000]);
});

test("муж: сүүлийнхийг тоогоор бичиж болно", () => {
  const r = parseRange("AA0000001", "50");
  assert.ok(!("error" in r));
  assert.deepEqual([r.to, r.count, r.total], ["AA0000050", 50, 1000000]);
});

test("буруу муж", () => {
  assert.ok("error" in parseRange("AB123"));
  assert.ok("error" in parseRange("AA0000001", "AB0000005"));
  assert.ok("error" in parseRange("AA0000010", "AA0000005"));
  assert.ok("error" in parseRange("AA0000001", "AA0020000"));
});

test("өгөгдлийн сангийн алдааг орчуулна", () => {
  assert.match(talonDbError({ message: "TALON_NOT_SOLD", details: "2|AA0000001, AA0000002" }), /зарагдаагүй.*AA0000001/);
  assert.match(talonDbError({ message: "TALON_USED", details: "12|AA1" }), /нийт 12/);
  assert.equal(talonDbError({ message: "TALON_DATE", details: "2026-11-20|2026-11-20" }), "Зөвхөн өнөөдрийн огноогоор оруулна.");
  assert.equal(fmtMoney(1250000), "1,250,000₮");
});
