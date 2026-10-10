import {
  petalPositions,
  shieldHealth,
  shieldCapacity,
  LASERS,
  ENEMIES,
} from "../../lib/game.mjs";
import { drawDragon, DRAGON_STYLES } from "./dragons.mjs";
import { cachedArtwork } from "./render-cache.mjs";

const COLORS = [
  "ground",
  "tuft",
  "bloom",
  "petal",
  "petal-2",
  "center",
  "seed",
  "gem",
  "gem-edge",
  "aphid",
  "wasp",
  "beetle",
  "boss",
  "eye",
  "stick",
];

// Colours come from CSS custom properties so light/dark themes stay in CSS.
export function readPalette(el) {
  const css = getComputedStyle(el);
  return Object.fromEntries(
    COLORS.map((c) => [c, css.getPropertyValue(`--game-${c}`).trim()]),
  );
}

// Ally sprites reuse the mascot layers; numbers are each layer's box in the
// 1920x1080 artwork (see LAYERS in src/components/ui/Mascot.jsx).
const ALLY_LAYERS = {
  bird: [
    ["bird-wing-left", 746, 274, 52, 67],
    ["bird-wing-right", 844, 270, 40, 69],
    ["bird", 784, 255, 73, 99],
  ],
  robot: [
    ["robot", 847, 763, 121, 111],
    ["robot-halo", 858, 749, 51, 36],
  ],
  flyer: [["flyer", 1209, 242, 209, 126]],
  orange: [["orange", 1193, 502, 248, 243]],
};
const ALLY_HEIGHT = { bird: 34, robot: 34, flyer: 30, orange: 40 };
const SHOT_COLOR = {
  bird: "#7fb8f0",
  robot: "#e879c6",
  flyer: "#f08a2c",
};

export const SPRITE_URLS = Object.fromEntries([
  ["coin", "/images/game/aya-coin.png"],
  ["guardian", "/images/game/guardian-cloud.png"],
  ["guardian-shield", "/images/game/guardian-shield.png"],
  ...Object.values(ALLY_LAYERS)
    .flat()
    .map(([name]) => [name, `/images/mascot/${name}.webp`]),
]);

const ready = (img) => img?.complete && img.naturalWidth > 0;

