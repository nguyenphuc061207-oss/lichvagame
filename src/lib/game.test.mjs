import test from "node:test";
import assert from "node:assert/strict";
import {
  STEP,
  MAX_ENEMIES,
  xpFor,
  evolutionStage,
  isBreather,
  ENEMIES,
  ALLIES,
  GUARD,
  SCYTHE,
  buyScythe,
  scytheCost,
  buyGuard,
  guardCost,
  allySlots,
  nextSlotLevel,
  allyCost,
  buyAlly,
  buyBlocker,
  shieldHealth,
  shieldCapacity,
  UPGRADES,
  createGame,
  step,
  spawnEnemy,
  pickUpgrades,
  chooseUpgrade,
  spawnRate,
  isBetter,
  formatTime,
} from "./game.mjs";

const run = (s, seconds, input) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) step(s, input);
  return s;
};

test("Game: rồng mới bắn các kiểu đạn khác nhau và giữ giới hạn đạn", () => {
  for (const [kind, count] of [
    ["stormdrake", 3],
    ["voidlord", 7],
    ["goldlord", 12],
  ]) {
    const s = createGame();
    s.spawnTimer = -1e9;
    s.fireTimer = 1e9;
    Object.assign(spawnEnemy(s, kind), { x: 250, y: 0, speed: 0, attackCd: 0 });
    step(s);
    assert.equal(s.enemyShots.length, count);
    assert.ok(
      s.enemyShots.every((b) =>
        kind === "goldlord" ? b.color === "#f6bf48" : b.electric,
      ),
    );
    while (s.enemyShots.length < 119)
      s.enemyShots.push({ x: 500, y: 500, vx: 0, vy: 0, damage: 1, life: 4 });
    s.enemies[0].attackCd = 0;
    step(s);
    assert.ok(s.enemyShots.length <= 120);
  }
});

test("Game: Kim Giáp Thú giảm 30% sát thương, Nhật Long lao theo hướng đã khóa", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.fireTimer = 1e9;
  const guard = spawnEnemy(s, "goldguard");
  Object.assign(guard, { x: 70, y: 0, speed: 0, hp: 100, maxHp: 100 });
  s.bullets.push({
    kind: "seed",
    x: 65,
    y: 0,
    vx: 430,
    vy: 0,
    life: 1,
    damage: 10,
    pierce: 0,
    hits: [],
  });
  step(s);
  assert.equal(guard.hp, 93);
  const drake = spawnEnemy(s, "sundrake");
  Object.assign(drake, { x: 250, y: 0, attackCd: 0 });
  step(s);
  assert.ok(drake.dash > 0);
  assert.equal(drake.dashY, 0);
  s.player.y = 100;
  step(s);
  assert.equal(drake.y, 0);
});

test("Game: boss rồng tím và vàng luân phiên từ phút thứ 8", () => {
  for (const [time, kind] of [
    [480, "voidlord"],
    [600, "goldlord"],
    [720, "voidlord"],
  ]) {
    const s = createGame();
    s.time = time;
    s.nextBoss = time;
    s.spawnTimer = -1e9;
    s.fireTimer = 1e9;
    step(s);
    assert.equal(s.enemies[0].kind, kind);
    assert.equal(s.enemies[0].elite, false);
    assert.equal(s.nextBoss, time + 120);
  }
});

test("Game: giọt nắng cũ tự thu và lên cấp tiếp sau cấp 12", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.time = 300;
  s.nextBoss = 9999;
  s.level = 12;
  s.xpNext = xpFor(12);
  s.gems.push({ x: 400, y: 0, value: xpFor(12) + 7, at: s.time - 16 });
  step(s);
  assert.equal(s.level, 13);
  assert.equal(s.xp, 7);
  assert.equal(s.gems.length, 0);
  assert.ok(s.pending.length > 0);
});

