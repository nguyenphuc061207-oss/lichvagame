// "Hướng Dương Thủ Vệ": pure survival-game logic. No DOM access, so the whole
// simulation runs in node tests. State is mutated in place for speed.
import { enemyIndex, nearbyEnemies } from "./game-spatial.mjs";
export const STEP = 1 / 60;
export const MAX_ENEMIES = 260;
const MAX_GEMS = 300;
const MAX_COINS = 200;
const BOSS_EVERY = 120;
const FIRE_RANGE = 480;
const PETAL_ORBIT = 64;
export const evolutionStage = (time) => 1 + Math.floor(time / 90);
export const isBreather = (time) => time >= 90 && time % 90 >= 75;

// mulberry32: tiny seeded PRNG so a seed always replays the same run.
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// coin below 1 is the chance to drop an Aya coin; 1 or more is a sure count.
export const ENEMIES = {
  aphid: { r: 10, hp: 2, speed: 58, damage: 6, xp: 1, coin: 0.12 },
  wasp: { r: 9, hp: 2, speed: 128, damage: 6, xp: 2, coin: 0.2 },
  beetle: { r: 15, hp: 12, speed: 46, damage: 14, xp: 3, coin: 0.45 },
  charger: { r: 12, hp: 10, speed: 70, damage: 12, xp: 4, coin: 0.5 },
  spitter: { r: 14, hp: 16, speed: 48, damage: 10, xp: 5, coin: 0.6 },
  brood: { r: 19, hp: 24, speed: 38, damage: 14, xp: 7, coin: 1 },
  voidling: {
    name: "Ảnh Long",
    dragon: "shadow",
    r: 17,
    hp: 18,
    speed: 95,
    damage: 12,
    xp: 6,
    coin: 0.65,
  },
  stormdrake: {
    name: "Lôi Long",
    dragon: "storm",
    r: 22,
    hp: 30,
    speed: 50,
    damage: 14,
    xp: 9,
    coin: 1,
  },
  goldguard: {
    name: "Kim Giáp Thú",
    dragon: "armor",
    armor: 0.3,
    r: 23,
    hp: 34,
    speed: 35,
    damage: 17,
    xp: 10,
    coin: 2,
  },
  sundrake: {
    name: "Nhật Long",
    dragon: "sun",
    r: 21,
    hp: 27,
    speed: 72,
    damage: 16,
    xp: 8,
    coin: 1,
  },
  voidlord: {
    name: "Hắc Lôi Vương",
    dragon: "voidBoss",
    boss: true,
    r: 39,
    hp: 320,
    speed: 43,
    damage: 24,
    xp: 55,
    coin: 14,
  },
  goldlord: {
    name: "Thiên Kim Vương",
    dragon: "goldBoss",
    boss: true,
    armor: 0.2,
    r: 41,
    hp: 370,
    speed: 38,
    damage: 26,
    xp: 65,
    coin: 16,
  },
  boss: { boss: true, r: 34, hp: 240, speed: 42, damage: 25, xp: 30, coin: 8 },
};

// Allies are bought with Aya coins; levels unlock how many can join.
export const ALLIES = {
  bird: {
    name: "Chim Sao",
    text: "Bay quanh bạn, bắn lông vũ liên tục.",
    cost: 5,
    fireRate: 1.6,
    damage: 2,
    range: 380,
  },
  robot: {
    name: "Robot Thiên Thần",
    text: "Bắn tia nặng, xuyên qua 2 kẻ địch.",
    cost: 8,
    fireRate: 0.8,
    damage: 6,
    pierce: 2,
    range: 440,
  },
  flyer: {
    name: "Phi Công Nhí",
    text: "Rải 3 hạt hình quạt.",
    cost: 12,
    fireRate: 0.9,
    damage: 3,
    seeds: 3,
    range: 400,
  },
  orange: {
    name: "Cam Gai",
    text: "Lao vào cắn kẻ địch gần nhất.",
    cost: 15,
    charge: true,
    damage: 8,
    speed: 260,
    range: 300,
  },
  guardian: {
    name: "Aya Hộ Vệ",
    text: "Ngồi trên đầu hoa, tạo 15 giáp và làm mới mỗi 10 giây.",
    cost: 18,
    shield: 15,
    refresh: 10,
  },
};
// Shop items (not allies). Each purchase adds one charge that is spent on death.
export const GUARD = {
  name: "Giáp hộ mệnh",
  text: "Hết máu sẽ hồi sinh với 40% máu tối đa.",
  cost: 10,
  step: 5,
  revive: 0.4,
};
export const guardCost = (s) => GUARD.cost + GUARD.step * s.guards;

