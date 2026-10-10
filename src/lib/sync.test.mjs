import test from "node:test";
import assert from "node:assert/strict";
import {
  CODE_LENGTH,
  SyncError,
  createSyncApi,
  adoptRemote,
  createSyncCode,
  formatCode,
  syncSignature,
  loadMeta,
  normalizeCode,
  planSync,
  saveMeta,
} from "./sync.mjs";
import {
  CODE_PATTERN,
  createMemoryDb,
  handleSync,
  hashCode,
} from "../../server/sync-core.mjs";
import { emptyState } from "./state.mjs";

test("Đồng bộ: mã tạo ra đúng độ dài, đúng bảng chữ và không trùng", () => {
  const codes = new Set(Array.from({ length: 200 }, () => createSyncCode()));
  assert.equal(codes.size, 200);
  for (const code of codes) {
    assert.equal(code.length, CODE_LENGTH);
    assert.match(code, CODE_PATTERN);
  }
});

test("Đồng bộ: nhập mã chấp nhận dấu gạch, khoảng trắng, chữ thường", () => {
  const code = createSyncCode();
  assert.equal(normalizeCode(formatCode(code)), code);
  assert.equal(normalizeCode(` ${code.toLowerCase()} `), code);
  assert.equal(normalizeCode("ABC"), null, "quá ngắn");
  assert.equal(normalizeCode("0".repeat(CODE_LENGTH)), null, "ký tự dễ nhầm");
  assert.equal(normalizeCode(null), null);
});

test("Đồng bộ: kế hoạch theo bản trên máy chủ", () => {
  const clean = { revision: 3, dirty: false };
  const dirty = { revision: 3, dirty: true };
  assert.equal(planSync(clean, { revision: 3 }), "idle");
  assert.equal(planSync(dirty, { revision: 3 }), "push");
  assert.equal(planSync(clean, { revision: 5 }), "pull");
  assert.equal(planSync(dirty, { revision: 5 }), "conflict");
  assert.equal(planSync(clean, null), "push", "máy chủ mất dữ liệu");
  assert.equal(planSync(clean, { revision: 1 }), "conflict", "máy chủ cũ hơn");
});

test("Đồng bộ: lưu và đọc cấu hình trên máy, bỏ qua dữ liệu hỏng", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const code = createSyncCode();
  assert.equal(loadMeta(storage), null);
  saveMeta({ code, revision: 4, dirty: true, syncedAt: "2026-10-10" }, storage);
  assert.deepEqual(loadMeta(storage), {
    code,
    revision: 4,
    dirty: true,
    syncedAt: "2026-10-10",
  });
  storage.setItem("tranaya-sync", "{không phải json");
  assert.equal(loadMeta(storage), null);
  saveMeta(null, storage);
  assert.equal(store.size, 0);
  const blocked = {
    getItem() {
      throw new Error("bị chặn");
    },
  };
  assert.equal(loadMeta(blocked), null, "kho lưu trữ bị chặn");
});

// ----- máy chủ (lõi xử lý, CSDL giả trong bộ nhớ) -------------------------
const call = (db, over) =>
  handleSync({ method: "GET", code: createSyncCode(), db, ...over });

test("API: mã sai định dạng bị từ chối, phương thức lạ bị chặn", async () => {
  const db = createMemoryDb();
  assert.equal((await call(db, { code: "abc" })).status, 400);
  assert.equal((await call(db, { method: "DELETE" })).status, 405);
});

test("API: mã chưa có dữ liệu thì 404, tạo mới bằng revision 0", async () => {
  const db = createMemoryDb();
  const code = createSyncCode();
  assert.equal((await call(db, { code })).status, 404);
  const state = emptyState();
  const put = await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 0, data: state },
  });
  assert.deepEqual([put.status, put.body.revision], [200, 1]);
  const got = await call(db, { code });
  assert.equal(got.status, 200);
  assert.equal(got.body.revision, 1);
  assert.equal(got.body.data.preferences.name, "TranAya");
  assert.equal(hashCode(code).length, 64, "chỉ lưu mã băm");
});

