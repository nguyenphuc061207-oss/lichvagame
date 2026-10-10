import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { getFormDefaults } from "../features/forms/schema.mjs";
import { emptyState, record } from "./state.mjs";
import { saveRecord } from "./actions.mjs";
import { budgetSpent } from "./finance.mjs";
import { validateBackup } from "./validation.mjs";
import {
  readSnapshot,
  writeState,
  loadAppState,
} from "../services/storage.mjs";

test("Form mới dùng ngày và tháng tại thời điểm mở", () => {
  assert.equal(getFormDefaults("tasks", "2026-12-31").due, "2026-12-31");
  assert.equal(getFormDefaults("events", "2027-01-01").date, "2027-01-01");
  assert.equal(getFormDefaults("budgets", "2027-01-01").month, "2027-01");
});

test("Ngân sách cộng chi tiêu không phân biệt hoa thường và từ chối mục trùng", () => {
  let state = saveRecord(emptyState(), "budgets", {
    title: "Ăn uống",
    month: "2026-10",
    amount: 1000000,
  });
  state.transactions = [
    record({
      title: "Bữa trưa",
      kind: "expense",
      amount: 50000,
      date: "2026-10-09",
      category: " ăn UỐNG ",
    }),
  ];
  assert.equal(budgetSpent(state, state.budgets[0]), 50000);
  assert.throws(
    () =>
      saveRecord(state, "budgets", {
        title: "ĂN UỐNG",
        month: "2026-10",
        amount: 2000000,
      }),
    /đã có ngân sách/,
  );
});

test("Dữ liệu nhật ký sai kiểu và ID trùng giữa collection bị từ chối", () => {
  const state = emptyState();
  state.journals = [
    record({ title: "Nhật ký", date: "2026-10-09", mood: "good", content: 42 }),
  ];
  assert.throws(() => validateBackup(state));
  state.journals = [];
  state.tasks = [
    record({ ...getFormDefaults("tasks"), title: "Việc cần làm" }),
  ];
  state.resources = [
    {
      ...record({ ...getFormDefaults("resources"), title: "Ghi chú" }),
      id: state.tasks[0].id,
    },
  ];
  assert.throws(() => validateBackup(state));
});

test("Ghi dữ liệu không hợp lệ không làm hỏng snapshot đã lưu", async () => {
  await writeState(emptyState());
  const before = await readSnapshot();
  await assert.rejects(() =>
    writeState({ ...before.state, tasks: [{ title: "Thiếu dữ liệu" }] }),
  );
  assert.deepEqual(await readSnapshot(), before);
});

test("Hai lượt lưu cùng revision: chỉ lượt đầu được ghi", async () => {
  await writeState(emptyState());
  const before = await readSnapshot();
  const first = {
    ...before.state,
    preferences: { ...before.state.preferences, name: "Tab A" },
  };
  const second = {
    ...before.state,
    preferences: { ...before.state.preferences, name: "Tab B" },
  };
  const results = await Promise.allSettled([
    writeState(first, { expectedRevision: before.revision }),
    writeState(second, { expectedRevision: before.revision }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].reason.code, "STALE_STATE");
  assert.equal((await readSnapshot()).state.preferences.name, "Tab A");
});

test("Mở lại ứng dụng đọc snapshot mới thay vì cache lần đầu", async () => {
  await writeState(emptyState());
  const first = await loadAppState(emptyState);
  const updated = {
    ...first.state,
    preferences: { ...first.state.preferences, name: "Đã cập nhật" },
  };
  await writeState(updated);
  assert.equal(
    (await loadAppState(emptyState)).state.preferences.name,
    "Đã cập nhật",
  );
});
