export const DRAGON_STYLES = {
  shadow: {
    body: "#252443",
    edge: "#8b5cf6",
    wing: "#50347e",
    glow: "#d580ff",
    gold: false,
  },
  storm: {
    body: "#332c59",
    edge: "#ba79ff",
    wing: "#73519c",
    glow: "#dec1ff",
    gold: false,
  },
  armor: {
    body: "#5b6671",
    edge: "#e4b74c",
    wing: "#c5a968",
    glow: "#fff0af",
    gold: true,
  },
  sun: {
    body: "#856645",
    edge: "#ffca62",
    wing: "#ebac55",
    glow: "#fff3d2",
    gold: true,
  },
  voidBoss: {
    body: "#191d37",
    edge: "#aa59f5",
    wing: "#643c8a",
    glow: "#eba2ff",
    gold: false,
  },
  goldBoss: {
    body: "#667080",
    edge: "#f9d473",
    wing: "#d2b871",
    glow: "#fff7da",
    gold: true,
  },
};

// Code-native artwork stays sharp at every game zoom and theme.
export function drawDragon(
  g,
  e,
  variant,
  angle,
  time = 0,
  reducedMotion = false,
) {
  const c = DRAGON_STYLES[variant];
  const flap = reducedMotion ? 0 : Math.sin(time * 4 + e.x * 0.01) * 0.1;
  g.save();
  g.translate(e.x, e.y);
  g.rotate(angle);
  g.scale(e.r, e.r);
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = 0.055;
  g.strokeStyle = c.edge;

  // Swept tail with a bright blade at its tip.
  g.fillStyle = c.body;
  g.beginPath();
  g.moveTo(-0.5, -0.15);
  g.bezierCurveTo(-1.1, -0.3, -1.5, 0.55, -1.95, 0.25);
  g.quadraticCurveTo(-1.5, 0.05, -1.15, 0.04);
  g.lineTo(-0.5, 0.2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = c.edge;
  g.beginPath();
  g.moveTo(-1.8, 0.12);
  g.lineTo(-2.07, 0.32);
  g.lineTo(-1.7, 0.38);
  g.closePath();
  g.fill();

  for (const side of [-1, 1]) {
    // Kim Giáp Thú has shoulder armor; the others have batlike wings.
    const extent =
      variant === "armor"
        ? 0.75
        : (variant.endsWith("Boss") ? 1.8 : 1.45) + flap;
    g.fillStyle = c.wing;
    g.beginPath();
    g.moveTo(0.1, side * 0.3);
    g.lineTo(-0.3, side * extent);
    g.lineTo(-0.72, side * (extent - 0.18));
    g.lineTo(-0.76, side * 0.67);
    g.lineTo(-1.2, side * 0.87);
    g.lineTo(-0.76, side * 0.26);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = c.glow;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(0.02, side * 0.34);
    g.lineTo(-0.3, side * extent);
    g.moveTo(-0.3, side * extent);
    g.lineTo(-0.76, side * 0.67);
    g.stroke();
    g.globalAlpha = 1;
    g.strokeStyle = c.edge;
    // Forelegs and three tapered claws.
    g.fillStyle = c.body;
    g.beginPath();
    g.moveTo(0.25, side * 0.3);
    g.lineTo(0.55, side * 0.78);
    g.lineTo(0.22, side * 0.7);
    g.lineTo(0.04, side * 0.3);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = c.edge;
    for (let i = 0; i < 3; i++) {
      const x = 0.22 + i * 0.12;
      g.beginPath();
      g.moveTo(x, side * 0.67);
      g.lineTo(x + 0.16, side * 0.96);
      g.lineTo(x + 0.13, side * 0.68);
      g.closePath();
      g.fill();
    }
  }

  const scales = g.createLinearGradient(-0.7, -0.5, 0.6, 0.5);
  scales.addColorStop(0, c.edge);
  scales.addColorStop(0.35, c.body);
  scales.addColorStop(1, c.body);
  g.fillStyle = e.flash > 0 ? "#ffffff" : scales;
  g.beginPath();
  g.ellipse(-0.05, 0, 0.78, 0.49, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Layered scales and luminous cracks, inspired by the reference armor.
  for (let i = 0; i < 3; i++) {
    const x = -0.48 + i * 0.3;
    g.fillStyle = c.gold ? "#f1dfa4" : c.wing;
    g.beginPath();
    g.moveTo(x - 0.13, -0.22);
    g.lineTo(x + 0.19, -0.17);
    g.lineTo(x + 0.26, 0);
    g.lineTo(x + 0.19, 0.17);
    g.lineTo(x - 0.13, 0.22);
    g.lineTo(x - 0.04, 0);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = c.body;
  g.beginPath();
  g.ellipse(0.77, 0, 0.47, 0.32, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  for (const side of [-1, 1]) {
    g.fillStyle = c.gold ? "#f6df95" : c.edge;
    g.beginPath();
    g.moveTo(0.7, side * 0.19);
    if (c.gold) {
      g.quadraticCurveTo(0.58, side * 0.9, 0.12, side * 0.82);
      g.quadraticCurveTo(0.52, side * 0.55, 0.43, side * 0.26);
    } else {
      g.lineTo(0.03, side * 0.81);
      g.lineTo(0.31, side * 0.22);
    }
    g.closePath();
    g.fill();
    g.fillStyle = c.glow;
    g.beginPath();
    g.ellipse(0.89, side * 0.17, 0.13, 0.06, side * -0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff8d6";
    g.beginPath();
    g.moveTo(1.03, side * 0.16);
    g.lineTo(1.19, side * 0.24);
    g.lineTo(1.14, side * 0.08);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = c.glow;
  g.beginPath();
  g.moveTo(0.78, 0);
  g.lineTo(1.16, 0);
  g.stroke();
  if (variant === "storm" || variant === "voidBoss") {
    g.lineWidth = 0.04;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(-0.9, side * 0.7);
      g.lineTo(-0.52, side * 0.92);
      g.lineTo(-0.66, side * 0.55);
      g.lineTo(-0.29, side * 0.72);
      g.stroke();
    }
  }
  if (variant.endsWith("Boss")) {
    g.strokeStyle = c.glow;
    g.fillStyle = c.edge;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(-0.1, side * 1.2);
      g.lineTo(0.06, side * 1.48);
      g.lineTo(-0.1, side * 1.72);
      g.lineTo(-0.24, side * 1.48);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(0.1, side * 0.3);
      g.lineTo(-0.13, side * 0.87);
      g.lineTo(-0.3, side * 0.35);
      g.stroke();
    }
    if (c.gold) {
      g.fillStyle = c.glow;
      g.beginPath();
      g.moveTo(0.1, 0);
      g.lineTo(-0.1, -0.12);
      g.lineTo(-0.29, 0);
      g.lineTo(-0.1, 0.12);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0.8, 0, 0.6, -Math.PI * 0.4, Math.PI * 0.4);
      g.stroke();
    } else {
      // Forked crest distinguishes the lightning king from ordinary drakes.
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(0.6, side * 0.24);
        g.lineTo(-0.16, side * 1.07);
        g.lineTo(0.16, side * 0.32);
        g.closePath();
        g.fill();
      }
    }
  }
  g.restore();
}
