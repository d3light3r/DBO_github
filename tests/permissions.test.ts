import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_PERMS, can, canTalonApp, homeFor, isConfigured, permsOf, talonHome } from "../src/lib/permissions";

test("эрх: админ үргэлж бүгд, null бол албан тушаалын анхдагч", () => {
  assert.equal(permsOf({ role: "admin", permissions: [] }).size, ALL_PERMS.length);
  assert.ok(can({ role: "manager" }, "talon.sell"));
  assert.ok(!can({ role: "manager" }, "talon.undo"));
  assert.ok(can({ role: "manager" }, "attendance.dashboard"));
  assert.ok(!can({ role: "manager" }, "attendance.employees"));
  assert.ok(!canTalonApp({ role: "employee", permissions: null }));
  assert.ok(can({ role: "employee", permissions: null }, "station.talon.redeem"));
  assert.ok(can({ role: "employee", permissions: null }, "attendance.punch"));
  assert.equal(homeFor({ role: "employee", permissions: null }), "/app");
});

test("эрх: тэмдэггүй хуучин жагсаалт = Талон, ШТС тохируулсан; Цаг бүртгэл анхдагчаар", () => {
  const e = { role: "employee" as const, permissions: ["talon.customers", "station.talon.import", "bogus"] };
  assert.deepEqual([...permsOf(e)].sort(), ["attendance.punch", "station.talon.import", "talon.customers"]);
  assert.ok(canTalonApp(e));
  assert.equal(talonHome(e), "/talon/customers");
  assert.ok(!can(e, "station.talon.redeem"));
  assert.ok(isConfigured(e, "talon") && !isConfigured(e, "attendance"));
});

test("эрх: «@апп» тэмдэгтэй бол зөвхөн тохируулсан апп-д жагсаалт үйлчилнэ", () => {
  // Цаг бүртгэлийг тохируулсан (ирц бүртгүүлэхгүй, зөвхөн тайлан), Талон / ШТС анхдагч
  const e = { role: "manager" as const, permissions: ["@attendance", "attendance.reports"] };
  const p = permsOf(e);
  assert.ok(p.has("attendance.reports") && !p.has("attendance.punch") && !p.has("attendance.dashboard"));
  assert.ok(p.has("talon.sell")); // анхдагч хэвээр
  assert.equal(homeFor(e), "/app/reports");
  assert.equal(talonHome({ role: "employee", permissions: ["@talon", "@station", "@attendance"] }), null);
  assert.equal(homeFor({ role: "employee", permissions: ["@talon", "@station", "@attendance"] }), "/app/profile");
});
