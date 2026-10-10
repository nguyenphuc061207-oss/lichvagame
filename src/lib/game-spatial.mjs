const SIZE = 96;
const indexes = new WeakMap();

export function enemyIndex(s) {
  let index = indexes.get(s);
  if (!index) {
    index = {
      cells: new Map(),
      pool: [],
      radius: 0,
      collisions: [],
      chains: [],
    };
    indexes.set(s, index);
  }
  index.cells.clear();
  index.radius = 0;
  let used = 0;
  for (let i = 0; i < s.enemies.length; i++) {
    const e = s.enemies[i];
    e.collisionOrder = i;
    if (e.hp <= 0) continue;
    index.radius = Math.max(index.radius, e.r);
    const key = `${Math.floor(e.x / SIZE)},${Math.floor(e.y / SIZE)}`;
    let cell = index.cells.get(key);
    if (!cell) {
      cell = index.pool[used] || (index.pool[used] = []);
      used++;
      cell.length = 0;
      index.cells.set(key, cell);
    }
    cell.push(e);
  }
  return index;
}

export function nearbyEnemies(index, x, y, radius, out) {
  out.length = 0;
  for (
    let ix = Math.floor((x - radius) / SIZE);
    ix <= Math.floor((x + radius) / SIZE);
    ix++
  ) {
    for (
      let iy = Math.floor((y - radius) / SIZE);
      iy <= Math.floor((y + radius) / SIZE);
      iy++
    ) {
      const cell = index.cells.get(`${ix},${iy}`);
      if (cell) for (const e of cell) out.push(e);
    }
  }
  return out;
}
