import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  record,
  financeSummary,
  payroll,
  gradeSummary,
  occursOn,
  hasConflict,
  addDays,
  weekStart,
  validateBackup,
  validateEntity,
  deleteRecord,
  updateRecord,
  removeDemo,
  csvTransactions,
  safeURL,
  habitDone,
  eventsOn,
} from "./domain.mjs";
import { demoState } from "./demo.mjs";

test("thu chi loại bỏ chuyển nội bộ, giới hạn đúng tháng", () => {
  const s = emptyState();
  s.transactions = [
    { date: "2026-10-01", kind: "income", amount: 1000 },
    { date: "2026-10-02", kind: "expense", amount: 300 },
    { date: "2026-10-02", kind: "transfer", amount: 900 },
    { date: "2026-09-30", kind: "income", amount: 800 },
  ];
  s.budgets = [{ month: "2026-10", amount: 500 }];
  assert.deepEqual(financeSummary(s, "2026-10"), {
    income: 1000,
    expense: 300,
    net: 700,
    budget: 500,
    available: 200,
  });
});
test("lương theo giờ, giờ lẻ, tips và thưởng", () =>
  assert.equal(payroll(25000, 4.5, 20000, 50000), 182500));
test("điểm thành phần khác nhau và chưa chấm", () => {
  assert.deepEqual(
    gradeSummary([
      { weight: 20, score: 8 },
      { weight: 80, score: 9 },
    ]),
    { weight: 100, assessed: 100, weighted: 8.8, average: 8.8, complete: true },
  );
  const partial = gradeSummary([
    { weight: 10, score: 9 },
    { weight: 30, score: "" },
    { weight: 60, score: "" },
  ]);
  assert.equal(partial.average, 9);
  assert.equal(partial.complete, false);
  assert.equal(gradeSummary([{ weight: 80, score: 8 }]).weight, 80);
  assert.equal(gradeSummary([]).average, null);
});
test("ngày tháng qua năm nhuận, tuần bắt đầu thứ hai", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekStart("2026-10-11"), "2026-10-05");
});
test("lịch lặp, ngày kết thúc và hủy lịch", () => {
  const e = {
    date: "2026-10-09",
    recurrence: "weekly",
    repeatUntil: "2026-10-23",
    status: "planned",
  };
  assert.equal(occursOn(e, "2026-10-16"), true);
  assert.equal(occursOn(e, "2026-10-17"), false);
  assert.equal(occursOn(e, "2026-10-30"), false);
  assert.equal(occursOn(e, "2026-10-02"), false);
  assert.equal(occursOn({ ...e, status: "cancelled" }, "2026-10-16"), false);
  assert.equal(occursOn({ ...e, recurrence: "daily" }, "2026-10-10"), true);
});
test("trùng lịch: giao nhau, tiếp giáp và bỏ qua lịch hủy", () => {
  const e = { id: "a", start: "08:00", end: "09:00" };
  assert.equal(
    hasConflict(e, [{ id: "b", start: "08:30", end: "09:30" }]),
    true,
  );
  assert.equal(
    hasConflict(e, [{ id: "b", start: "09:00", end: "10:00" }]),
    false,
  );
  assert.equal(
    hasConflict(e, [
      { id: "b", start: "08:30", end: "09:30", status: "cancelled" },
    ]),
    false,
  );
});
test("lịch thi xuất hiện trong lịch ngày", () => {
  const s = emptyState();
  s.exams = [
    {
      id: "ex",
      date: "2026-10-09",
      start: "07:00",
      end: "08:00",
      title: "Thi",
    },
  ];
  assert.equal(eventsOn(s, "2026-10-09")[0].entity, "exams");
});
test("thói quen tuần không tạo yêu cầu hoàn thành mỗi ngày", () => {
  const s = emptyState();
  s.habitLogs = [{ habitId: "h", date: "2026-10-05" }];
  assert.equal(
    habitDone(s, { id: "h", frequency: "weekly" }, "2026-10-11"),
    true,
  );
  assert.equal(
    habitDone(s, { id: "h", frequency: "daily" }, "2026-10-11"),
    false,
  );
});
test("mọi loại dữ liệu mẫu sao lưu/khôi phục hợp lệ", () =>
  assert.deepEqual(
    validateBackup(JSON.parse(JSON.stringify(demoState()))).schemaVersion,
    1,
  ));
