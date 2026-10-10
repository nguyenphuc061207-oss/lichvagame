import { COLLECTIONS, CATEGORY, PRIORITY } from "./constants.mjs";
import { validDate } from "./dates.mjs";
import { emptyState } from "./state.mjs";
import { categoryKey } from "./finance.mjs";
const REQUIRED = {
  events: ["title", "date", "start", "end", "category", "recurrence", "status"],
  tasks: ["title", "due", "priority", "category", "done"],
  transactions: ["title", "date", "kind", "amount", "category", "payment"],
  budgets: ["title", "month", "amount"],
  savings: ["title", "target", "current", "deadline"],
  subjects: ["title", "semester", "code", "lecturer", "notes"],
  assignments: ["title", "subjectId", "due", "done"],
  exams: ["title", "subjectId", "date", "start", "end"],
  grades: ["title", "subjectId", "weight", "score"],
  habits: ["title", "frequency"],
  habitLogs: ["habitId", "date"],
  goals: ["title", "deadline", "progress"],
  journals: ["title", "date", "content", "mood", "kind"],
  resources: ["title", "category", "tags", "url", "notes", "favorite"],
};
const ENUMS = {
  events: {
    category: Object.keys(CATEGORY),
    recurrence: ["none", "daily", "weekly"],
    status: ["planned", "done", "cancelled"],
  },
  tasks: { category: Object.keys(CATEGORY), priority: Object.keys(PRIORITY) },
  transactions: { kind: ["income", "expense", "transfer"] },
  habits: { frequency: ["daily", "weekly"] },
  journals: {
    kind: ["daily", "weekly"],
    mood: ["", "happy", "calm", "tired", "sad"],
  },
};
const STRING_FIELDS = [
  "title",
  "date",
  "start",
  "end",
  "category",
  "recurrence",
  "status",
  "due",
  "priority",
  "kind",
  "payment",
  "month",
  "deadline",
  "subjectId",
  "semester",
  "code",
  "lecturer",
  "notes",
  "frequency",
  "habitId",
  "content",
  "mood",
  "tags",
  "url",
  "reminder",
  "location",
  "repeatUntil",
];
const NUMBER_FIELDS = [
  "amount",
  "target",
  "current",
  "weight",
  "progress",
  "hours",
  "rate",
  "tips",
  "bonus",
];
const BOOLEAN_FIELDS = ["done", "favorite", "demo"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function validateEntity(entity, value) {
  const errors = {},
    fail = (key, message) => {
      errors[key] = message;
    };
  if (!COLLECTIONS.includes(entity) || !value || typeof value !== "object")
    return { form: "Dữ liệu không hợp lệ." };
  for (const key of STRING_FIELDS)
    if (key in value && typeof value[key] !== "string")
      fail(key, "Trường này phải là văn bản.");
  for (const key of NUMBER_FIELDS)
    if (key in value && !Number.isFinite(value[key]))
      fail(key, "Nhập một số hợp lệ.");
  for (const key of BOOLEAN_FIELDS)
    if (key in value && typeof value[key] !== "boolean")
      fail(key, "Trạng thái không hợp lệ.");
  if (Object.keys(errors).length) return errors;
  if ("title" in value && !value.title.trim())
    fail("title", "Nhập tên cho mục này.");
  for (const key of ["date", "due", "deadline", "repeatUntil"])
    if (value[key] && !validDate(value[key])) fail(key, "Ngày không hợp lệ.");
  if (
    value.reminder &&
    (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value.reminder) ||
      !validDate(value.reminder.slice(0, 10)))
  )
    fail("reminder", "Thời gian nhắc không hợp lệ.");
  for (const [key, values] of Object.entries(ENUMS[entity] || {}))
    if (key in value && !values.includes(value[key]))
      fail(key, "Phân loại không hợp lệ.");
  if (["events", "exams"].includes(entity)) {
    if (!validDate(value.date)) fail("date", "Chọn ngày hợp lệ.");
    if (!TIME.test(value.start || "")) fail("start", "Chọn giờ bắt đầu.");
    if (!TIME.test(value.end || "") || value.end <= value.start)
      fail("end", "Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.");
    if (value.repeatUntil && value.repeatUntil < value.date)
      fail("repeatUntil", "Ngày kết thúc lặp phải sau ngày bắt đầu.");
  }
  if (entity === "events") {
    if (
      value.weekdays !== undefined &&
      (!Array.isArray(value.weekdays) ||
        value.weekdays.some(
          (day) => !Number.isInteger(day) || day < 0 || day > 6,
        ) ||
        new Set(value.weekdays).size !== value.weekdays.length)
    )
      fail("weekdays", "Chọn các thứ hợp lệ trong tuần.");
    if (
      value.weekInterval !== undefined &&
      (!Number.isInteger(value.weekInterval) ||
        value.weekInterval < 1 ||
        value.weekInterval > 52)
    )
      fail("weekInterval", "Khoảng lặp từ 1 đến 52 tuần.");
    if (
      value.excludedDates !== undefined &&
      (!Array.isArray(value.excludedDates) ||
        value.excludedDates.some((date) => !validDate(date)) ||
        new Set(value.excludedDates).size !== value.excludedDates.length)
    )
      fail("excludedDates", "Ngày nghỉ không hợp lệ hoặc bị trùng.");
  }
  if (["transactions", "budgets", "savings"].includes(entity)) {
    const key = entity === "savings" ? "target" : "amount";
    if (!Number.isSafeInteger(value[key]) || value[key] <= 0)
      fail(key, "Nhập số tiền VND nguyên lớn hơn 0, trong giới hạn an toàn.");
  }
  if (entity === "transactions" && !validDate(value.date))
    fail("date", "Chọn ngày giao dịch.");
  for (const key of ["current", "hours", "rate", "tips", "bonus"])
    if (key in value && value[key] < 0) fail(key, "Nhập số không âm.");
  if (entity === "savings") {
    if (!Number.isSafeInteger(value.current) || value.current < 0)
      fail("current", "Số đã tiết kiệm phải là số VND nguyên không âm.");
    if (value.current > value.target)
      fail("current", "Số đã tiết kiệm không được vượt mục tiêu.");
  }
  if (entity === "grades") {
    if (
      !Number.isFinite(value.weight) ||
      value.weight < 0 ||
      value.weight > 100
    )
      fail("weight", "Trọng số từ 0 đến 100%.");
    if (
      value.score !== "" &&
      (!Number.isFinite(value.score) || value.score < 0 || value.score > 10)
    )
      fail("score", "Điểm từ 0 đến 10.");
  }
  if (
    entity === "goals" &&
    (!Number.isFinite(value.progress) ||
      value.progress < 0 ||
      value.progress > 100)
  )
    fail("progress", "Tiến độ từ 0 đến 100%.");
  if (entity === "resources" && value.url && !safeURL(value.url))
    fail("url", "Dùng liên kết https:// hoặc http:// hợp lệ.");
  if (entity === "journals" && !value.content?.trim())
    fail("content", "Viết một vài dòng trước khi lưu.");
  if (["assignments", "exams", "grades"].includes(entity) && !value.subjectId)
    fail("subjectId", "Chọn môn học.");
  if (
    entity === "budgets" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month || "")
  )
    fail("month", "Chọn tháng hợp lệ.");
  if (entity === "habitLogs" && !validDate(value.date))
    fail("date", "Ngày thói quen không hợp lệ.");
  return errors;
}
export function validateBackup(data) {
  if (!data || data.schemaVersion !== 1)
    throw new Error("Bản sao lưu không tương thích (cần phiên bản 1).");
  const preferences = data.preferences;
  if (
    !preferences ||
    typeof preferences.name !== "string" ||
    !preferences.name.trim() ||
    preferences.name.length > 80 ||
    typeof preferences.avatar !== "string" ||
    preferences.avatar.length > 10 ||
    !["system", "light", "dark"].includes(preferences.theme) ||
    ["mascotVisible", "mascotMotion"].some(
      (key) =>
        preferences[key] !== undefined && typeof preferences[key] !== "boolean",
    ) ||
    (preferences.quality !== undefined &&
      !["auto", "hd", "ultra"].includes(preferences.quality)) ||
    !["rose", "plum", "sage"].includes(preferences.accent) ||
    typeof preferences.compact !== "boolean" ||
    typeof preferences.decoration !== "boolean" ||
    !preferences.widgets ||
    ["finance", "habits", "goals"].some(
      (key) => typeof preferences.widgets[key] !== "boolean",
    )
  )
    throw new Error("Cài đặt trong bản sao lưu không hợp lệ.");
  const ids = new Set();
  for (const entity of COLLECTIONS) {
    if (!Array.isArray(data[entity]) || data[entity].length > 10000)
      throw new Error("Dữ liệu " + entity + " không hợp lệ.");
    for (const row of data[entity]) {
      if (
        !row ||
        typeof row !== "object" ||
        typeof row.id !== "string" ||
        !row.id.trim() ||
        ids.has(row.id) ||
        typeof row.createdAt !== "string" ||
        !Number.isFinite(Date.parse(row.createdAt)) ||
        typeof row.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(row.updatedAt)) ||
        REQUIRED[entity].some((key) => !Object.hasOwn(row, key)) ||
        Object.keys(validateEntity(entity, row)).length
      )
        throw new Error("Có bản ghi không hợp lệ trong " + entity + ".");
      ids.add(row.id);
    }
  }
  const subjectIds = new Set(data.subjects.map((s) => s.id)),
    habitIds = new Set(data.habits.map((h) => h.id));
  for (const entity of ["assignments", "exams", "grades"])
    if (data[entity].some((row) => !subjectIds.has(row.subjectId)))
      throw new Error("Có mục học tập không có môn học tương ứng.");
  if (data.habitLogs.some((log) => !habitIds.has(log.habitId)))
    throw new Error("Nhật ký thói quen thiếu thói quen tương ứng.");
  const budgetKeys = data.budgets.map(
    (b) => b.month + ":" + categoryKey(b.title),
  );
  if (new Set(budgetKeys).size !== budgetKeys.length)
    throw new Error("Có danh mục ngân sách trùng trong cùng tháng.");
  for (const entity of ["transactions", "budgets", "savings"]) {
    const amountKey = entity === "savings" ? "target" : "amount";
    if (
      !Number.isSafeInteger(
        data[entity].reduce((sum, row) => sum + row[amountKey], 0),
      )
    )
      throw new Error("Tổng tiền vượt giới hạn tính toán an toàn.");
  }
  return {
    ...emptyState(),
    ...data,
    preferences: { ...emptyState().preferences, ...preferences },
  };
}