function drawAlly(g, a, sprites, bob) {
  if (a.kind === "guardian") {
    if (ready(sprites.guardian)) {
      const height = 58;
      const width =
        (height * sprites.guardian.naturalWidth) /
        sprites.guardian.naturalHeight;
      g.drawImage(
        sprites.guardian,
        a.x - width / 2,
        a.y - height / 2 + bob,
        width,
        height,
      );
    } else {
      g.fillStyle = "#c88cec";
      g.beginPath();
      g.arc(a.x, a.y + bob, 9, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }
  const layers = ALLY_LAYERS[a.kind];
  const left = Math.min(...layers.map((l) => l[1]));
  const top = Math.min(...layers.map((l) => l[2]));
  const right = Math.max(...layers.map((l) => l[1] + l[3]));
  const bottom = Math.max(...layers.map((l) => l[2] + l[4]));
  const k = ALLY_HEIGHT[a.kind] / (bottom - top);
  g.save();
  g.translate(a.x, a.y + bob);
  // The artwork faces left; mirror it when the ally moves right.
  g.scale(a.facing > 0 ? -k : k, k);
  g.translate(-(left + right) / 2, -(top + bottom) / 2);
  for (const [name, x, y, w, h] of layers)
    if (ready(sprites[name])) g.drawImage(sprites[name], x, y, w, h);
  g.restore();
}

const TILE = 70;

function drawGround(g, pal, cx, cy, w, h) {
  g.fillStyle = pal.ground;
  g.fillRect(cx, cy, w, h);
  g.lineWidth = 2;
  g.lineCap = "round";
  for (let gx = Math.floor(cx / TILE); gx <= (cx + w) / TILE; gx++)
    for (let gy = Math.floor(cy / TILE); gy <= (cy + h) / TILE; gy++) {
      const hash = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
      const x = gx * TILE + (hash % 50);
      const y = gy * TILE + ((hash >>> 8) % 50);
      if (hash % 3 === 0) {
        g.strokeStyle = pal.tuft;
        g.beginPath();
        g.moveTo(x - 5, y - 6);
        g.lineTo(x, y + 2);
        g.lineTo(x + 5, y - 7);
        g.stroke();
      } else if (hash % 7 === 0) {
        g.fillStyle = pal.bloom;
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
}

function sunflower(g, pal, x, y, r, spin) {
  for (let i = 0; i < 12; i++) {
    g.save();
    g.translate(x, y);
    g.rotate(spin + (i * Math.PI) / 6);
    g.fillStyle = i % 2 ? pal["petal-2"] : pal.petal;
    g.beginPath();
    g.ellipse(0, -r * 0.95, r * 0.32, r * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = pal.center;
  g.beginPath();
  g.arc(x, y, r * 0.58, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = pal.eye;
  for (const dx of [-0.2, 0.2]) {
    g.beginPath();
    g.arc(x + dx * r, y - r * 0.1, r * 0.08, 0, Math.PI * 2);
    g.fill();
  }
}

function eyes(g, pal, x, y, r, angle) {
  g.fillStyle = pal.eye;
  for (const side of [-0.45, 0.45]) {
    g.beginPath();
    g.arc(
      x + Math.cos(angle + side) * r * 0.55,
      y + Math.sin(angle + side) * r * 0.55,
      Math.max(1.6, r * 0.16),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
}

function drawEnemy(g, pal, e, p, time, reducedMotion, cache) {
  const angle = Math.atan2(p.y - e.y, p.x - e.x);
  const variant = ENEMIES[e.kind].dragon;
  if (variant) {
    const flap = reducedMotion ? 0 : Math.sin(time * 4 + e.x * 0.01);
    const pose = Math.round((flap + 1) * 2);
    const sprite = cachedArtwork(
      cache,
      "dragons",
      `${variant}:${pose}:${e.flash > 0 ? 1 : 0}`,
      144,
      128,
      (context) => {
        drawDragon(
          context,
          { x: 72, y: 64, r: 28, flash: e.flash },
          variant,
          0,
          Math.asin((pose - 2) / 2) / 4 - 0.18,
          false,
        );
      },
    );
    if (sprite) {
      g.save();
      g.translate(e.x, e.y);
      g.rotate(angle);
      const scale = e.r / 28;
      g.drawImage(sprite, -72 * scale, -64 * scale, 144 * scale, 128 * scale);
      g.restore();
    } else drawDragon(g, e, variant, angle, time, reducedMotion);
    const accent = DRAGON_STYLES[variant].glow;
    if (
      e.attackCd < 0.7 &&
      ["stormdrake", "sundrake", "voidlord", "goldlord"].includes(e.kind)
    ) {
      g.save();
      g.strokeStyle = accent;
      g.lineWidth = 1.5;
      g.setLineDash([5, 5]);
      g.beginPath();
      if (e.kind === "goldlord") g.arc(e.x, e.y, e.r * 1.8, 0, Math.PI * 2);
      else {
        g.moveTo(e.x, e.y);
        g.lineTo(e.x + Math.cos(angle) * 115, e.y + Math.sin(angle) * 115);
      }
      g.stroke();
      g.restore();
    }
    if (e.elite || ENEMIES[e.kind].boss || ENEMIES[e.kind].armor) {
      g.fillStyle = pal.tuft;
      g.fillRect(e.x - e.r, e.y - e.r * 1.8 - 8, e.r * 2, 4);
      g.fillStyle = accent;
      g.fillRect(
        e.x - e.r,
        e.y - e.r * 1.8 - 8,
        e.r * 2 * Math.max(0, e.hp / e.maxHp),
        4,
      );
    }
    if (ENEMIES[e.kind].boss) {
      g.save();
      g.font = "600 11px sans-serif";
      g.textAlign = "center";
      g.fillStyle = pal.eye;
      g.fillText(ENEMIES[e.kind].name, e.x, e.y - e.r * 1.8 - 13);
      g.restore();
    }
    return;
  }
  const color =
    e.flash > 0
      ? "#ffffff"
      : { charger: "#df643e", spitter: "#29a78d", brood: "#b769b6" }[e.kind] ||
        pal[e.kind];
  g.fillStyle = color;
  if (e.kind === "boss") {
    // A caterpillar: segments trail away from the player.
    for (let i = 4; i >= 1; i--) {
      g.beginPath();
      g.arc(
        e.x - Math.cos(angle) * e.r * 0.85 * i,
        e.y - Math.sin(angle) * e.r * 0.85 * i,
        e.r * (1 - i * 0.12),
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  g.beginPath();
  if (e.kind === "wasp")
    g.ellipse(e.x, e.y, e.r * 1.25, e.r * 0.85, angle, 0, Math.PI * 2);
  else g.arc(e.x, e.y, e.r, 0, Math.PI * 2);
  g.fill();
  if (e.kind === "beetle" || e.kind === "wasp") {
    g.strokeStyle = pal.eye;
    g.lineWidth = 1.5;
    g.beginPath();
    const nx = Math.cos(angle + Math.PI / 2) * e.r * 0.8;
    const ny = Math.sin(angle + Math.PI / 2) * e.r * 0.8;
    g.moveTo(e.x - nx, e.y - ny);
    g.lineTo(e.x + nx, e.y + ny);
    g.stroke();
  }
  eyes(g, pal, e.x, e.y, e.r, angle);
  if (e.kind === "charger") {
    g.strokeStyle = "#f4ad72";
    g.lineWidth = 2;
    g.beginPath();
    for (const side of [-1, 1]) {
      g.moveTo(
        e.x + Math.cos(angle + side * 0.6) * e.r,
        e.y + Math.sin(angle + side * 0.6) * e.r,
      );
      g.lineTo(
        e.x + Math.cos(angle) * e.r * 1.8,
        e.y + Math.sin(angle) * e.r * 1.8,
      );
    }
    g.stroke();
    if (e.attackCd < 0.6) {
      g.save();
      g.setLineDash([4, 5]);
      g.beginPath();
      g.moveTo(e.x, e.y);
      g.lineTo(e.x + Math.cos(angle) * 90, e.y + Math.sin(angle) * 90);
      g.stroke();
      g.restore();
    }
  }
  if (e.kind === "brood" || e.kind === "spitter") {
    g.strokeStyle = "#eaffd1";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(e.x, e.y, e.r * 0.65, angle + 0.8, angle + Math.PI * 2 - 0.8);
    g.stroke();
    if (e.kind === "brood") {
      g.fillStyle = "#fce7f3";
      for (const offset of [-6, 6]) {
        g.beginPath();
        g.arc(e.x + offset, e.y + e.r * 0.5, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (e.elite || e.slowUntil > 0) {
    g.strokeStyle = e.elite ? "#facc15" : "#67e8f9";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
    g.stroke();
  }
  if (e.kind === "boss" || e.elite) {
    g.fillStyle = pal.tuft;
    g.fillRect(e.x - 30, e.y - e.r - 14, 60, 5);
    g.fillStyle = pal.boss;
    g.fillRect(e.x - 30, e.y - e.r - 14, (60 * e.hp) / e.maxHp, 5);
  }
}

function laserCore(g, length, laser) {
  g.lineCap = "round";
  for (const [width, alpha, color] of [
    [15, 0.1, laser.color],
    [9, 0.25, laser.color],
    [4, 1, laser.color],
    [1.5, 1, "#ffffff"],
  ]) {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(-length, 0);
    g.lineTo(0, 0);
    g.stroke();
  }
  const head = g.createRadialGradient(0, 0, 0, 0, 0, 10);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.2, laser.color);
  head.addColorStop(1, `${laser.color}00`);
  g.globalAlpha = 0.8;
  g.fillStyle = head;
  g.beginPath();
  g.arc(0, 0, 10, 0, Math.PI * 2);
  g.fill();
}

export function drawLaserProjectile(g, b, time, reducedMotion = false, cache) {
  const tier = Number(b.kind.slice(5));
  const laser = LASERS[tier];
  if (!laser) return;
  const length = 28 + tier * 6;
  const phase = reducedMotion ? 0 : Math.floor(time * 16 + (b.life || 0) * 9);
  g.save();
  g.translate(b.x, b.y);
  g.rotate(Math.atan2(b.vy, b.vx));
  g.lineCap = "round";
  const core = cachedArtwork(
    cache,
    "lasers",
    tier,
    length + 24,
    32,
    (context) => {
      context.translate(length + 12, 16);
      laserCore(context, length, laser);
    },
  );
  if (core) g.drawImage(core, -length - 12, -16, length + 24, 32);
  else laserCore(g, length, laser);
  g.globalAlpha = reducedMotion ? 0.55 : 0.9;
  g.strokeStyle = laser.color;
  g.lineWidth = 1.25;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(-length - 2, 0);
    for (let i = 1; i < 8; i++) {
      const x = -length + (length * i) / 8;
      const jitter = Math.sin(phase * 1.7 + i * 5.3 + side * 2) * 3;
      g.lineTo(x, side * (5 + tier * 0.4 + jitter));
    }
    g.lineTo(2, 0);
    g.stroke();
    for (let i = 0; i < 2; i++) {
      const x = -length * (0.3 + i * 0.4);
      g.beginPath();
      g.moveTo(x, side * 5);
      g.lineTo(x - 3, side * 10);
      g.lineTo(x + 3, side * 13);
      g.stroke();
    }
  }
  g.restore();
}

export function drawGame(g, pal, s, view, opts = {}) {
  const { w, h } = view;
  const p = s ? s.player : { x: 0, y: 0, r: 16, invuln: 0 };
  const cx = p.x - w / 2;
  const cy = p.y - h / 2;
  const visible = (x, y, margin = 60) =>
    x >= cx - margin &&
    x <= cx + w + margin &&
    y >= cy - margin &&
    y <= cy + h + margin;
  g.save();
  g.translate(-cx, -cy);
  drawGround(g, pal, cx, cy, w, h);
  if (s) {
    // Sun drops are outlined diamonds so they stand out from ground dots.
    g.fillStyle = pal.gem;
    g.strokeStyle = pal["gem-edge"];
    g.lineWidth = 1.5;
    for (const gem of s.gems) {
      if (!visible(gem.x, gem.y, 12)) continue;
      const r = gem.value > 2 ? 8 : 6;
      g.beginPath();
      g.moveTo(gem.x, gem.y - r);
      g.lineTo(gem.x + r * 0.7, gem.y);
      g.lineTo(gem.x, gem.y + r);
      g.lineTo(gem.x - r * 0.7, gem.y);
      g.closePath();
      g.fill();
      g.stroke();
    }
    const coin = opts.sprites?.coin;
    for (const c of s.coinDrops) {
      if (!visible(c.x, c.y, 12)) continue;
      if (ready(coin)) g.drawImage(coin, c.x - 11, c.y - 11, 22, 22);
      else {
        g.fillStyle = pal.gem;
        g.beginPath();
        g.arc(c.x, c.y, 10, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const e of s.enemies) {
      if (!visible(e.x, e.y, e.r * 5 + 15)) continue;
      drawEnemy(g, pal, e, p, s.time, opts.reducedMotion, opts.cache);
    }
    for (const shot of s.enemyShots || []) {
      if (!visible(shot.x, shot.y, 12)) continue;
      g.fillStyle = shot.color || "#e96264";
      g.strokeStyle = "#fff3cf";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (shot.electric && !opts.reducedMotion) {
        g.strokeStyle = shot.color;
        g.beginPath();
        g.moveTo(shot.x - 9, shot.y - 6);
        g.lineTo(shot.x - 3, shot.y + 1);
        g.lineTo(shot.x - 7, shot.y + 5);
        g.lineTo(shot.x + 9, shot.y + 6);
        g.stroke();
      }
    }
    const novaAge = s.time - s.novaAt;
    if (novaAge >= 0 && novaAge < 0.45) {
      g.save();
      g.globalAlpha = 1 - novaAge / 0.45;
      g.strokeStyle = "#f6bb44";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(
        p.x,
        p.y,
        opts.reducedMotion ? 150 : 20 + (130 * novaAge) / 0.45,
        0,
        Math.PI * 2,
      );
      g.stroke();
      g.restore();
    }
    for (const b of s.bullets) {
      if (!visible(b.x, b.y, 90)) continue;
      const laser =
        b.kind?.startsWith("laser") && LASERS[Number(b.kind.slice(5))];
      if (laser) {
        drawLaserProjectile(g, b, s.time, opts.reducedMotion, opts.cache);
        continue;
      }
      g.fillStyle = SHOT_COLOR[b.kind] || pal.seed;
      g.beginPath();
      g.ellipse(b.x, b.y, 6, 3.5, Math.atan2(b.vy, b.vx), 0, Math.PI * 2);
      g.fill();
    }
    for (const flash of s.lightning || []) {
      const fade = Math.max(0, 1 - (s.time - flash.at) / 0.24);
      g.save();
      g.globalAlpha = fade;
      g.strokeStyle = LASERS[flash.tier].color;
      g.lineWidth = 2;
      g.lineCap = "round";
      if (flash.fromX !== undefined) {
        g.beginPath();
        g.moveTo(flash.fromX, flash.fromY);
        g.lineTo(
          (flash.fromX + flash.x) / 2 + (opts.reducedMotion ? 0 : 7),
          (flash.fromY + flash.y) / 2 - (opts.reducedMotion ? 0 : 7),
        );
        g.lineTo(flash.x, flash.y);
        g.stroke();
      }
      if (opts.reducedMotion) {
        g.beginPath();
        g.arc(flash.x, flash.y, 13, 0, Math.PI * 2);
        g.stroke();
      } else {
        for (let i = 0; i < flash.tier + 3; i++) {
          const angle = (i * Math.PI * 2) / (flash.tier + 3) + flash.at;
          g.save();
          g.translate(flash.x, flash.y);
          g.rotate(angle);
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(9, -5);
          g.lineTo(13, 4);
          g.lineTo(22, -3);
          g.lineTo(26 + flash.tier * 4, 1);
          g.stroke();
          g.restore();
        }
      }
      g.restore();
    }
    s.allies
      .filter((a) => a.kind !== "guardian")
      .forEach((a, i) =>
        drawAlly(
          g,
          a,
          opts.sprites || {},
          opts.reducedMotion ? 0 : Math.sin(s.time * 5 + i) * 2.5,
        ),
      );
    g.fillStyle = pal.petal;
    for (const petal of petalPositions(s)) {
      g.beginPath();
      g.ellipse(petal.x, petal.y, 6, 13, petal.a, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (s && shieldHealth(s) > 0) {
    const shieldY = p.y + 3;
    const r = p.r * 1.25 * 1.55 + 3;
    const shield = opts.sprites?.["guardian-shield"];
    if (ready(shield)) {
      // Wrap only the flower; the cloud rider sits above the bubble's rim.
      g.globalAlpha = 1;
      g.drawImage(
        shield,
        p.x - r * 1.16,
        shieldY - r * 1.16,
        r * 2.32,
        r * 2.32,
      );
      g.globalAlpha = 1;
    } else {
      const glow = g.createRadialGradient(
        p.x - r * 0.3,
        shieldY - r * 0.4,
        2,
        p.x,
        shieldY,
        r,
      );
      glow.addColorStop(0, "#effcff08");
      glow.addColorStop(0.75, "#70dcff66");
      glow.addColorStop(1, "#82cfffaa");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(p.x, shieldY, r, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#a7f6ffbb";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(
      p.x,
      shieldY,
      r,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * shieldHealth(s)) / shieldCapacity(s),
    );
    g.stroke();
  }
  const blink = p.invuln > 0 && (opts.reducedMotion || (p.invuln * 20) % 2 < 1);
  g.globalAlpha = blink ? 0.45 : 1;
  sunflower(
    g,
    pal,
    p.x,
    p.y,
    p.r * 1.25,
    opts.reducedMotion ? 0 : (s?.time || 0) * 0.8,
  );
  g.globalAlpha = 1;
  if (s && shieldHealth(s) > 0) {
    // The front shell tints the petals and face, making the flower sit inside.
    const shieldY = p.y + 3;
    const r = p.r * 1.25 * 1.55 + 3;
    const shield = opts.sprites?.["guardian-shield"];
    g.save();
    if (ready(shield)) {
      g.globalAlpha = 0.45;
      g.drawImage(
        shield,
        p.x - r * 1.16,
        shieldY - r * 1.16,
        r * 2.32,
        r * 2.32,
      );
    } else {
      g.fillStyle = "#39adff66";
      g.beginPath();
      g.arc(p.x, shieldY, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  if (s) {
    for (const a of s.allies.filter((a) => a.kind === "guardian")) {
      drawAlly(
        g,
        a,
        opts.sprites || {},
        opts.reducedMotion ? 0 : Math.sin(s.time * 3) * 1.2,
      );
    }
  }
  g.restore();

  const stick = opts.pointer;
  if (stick) {
    g.strokeStyle = pal.stick;
    g.fillStyle = pal.stick;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(stick.ox, stick.oy, 48, 0, Math.PI * 2);
    g.stroke();
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const k = Math.min(1, 48 / (Math.hypot(dx, dy) || 1));
    g.beginPath();
    g.arc(stick.ox + dx * k, stick.oy + dy * k, 18, 0, Math.PI * 2);
    g.fill();
  }
}
