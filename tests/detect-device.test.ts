import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDevice } from "../src/lib/device-detect";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  winChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  winEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
};

test("iPhone Safari / Chrome", () => {
  assert.deepEqual(detectDevice(UA.iphoneSafari, 5), { platform: "ios", browser: "safari" });
  assert.deepEqual(detectDevice(UA.iphoneChrome, 5), { platform: "ios", browser: "chrome" });
});

test("iPad (Mac гэж танилцуулдаг) ба жинхэнэ Mac", () => {
  assert.equal(detectDevice(UA.ipad, 5).platform, "ios");
  assert.deepEqual(detectDevice(UA.ipad, 0), { platform: "mac", browser: "safari" });
});

test("Android", () => {
  assert.deepEqual(detectDevice(UA.android, 5), { platform: "android", browser: "chrome" });
});

test("Windows Chrome / Edge", () => {
  assert.deepEqual(detectDevice(UA.winChrome, 0), { platform: "windows", browser: "chrome" });
  assert.deepEqual(detectDevice(UA.winEdge, 0), { platform: "windows", browser: "edge" });
});
