import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_PERMS, can, canTalonApp, permsOf, talonHome } from "../src/lib/permissions";

test("эрх: админ үргэлж бүгд, null бол албан тушаалын анхдагч, оноосон бол түүгээр", () => {
  assert.equal(permsOf({ role: "admin", permissions: [] }).size, ALL_PERMS.length);
  assert.ok(can({ role: "manager" }, "talon.sell"));
  assert.ok(!can({ role: "manager" }, "talon.undo"));
  assert.ok(!canTalonApp({ role: "employee", permissions: null }));
  assert.ok(can({ role: "employee", permissions: null }, "station.talon.redeem"));

  const e = { role: "employee" as const, permissions: ["talon.customers", "station.talon.import", "bogus"] };
  assert.deepEqual([...permsOf(e)].sort(), ["station.talon.import", "talon.customers"]);
  assert.ok(canTalonApp(e));
  assert.equal(talonHome(e), "/talon/customers");
  assert.ok(!can(e, "station.talon.redeem"));
  assert.equal(talonHome({ role: "employee", permissions: [] }), null);
});