test("Game: ưu tiên plasma cấp 12, mặt trời cấp 20, tiếp tục sức mạnh vô hạn", () => {
  const s = createGame();
  Object.assign(s, { level: 12 });
  s.stats.laser = 3;
  assert.equal(pickUpgrades(s)[0], "laserPlasma");
  s.pending = pickUpgrades(s);
  chooseUpgrade(s, "laserPlasma");
  assert.equal(s.stats.laser, 4);
  s.level = 20;
  s.pending = pickUpgrades(s);
  assert.equal(s.pending[0], "laserSolar");
  chooseUpgrade(s, "laserSolar");
  assert.equal(s.stats.laser, 5);
  for (const [id, upgrade] of Object.entries(UPGRADES))
    if (Number.isFinite(upgrade.max)) s.upgrades[id] = upgrade.max;
  for (let i = 0; i < 100; i++) {
    s.pending = pickUpgrades(s);
    assert.ok(s.pending.includes("mastery"));
    chooseUpgrade(s, "mastery");
  }
  assert.ok(Math.abs(s.stats.power - 13) < 1e-8);
});

test("Game: các đợt thưởng thêm XP và có khoảng nghỉ", () => {
  const early = createGame(),
    late = createGame();
  late.time = 360;
  assert.ok(spawnEnemy(late, "beetle").xp > spawnEnemy(early, "beetle").xp);
  assert.equal(evolutionStage(360), 5);
  assert.equal(isBreather(165), true);
  assert.ok(spawnRate(165) < spawnRate(160));
});

test("Game: quái phun đạn, đạn gây sát thương và tự hết hạn", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.fireTimer = 1e9;
  const e = spawnEnemy(s, "spitter");
  Object.assign(e, { x: 220, y: 0, speed: 0, attackCd: 0 });
  step(s);
  assert.equal(s.enemyShots.length, 1);
  run(s, 1.6);
  assert.ok(s.player.hp < 100);
  s.enemies = [];
  s.enemyShots.push({ x: 500, y: 500, vx: 0, vy: 0, damage: 1, life: 0.1 });
  run(s, 0.2);
  assert.equal(s.enemyShots.length, 0);
});

test("Game: quái mẹ phân tách và giữ giới hạn số quái", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.fireTimer = 1e9;
  spawnEnemy(s, "brood").hp = 0;
  step(s);
  assert.equal(s.enemies.length, 2);
  assert.ok(s.enemies.every((e) => e.kind === "aphid" && e.coin === 0));
  while (s.enemies.length < MAX_ENEMIES) spawnEnemy(s, "brood");
  s.enemies.at(-1).hp = 0;
  step(s);
  assert.equal(s.enemies.length, MAX_ENEMIES);
});

test("Game: sét lan, làm chậm và sóng đẩy có tác dụng thực", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  Object.assign(s.stats, { laser: 1, chain: 1, frost: 0.3, fireRate: 0.1 });
  const a = spawnEnemy(s, "beetle"),
    b = spawnEnemy(s, "beetle");
  Object.assign(a, { x: 70, y: 0, speed: 0, hp: 100, maxHp: 100 });
  Object.assign(b, { x: 70, y: 70, speed: 0, hp: 100, maxHp: 100 });
  run(s, 0.2);
  assert.equal(a.hp, 96);
  assert.equal(b.hp, 98);
  assert.ok(a.slowUntil > s.time);
  assert.ok(s.lightning.some((f) => f.fromX !== undefined));
  s.stats.nova = 1;
  step(s);
  assert.ok(a.hp < 96);
  assert.ok(a.x > 70);
  assert.equal(s.novaAt, s.time);
});

test("Game: kẻ địch xuất hiện và mật độ tăng theo thời gian", () => {
  const s = run(createGame({ seed: 4 }), 2);
  assert.ok(s.spawned > 0);
  assert.ok(spawnRate(90) > spawnRate(0) * 3);
});

test("Game: di chuyển theo input, đường chéo không nhanh hơn", () => {
  const a = run(createGame(), 1, { x: 1, y: 0 });
  const b = run(createGame(), 1, { x: 1, y: 1 });
  assert.ok(Math.abs(a.player.x - 170) < 1);
  assert.ok(Math.abs(Math.hypot(b.player.x, b.player.y) - 170) < 1);
});

test("Game: chạm kẻ địch mất máu, có thời gian bất tử ngắn", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  const e = spawnEnemy(s, "aphid");
  Object.assign(e, { x: 10, y: 0, hp: 100 });
  step(s);
  const hp = 100 - ENEMIES.aphid.damage;
  assert.equal(s.player.hp, hp);
  assert.ok(Math.hypot(e.x, e.y) > 40, "kẻ địch bị đẩy lùi");
  Object.assign(e, { x: 0, y: 0 });
  step(s);
  assert.equal(s.player.hp, hp);
});