test("API: ghi đúng revision thì tăng, lệch revision thì 409 kèm bản mới", async () => {
  const db = createMemoryDb();
  const code = createSyncCode();
  const state = emptyState();
  await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 0, data: state },
  });
  const edited = { ...state, preferences: { ...state.preferences, name: "A" } };
  const ok = await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 1, data: edited },
  });
  assert.deepEqual([ok.status, ok.body.revision], [200, 2]);
  // Another device still on revision 1 tries to save.
  const stale = await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 1, data: state },
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.revision, 2);
  assert.equal(stale.body.data.preferences.name, "A");
  // Creating over an existing code also conflicts instead of overwriting.
  const again = await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 0, data: state },
  });
  assert.equal(again.status, 409);
});

test("API: dữ liệu sai bị từ chối và không ghi", async () => {
  const db = createMemoryDb();
  const code = createSyncCode();
  const bad = await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 0, data: { schemaVersion: 99 } },
  });
  assert.equal(bad.status, 400);
  assert.equal((await call(db, { code })).status, 404);
  const noRevision = await call(db, {
    method: "PUT",
    code,
    body: { data: emptyState() },
  });
  assert.equal(noRevision.status, 400);
});

test("API: máy gửi kèm revision đã có thì không tải lại dữ liệu", async () => {
  const db = createMemoryDb();
  const code = createSyncCode();
  await call(db, {
    method: "PUT",
    code,
    body: { expectedRevision: 0, data: emptyState() },
  });
  const same = await call(db, { code, sinceRevision: "1" });
  assert.deepEqual(same.body, { revision: 1, unchanged: true });
  const older = await call(db, { code, sinceRevision: "0" });
  assert.ok(older.body.data);
});

test("Ứng dụng gọi API: lỗi mạng thành SyncError offline, 503 là chưa cấu hình", async () => {
  const offline = createSyncApi({
    fetchImpl: () => Promise.reject(new Error("net")),
  });
  await assert.rejects(
    () => offline.get(createSyncCode()),
    (e) => e instanceof SyncError && e.kind === "offline",
  );
  const noDb = createSyncApi({
    fetchImpl: async () => ({ status: 503, json: async () => ({}) }),
  });
  await assert.rejects(
    () => noDb.get(createSyncCode()),
    (e) => e.kind === "unavailable",
  );
  let seen;
  const api = createSyncApi({
    base: "https://x.test",
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return { status: 200, json: async () => ({ revision: 2 }) };
    },
  });
  const code = createSyncCode();
  const res = await api.get(code, 2);
  assert.equal(res.revision, 2);
  assert.equal(seen.url, "https://x.test/api/sync");
  assert.equal(seen.init.headers["x-sync-code"], code);
  assert.equal(seen.init.headers["x-since-revision"], "2");
});

test("Đồng bộ: giao diện riêng từng máy không đi qua đồng bộ", () => {
  const phone = emptyState();
  phone.preferences = { ...phone.preferences, theme: "dark", quality: "hd" };
  const desktop = emptyState();
  desktop.preferences = {
    ...desktop.preferences,
    theme: "light",
    quality: "ultra",
    name: "Tên khác",
  };
  // Theme/quality changes are not "unsynced work"; a name change is.
  assert.equal(
    syncSignature(phone),
    syncSignature({
      ...phone,
      preferences: { ...phone.preferences, theme: "light", quality: "ultra" },
    }),
  );
  assert.notEqual(syncSignature(phone), syncSignature(desktop));
  // Taking the desktop's data on the phone keeps the phone's own look.
  const adopted = adoptRemote(desktop, phone);
  assert.equal(adopted.preferences.name, "Tên khác");
  assert.equal(adopted.preferences.theme, "dark");
  assert.equal(adopted.preferences.quality, "hd");
  assert.equal(adoptRemote(desktop, null), desktop);
});
