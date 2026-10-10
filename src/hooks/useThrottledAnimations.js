import { useEffect } from "react";

// Steps every CSS animation inside `rootRef` at `fps` instead of the display's
// refresh rate (120 Hz or more on some screens). Meant for slow decorative
// scenery: animations on shapes inside an SVG can't run on the compositor, so
// each frame repaints the whole SVG, and even composited layers cost a full
// compositor/GPU frame each tick. Fewer, evenly spaced frames look the same
// for gentle motion and cost a fraction of the work.
// An element inside the root marked data-frozen="true" holds still: its
// animations stop advancing and pick up where they were once unmarked.
const RESCAN_MS = 1000;

export function useThrottledAnimations(
  rootRef,
  fps = 30,
  pauseDuringGame = false,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (typeof root?.getAnimations !== "function") return;
    const driven = new Map(); // animation -> { base, start }
    let raf = 0;
    let last = 0;
    let scanned = -Infinity;
    let pausedAt = null;
    // Animations come and go (day/night swap uses display: none), so the set
    // is refreshed now and then; anything new runs freely until picked up.
    const scan = (now) => {
      scanned = now;
      for (const anim of driven.keys())
        if (anim.playState === "idle") driven.delete(anim);
      for (const anim of root.getAnimations({ subtree: true })) {
        if (driven.has(anim) || anim.playState !== "running") continue;
        driven.set(anim, { base: anim.currentTime ?? 0, start: now });
        anim.pause();
      }
    };
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (
        pauseDuringGame &&
        document.documentElement.dataset.gameActive === "true"
      ) {
        pausedAt ??= now;
        return;
      }
      if (pausedAt !== null) {
        for (const timing of driven.values()) timing.start += now - pausedAt;
        pausedAt = null;
      }
      if (now - scanned > RESCAN_MS) scan(now);
      if (now - last < 1000 / fps - 1) return;
      last = now;
      const frozen = root.querySelector('[data-frozen="true"]');
      for (const [anim, timing] of driven) {
        if (frozen?.contains(anim.effect?.target)) {
          timing.start = now - ((anim.currentTime ?? 0) - timing.base);
          continue;
        }
        anim.currentTime = timing.base + now - timing.start;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      for (const anim of driven.keys()) anim.play();
    };
  }, [rootRef, fps, pauseDuringGame]);
}