test("Game: hạ địch rơi giọt nắng, nhặt đủ thì lên cấp và chờ chọn", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  const e = spawnEnemy(s, "aphid");
  Object.assign(e, { x: 60, y: 0, hp: 0.1 });
  run(s, 0.5);
  assert.equal(s.kills, 1);
  assert.equal(s.gems.length, 0, "giọt nắng gần được hút về");
  s.xp = s.xpNext;
  step(s);
  assert.equal(s.level, 2);
  assert.equal(s.pending.length, 3);
  assert.equal(new Set(s.pending).size, 3);
  const time = s.time;
  step(s);
  assert.equal(s.time, time);
});

test("Game: chọn nâng cấp áp dụng đúng và tiếp tục chơi", () => {
  const s = createGame();
  s.pending = ["seeds", "rate", "damage"];
  chooseUpgrade(s, "petals");
  assert.ok(s.pending, "lựa chọn ngoài danh sách bị bỏ qua");
  chooseUpgrade(s, "seeds");
  assert.equal(s.stats.seeds, 2);
  assert.equal(s.upgrades.seeds, 1);
  assert.equal(s.pending, null);
});

test("Game: laser mở lần lượt bạc, tím, vàng và không hạ cấp", () => {
  const s = createGame();
  const tiers = ["laserSilver", "laserPurple", "laserGold"];
  for (const [i, id] of tiers.entries()) {
    const offered = pickUpgrades(s, 100).filter((key) =>
      key.startsWith("laser"),
    );
    assert.deepEqual(offered, [id]);
    s.pending = offered;
    chooseUpgrade(s, id);
    assert.equal(s.stats.laser, i + 1);
  }
  assert.ok(!pickUpgrades(s, 100).some((id) => id.startsWith("laser")));
  s.pending = ["laserSilver"];
  chooseUpgrade(s, "laserSilver");
  assert.equal(s.stats.laser, 3);
});

test("Game: laser giữ nâng cấp hạt và tăng sát thương, xuyên địch theo màu", () => {
  for (const [i, bonus] of [2, 4, 7].entries()) {
    const s = createGame();
    s.spawnTimer = -1e9;
    Object.assign(s.stats, { laser: i + 1, seeds: 2, damage: 3, pierce: 1 });
    Object.assign(spawnEnemy(s, "beetle"), { x: 200, y: 0, speed: 0 });
    step(s);
    assert.equal(s.bullets.length, 2);
    for (const b of s.bullets) {
      assert.equal(b.kind, `laser${i + 1}`);
      assert.equal(b.damage, 3 + bonus);
      assert.equal(b.pierce, i + 2);
    }
  }
});

test("Game: một tia laser bạc gây sát thương cho hai địch liên tiếp", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  Object.assign(s.stats, { laser: 1, fireRate: 0.1 });
  const targets = [80, 130].map((x) =>
    Object.assign(spawnEnemy(s, "beetle"), {
      x,
      y: 0,
      hp: 20,
      maxHp: 20,
      speed: 0,
    }),
  );
  run(s, 0.35);
  for (const e of targets) assert.equal(e.hp, 16);
  assert.equal(s.laserHitSerial, 2);
  assert.equal(s.laserHitTier, 1);
  assert.ok(s.lightning.length > 0);
  run(s, 0.3);
  assert.equal(s.lightning.length, 0);
});

test("Game: nâng cấp đã tối đa không được đề xuất nữa", () => {
  const s = createGame();
  for (const [id, u] of Object.entries(UPGRADES))
    if (!u.fallback) s.upgrades[id] = u.max;
  assert.deepEqual(pickUpgrades(s), ["water"]);
  s.upgrades.pierce = 0;
  assert.deepEqual(pickUpgrades(s), ["pierce"]);
});

test("Game: hết máu thì kết thúc và dừng mô phỏng", () => {
  const s = createGame();
  s.player.hp = 5;
  const e = spawnEnemy(s, "beetle");
  Object.assign(e, { x: 0, y: 0 });
  step(s);
  assert.equal(s.over, true);
  assert.equal(s.player.hp, 0);
  const time = s.time;
  step(s);
  assert.equal(s.time, time);
});

