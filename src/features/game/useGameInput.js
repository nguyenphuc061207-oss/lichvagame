import { useEffect, useState } from "react";

// Physical key codes, so Vietnamese IMEs (Telex turns "w" into "ư") still work.
const KEYS = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const STICK = 48;

function createInput() {
  return {
    keys: new Set(),
    pointer: null,
    reset() {
      this.keys.clear();
      this.pointer = null;
    },
    // Movement as a vector of length <= 1; dragging wins over the keyboard.
    vector() {
      const p = this.pointer;
      if (p) {
        const dx = (p.x - p.ox) / STICK;
        const dy = (p.y - p.oy) / STICK;
        return Math.hypot(dx, dy) < 0.15 ? { x: 0, y: 0 } : { x: dx, y: dy };
      }
      const k = this.keys;
      return {
        x: (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0),
        y: (k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0),
      };
    },
  };
}

export function useGameInput(targetRef, enabled) {
  const [input] = useState(createInput);
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;
    const point = (e) => {
      const r = target.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const keyDown = (e) => {
      const key = KEYS[e.code];
      if (!key) return;
      e.preventDefault();
      input.keys.add(key);
    };
    const keyUp = (e) => {
      const key = KEYS[e.code];
      if (key) input.keys.delete(key);
    };
    const pointerDown = (e) => {
      target.setPointerCapture?.(e.pointerId);
      const { x, y } = point(e);
      input.pointer = { id: e.pointerId, ox: x, oy: y, x, y };
    };
    const pointerMove = (e) => {
      if (input.pointer?.id !== e.pointerId) return;
      Object.assign(input.pointer, point(e));
    };
    const pointerUp = (e) => {
      if (input.pointer?.id === e.pointerId) input.pointer = null;
    };
    const reset = () => input.reset();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", reset);
    target.addEventListener("pointerdown", pointerDown);
    target.addEventListener("pointermove", pointerMove);
    target.addEventListener("pointerup", pointerUp);
    target.addEventListener("pointercancel", pointerUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", reset);
      target.removeEventListener("pointerdown", pointerDown);
      target.removeEventListener("pointermove", pointerMove);
      target.removeEventListener("pointerup", pointerUp);
      target.removeEventListener("pointercancel", pointerUp);
      input.reset();
    };
  }, [enabled, input, targetRef]);
  return input;
}
