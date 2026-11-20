import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRedeemPaste } from "../src/lib/talon-redeem-import";

test("ШТС импорт: Огноо | AB | тоо, Огноо | AB1234567, огноогүй, давхар", () => {
  const r = parseRedeemPaste(
    [
      "Огноо\tТөрөл\tДугаар",
      "2026.05.08\tAB\t671",
      "2026.05.08\tАВ0000672", // кирилл
      "AC\t225", // огноогүй
      "2026.05.08\tAB\t671", // яг ижил → хасна
      "2026.05.09\tAB\t672", // өөр огноо → зөрчил
      "2026.13.01\tAB\t1", // буруу огноо
      "2026.05.08\tТэс", // сериалгүй
    ].join("\n"),
  );
  assert.deepEqual(r.rows.map((x) => [x.line, x.serial, x.amount, x.date]), [
    [2, "AB0000671", 50000, "2026-05-08"],
    [3, "AB0000672", 50000, "2026-05-08"],
    [4, "AC0000225", 10000, null],
  ]);
  assert.deepEqual(r.removed.map((d) => [d.line, d.firstLine]), [[5, 2]]);
  assert.deepEqual(r.duplicates.map((d) => [d.line, d.firstLine]), [[6, 3]]);
  assert.deepEqual(r.errors.map((e) => e.line), [7, 8]);
});