test("Game: cùng seed và input cho cùng kết quả", () => {
  const input = { x: 0.3, y: -0.6 };
  const a = run(createGame({ seed: 99 }), 20, input);
  const b = run(createGame({ seed: 99 }), 20, input);
  assert.equal(a.kills, b.kills);
  assert.equal(a.spawned, b.spawned);
  assert.deepEqual(
    a.enemies.map((e) => [e.x, e.y]),
    b.enemies.map((e) => [e.x, e.y]),
  );
});

test("Game: so sánh kỷ lục và định dạng thời gian", () => {
  assert.ok(isBetter({ time: 30, kills: 1 }, null));
  assert.ok(isBetter({ time: 31, kills: 0 }, { time: 30, kills: 9 }));
  assert.ok(isBetter({ time: 30, kills: 10 }, { time: 30, kills: 9 }));
  assert.ok(!isBetter({ time: 29, kills: 99 }, { time: 30, kills: 0 }));
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(125.7), "2:05");
});

test("Game: hạ boss rơi 8 xu Aya và hút về người chơi", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.xpNext = Infinity; // keep level-up choices from pausing the run
  const boss = spawnEnemy(s, "boss");
  Object.assign(boss, { x: 200, y: 0, hp: 0.1, speed: 0 });
  run(s, 0.5);
  assert.equal(s.kills, 1);
  assert.equal(s.coinDrops.length, 8);
  run(s, 2, { x: 1, y: 0 });
  assert.equal(s.coins, 8);
  assert.equal(s.coinsEarned, 8);
  assert.equal(s.coinDrops.length, 0);
});

test("Game: lên cấp mở thêm chỗ đồng minh", () => {
  assert.equal(allySlots(1), 1);
  assert.equal(allySlots(2), 1);
  assert.equal(allySlots(3), 2);
  assert.equal(allySlots(6), 3);
  assert.equal(allySlots(25), 6);
  assert.equal(nextSlotLevel(1), 3);
  assert.equal(nextSlotLevel(20), null);
});

test("Game: mua đồng minh cần đủ xu và còn chỗ, giá tăng dần", () => {
  const s = createGame();
  assert.equal(buyBlocker(s, "bird"), "coins");
  assert.equal(buyAlly(s, "bird"), false);
  s.coins = 100;
  assert.equal(buyAlly(s, "bird"), true);
  assert.equal(s.coins, 100 - ALLIES.bird.cost);
  assert.equal(buyBlocker(s, "robot"), "slots");
  s.level = 3;
  assert.equal(allyCost(s, "robot"), ALLIES.robot.cost + 4);
  assert.equal(buyAlly(s, "robot"), true);
  assert.equal(s.allies.length, 2);
});

test("Game: đồng minh tự bắn và lao vào cắn kẻ địch", () => {
  for (const kind of Object.keys(ALLIES).filter(
    (kind) => !ALLIES[kind].shield,
  )) {
    const s = createGame();
    s.spawnTimer = -1e9;
    s.fireTimer = 1e9;
    s.coins = 99;
    buyAlly(s, kind);
    const e = spawnEnemy(s, "beetle");
    Object.assign(e, { x: 160, y: 0, hp: 100, maxHp: 100, speed: 0 });
    run(s, 2);
    assert.ok(e.hp < 100, `${kind} gây sát thương`);
  }
});

test("Game: Aya Hộ Vệ tạo giáp ngay khi mua và ngồi trên đầu hoa", () => {
  const s = createGame();
  assert.equal(buyAlly(s, "guardian"), false);
  s.coins = 100;
  assert.equal(buyAlly(s, "guardian"), true);
  assert.equal(s.coins, 100 - ALLIES.guardian.cost);
  assert.equal(shieldHealth(s), 15);
  assert.equal(shieldCapacity(s), 15);
  assert.equal(buyAlly(s, "guardian"), false, "Vẫn dùng một chỗ đồng minh");
  assert.ok(s.allies[0].y < s.player.y);
  step(s, { x: 1, y: 1 });
  assert.equal(s.allies[0].x, s.player.x);
  assert.equal(s.allies[0].y, s.player.y - s.player.r * 1.25 - 37);
});

