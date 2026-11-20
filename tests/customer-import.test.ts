import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCustomerPaste, splitRegisterName, titleCase } from "../src/lib/customer-import";

test("нэр: үг бүр, зураасны дараах үсэг том; ХХК товчлол хэвээр", () => {
  assert.equal(titleCase("ЧАНДМАНЬ БАТЦОГТ"), "Чандмань Батцогт");
  assert.equal(titleCase("тэс-ойл ххк"), "Тэс-Ойл ХХК");
  assert.equal(titleCase("  МАГНАЙ   ТРЕЙД  "), "Магнай Трейд");
});

test("нэг нүднээс регистр, нэрийг салгана; нэр доторх зураас хадгалагдана", () => {
  assert.deepEqual(splitRegisterName("УУ89021223-ЧАНДМАНЬ БАТЦОГТ"), { register: "УУ89021223", kind: "person", name: "Чандмань Батцогт" });
  assert.deepEqual(splitRegisterName("2026813-ТЭС-ОЙЛ ХХК"), { register: "2026813", kind: "org", name: "Тэс-Ойл ХХК" });
  assert.deepEqual(splitRegisterName("Номин-Холдинг ХХК - 2012345"), { register: "2012345", kind: "org", name: "Номин-Холдинг ХХК" });
  assert.deepEqual(splitRegisterName("ус85010410 Болд"), { register: "УС85010410", kind: "person", name: "Болд" });
  assert.deepEqual(splitRegisterName("регистргүй ххк"), { register: null, kind: null, name: "Регистргүй ХХК" });
});

test("Excel буулгалт: нэр эсвэл регистрийн аль нэг байхад хангалттай", () => {
  const r = parseCustomerPaste(
    [
      "Регистр\tНэр",
      "УУ89021223-ЧАНДМАНЬ БАТЦОГТ\tУУ89021223-ЧАНДМАНЬ БАТЦОГТ",
      "2026813\t2026813",
      "Тэс ххк\t6123456\t99112233\tгэрээт",
      "УУ89021223 давхар",
      "Эс энд эм сольюшн-6366015",
    ].join("\r\n"),
  );
  assert.deepEqual(r.rows.map((x) => [x.line, x.name, x.register, x.phone, x.note]), [
    [2, "Чандмань Батцогт", "УУ89021223", null, null],
    [3, "", "2026813", null, null],
    [4, "Тэс ХХК", "6123456", "99112233", "гэрээт"],
    [6, "Эс Энд Эм Сольюшн", "6366015", null, null],
  ]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.duplicates.map((d) => [d.line, d.firstLine]), [[5, 2]]);
});

test("том/жижиг үсэг, зай, зураасаар ялгаатай нэр = нэг харилцагч", () => {
  const r = parseCustomerPaste(["эс ти юу", "Эс Ти Юу", "эс ти  юу", "Эс Ти юу", "эс-ти-юу", "Эс Ти Юу-6000001", "Эстэйт КО-6706452"].join("\n"));
  // Регистргүй эхний мөрөнд дараагийн мөрийн регистр нөхөгдөнө
  assert.deepEqual(r.rows.map((x) => [x.line, x.name, x.register]), [[1, "Эс Ти Юу", "6000001"], [7, "Эстэйт Ко", "6706452"]]);
  assert.equal(r.duplicates.length, 5);
});

test("ижил нэртэй ч өөр регистртэй бол 2 өөр харилцагч", () => {
  const r = parseCustomerPaste("Номин 2000001\nНомин 2000002");
  assert.equal(r.rows.length, 2);
});