// Each purchase adds one charge; a charge makes the player immortal for a few
// seconds the moment a lethal hit would land. Takes priority over the armor.
export const SCYTHE = {
  name: "Liềm đoạt mệnh",
  text: "Sắp chết sẽ bất tử 5 giây, hồi sau 60 giây.",
  cost: 15,
  step: 8,
  immortal: 5,
  cooldown: 60,
};
export const scytheCost = (s) => SCYTHE.cost + SCYTHE.step * s.scythes;
export const ALLY_SLOT_LEVELS = [1, 3, 6, 10, 15, 20];
export const allySlots = (level) =>
  ALLY_SLOT_LEVELS.filter((l) => l <= level).length;
export const nextSlotLevel = (level) =>
  ALLY_SLOT_LEVELS.find((l) => l > level) ?? null;
const ALLY_ORBIT = 46;

const heal = (s, amount) => {
  s.player.hp = Math.min(s.player.maxHp, s.player.hp + amount);
};

export const LASERS = [
  { title: "Đạn hạt", color: "#8a5a10", damage: 0, pierce: 0 },
  { title: "Laser bạc", color: "#cbd5e1", damage: 2, pierce: 1 },
  { title: "Laser tím", color: "#c084fc", damage: 4, pierce: 2 },
  { title: "Laser vàng", color: "#facc15", damage: 7, pierce: 3 },
  { title: "Laser plasma", color: "#22d3ee", damage: 12, pierce: 4 },
  { title: "Laser mặt trời", color: "#fb7185", damage: 20, pierce: 5 },
];