test("Game: giáp nhận sát thương trước máu, phần vượt giáp trừ vào máu", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.fireTimer = 1e9;
  s.coins = 100;
  buyAlly(s, "guardian");
  const e = spawnEnemy(s, "beetle");
  Object.assign(e, { x: 0, y: 0, speed: 0, hp: 1e4 });
  step(s);
  assert.equal(s.player.hp, 100);
  assert.equal(shieldHealth(s), 1);
  s.player.invuln = 0;
  step(s);
  assert.equal(shieldHealth(s), 0);
  assert.equal(s.player.hp, 87);
});

test("Game: giáp hồi về 15 mỗi 10 giây, không cộng dồn và dừng khi chọn nâng cấp", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  buyAlly(s, "guardian");
  s.allies[0].shield = 0;
  run(s, 9);
  assert.equal(shieldHealth(s), 0);
  const time = s.time;
  s.pending = ["seeds"];
  run(s, 2);
  assert.equal(s.time, time);
  assert.equal(shieldHealth(s), 0);
  s.pending = null;
  run(s, 1);
  assert.equal(shieldHealth(s), 15);
  run(s, 10);
  assert.equal(shieldHealth(s), 15);
});

test("Game: mỗi Aya Hộ Vệ có lịch hồi giáp riêng", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  s.level = 3;
  buyAlly(s, "guardian");
  run(s, 5);
  buyAlly(s, "guardian");
  s.allies[0].shield = 0;
  s.allies[1].shield = 0;
  run(s, 5);
  assert.equal(shieldCapacity(s), 30);
  assert.equal(shieldHealth(s), 15);
  run(s, 5);
  assert.equal(shieldHealth(s), 30);
});

test("Game: giáp hộ mệnh hồi sinh với 40% máu và tiêu hao một lượt", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  assert.equal(buyGuard(s), false);
  s.coins = 100;
  assert.equal(buyGuard(s), true);
  assert.equal(s.coins, 100 - GUARD.cost);
  assert.equal(guardCost(s), GUARD.cost + GUARD.step);
  assert.equal(s.guards, 1);
  s.player.hp = 5;
  const e = spawnEnemy(s, "beetle");
  Object.assign(e, { x: 0, y: 0 });
  step(s);
  assert.equal(s.over, false);
  assert.equal(s.revives, 1);
  assert.equal(s.guards, 0);
  assert.equal(s.player.hp, Math.round(s.player.maxHp * 0.4));
  // The next lethal hit ends the run.
  s.player.hp = 0;
  step(s);
  assert.equal(s.over, true);
});

test("Game: liềm đoạt mệnh giữ người chơi sống 5 giây và không mất đi", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  assert.equal(buyScythe(s), true);
  assert.equal(s.coins, 100 - SCYTHE.cost);
  assert.equal(scytheCost(s), SCYTHE.cost + SCYTHE.step);
  s.player.hp = 5;
  const e = spawnEnemy(s, "beetle");
  Object.assign(e, { x: 0, y: 0 });
  step(s);
  assert.equal(s.over, false);
  assert.equal(s.scythes, 1, "liềm vẫn còn sau khi dùng");
  assert.equal(s.player.hp, 1);
  assert.equal(s.player.invuln, SCYTHE.immortal, "bất tử đủ 5 giây");
  run(s, 4);
  assert.equal(s.over, false);
  assert.equal(s.player.hp, 1);
});

test("Game: liềm hồi sau 60 giây rồi dùng lại được", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  buyScythe(s);
  s.player.hp = 0;
  step(s);
  assert.equal(s.over, false);
  assert.equal(s.player.hp, 1);
  // Still cooling down: the next lethal hit ends the run.
  run(s, SCYTHE.cooldown - 10);
  s.player.hp = 0;
  s.player.invuln = 0;
  step(s);
  assert.equal(s.over, true);
});

test("Game: liềm được dùng lại sau khi hồi", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  buyScythe(s);
  s.player.hp = 0;
  step(s);
  run(s, SCYTHE.cooldown + 1);
  s.player.hp = 0;
  s.player.invuln = 0;
  step(s);
  assert.equal(s.over, false);
  assert.equal(s.player.hp, 1);
});

test("Game: liềm được dùng trước giáp", () => {
  const s = createGame();
  s.spawnTimer = -1e9;
  s.coins = 100;
  buyScythe(s);
  buyGuard(s);
  s.player.hp = 0;
  step(s);
  assert.equal(s.guards, 1);
  assert.equal(s.revives, 0);
  assert.equal(s.over, false);
});
