import { useEffect, useId, useRef, useState } from "react";

// Layers cut from public/images/mascot.png by scripts/mascot-layers.py.
// Coordinates are in the original 1920x1080 artwork space.
const DIR = "/images/mascot";
const LAYERS = {
  base: { x: 472, y: 192, w: 988, h: 704 },
  "bird-wing-left": { x: 746, y: 274, w: 52, h: 67 },
  "bird-wing-right": { x: 844, y: 270, w: 40, h: 69 },
  bird: { x: 784, y: 255, w: 73, h: 99 },
  flyer: { x: 1209, y: 242, w: 209, h: 126 },
  orange: { x: 1193, y: 502, w: 248, h: 243 },
  robot: { x: 847, y: 763, w: 121, h: 111 },
  "robot-halo": { x: 858, y: 749, w: 51, h: 36 },
  "hair-left": { x: 874, y: 336, w: 109, h: 116 },
  "hair-right": { x: 1014, y: 335, w: 116, h: 132 },
  tail: { x: 1032, y: 338, w: 193, h: 169 },
};
const HUB = "513,600 537,570 571,545 593,537 607,543 609,588 574,606 540,608";

// Every motion is a function of one shared phase so the whole scene stays in
// sync and loops seamlessly: θ goes 0 → 2π over LOOP seconds.
const LOOP = 6;
const STEPS = 96;
// SMIL would repaint the whole scene (filters included) at the display's
// refresh rate, 120 Hz or more on some screens. The animation is paused and
// stepped from requestAnimationFrame at this rate instead: it looks the same
// at 168 px wide and costs a fraction of the CPU/GPU time. rAF also stops on
// its own while the tab is hidden.
const FPS = 30;
const TAU = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;

// The jet bobs up and down; it pitches nose-up (nose is on the left, so a
// clockwise turn) while climbing.
const jetY = (t) => -9 * sin(t);
const jetPitch = (t) => 0.9 * cos(t);
// Upward speed of the jet, used for drag on hair and the delayed companions.
const jetClimb = (t) => cos(t);

const track = (fn) =>
  Array.from({ length: STEPS + 1 }, (_, i) => fn((i / STEPS) * TAU)).join(";");
const round = (n) => Math.round(n * 100) / 100;

function Layer({ name, filter }) {
  const { x, y, w, h } = LAYERS[name];
  return (
    <image
      href={`${DIR}/${name}.webp`}
      x={x}
      y={y}
      width={w}
      height={h}
      filter={filter}
    />
  );
}

function Motion({ type, values, reduced, children }) {
  if (reduced) return <g>{children}</g>;
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type={type}
        values={values}
        dur={`${LOOP}s`}
        repeatCount="indefinite"
      />
      {children}
    </g>
  );
}

const move = (fx, fy) => track((t) => `${round(fx(t))} ${round(fy(t))}`);
const turn = (fa, [cx, cy]) => track((t) => `${round(fa(t))} ${cx} ${cy}`);

// Hair and tail are bent with displacement maps instead of rotated as rigid
// pieces: the root stays glued to the head while the tip trails behind.
//  - drag: when the jet climbs the tips lag downward, and the other way round
//  - flutter: the wind of flight ripples each strand from root to tip
// `dir` is +1 for strands blowing to the right (tip down = clockwise) and -1
// for the tuft pointing left.
const STRANDS = {
  tail: { dir: 1, drag: 7, flutter: 9, beats: 5, phase: 0 },
  "hair-right": { dir: 1, drag: 4.5, flutter: 5, beats: 4, phase: 0.7 },
  "hair-left": { dir: -1, drag: 3.5, flutter: 4, beats: 4, phase: 1.6 },
};
// Map field strength at the strand's nominal length, times the 0.5 offset of
// feDisplacementMap; dividing by it turns a tip distance in px into `scale`.
const FIELD_AT_TIP = 0.32;

