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
  assert.equal(splitRegisterName("Регистргүй ХХК"), null);
});

test("Excel буулгалт: нэг багана ба олон багана, алдаатай мөрийг жагсаана", () => {
  const r = parseCustomerPaste(
    "Регистр\tНэр\n" +
      "УУ89021223-ЧАНДМАНЬ БАТЦОГТ\tУУ89021223-ЧАНДМАНЬ БАТЦОГТ\n" + // 2 баганад ижил текст
      "2026813\t2026813\n" + //                                       нэргүй
      "Тэс ххк\t6123456\t99112233\tгэрээт\n" +
      "УУ89021223 давхар\n" +
      "Зүгээр текст\n",
  );
  assert.deepEqual(r.rows.map((x) => [x.line, x.name, x.register, x.phone, x.note]), [
    [2, "Чандмань Батцогт", "УУ89021223", null, null],
    [4, "Тэс ХХК", "6123456", "99112233", "гэрээт"],
  ]);
  assert.deepEqual(r.errors.map((e) => [e.line, e.message.split(" ")[0]]), [[3, "нэр"], [6, "регистр"]]);
  assert.deepEqual(r.duplicates.map((d) => [d.line, d.firstLine]), [[5, 2]]);
});
