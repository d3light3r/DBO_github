import { test } from "node:test";
import assert from "node:assert/strict";
import { isWorkDay, lateMinutes, workedAndOvertime, scheduledMinutes } from "../src/lib/schedule";
import { distanceMeters } from "../src/lib/geo";
import { zoned } from "../src/lib/time";
import type { Schedule } from "../src/lib/types";

const office: Schedule = {
  id: "o", organization_id: "x", name: "Оффис", kind: "fixed", start_time: "09:00:00", end_time: "18:00:00",
  break_minutes: 60, work_weekdays: [1, 2, 3, 4, 5], cycle_length_days: null, work_days_in_cycle: null, shift_hours: null, late_grace_minutes: 5,
};
const shift: Schedule = { ...office, id: "s", kind: "cycle", break_minutes: 0, cycle_length_days: 3, work_days_in_cycle: 1, shift_hours: 24, late_grace_minutes: 10 };

test("тогтмол хуваарь: ажлын өдөр, баяр", () => {
  assert.equal(isWorkDay(office, { cycle_anchor_date: null }, "2026-11-16"), true); // Даваа
  assert.equal(isWorkDay(office, { cycle_anchor_date: null }, "2026-11-22"), false); // Ням
  assert.equal(isWorkDay(office, { cycle_anchor_date: null }, "2026-11-16", new Set(["2026-11-16"])), false);
});

test("24/48 ээлж: 3 хоног тутамд", () => {
  const e = { cycle_anchor_date: "2026-11-15" };
  assert.deepEqual(
    ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"].map((d) => isWorkDay(shift, e, d)),
    [false, true, false, false, true],
  );
  assert.equal(isWorkDay(shift, e, "2026-11-12"), true); // anchor-аас өмнө
});

test("хоцролт: 5 минутын хөнгөлөлт", () => {
  assert.equal(lateMinutes(office, "2026-11-16", new Date("2026-11-16T09:05:00+08:00")), 0);
  assert.equal(lateMinutes(office, "2026-11-16", new Date("2026-11-16T09:20:00+08:00")), 20);
  assert.equal(lateMinutes(office, "2026-11-16", new Date("2026-11-16T08:40:00+08:00")), 0);
});

test("ажилласан цаг, илүү цаг", () => {
  assert.equal(scheduledMinutes(office), 480);
  assert.deepEqual(workedAndOvertime(office, new Date("2026-11-16T09:00:00+08:00"), new Date("2026-11-16T20:00:00+08:00")), { worked: 600, overtime: 120 });
  assert.deepEqual(workedAndOvertime(office, new Date("2026-11-16T09:00:00+08:00"), new Date("2026-11-16T12:00:00+08:00")), { worked: 180, overtime: 0 });
  assert.deepEqual(workedAndOvertime(shift, new Date("2026-11-15T09:00:00+08:00"), new Date("2026-11-16T09:30:00+08:00")), { worked: 1470, overtime: 30 });
});

test("УБ цагийн бүс, зай", () => {
  assert.deepEqual(zoned(new Date("2026-11-16T17:30:00Z")), { date: "2026-11-17", minutes: 90, weekday: 2 });
  const d = distanceMeters(47.9186, 106.9177, 47.9189, 106.918);
  assert.ok(d > 30 && d < 50, String(d));
});