function StrandFilter({ id, name, strand }) {
  const { x, y, w, h } = LAYERS[name];
  const { dir, drag, flutter, beats, phase } = strand;
  const gust = (t) => 0.75 + 0.25 * cos(t + phase);
  const wave = (t) => beats * t + phase;
  // feDisplacementMap pulls pixels, so a negative scale pushes them along
  // the field (the field points clockwise around the root).
  const bend = (t) =>
    -(dir * drag * jetClimb(t - 0.6) + flutter * gust(t) * sin(wave(t))) /
    FIELD_AT_TIP;
  const ripple = (t) => (1.3 * flutter * gust(t) * cos(wave(t))) / FIELD_AT_TIP;
  const map = (kind, result) => (
    <feImage
      href={`${DIR}/${name}-${kind}.png`}
      x={x}
      y={y}
      width={w}
      height={h}
      preserveAspectRatio="none"
      result={result}
    />
  );
  return (
    <filter
      id={id}
      filterUnits="userSpaceOnUse"
      primitiveUnits="userSpaceOnUse"
      x={x}
      y={y}
      width={w}
      height={h}
      colorInterpolationFilters="sRGB"
    >
      {map("bend", "bendMap")}
      {map("wave", "waveMap")}
      <feDisplacementMap
        in="SourceGraphic"
        in2="bendMap"
        scale="0"
        xChannelSelector="R"
        yChannelSelector="G"
        result="bent"
      >
        <animate
          attributeName="scale"
          values={track((t) => round(bend(t)))}
          dur={`${LOOP}s`}
          repeatCount="indefinite"
        />
      </feDisplacementMap>
      <feDisplacementMap
        in="bent"
        in2="waveMap"
        scale="0"
        xChannelSelector="R"
        yChannelSelector="G"
      >
        <animate
          attributeName="scale"
          values={track((t) => round(ripple(t)))}
          dur={`${LOOP}s`}
          repeatCount="indefinite"
        />
      </feDisplacementMap>
    </filter>
  );
}

// Companions fly alongside, not bolted on: each follows the jet's climb with
// a delay that grows with its distance, plus its own way of staying aloft.
function Bird({ reduced }) {
  const flaps = 12; // 0.5s per wingbeat
  // Wings start raised (the drawn pose) and sweep down; each downstroke lifts
  // the body a little, and drifting forward tips the bird forward.
  const stroke = (t) => (1 - cos(flaps * t)) / 2;
  const drift = (t) => 2 * t + 1;
  return (
    <Motion
      type="translate"
      reduced={reduced}
      values={move(
        (t) => -5 * sin(drift(t)),
        (t) => 0.9 * jetY(t - 0.8) + 2.2 * cos(flaps * t - 0.4),
      )}
    >
      <Motion
        type="rotate"
        reduced={reduced}
        values={turn((t) => -3 * cos(drift(t)), [818, 305])}
      >
        <Motion
          type="rotate"
          reduced={reduced}
          values={turn((t) => -24 * stroke(t), [796, 303])}
        >
          <Layer name="bird-wing-left" />
        </Motion>
        <Motion
          type="rotate"
          reduced={reduced}
          values={turn((t) => 24 * stroke(t), [852, 303])}
        >
          <Layer name="bird-wing-right" />
        </Motion>
        <Layer name="bird" />
      </Motion>
    </Motion>
  );
}

function Flyer({ reduced }) {
  // Swoops in its own small loop while trailing the jet's climb; its nose
  // (right side) dips when descending and lifts when climbing.
  const y = (t) => 1.1 * jetY(t - 1.3) + 4 * sin(2 * t + 0.5);
  const fall = (t) => -9.9 * cos(t - 1.3) + 8 * cos(2 * t + 0.5);
  return (
    <Motion
      type="translate"
      reduced={reduced}
      values={move((t) => 6 * sin(2 * t + 2), y)}
    >
      <Motion
        type="rotate"
        reduced={reduced}
        values={turn((t) => 0.35 * fall(t), [1345, 300])}
      >
        <Layer name="flyer" />
      </Motion>
    </Motion>
  );
}

function Orange({ reduced }) {
  // Heavy and sluggish: the longest lag, with a slow rocking.
  return (
    <Motion
      type="translate"
      reduced={reduced}
      values={move(
        (t) => 3 * sin(t + 0.3),
        (t) => 0.8 * jetY(t - 1.1),
      )}
    >
      <Motion
        type="rotate"
        reduced={reduced}
        values={turn((t) => 2.5 * sin(t - 1.6), [1335, 615])}
      >
        <Layer name="orange" />
      </Motion>
    </Motion>
  );
}

