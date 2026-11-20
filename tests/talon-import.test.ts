import { test } from "node:test";
import assert from "node:assert/strict";
import { customerMatcher, parseTalonPaste } from "../src/lib/talon-import";

test("талон импорт: харилцагч | AB | тоо, харилцагч | AB1234567, огноо, 0-ээр нөхөх", () => {
  const r = parseTalonPaste(
    [
      "Харилцагч\tТөрөл\tДугаар",
      "Эс Ти Юу\tAB\t1234567",
      "2026813-ТЭС ОЙЛ ХХК\tAA0000225",
      "Номин\tАС\t225\t2026.11.15", // кирилл АС, огноотой
      "Тэс ХХК AB7654321", // нэг нүдэнд
      "Эс Ти Юу\tAB\t1234567", // давхар
      "Сериалгүй харилцагч",
      "\tAB\t1",
    ].join("\n"),
  );
  assert.deepEqual(
    r.rows.map((x) => [x.line, x.customerName, x.customerRegister, x.serial, x.amount, x.date]),
    [
      [2, "Эс Ти Юу", null, "AB1234567", 50000, null],
      [3, "Тэс Ойл ХХК", "2026813", "AA0000225", 20000, null],
      [4, "Номин", null, "AC0000225", 10000, "2026-11-15"],
      [5, "Тэс ХХК", null, "AB7654321", 50000, null],
    ],
  );
  assert.deepEqual(r.duplicates, [{ line: 6, serial: "AB1234567", firstLine: 2 }]);
  assert.deepEqual(r.errors.map((e) => e.line), [7, 8]);
});

test("харилцагч таних: регистрээр, эсвэл нэрээр (үсэг, зай, зураас хамаарахгүй)", () => {
  const find = customerMatcher([
    { id: "1", name: "Эс Ти Юу", register: null },
    { id: "2", name: "Тэс Ойл ХХК", register: "2026813" },
  ]);
  assert.equal(find("эс-ти юу", null)?.id, "1");
  assert.equal(find("", "2026813")?.id, "2");
  assert.equal(find("Өөр нэр", "2026813")?.id, "2");
  assert.equal(find("Шинэ ХХК", null), null);
});
