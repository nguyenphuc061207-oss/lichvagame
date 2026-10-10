import field from "../../assets/sunflower-field-ultra.svg?raw";
import sky from "../../assets/sunflower-sky-ultra.svg?raw";
import nightField from "../../assets/sunflower-field-ultra-dark.svg?raw";
import nightSky from "../../assets/sunflower-sky-ultra-dark.svg?raw";
import { useRef, useState } from "react";
import { isLowPowerDevice, sceneBudget } from "../../lib/device.mjs";
import { Crocodile } from "./Crocodile.jsx";
import { useThrottledAnimations } from "../../hooks/useThrottledAnimations.js";

const PETALS = Array.from({ length: 42 }, (_, i) => ({
  "--petal-height": `${12 + ((i * 37) % 80)}%`,
  "--petal-size": `${8 + (i % 5) * 2}px`,
  "--flight-time": `${19 + (i % 9) * 2}s`,
  "--flight-delay": `-${(i * 7.3) % 35}s`,
  "--flutter-time": `${2.8 + (i % 6) * 0.5}s`,
  "--petal-opacity": 0.4 + (i % 4) * 0.13,
}));

const FIREFLIES = Array.from({ length: 28 }, (_, i) => ({
  left: `${6 + ((i * 31) % 88)}%`,
  top: `${56 + ((i * 17) % 38)}%`,
  "--firefly-size": `${2 + (i % 3)}px`,
  "--drift-x": `${(i % 2 ? -1 : 1) * (28 + (i % 5) * 12)}px`,
  "--drift-y": `${-25 - (i % 6) * 9}px`,
  "--drift-time": `${9 + (i % 7) * 1.4}s`,
  "--glow-time": `${2.4 + (i % 5) * 0.7}s`,
  "--firefly-delay": `-${i * 1.3}s`,
}));

const METEORS = [
  { left: "88%", top: "12%", "--meteor-time": "13s", "--meteor-delay": "-2s" },
  { left: "70%", top: "6%", "--meteor-time": "19s", "--meteor-delay": "-10s" },
  { left: "98%", top: "28%", "--meteor-time": "27s", "--meteor-delay": "-19s" },
  { left: "62%", top: "18%", "--meteor-time": "9s", "--meteor-delay": "-5s" },
  { left: "94%", top: "5%", "--meteor-time": "11s", "--meteor-delay": "-8s" },
  { left: "78%", top: "32%", "--meteor-time": "15s", "--meteor-delay": "-1s" },
  { left: "55%", top: "9%", "--meteor-time": "17s", "--meteor-delay": "-12s" },
  { left: "85%", top: "22%", "--meteor-time": "21s", "--meteor-delay": "-17s" },
];

function Dragonfly({ index }) {
  return (
    <div
      className={`ultra-dragonfly ultra-dragonfly-${index}`}
      style={{ "--dragonfly-delay": `-${index * 11}s` }}
    >
      <svg viewBox="0 0 100 80" focusable="false">
        <g className="ultra-wings">
          <g
            fill="#fffdf2"
            fillOpacity="0.7"
            stroke="#9da984"
            strokeWidth="0.8"
          >
            <ellipse
              cx="30"
              cy="26"
              rx="25"
              ry="7"
              transform="rotate(22 30 26)"
            />
            <ellipse
              cx="70"
              cy="26"
              rx="25"
              ry="7"
              transform="rotate(-22 70 26)"
            />
            <ellipse
              cx="28"
              cy="43"
              rx="23"
              ry="6"
              transform="rotate(-12 28 43)"
            />
            <ellipse
              cx="72"
              cy="43"
              rx="23"
              ry="6"
              transform="rotate(12 72 43)"
            />
          </g>
          <path
            d="M8 18L48 33L92 18M8 48L48 36L92 48"
            fill="none"
            stroke="#b4bf9e"
            strokeWidth="0.6"
          />
        </g>
        <path
          d="M50 32L50 72"
          stroke="#51795d"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M50 45L50 69"
          stroke="#a7bb73"
          strokeWidth="2"
          strokeDasharray="2 4"
        />
        <ellipse cx="50" cy="32" rx="4" ry="8" fill="#47705b" />
        <circle cx="47" cy="23" r="3" fill="#698e70" />
        <circle cx="53" cy="23" r="3" fill="#698e70" />
      </svg>
    </div>
  );
}

export function UltraScene() {
  const ref = useRef(null);
  // Weak or small devices get the same scene with fewer particles and a lower
  // frame rate; Ultra HD is never locked out.
  const [budget] = useState(() => sceneBudget(isLowPowerDevice()));
  // ~220 decorative animations; at the display rate they repaint the
  // full-screen SVGs every frame. Step them all at 30 fps instead.
  useThrottledAnimations(ref, budget.fps, true);
  return (
    <div className="ultra-scene" aria-hidden="true" ref={ref}>
      <div className="ultra-day">
        <div className="ultra-sky" dangerouslySetInnerHTML={{ __html: sky }} />
        <div className="ultra-sunlight" />
        <div
          className="ultra-field"
          dangerouslySetInnerHTML={{ __html: field }}
        />
        <div className="ultra-petals">
          {PETALS.slice(0, budget.petals).map((style, i) => (
            <span className="ultra-petal-flight" key={i} style={style}>
              <span className="ultra-petal" />
            </span>
          ))}
        </div>
        {[0, 1, 2].slice(0, budget.dragonflies).map((index) => (
          <Dragonfly key={index} index={index} />
        ))}
        <Crocodile />
      </div>
      <div className="ultra-night">
        <div
          className="ultra-sky"
          dangerouslySetInnerHTML={{ __html: nightSky }}
        />
        {METEORS.slice(0, budget.meteors).map((style, i) => (
          <span className="ultra-meteor" key={i} style={style} />
        ))}
        <div
          className="ultra-field"
          dangerouslySetInnerHTML={{ __html: nightField }}
        />
        {FIREFLIES.slice(0, budget.fireflies).map((style, i) => (
          <span className="ultra-firefly" key={i} style={style}>
            <span className="ultra-firefly-light" />
          </span>
        ))}
        <Crocodile sleeping />
      </div>
    </div>
  );
}