export const UPGRADES = {
  laserPlasma: {
    title: "Tiến hóa: Laser plasma",
    color: LASERS[4].color,
    text: "Từ cấp 12: tiến hóa laser vàng, +12 sát thương và xuyên thêm 4 địch so với đạn hạt.",
    max: 1,
    available: (s) => s.level >= 12 && s.stats.laser === 3,
    apply: (s) => (s.stats.laser = 4),
  },
  laserSolar: {
    title: "Tiến hóa: Laser mặt trời",
    color: LASERS[5].color,
    text: "Từ cấp 20: tiến hóa plasma, +20 sát thương và xuyên thêm 5 địch so với đạn hạt.",
    max: 1,
    available: (s) => s.level >= 20 && s.stats.laser === 4,
    apply: (s) => (s.stats.laser = 5),
  },
  chain: {
    title: "Sét lan",
    text: "Laser phóng điện sang thêm 1 địch gần đó, gây 50% sát thương.",
    max: 4,
    available: (s) => s.stats.laser > 0,
    apply: (s) => (s.stats.chain += 1),
  },
  frost: {
    title: "Băng điện",
    text: "Đạn của hoa làm chậm địch thêm 10% trong 2 giây.",
    max: 5,
    available: (s) => s.level >= 6,
    apply: (s) => (s.stats.frost += 0.1),
  },
  nova: {
    title: "Sóng mặt trời",
    text: "Mỗi 6 giây đẩy lùi địch trong 150px; thêm 1 lần sát thương đạn mỗi cấp.",
    max: 6,
    available: (s) => s.level >= 8,
    apply: (s) => (s.stats.nova += 1),
  },
  mastery: {
    title: "Sức mạnh vô hạn",
    text: "+12% sát thương gốc cho đạn, cánh hoa và đồng minh. Nâng không giới hạn từ cấp 12.",
    max: Infinity,
    available: (s) => s.level >= 12,
    apply: (s) => (s.stats.power += 0.12),
  },
  resilience: {
    title: "Sinh lực vô hạn",
    text: "+15 máu tối đa và hồi 30 máu. Nâng không giới hạn từ cấp 12.",
    max: Infinity,
    available: (s) => s.level >= 12,
    apply: (s) => {
      s.player.maxHp += 15;
      heal(s, 30);
    },
  },
  laserSilver: {
    title: "Laser bạc",
    text: "Đổi đạn thành laser bạc: +2 sát thương, xuyên thêm 1 địch.",
    color: LASERS[1].color,
    max: 1,
    available: (s) => s.stats.laser === 0,
    apply: (s) => (s.stats.laser = 1),
  },
  laserPurple: {
    title: "Laser tím",
    text: "Nâng laser bạc lên tím: +4 sát thương, xuyên thêm 2 địch so với đạn hạt.",
    color: LASERS[2].color,
    max: 1,
    available: (s) => s.stats.laser === 1,
    apply: (s) => (s.stats.laser = 2),
  },
  laserGold: {
    title: "Laser vàng",
    text: "Nâng laser tím lên vàng: +7 sát thương, xuyên thêm 3 địch so với đạn hạt.",
    color: LASERS[3].color,
    max: 1,
    available: (s) => s.stats.laser === 2,
    apply: (s) => (s.stats.laser = 3),
  },
  seeds: {
    title: "Thêm hạt",
    text: "Mỗi lượt bắn thêm 1 hạt.",
    max: 5,
    apply: (s) => (s.stats.seeds += 1),
  },
  rate: {
    title: "Bắn nhanh",
    text: "Tốc độ bắn tăng 20%.",
    max: 6,
    apply: (s) => (s.stats.fireRate *= 1.2),
  },
  damage: {
    title: "Hạt cứng",
    text: "Sát thương mỗi hạt +1.",
    max: 6,
    apply: (s) => (s.stats.damage += 1),
  },
  pierce: {
    title: "Xuyên thấu",
    text: "Hạt xuyên qua thêm 1 kẻ địch.",
    max: 3,
    apply: (s) => (s.stats.pierce += 1),
  },
  petals: {
    title: "Vòng cánh hoa",
    text: "Thêm 1 cánh hoa xoay quanh bạn.",
    max: 6,
    apply: (s) => (s.stats.petals += 1),
  },
  magnet: {
    title: "Nam châm nắng",
    text: "Hút giọt nắng từ xa hơn 40%.",
    max: 4,
    apply: (s) => (s.stats.magnet *= 1.4),
  },
  vigor: {
    title: "Thân khoẻ",
    text: "Máu tối đa +20 và hồi 20 máu.",
    max: 5,
    apply: (s) => {
      s.player.maxHp += 20;
      heal(s, 20);
    },
  },
  speed: {
    title: "Rễ nhẹ",
    text: "Di chuyển nhanh hơn 10%.",
    max: 4,
    apply: (s) => (s.player.speed *= 1.1),
  },
  regen: {
    title: "Quang hợp",
    text: "Hồi 0,5 máu mỗi giây.",
    max: 4,
    apply: (s) => (s.stats.regen += 0.5),
  },
  // Offered only once every other upgrade is maxed out.
  water: {
    title: "Nước mát",
    text: "Hồi 30 máu.",
    max: Infinity,
    fallback: true,
    apply: (s) => heal(s, 30),
  },
};

export const xpFor = (level) =>
  Math.round(
    4 + level * 3 + Math.min(level, 10) ** 1.5 + Math.max(0, level - 10) * 1.5,
  );

export function createGame({ seed = 1, spawnRadius = 560 } = {}) {
  return {
    seed,
    rand: createRng(seed),
    time: 0,
    over: false,
    pending: null,
    spawnRadius,
    player: {
      x: 0,
      y: 0,
      r: 16,
      hp: 100,
      maxHp: 100,
      speed: 170,
      invuln: 0,
    },
    stats: {
      laser: 0,
      chain: 0,
      frost: 0,
      nova: 0,
      power: 1,
      fireRate: 2.2,
      seeds: 1,
      damage: 2,
      pierce: 0,
      petals: 0,
      petalDamage: 3,
      magnet: 90,
      regen: 0,
    },
    upgrades: {},
    level: 1,
    xp: 0,
    xpNext: xpFor(1),
    kills: 0,
    spawned: 0,
    enemies: [],
    bullets: [],
    lightning: [],
    enemyShots: [],
    novaTimer: 0,
    novaAt: -10,
    laserHitSerial: 0,
    laserHitTier: 0,
    gems: [],
    coins: 0,
    coinsEarned: 0,
    coinDrops: [],
    allies: [],
    guards: 0,
    scythes: 0,
    scytheReady: [], // per owned liềm: game time when it can trigger again
    revives: 0,
    fireTimer: 0,
    spawnTimer: 0,
    nextBoss: BOSS_EVERY,
    petalAngle: 0,
  };
}

