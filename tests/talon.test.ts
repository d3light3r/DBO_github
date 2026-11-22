import { test } from "node:test";
import assert from "node:assert/strict";
import { describeRanges, fmtMoney, normalizeSerial, parseRange, parseTalonForm, parseTalonRow, talonAmount, talonDbError } from "../src/lib/talon";

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

test("мөр: эхний дугаар + тоо ширхэг -> сүүлийн сериал", () => {
  const r = parseTalonRow("AB", "1234567", "", "10");
  assert.ok(r && !("error" in r));
  assert.deepEqual([r.from, r.to, r.count, r.total], ["AB1234567", "AB1234576", 10, 500000]);
  const single = parseTalonRow("AA", "123456", "", "");
  assert.ok(single && !("error" in single));
  assert.deepEqual([single.from, single.to], ["AA0123456", "AA0123456"]);
  assert.equal(parseTalonRow("AC", "", "", ""), null);
  assert.ok("error" in parseTalonRow("AC", "100", "105", "3")!);
  assert.ok("error" in parseTalonRow("AC", "", "105", "")!);
});

test("маягт: AB, AA, AC мөрүүд", () => {
  const f: Record<string, string> = { from_AA: "0123456", qty_AA: "2", from_AC: "2345678", to_AC: "2345680" };
  const r = parseTalonForm((k) => f[k] ?? "");
  assert.ok(!("error" in r));
  assert.deepEqual(r.ranges.map((x) => `${x.from}-${x.to}`), ["AA0123456-AA0123457", "AC2345678-AC2345680"]);
  assert.match(describeRanges(r.ranges), /Нийт 5 ширхэг, 70,000₮/);
  assert.ok("error" in parseTalonForm(() => ""));
});
