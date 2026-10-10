// Never used to block a feature: it only lets heavy decorative scenery scale
// itself down (fewer particles, lower frame rate) on weaker or smaller
// devices, so Ultra HD stays selectable and responsive everywhere.
export function isLowPowerDevice(env = globalThis) {
  const nav = env.navigator || {};
  const cores = nav.hardwareConcurrency;
  const memory = nav.deviceMemory; // Chromium only; GB, rounded down
  const phone =
    typeof env.matchMedia === "function" &&
    env.matchMedia("(max-width: 760px) and (pointer: coarse)").matches;
  return Boolean((cores && cores <= 4) || (memory && memory <= 4) || phone);
}

// How much of the Ultra scene to draw. Counts are caps on prebuilt lists.
export function sceneBudget(low) {
  return low
    ? { petals: 12, fireflies: 8, meteors: 3, dragonflies: 1, fps: 20 }
    : { petals: 42, fireflies: 28, meteors: 8, dragonflies: 3, fps: 30 };
}
