import test from "node:test";
import assert from "node:assert/strict";
import { occursOn, eventsOn } from "./selectors.mjs";
import { inspectSchedule } from "./recurrence.mjs";
import { emptyState, record } from "./state.mjs";
import { validateEntity, validateBackup } from "./validation.mjs";

const event = {
  title: "Lịch học",
  date: "2026-10-05",
  start: "08:00",
  end: "10:00",
  category: "school",
  recurrence: "weekly",
  status: "planned",
  weekdays: [0, 2],
  weekInterval: 2,
  repeatUntil: "2026-11-01",
  excludedDates: ["2026-10-21"],
};
test("Lặp nhiều thứ, cách tuần, ngày kết thúc và bỏ buổi", () => {
  for (const [date, expected] of [
    ["2026-10-05", true],
    ["2026-10-07", true],
    ["2026-10-06", false],
    ["2026-10-12", false],
    ["2026-10-19", true],
    ["2026-10-21", false],
    ["2026-11-02", false],
  ])
    assert.equal(occursOn(event, date), expected, date);
});
test("Lặp cách tuần tính từ thứ hai, không phải từ ngày đầu tiên", () => {
  const midweek = { ...event, date: "2026-10-07", excludedDates: [] };
  assert.equal(occursOn(midweek, "2026-10-05"), false);
  assert.equal(occursOn(midweek, "2026-10-12"), false);
  assert.equal(occursOn(midweek, "2026-10-19"), true);
});
test("Lịch cũ thiếu trường mới vẫn lặp đúng ngày trong tuần", () => {
  const { weekdays, weekInterval, excludedDates, ...legacy } = event;
  void weekdays;
  void weekInterval;
  void excludedDates;
  assert.equal(occursOn(legacy, "2026-10-12"), true);
  assert.equal(occursOn(legacy, "2026-10-14"), false);
});
test("Cảnh báo phát hiện trùng ở tuần sau và bỏ qua ngày nghỉ", () => {
  const state = emptyState();
  state.events = [
    record({
      ...event,
      recurrence: "none",
      date: "2026-10-19",
      start: "09:00",
      end: "11:00",
    }),
  ];
  assert.deepEqual(inspectSchedule(event, state).conflicts, ["2026-10-19"]);
  assert.deepEqual(
    inspectSchedule({ ...event, excludedDates: ["2026-10-19"] }, state)
      .conflicts,
    [],
  );
});
test("Chỉnh sửa chuỗi không cảnh báo trùng với chính nó", () => {
  const saved = record(event),
    state = { ...emptyState(), events: [saved] };
  assert.deepEqual(inspectSchedule(saved, state).conflicts, []);
  assert.equal(eventsOn(state, "2026-10-21").length, 0);
  assert.deepEqual(validateBackup(state).events, [saved]);
});
test("Từ chối trường lặp sai kiểu và ngày nghỉ không tồn tại", () => {
  for (const values of [
    { weekdays: [7] },
    { weekdays: "T2" },
    { weekInterval: 0 },
    { weekInterval: 1.5 },
    { excludedDates: ["2026-02-30"] },
  ])
    assert.ok(
      Object.keys(validateEntity("events", { ...event, ...values })).length,
    );
});