export const spawnRate = (time) =>
  Math.min(12, 0.6 + time / 25) * (isBreather(time) ? 0.3 : 1);

function pickKind(s) {
  const weights = [
    ["aphid", 6],
    ["wasp", s.time >= 45 ? 3 : 0],
    ["beetle", s.time >= 75 ? 2 : 0],
    ["charger", s.time >= 180 ? 2 : 0],
    ["spitter", s.time >= 270 ? 2 : 0],
    ["brood", s.time >= 360 ? 1.5 : 0],
    ["voidling", s.time >= 240 ? 2 : 0],
    ["goldguard", s.time >= 300 ? 1.5 : 0],
    ["stormdrake", s.time >= 360 ? 1.5 : 0],
    ["sundrake", s.time >= 450 ? 1.5 : 0],
  ];
  let roll = s.rand() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [kind, w] of weights) if ((roll -= w) < 0) return kind;
  return "aphid";
}

export function spawnEnemy(s, kind, angle = s.rand() * Math.PI * 2) {
  const def = ENEMIES[kind];
  const stage = evolutionStage(s.time);
  const elite =
    stage >= 3 && !def.boss && s.rand() < Math.min(0.25, (stage - 2) * 0.035);
  const hp = def.hp * (1 + s.time / 140) * (elite ? 1.8 : 1);
  const enemy = {
    kind,
    x: s.player.x + Math.cos(angle) * s.spawnRadius,
    y: s.player.y + Math.sin(angle) * s.spawnRadius,
    r: def.r * (elite ? 1.2 : 1),
    elite,
    stage,
    slowUntil: 0,
    slow: 0,
    attackCd: 1.5,
    dash: 0,
    hp,
    maxHp: hp,
    speed: def.speed * (1 + Math.min(s.time / 600, 0.4)),
    damage: def.damage,
    xp: Math.ceil(def.xp * (1 + (stage - 1) * 0.35) * (elite ? 2 : 1)),
    coin: def.coin >= 1 ? def.coin : s.rand() < def.coin ? 1 : 0,
    flash: 0,
    petalCd: 0,
  };
  s.enemies.push(enemy);
  s.spawned++;
  return enemy;
}

const hurt = (e, amount) => {
  e.hp -= amount * (1 - (ENEMIES[e.kind].armor || 0));
  e.flash = 0.1;
};

