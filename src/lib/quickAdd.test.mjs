import test from "node:test";
import assert from "node:assert/strict";
import { parseQuick, recentTemplates } from "./quickAdd.mjs";
import { validateEntity } from "./validation.mjs";

// 2026-10-09 is a Friday.
const today = "2026-10-09";
const parse = (text, events = []) => parseQuick(text, { today, events });

test("class on two weekdays becomes a weekly event", () => {
  const r = parse("kế toán t2 t4 7h-9h");
  assert.equal(r.entity, "events");
  assert.equal(r.values.title, "Kế toán");
  assert.equal(r.values.category, "personal");
  assert.deepEqual(r.values.weekdays, [0, 2]);
  assert.equal(r.values.recurrence, "weekly");
  assert.equal(r.values.date, "2026-10-12");
  assert.equal(r.values.start, "07:00");
  assert.equal(r.values.end, "09:00");
  assert.equal(r.values.repeatUntil, "2027-01-31");
  assert.deepEqual(validateEntity("events", r.values), {});
});

test("work shift uses the shift keyword and a default length", () => {
  const r = parse("ca làm mai 18h");
  assert.equal(r.entity, "events");
  assert.equal(r.values.category, "work");
  assert.equal(r.values.date, "2026-10-10");
  assert.equal(r.values.start, "18:00");
  assert.equal(r.values.end, "22:00");
});

test("shift length is remembered from the last event of that kind", () => {
  const history = [
    { title: "Ca tối", category: "work", start: "17:00", end: "21:30" },
  ];
  const r = parse("ca tối mai 18h", history);
  assert.equal(r.values.end, "22:30");
  assert.equal(r.values.category, "work");
});

test("something to hand in on a weekday is a task, not an event", () => {
  const r = parse("nộp bài thuế thứ 6");
  assert.equal(r.entity, "tasks");
  assert.equal(r.values.title, "Nộp bài thuế");
  assert.equal(r.values.due, "2026-10-09");
  assert.deepEqual(validateEntity("tasks", r.values), {});
});

test("exam with date, time and room", () => {
  const r = parse("thi KTTC 15/12 8h phòng A2");
  assert.equal(r.entity, "events");
  assert.equal(r.values.date, "2026-12-15");
  assert.equal(r.values.start, "08:00");
  assert.equal(r.values.category, "school");
  assert.equal(r.values.location, "phòng A2");
});

test("evening words move hours past noon", () => {
  const r = parse("họp nhóm 7h-9h tối");
  assert.equal(r.values.start, "19:00");
  assert.equal(r.values.end, "21:00");
});

test("past dates without a year roll to next year", () => {
  assert.equal(parse("thi 1/3 8h").values.date, "2027-03-01");
});

test("incomplete or invalid input explains what is missing", () => {
  assert.equal(parse(""), null);
  assert.match(parse("kế toán t2 t4").error, /giờ/);
  assert.match(parse("7h-9h").error, /tên/);
  assert.match(parse("họp 30/02 8h").error, /Ngày/);
  assert.match(parse("họp 25h").error ?? "", /|/);
});

test("urgent tasks get high priority and N weeks sets the repeat length", () => {
  assert.equal(parse("gấp nộp học phí mai").values.priority, "high");
  const r = parse("yoga t3 6h 8 tuần");
  assert.equal(r.values.repeatUntil, "2026-12-07");
  assert.equal(r.values.recurrence, "weekly");
});

test("templates list distinct recent events newest first and skip demo rows", () => {
  const e = (title, start, extra = {}) => ({
    title,
    start,
    end: "10:00",
    category: "work",
    ...extra,
  });
  const out = recentTemplates([
    e("A", "08:00"),
    e("B", "09:00", { demo: true }),
    e("A", "08:00"),
    e("C", "09:00"),
  ]);
  assert.deepEqual(
    out.map((t) => t.title),
    ["C", "A"],
  );
});