function Robot({ reduced }) {
  // Floats just below the jet; its halo is loose, so it lags behind each
  // rise and fall of the head.
  const lift = (t) => 0.7 * jetY(t - 0.5) + 2 * sin(3 * t);
  const climb = (t) => 0.7 * 9 * cos(t - 0.5) - 6 * cos(3 * t);
  return (
    <Motion
      type="translate"
      reduced={reduced}
      values={move((t) => 3 * sin(2 * t), lift)}
    >
      <Motion
        type="rotate"
        reduced={reduced}
        values={turn((t) => 3 * cos(2 * t), [905, 812])}
      >
        <Layer name="robot" />
        <Motion
          type="translate"
          reduced={reduced}
          values={move(
            () => 0,
            (t) => 0.3 * climb(t - 0.6),
          )}
        >
          <Layer name="robot-halo" />
        </Motion>
      </Motion>
    </Motion>
  );
}

// Drives the SVG's SMIL clock at FPS instead of the display refresh rate.
function useThrottledClock(svgRef, reduced) {
  useEffect(() => {
    const svg = svgRef.current;
    if (reduced || typeof svg?.pauseAnimations !== "function") return;
    svg.pauseAnimations();
    const start = performance.now() - svg.getCurrentTime() * 1000;
    let last = 0;
    let raf = requestAnimationFrame(function frame(now) {
      if (now - last >= 1000 / FPS - 1) {
        last = now;
        svg.setCurrentTime((now - start) / 1000);
      }
      raf = requestAnimationFrame(frame);
    });
    return () => {
      cancelAnimationFrame(raf);
      svg.unpauseAnimations();
    };
  }, [svgRef, reduced]);
}

export function Mascot() {
  const id = useId().replaceAll(":", "");
  const svgRef = useRef(null);
  const ref = (name) => `url(#${id}-${name})`;
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event) => setReduced(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useThrottledClock(svgRef, reduced);
  const base = <Layer name="base" />;
  const strand = (name) => (
    <Layer name={name} filter={reduced ? undefined : ref(name)} />
  );
  return (
    <div className="mascot-widget">
      <svg
        ref={svgRef}
        className="mascot-scene"
        viewBox="472 192 988 704"
        role="img"
        aria-label="Linh vật TranAya bay cùng các bạn nhỏ: cánh quạt xoay, tóc và đuôi bay theo gió"
        focusable="false"
      >
        <defs>
          {!reduced &&
            Object.entries(STRANDS).map(([name, strand]) => (
              <StrandFilter
                key={name}
                id={`${id}-${name}`}
                name={name}
                strand={strand}
              />
            ))}
          <clipPath id={`${id}-rotor`}>
            <circle r="147" />
          </clipPath>
          <clipPath id={`${id}-hub`}>
            <polygon points={HUB} />
          </clipPath>
          <mask
            id={`${id}-fan-texture`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1920"
            height="1080"
          >
            <rect width="1920" height="1080" fill="white" />
            <polygon points={HUB} fill="black" />
          </mask>
          <radialGradient id={`${id}-fan-shadow`}>
            <stop stopColor="#44405e" />
            <stop offset="1" stopColor="#1b1728" />
          </radialGradient>
        </defs>
        <Motion type="translate" reduced={reduced} values={move(() => 0, jetY)}>
          <Motion
            type="rotate"
            reduced={reduced}
            values={turn(jetPitch, [970, 610])}
          >
            {base}
            {/* Turn the original fan texture in the plane of its elliptical opening. */}
            <g transform="translate(617 550) rotate(-22) scale(.5 1)">
              <circle r="147" fill={ref("fan-shadow")} />
              <g clipPath={ref("rotor")}>
                <Motion
                  type="rotate"
                  reduced={reduced}
                  values={track((t) => round((t / TAU) * 360 * 5))}
                >
                  <g transform="scale(2 1) rotate(22) translate(-617 -550)">
                    <g mask={ref("fan-texture")}>{base}</g>
                  </g>
                </Motion>
              </g>
            </g>
            <g clipPath={ref("hub")}>{base}</g>
            {strand("tail")}
            {strand("hair-left")}
            {strand("hair-right")}
          </Motion>
        </Motion>
        <Robot reduced={reduced} />
        <Orange reduced={reduced} />
        <Bird reduced={reduced} />
        <Flyer reduced={reduced} />
      </svg>
    </div>
  );
}