test("khôi phục từ chối tệp sai phiên bản, kiểu, ID trùng và liên kết hỏng", () => {
  assert.throws(() => validateBackup({ schemaVersion: 9 }));
  const s = demoState();
  s.transactions[0].amount = "100";
  assert.throws(() => validateBackup(s));
  const s2 = demoState();
  s2.tasks.push(s2.tasks[0]);
  assert.throws(() => validateBackup(s2));
  const s3 = demoState();
  s3.assignments[0].subjectId = "missing";
  assert.throws(() => validateBackup(s3));
});
test("validation tiền âm, thời gian ngược và điểm quá thang", () => {
  assert.ok(
    validateEntity("transactions", {
      title: "Chi",
      amount: -100,
      date: "2026-10-09",
    }).amount,
  );
  assert.ok(
    validateEntity("events", {
      title: "Học",
      date: "2026-10-09",
      start: "09:00",
      end: "08:00",
    }).end,
  );
  assert.ok(
    validateEntity("grades", {
      title: "Điểm",
      subjectId: "x",
      weight: 110,
      score: 11,
    }).score,
  );
  assert.ok(
    validateEntity("savings", { title: "Tiết kiệm", target: 100, current: 200 })
      .current,
  );
});
test("chỉnh sửa giữ ID và ngày tạo, xóa môn học không để bản ghi mồ côi", () => {
  const s = demoState(),
    id = s.subjects[0].id;
  const updated = updateRecord(s, "subjects", id, {
    title: "Tên mới",
    id: "overwrite",
  });
  assert.equal(updated.subjects[0].id, id);
  assert.equal(updated.subjects[0].createdAt, s.subjects[0].createdAt);
  const deleted = deleteRecord(s, "subjects", id);
  assert.equal(deleted.assignments.length, 0);
  assert.equal(deleted.exams.length, 0);
  assert.equal(deleted.grades.length, 0);
  assert.doesNotThrow(() => validateBackup(deleted));
});
test("xóa thói quen xóa nhật ký liên quan", () => {
  const s = demoState();
  const next = deleteRecord(s, "habits", s.habits[0].id);
  assert.equal(next.habitLogs.length, 0);
});
test("xóa mẫu giữ dữ liệu thật và quan hệ môn học cần dùng", () => {
  const s = demoState();
  s.assignments.push(
    record({
      title: "Bài thật",
      subjectId: s.subjects[0].id,
      due: "2026-10-10",
      done: false,
      notes: "",
    }),
  );
  const next = removeDemo(s);
  assert.equal(next.assignments.length, 1);
  assert.equal(next.subjects.length, 1);
  assert.equal(next.subjects[0].demo, false);
  assert.doesNotThrow(() => validateBackup(next));
});
test("URL chỉ cho http(s); CSV escape dấu ngoặc, xuống dòng và công thức", () => {
  assert.equal(safeURL("javascript:alert(1)"), null);
  assert.equal(safeURL("https://example.com"), "https://example.com/");
  const csv = csvTransactions([
    {
      title: "=1+1",
      notes: 'a"b\nc',
      amount: 100,
      date: "2026-10-09",
      kind: "expense",
      category: "Ăn",
      payment: "Tiền mặt",
    },
  ]);
  assert.ok(csv.includes("'" + "=1+1"));
  assert.ok(csv.includes('a""b\nc'));
});

test("nhắc việc dùng giờ Việt Nam và bỏ qua việc đã hoàn thành", async () => {
  const { localMinute, dueReminders } = await import("./domain.mjs");
  const now = Date.parse("2026-10-09T03:30:00Z");
  assert.equal(localMinute(now), "2026-10-09T10:30");
  const s = emptyState();
  s.tasks = [
    { id: "a", done: false, reminder: "2026-10-09T10:00" },
    { id: "b", done: true, reminder: "2026-10-09T10:00" },
    { id: "c", done: false, reminder: "2026-10-09T11:00" },
  ];
  assert.deepEqual(
    dueReminders(s, now).map((t) => t.id),
    ["a"],
  );
  assert.ok(
    validateEntity("tasks", { title: "A", reminder: "2026-99-99T10:00" })
      .reminder,
  );
});
test("validation ngày không tồn tại không làm vỡ form", () => {
  assert.ok(
    validateEntity("events", {
      title: "A",
      date: "2026-99-99",
      start: "08:00",
      end: "09:00",
    }).date,
  );
  assert.ok(validateEntity("tasks", { title: "A", due: "2026-02-30" }).due);
});
