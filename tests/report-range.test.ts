import { test } from "node:test";
import assert from "node:assert/strict";
import { reportRange } from "../src/lib/time";

const today = "2026-11-18";

test("огноо өгөөгүй бол сарын эхнээс өнөөдөр хүртэл", () => {
  assert.deepEqual(reportRange(undefined, undefined, today), { from: "2026-11-01", to: today });
});

test("буруу огноог үл тооно", () => {
  assert.deepEqual(reportRange("abc", "2026-13-45", today), { from: "2026-11-01", to: today });
});

test("хэт урт мужийг 366 хоногоор хязгаарлана", () => {
  assert.deepEqual(reportRange("0001-01-01", "9999-12-31", today), { from: "9998-12-31", to: "9999-12-31" });
  assert.deepEqual(reportRange("2020-01-01", "2026-11-18", today), { from: "2025-11-18", to: "2026-11-18" });
});

test("эхлэх нь дуусахаас хойш бол дуусахтай тэнцүүлнэ", () => {
  assert.deepEqual(reportRange("2026-11-10", "2026-11-05", today), { from: "2026-11-05", to: "2026-11-05" });
});

test("хэвийн мужийг өөрчлөхгүй", () => {
  assert.deepEqual(reportRange("2026-10-01", "2026-10-31", today), { from: "2026-10-01", to: "2026-10-31" });
});
