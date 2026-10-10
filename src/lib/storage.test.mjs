import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { readState, writeState } from "./storage.mjs";
import { demoState } from "./demo.mjs";
import {
  COLLECTIONS,
  emptyState,
  record,
  deleteRecord,
  updateRecord,
} from "./domain.mjs";
test("IndexedDB: chưa có dữ liệu, lưu và đọc lại toàn bộ schema", async () => {
  assert.equal(await readState(), null);
  const data = demoState();
  await writeState(data);
  assert.deepEqual(await readState(), data);
});
test("IndexedDB: thêm, sửa, xóa từng loại dữ liệu và đọc lại", async () => {
  let state = demoState();
  for (const key of COLLECTIONS) {
    const original = state[key][0];
    if (!original) continue;
    const newRecord = record({
      ...original,
      id: undefined,
      ...(original.title ? { title: original.title + " mới" } : {}),
    });
    state = { ...state, [key]: [...state[key], newRecord] };
    await writeState(state);
    assert.equal((await readState())[key].length, state[key].length);
    state = updateRecord(state, key, newRecord.id, {
      updatedAt: new Date().toISOString(),
      ...(original.title ? { title: "Đã sửa" } : {}),
    });
    await writeState(state);
    assert.deepEqual(
      (await readState())[key].find((r) => r.id === newRecord.id),
      state[key].find((r) => r.id === newRecord.id),
    );
    state = deleteRecord(state, key, newRecord.id);
    await writeState(state);
    assert.equal(
      (await readState())[key].some((r) => r.id === newRecord.id),
      false,
    );
  }
});
test("IndexedDB: dữ liệu không đổi nếu giao dịch ghi thất bại", async () => {
  const before = await readState();
  await assert.rejects(() => writeState({ ...before, invalid: () => {} }));
  assert.deepEqual(await readState(), before);
});
test("IndexedDB: xóa toàn bộ giữ trạng thái trống sau khi đọc lại", async () => {
  await writeState(emptyState());
  assert.deepEqual(await readState(), emptyState());
});