function nearestEnemy(s, range, from = s.player) {
  let best = null;
  let bestD = range * range;
  for (const e of s.enemies) {
    const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
    if (e.hp > 0 && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function shoot(s, from, target, { seeds = 1, damage, pierce = 0 }, kind) {
  const base = Math.atan2(target.y - from.y, target.x - from.x);
  for (let i = 0; i < seeds; i++) {
    const a = base + (i - (seeds - 1) / 2) * 0.16;
    s.bullets.push({
      x: from.x,
      y: from.y,
      vx: Math.cos(a) * 430,
      vy: Math.sin(a) * 430,
      life: 1.3,
      pierce,
      damage,
      hits: [],
      kind,
    });
  }
}

function fire(s, dt) {
  s.fireTimer -= dt;
  if (s.fireTimer > 0) return;
  const target = nearestEnemy(s, FIRE_RANGE);
  if (!target) {
    s.fireTimer = 0;
    return;
  }
  const laser = LASERS[s.stats.laser];
  shoot(
    s,
    s.player,
    target,
    {
      ...s.stats,
      damage: (s.stats.damage + laser.damage) * s.stats.power,
      pierce: s.stats.pierce + laser.pierce,
    },
    s.stats.laser ? `laser${s.stats.laser}` : "seed",
  );
  s.fireTimer = 1 / s.stats.fireRate;
}

export const allyCost = (s, kind) => ALLIES[kind].cost + 4 * s.allies.length;

// Why an ally can't be bought right now: "slots", "coins" or null.
export function buyBlocker(s, kind) {
  if (s.allies.length >= allySlots(s.level)) return "slots";
  if (s.coins < allyCost(s, kind)) return "coins";
  return null;
}

export function buyGuard(s) {
  if (s.coins < guardCost(s)) return false;
  s.coins -= guardCost(s);
  s.guards++;
  return true;
}

export function buyScythe(s) {
  if (s.coins < scytheCost(s)) return false;
  s.coins -= scytheCost(s);
  s.scythes++;
  s.scytheReady.push(0);
  return true;
}

export function buyAlly(s, kind) {
  if (!ALLIES[kind] || buyBlocker(s, kind)) return false;
  s.coins -= allyCost(s, kind);
  s.allies.push({
    kind,
    x: s.player.x,
    y: s.player.y - (ALLIES[kind].shield ? s.player.r * 1.25 + 37 : 0),
    slot: s.allies.length,
    timer: 0,
    cd: 0,
    target: null,
    facing: 1,
    ...(ALLIES[kind].shield && {
      shield: ALLIES[kind].shield,
      shieldReadyAt: s.time + ALLIES[kind].refresh,
    }),
  });
  return true;
}

export const shieldHealth = (s) =>
  s.allies.reduce((sum, ally) => sum + (ally.shield || 0), 0);
export const shieldCapacity = (s) =>
  s.allies.reduce((sum, ally) => sum + (ALLIES[ally.kind].shield || 0), 0);

function refreshShields(s) {
  for (const ally of s.allies) {
    const def = ALLIES[ally.kind];
    if (!def.shield || s.time + 1e-9 < ally.shieldReadyAt) continue;
    ally.shield = def.shield;
    const periods =
      Math.floor((s.time - ally.shieldReadyAt + 1e-9) / def.refresh) + 1;
    ally.shieldReadyAt += periods * def.refresh;
  }
}

function damagePlayer(s, amount) {
  for (const ally of s.allies) {
    const absorbed = Math.min(ally.shield || 0, amount);
    if (absorbed > 0) {
      ally.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount <= 0) break;
  }
  s.player.hp -= amount;
}

function moveToward(a, x, y, distance) {
  const dx = x - a.x;
  const dy = y - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return d;
  const k = Math.min(1, distance / d);
  a.x += dx * k;
  a.y += dy * k;
  if (Math.abs(dx) > 1) a.facing = Math.sign(dx);
  return d;
}

function updateAllies(s, dt) {
  const p = s.player;
  const guardians = s.allies.filter((a) => ALLIES[a.kind].shield);
  for (const a of s.allies) {
    const def = ALLIES[a.kind];
    if (def.shield) {
      a.x = p.x + (guardians.indexOf(a) - (guardians.length - 1) / 2) * 18;
      a.y = p.y - p.r * 1.25 - 37;
      continue;
    }
    const angle =
      (a.slot * Math.PI * 2) / ALLY_SLOT_LEVELS.length + s.time * 0.6;
    const homeX = p.x + Math.cos(angle) * ALLY_ORBIT;
    const homeY = p.y + Math.sin(angle) * ALLY_ORBIT;
    a.cd -= dt;
    if (def.charge) {
      if (
        !a.target ||
        a.target.hp <= 0 ||
        Math.hypot(a.target.x - p.x, a.target.y - p.y) > def.range * 1.5
      )
        a.target = nearestEnemy(s, def.range);
      const e = a.target;
      if (!e) {
        moveToward(a, homeX, homeY, def.speed * dt);
        continue;
      }
      const d = moveToward(a, e.x, e.y, def.speed * dt);
      if (d < e.r + 14 && a.cd <= 0) {
        hurt(e, def.damage * s.stats.power);
        a.cd = 0.5;
      }
      continue;
    }
    moveToward(a, homeX, homeY, Math.max(p.speed * 1.4, 200) * dt);
    a.timer -= dt;
    if (a.timer > 0) continue;
    const target = nearestEnemy(s, def.range, a);
    if (!target) {
      a.timer = 0;
      continue;
    }
    shoot(s, a, target, { ...def, damage: def.damage * s.stats.power }, a.kind);
    a.timer = 1 / def.fireRate;
  }
}

export const petalPositions = (s) =>
  Array.from({ length: s.stats.petals }, (_, i) => {
    const a = s.petalAngle + (i * Math.PI * 2) / s.stats.petals;
    return {
      a,
      x: s.player.x + Math.cos(a) * PETAL_ORBIT,
      y: s.player.y + Math.sin(a) * PETAL_ORBIT,
    };
  });

function checkLevel(s) {
  if (s.pending || s.xp < s.xpNext) return;
  s.xp -= s.xpNext;
  s.level++;
  s.xpNext = xpFor(s.level);
  heal(s, s.player.maxHp * 0.1);
  s.pending = pickUpgrades(s);
}

export function pickUpgrades(s, count = 3) {
  const ids = Object.keys(UPGRADES).filter(
    (id) =>
      !UPGRADES[id].fallback &&
      (s.upgrades[id] || 0) < UPGRADES[id].max &&
      (!UPGRADES[id].available || UPGRADES[id].available(s)),
  );
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(s.rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // Once an evolution is unlocked, always show it instead of relying on luck.
  const evolution = ["laserPlasma", "laserSolar"].find((id) =>
    ids.includes(id),
  );
  if (evolution) {
    ids.splice(ids.indexOf(evolution), 1);
    ids.unshift(evolution);
  }
  return ids.length ? ids.slice(0, count) : ["water"];
}

export function chooseUpgrade(s, id) {
  if (!s.pending?.includes(id)) return s;
  if (UPGRADES[id].available && !UPGRADES[id].available(s)) return s;
  UPGRADES[id].apply(s);
  s.upgrades[id] = (s.upgrades[id] || 0) + 1;
  s.pending = null;
  checkLevel(s);
  return s;
}

export function step(s, input = { x: 0, y: 0 }, dt = STEP) {
  if (s.over || s.pending) return s;
  const p = s.player;
  s.time += dt;
  s.lightning = s.lightning.filter((flash) => s.time - flash.at < 0.24);
  refreshShields(s);
  p.invuln = Math.max(0, p.invuln - dt);

  const len = Math.hypot(input.x, input.y);
  if (len > 0) {
    const k = Math.min(1, len) / len;
    p.x += input.x * k * p.speed * dt;
    p.y += input.y * k * p.speed * dt;
  }
  if (s.stats.regen) heal(s, s.stats.regen * dt);

  s.novaTimer -= dt;
  if (s.stats.nova && s.novaTimer <= 0) {
    s.novaTimer = 6;
    s.novaAt = s.time;
    for (const e of s.enemies) {
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 150 + e.r) continue;
      hurt(
        e,
        (s.stats.damage + LASERS[s.stats.laser].damage) *
          s.stats.power *
          s.stats.nova,
      );
      e.x += (dx / (d || 1)) * 55;
      e.y += (dy / (d || 1)) * 55;
    }
  }

  s.spawnTimer += dt * spawnRate(s.time);
  while (s.spawnTimer >= 1 && s.enemies.length < MAX_ENEMIES) {
    s.spawnTimer -= 1;
    spawnEnemy(s, pickKind(s));
  }
  s.spawnTimer = Math.min(s.spawnTimer, 1);
  if (s.time >= s.nextBoss && s.enemies.length < MAX_ENEMIES) {
    const bossKind =
      s.nextBoss < 480
        ? "boss"
        : Math.floor(s.nextBoss / BOSS_EVERY) % 2 === 0
          ? "voidlord"
          : "goldlord";
    spawnEnemy(s, bossKind);
    s.nextBoss += BOSS_EVERY;
  }

  const petals = petalPositions(s);
  s.petalAngle += 3.2 * dt;
  for (const e of s.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    // Stragglers far behind are moved back onto the spawn ring.
    if (d > s.spawnRadius * 1.8) {
      const a = Math.atan2(dy, dx);
      e.x = p.x + Math.cos(a) * s.spawnRadius;
      e.y = p.y + Math.sin(a) * s.spawnRadius;
      continue;
    }
    if (e.hp <= 0) continue;
    e.attackCd -= dt;
    const slowed = e.slowUntil > s.time ? 1 - e.slow : 1;
    let movement = 1;
    if (e.kind === "charger" || e.kind === "sundrake") {
      if (e.attackCd <= 0) {
        e.dash = 0.45;
        e.dashX = dx / d;
        e.dashY = dy / d;
        e.attackCd = 3.5;
      }
      if (e.dash > 0) {
        e.dash -= dt;
        e.x += e.dashX * e.speed * 3 * slowed * dt;
        e.y += e.dashY * e.speed * 3 * slowed * dt;
        movement = 0;
      } else if (e.attackCd < 0.6) movement = 0.2;
    }
    if (e.kind === "voidling") {
      const angle = Math.atan2(dy, dx) + Math.sin(s.time * 2.5 + e.maxHp) * 0.6;
      e.x += Math.cos(angle) * e.speed * slowed * dt;
      e.y += Math.sin(angle) * e.speed * slowed * dt;
      movement = 0;
    }
    if (e.kind === "stormdrake" || e.kind === "voidlord")
      movement = d < 180 ? -0.3 : d < 270 ? 0.25 : 1;
    if (ENEMIES[e.kind].dragon && e.kind !== "voidling" && e.attackCd < 0.7)
      movement *= 0.3;
    if (
      ["stormdrake", "voidlord", "goldlord"].includes(e.kind) &&
      e.attackCd <= 0 &&
      d < 520
    ) {
      const radial = e.kind === "goldlord";
      const count = radial ? 12 : e.kind === "voidlord" ? 7 : 3;
      const base = Math.atan2(dy, dx);
      for (let i = 0; i < count && s.enemyShots.length < 120; i++) {
        const angle =
          base +
          (radial ? (i * Math.PI * 2) / count : (i - (count - 1) / 2) * 0.18);
        s.enemyShots.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(angle) * (radial ? 105 : 145),
          vy: Math.sin(angle) * (radial ? 105 : 145),
          life: 4,
          damage: e.damage * 0.55,
          color: radial ? "#f6bf48" : "#bb72ff",
          electric: !radial,
        });
      }
      e.attackCd = e.hp < e.maxHp * 0.5 && ENEMIES[e.kind].boss ? 2.2 : 3.4;
    }
    if (e.kind === "spitter") movement = d < 170 ? -0.45 : d < 240 ? 0 : 1;
    if (
      (e.kind === "spitter" || (e.kind === "boss" && e.stage >= 3)) &&
      e.attackCd <= 0 &&
      d < 480
    ) {
      const count = e.kind === "boss" ? 5 : 1;
      const base = Math.atan2(dy, dx);
      for (let i = 0; i < count && s.enemyShots.length < 120; i++) {
        const angle = base + (i - (count - 1) / 2) * 0.22;
        s.enemyShots.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(angle) * 135,
          vy: Math.sin(angle) * 135,
          life: 4,
          damage: e.damage * 0.65,
        });
      }
      e.attackCd = e.kind === "boss" ? 3 : 2.8;
    }
    e.x += (dx / d) * e.speed * slowed * movement * dt;
    e.y += (dy / d) * e.speed * slowed * movement * dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.slowUntil <= s.time) e.slowUntil = 0;
    e.petalCd -= dt;
    if (d < e.r + p.r && p.invuln <= 0) {
      damagePlayer(s, e.damage);
      p.invuln = 0.8;
      // Knock the attacker back so a crowd cannot chain hits.
      e.x -= (dx / d) * 48;
      e.y -= (dy / d) * 48;
    }
    if (e.petalCd <= 0)
      for (const petal of petals)
        if (Math.hypot(petal.x - e.x, petal.y - e.y) < e.r + 10) {
          hurt(e, s.stats.petalDamage * s.stats.power);
          e.petalCd = 0.35;
          break;
        }
  }

  s.enemyShots = s.enemyShots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (Math.hypot(shot.x - p.x, shot.y - p.y) < p.r + 5) {
      if (p.invuln <= 0) {
        damagePlayer(s, shot.damage);
        p.invuln = 0.8;
      }
      return false;
    }
    return shot.life > 0;
  });

  fire(s, dt);
  updateAllies(s, dt);
  const index = enemyIndex(s);
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const candidates = nearbyEnemies(
      index,
      b.x,
      b.y,
      index.radius + 5,
      index.collisions,
    );
    // Preserve the original hit order when several enemies overlap.
    candidates.sort((a, c) => a.collisionOrder - c.collisionOrder);
    for (const e of candidates) {
      if (b.life <= 0) break;
      if (e.hp <= 0 || b.hits.includes(e)) continue;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 5) ** 2) {
        hurt(e, b.damage);
        const playerShot = b.kind === "seed" || b.kind?.startsWith("laser");
        if (playerShot && s.stats.frost) {
          e.slow = s.stats.frost;
          e.slowUntil = s.time + 2;
        }
        if (b.kind?.startsWith("laser")) {
          const tier = Number(b.kind.slice(5));
          s.lightning.push({ x: e.x, y: e.y, at: s.time, tier });
          if (s.stats.chain) {
            const targets = nearbyEnemies(index, e.x, e.y, 115, index.chains)
              .filter(
                (other) =>
                  other !== e &&
                  other.hp > 0 &&
                  (other.x - e.x) ** 2 + (other.y - e.y) ** 2 < 115 ** 2,
              )
              .sort(
                (a, c) =>
                  (a.x - e.x) ** 2 +
                    (a.y - e.y) ** 2 -
                    ((c.x - e.x) ** 2 + (c.y - e.y) ** 2) ||
                  a.collisionOrder - c.collisionOrder,
              )
              .slice(0, s.stats.chain);
            for (const target of targets) {
              hurt(target, b.damage * 0.5);
              s.lightning.push({
                x: target.x,
                y: target.y,
                fromX: e.x,
                fromY: e.y,
                at: s.time,
                tier,
              });
            }
          }
          if (s.lightning.length > 48)
            s.lightning.splice(0, s.lightning.length - 48);
          s.laserHitSerial++;
          s.laserHitTier = tier;
        }
        b.hits.push(e);
        if (b.pierce-- <= 0) b.life = 0;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);

  const broods = [];
  s.enemies = s.enemies.filter((e) => {
    if (e.hp > 0) return true;
    s.kills++;
    if (e.kind === "brood") broods.push(e);
    if (s.gems.length < MAX_GEMS)
      s.gems.push({ x: e.x, y: e.y, value: e.xp, at: s.time });
    else s.gems[s.kills % MAX_GEMS].value += e.xp;
    // Coins land beside the sun drop; a boss scatters its coins in a ring.
    for (let i = 0; i < e.coin; i++) {
      const a = (i / e.coin) * Math.PI * 2;
      const spread = e.coin > 1 ? e.r : 0;
      if (s.coinDrops.length < MAX_COINS)
        s.coinDrops.push({
          x: e.x + Math.cos(a) * spread,
          y: e.y + Math.sin(a) * spread + (spread ? 0 : 10),
          value: 1,
        });
      else s.coinDrops[(s.kills + i) % MAX_COINS].value += 1;
    }
    return false;
  });
  for (const parent of broods) {
    for (const offset of [-14, 14]) {
      if (s.enemies.length >= MAX_ENEMIES) break;
      const child = spawnEnemy(s, "aphid");
      Object.assign(child, {
        x: parent.x + offset,
        y: parent.y,
        elite: false,
        r: 8,
        hp: parent.maxHp * 0.15,
        maxHp: parent.maxHp * 0.15,
        xp: 1,
        coin: 0,
      });
    }
  }

  // Sun drops (XP) and Aya coins fly to the player once inside the magnet.
  const collect = (items, gain, isXp = false) =>
    items.filter((g) => {
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (
        d < p.r + 8 ||
        (isXp && (d > s.spawnRadius * 1.5 || s.time - (g.at ?? s.time) > 15))
      ) {
        gain(g.value);
        return false;
      }
      if (d < s.stats.magnet || (isXp && isBreather(s.time))) {
        const move = Math.min(d, 420 * dt);
        g.x += ((p.x - g.x) / d) * move;
        g.y += ((p.y - g.y) / d) * move;
      }
      return true;
    });
  s.gems = collect(s.gems, (v) => (s.xp += v), true);
  s.coinDrops = collect(s.coinDrops, (v) => {
    s.coins += v;
    s.coinsEarned += v;
  });

  const ready = s.scytheReady.findIndex((t) => t <= s.time);
  if (p.hp <= 0 && ready >= 0) {
    s.scytheReady[ready] = s.time + SCYTHE.cooldown;
    p.hp = 1;
    p.invuln = SCYTHE.immortal;
  }
  if (p.hp <= 0 && s.guards > 0) {
    // Spend a charge: come back at 40% and push nearby enemies away.
    s.guards--;
    s.revives++;
    p.hp = Math.round(p.maxHp * GUARD.revive);
    p.invuln = 2;
    s.enemies = s.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) > 140);
  }
  if (p.hp <= 0) {
    p.hp = 0;
    s.over = true;
    return s;
  }
  checkLevel(s);
  return s;
}

export const isBetter = (record, best) =>
  !best ||
  record.time > best.time ||
  (record.time === best.time && record.kills > best.kills);

export const formatTime = (seconds) => {
  const t = Math.max(0, Math.floor(seconds));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
