import { useCallback, useEffect, useRef, useState } from "react";
import { Crocodile } from "./Crocodile.jsx";

const WORD = "TranAya";
// The intro waits until the bouquet is tapped. Petals burst out (~0.9 s) and
// gather again (~0.9 s) while the portrait fades; the crocodile appears
// (~0.5 s), holds a moment, then flies into the crocodile of the background
// scene (or the sidebar brand when the Ultra HD scene is off).
const BLOOM_MS = 3200;
const DOCK_MS = 1100;
const EXIT_MS = 300;

const TAU = Math.PI * 2;
const PETAL_COUNT = 48;
// Fixed, pseudo-random layout so the burst is the same every time and
// rendering stays pure. Directions spread evenly, with jitter in reach/size.
const PETALS = Array.from({ length: PETAL_COUNT }, (_, i) => {
  const angle = (i / PETAL_COUNT) * TAU + Math.sin(i * 12.9898) * 0.22;
  const reach = 20 + ((i * 37) % 31); // vmin
  return {
    tone: i % 3,
    style: {
      "--dx": `${(Math.cos(angle) * reach).toFixed(1)}vmin`,
      "--dy": `${(Math.sin(angle) * reach).toFixed(1)}vmin`,
      "--rot": `${((i * 83) % 360) - 180}deg`,
      "--size": `${16 + ((i * 7) % 13)}px`,
    },
  };
});

// The Ultra HD scene's visible crocodile (day: hunting, night: sleeping).
const findSceneCroc = () =>
  [
    ...document.querySelectorAll(
      ".ultra-scene .ultra-crocodile, .hd-scene .ultra-crocodile",
    ),
  ].find((element) => element.getBoundingClientRect().width > 0);
const CROC_COLORS = [
  "--croc-skin",
  "--croc-outline",
  "--croc-scales",
  "--croc-belly",
  "--croc-highlight",
  "--croc-shadow",
  "--croc-grass",
];

export function Intro({ onDone }) {
  const [phase, setPhase] = useState("revealing"),
    [dockStyle, setDockStyle] = useState({}),
    [origin, setOrigin] = useState(null),
    [sleeping, setSleeping] = useState(false),
    frozenRef = useRef(null),
    doneRef = useRef(onDone);
  const startDock = useCallback(() => {
    const target = [
      ...document.querySelectorAll(".brand-copy, .home-brand"),
    ].find((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0;
    });
    const rect = target?.getBoundingClientRect();
    if (rect?.width && rect.height) {
      const style = getComputedStyle(target);
      setDockStyle({
        "--intro-dock-x": `${rect.left + rect.width / 2}px`,
        "--intro-dock-y": `${rect.top + rect.height / 2}px`,
        "--intro-dock-size": style.fontSize,
      });
    }
    // Ultra HD shows a crocodile behind the home page; land on that one,
    // shrunk to its size so the two merge.
    const croc = findSceneCroc()?.getBoundingClientRect();
    const own = document.querySelector(".intro-croc")?.getBoundingClientRect();
    if (croc && own?.width)
      setDockStyle((style) => ({
        ...style,
        "--croc-dock-x": `${croc.left + croc.width / 2}px`,
        "--croc-dock-y": `${croc.top + croc.height / 2}px`,
        "--croc-dock-scale": (croc.width / own.width).toFixed(3),
      }));
    setPhase("docking");
  }, []);
  useEffect(() => {
    doneRef.current = onDone;
  });
  // Once the crocodile forms it stands still. With Ultra HD on, the scene's
  // crocodile is frozen too and ours copies its exact pose and facing, so
  // the two line up when ours flies in. The scene one moves on afterwards.
  useEffect(() => {
    if (phase !== "bloom") return;
    const own = document.querySelector(".intro-croc .ultra-crocodile");
    if (typeof own?.getAnimations !== "function") return;
    const scene = findSceneCroc();
    // The HD scene's crocodile is a still picture (no animation, no prey);
    // ours stands in the same still pose.
    if (scene?.closest(".hd-scene")) own.classList.add("is-still");
    // Both are the same component, so animations pair up by element position
    // and animation name.
    const keyed = (croc) => {
      const nodes = [croc, ...croc.querySelectorAll("*")];
      return new Map(
        croc
          .getAnimations({ subtree: true })
          .map((anim) => [
            `${nodes.indexOf(anim.effect?.target)}:${anim.animationName}`,
            anim,
          ]),
      );
    };
    const twins = scene ? keyed(scene) : new Map();
    for (const [key, anim] of keyed(own)) {
      anim.currentTime = twins.get(key)?.currentTime ?? 0;
      anim.pause();
    }
    if (!scene) return;
    scene.dataset.frozen = "true";
    frozenRef.current = scene;
    const colors = getComputedStyle(scene);
    for (const name of CROC_COLORS)
      own.style.setProperty(name, colors.getPropertyValue(name));
    const facing = getComputedStyle(scene.querySelector("svg")).transform;
    const svg = own.querySelector("svg");
    if (svg && facing !== "none") svg.style.transform = facing;
  }, [phase]);
  useEffect(
    () => () => {
      if (frozenRef.current) delete frozenRef.current.dataset.frozen;
    },
    [],
  );
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Nothing happens on its own until the bouquet is tapped.
    if (phase === "revealing") return;
    const duration =
      phase === "bloom"
        ? BLOOM_MS
        : phase === "docking"
          ? reduced
            ? 100
            : DOCK_MS
          : reduced
            ? 100
            : EXIT_MS;
    const timer = setTimeout(() => {
      if (phase === "bloom") startDock();
      else if (phase === "docking") setPhase("exiting");
      else doneRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [phase, startDock]);
  // Tapping the bouquet starts the petal burst from the bouquet's own spot.
  const bloom = (event) => {
    if (phase !== "revealing") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return startDock();
    // Match the scene's crocodile: sleeping at night, hunting by day.
    setSleeping(Boolean(findSceneCroc()?.classList.contains("is-sleeping")));
    const box = event.currentTarget.getBoundingClientRect();
    setOrigin({
      "--bx": `${box.left + box.width / 2}px`,
      "--by": `${box.top + box.height / 2}px`,
    });
    setPhase("bloom");
  };
  return (
    <div
      className={`intro intro-${phase}`}
      style={{ ...dockStyle, ...origin }}
      role="dialog"
      aria-label="Màn hình chào TranAya"
    >
      <h1 className="intro-title" aria-hidden="true">
        {[...WORD].map((ch, i) => (
          <span key={i} style={{ "--i": i }} aria-hidden="true">
            {ch}
          </span>
        ))}
      </h1>
      <div className="intro-portrait">
        <img
          src="/images/intro-portrait.png"
          alt=""
          width="316"
          height="592"
          draggable="false"
        />
        <button
          type="button"
          className="intro-bouquet"
          aria-label="Chạm vào bó hoa để vào TranAya"
          onClick={bloom}
          autoFocus
        />
      </div>
      {phase === "revealing" && (
        <p className="intro-hint" aria-hidden="true">
          Chạm vào bó hoa để vào TranAya
        </p>
      )}
      {phase === "bloom" &&
        PETALS.map(({ tone, style }, i) => (
          <span
            className="intro-petal"
            key={i}
            data-tone={tone}
            style={style}
          />
        ))}
      {origin && (
        <div className="intro-croc">
          <Crocodile sleeping={sleeping} />
        </div>
      )}
    </div>
  );
}
