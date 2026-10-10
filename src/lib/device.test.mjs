import test from "node:test";
import assert from "node:assert/strict";
import { isLowPowerDevice, sceneBudget } from "./device.mjs";

const env = (navigator = {}, phone = false) => ({
  navigator,
  matchMedia: () => ({ matches: phone }),
});

test("Thiết bị: máy mạnh dùng đủ hiệu ứng", () => {
  assert.equal(
    isLowPowerDevice(env({ hardwareConcurrency: 12, deviceMemory: 8 })),
    false,
  );
  assert.equal(isLowPowerDevice(env({})), false, "không rõ thông số");
});

test("Thiết bị: ít nhân, ít RAM hoặc điện thoại thì giảm hiệu ứng", () => {
  assert.equal(isLowPowerDevice(env({ hardwareConcurrency: 4 })), true);
  assert.equal(isLowPowerDevice(env({ deviceMemory: 2 })), true);
  assert.equal(isLowPowerDevice(env({ hardwareConcurrency: 8 }, true)), true);
  assert.equal(isLowPowerDevice({}), false, "môi trường không có navigator");
});

test("Thiết bị: ngân sách cảnh nền luôn dùng được, chỉ nhẹ hơn", () => {
  const low = sceneBudget(true);
  const full = sceneBudget(false);
  for (const key of Object.keys(full)) assert.ok(low[key] > 0, key);
  assert.ok(low.petals < full.petals && low.fps < full.fps);
});
