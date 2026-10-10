import { addDays, formatDate, validDate, weekday } from "./dates.mjs";
import { CATEGORY } from "./constants.mjs";

// Turns one line of Vietnamese ("kế toán t2 t4 7h-9h") into a draft event or
// task. Everything runs on-device; nothing is guessed that the user could not
// fix afterwards in the normal form.

const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DEFAULT_MINUTES = { school: 120, work: 240, selfcare: 60 };
const FALLBACK_MINUTES = 60;
const DEFAULT_WEEKS = 16;

const KEYWORDS = {
  work: /\b(ca|di lam|lam them|part ?time|tang ca|ca lam)\b/,
  school:
    /\b(hoc|mon|thi|lop|tiet|kiem tra|thuc hanh|seminar|nhom|bao ve|giang duong)\b/,
  selfcare: /\b(gym|yoga|chay bo|the duc|thien|spa|ngu|tap|boi)\b/,
};
const TASK_WORDS =
  /\b(nop|han|deadline|bai tap|viec|nho|mua|gui|tra|dong tien|dang ky|lam bai)\b/;

// One character in, one character out, so indexes in the normalised text line
// up with the original (diacritics intact) for cutting the title out.
const fold = (text) =>
  [...text]
    .map((ch) => {
      const base = ch.normalize("NFD")[0].toLowerCase();
      return base === "đ" ? "d" : base;
    })
    .join("");

const minutes = (h, m = 0) => Number(h) * 60 + Number(m);
const clock = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const toMinutes = (hhmm) => minutes(...hhmm.split(":"));

const nextWeekday = (from, day) => {
  const gap = (day - weekday(from) + 7) % 7;
  return addDays(from, gap);
};

const normalTitle = (value) => fold(value).replace(/\s+/g, " ").trim();

function pickCategory(norm, title, history) {
  const same = history.find((e) => normalTitle(e.title) === normalTitle(title));
  if (same) return same.category;
  for (const key of ["work", "selfcare", "school"])
    if (KEYWORDS[key].test(norm)) return key;
  return "personal";
}

function pickDuration(category, title, history) {
  const key = normalTitle(title);
  const known =
    history.find((e) => normalTitle(e.title) === key) ||
    history.find((e) => e.category === category);
  if (known?.start && known?.end && known.end > known.start)
    return toMinutes(known.end) - toMinutes(known.start);
  return DEFAULT_MINUTES[category] || FALLBACK_MINUTES;
}

export function parseQuick(input, { today, events = [] } = {}) {
  const text = String(input || "").trim();
  if (!text) return null;
  const norm = fold(text);
  const cut = []; // [from, to) ranges that are not part of the title
  const take = (match) => {
    cut.push([match.index, match.index + match[0].length]);
    return match;
  };
  const free = (from, to) => !cut.some(([a, b]) => from < b && to > a); // not overlapping a cut

  // ---- time of day -------------------------------------------------------
  let start = null;
  let end = null;
  const range =
    /(?<![\d/])(\d{1,2})\s*(?:h|g|:)\s*(\d{2})?\s*(?:-|–|den|toi)\s*(\d{1,2})\s*(?:h|g|:)?\s*(\d{2})?(?![\d/])/.exec(
      norm,
    );
  if (range) {
    take(range);
    start = minutes(range[1], range[2]);
    end = minutes(range[3], range[4]);
  } else {
    const single = /(?<![\d/])(\d{1,2})\s*(?:h|g|:)\s*(\d{2})?(?![\d/])/.exec(
      norm,
    );
    if (single) {
      take(single);
      start = minutes(single[1], single[2]);
    }
  }
  const part = /\b(sang|chieu|toi|trua)\b/.exec(norm);
  if (part && start !== null) {
    take(part);
    // "7h toi" = 19:00, "1h chieu" = 13:00
    if ((part[1] === "chieu" || part[1] === "toi") && start < 12 * 60) {
      start += 12 * 60;
      if (end !== null && end < 12 * 60) end += 12 * 60;
    }
  }
  if (
    start !== null &&
    (start > 23 * 60 + 59 || (end !== null && end > 23 * 60 + 59))
  )
    return { error: "Giờ không hợp lệ." };

  // ---- date --------------------------------------------------------------
  let date = null;
  const full = /(?<!\d)(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?!\d)/.exec(norm);
  if (full) {
    take(full);
    const year = full[3] || today.slice(0, 4);
    let iso = `${year}-${full[2].padStart(2, "0")}-${full[1].padStart(2, "0")}`;
    if (!validDate(iso)) return { error: "Ngày không hợp lệ." };
    if (!full[3] && iso < today) iso = `${Number(year) + 1}${iso.slice(4)}`;
    date = validDate(iso) ? iso : null;
  }
  const relative = [
    [/\b(ngay kia|ngay mot)\b/, 2],
    [/\b(ngay mai|mai)\b/, 1],
    [/\b(hom nay|nay)\b/, 0],
  ];
  if (!date)
    for (const [pattern, offset] of relative) {
      const m = pattern.exec(norm);
      if (m && free(m.index, m.index + m[0].length)) {
        take(m);
        date = addDays(today, offset);
        break;
      }
    }

  // ---- weekdays ----------------------------------------------------------
  const days = [];
  const dayPattern = /\b(?:t|thu\s*)([2-7])\b|\b(cn|chu nhat)\b/g;
  for (const m of norm.matchAll(dayPattern)) {
    if (!free(m.index, m.index + m[0].length)) continue;
    cut.push([m.index, m.index + m[0].length]);
    const day = m[2] ? 6 : Number(m[1]) - 2;
    if (!days.includes(day)) days.push(day);
  }
  days.sort();

  // ---- repeat words --------------------------------------------------------
  let recurrence = days.length > 1 ? "weekly" : "none";
  const everyDay = /\b(hang ngay|moi ngay)\b/.exec(norm);
  const everyWeek = /\b(hang tuan|moi tuan)\b/.exec(norm);
  if (everyDay) {
    take(everyDay);
    recurrence = "daily";
  } else if (everyWeek) {
    take(everyWeek);
    recurrence = "weekly";
  }
  const weeks = /\b(?:trong\s+)?(\d{1,2})\s*tuan\b/.exec(norm);
  let repeatWeeks = DEFAULT_WEEKS;
  if (weeks && free(weeks.index, weeks.index + weeks[0].length)) {
    take(weeks);
    repeatWeeks = Math.min(52, Math.max(1, Number(weeks[1])));
    if (recurrence === "none") recurrence = "weekly";
  }

  // ---- place, priority ---------------------------------------------------------
  let location = "";
  const room = /\b(phong|p\.)\s*([a-z0-9.-]+)/.exec(norm);
  if (room) {
    location = text.slice(room.index, room.index + room[0].length);
    // The place stays visible in the title too (it is how people say it),
    // so only record it and do not cut it out.
  }
  const urgent = /\b(gap|quan trong|khan)\b/.exec(norm);
  if (urgent) take(urgent);

  // ---- title -------------------------------------------------------------------
  const cutSorted = cut.sort((a, b) => a[0] - b[0]);
  let title = "";
  let last = 0;
  for (const [a, b] of cutSorted) {
    if (a >= last) title += text.slice(last, a) + " ";
    last = Math.max(last, b);
  }
  title += text.slice(last);
  title = title
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(vao|luc|den|toi)\s+/i, "")
    .trim();
  // Leftover joiner words from "vào lúc", "từ", "ngày"
  title = title
    .replace(/(^|\s)(vào|lúc|từ|ngày|thứ|tới|đến)(?=\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return { error: "Thêm tên, ví dụ: Kế toán T2 T4 7h-9h." };
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 200) return { error: "Tên quá dài." };

  // ---- event or task ---------------------------------------------------------------
  const isTask =
    recurrence === "none" &&
    (start === null || (end === null && TASK_WORDS.test(norm)));
  if (isTask) {
    const due = date || (days.length ? nextWeekday(today, days[0]) : "");
    return {
      entity: "tasks",
      values: {
        title,
        due,
        category: KEYWORDS.school.test(norm) ? "school" : "personal",
        priority: urgent ? "high" : "medium",
      },
      summary: `Việc cần làm${due ? " · hạn " + formatDate(due) : ""}${
        urgent ? " · ưu tiên cao" : ""
      }`,
    };
  }

  if (start === null)
    return {
      error: "Thêm giờ cho lịch, ví dụ 7h-9h.",
      hint: true,
    };
  const category = pickCategory(norm, title, events);
  if (end === null) end = start + pickDuration(category, title, events);
  end = Math.min(end, 23 * 60 + 59);
  if (end <= start) return { error: "Giờ kết thúc phải sau giờ bắt đầu." };

  let first = date;
  if (!first) first = days.length ? nextWeekday(today, days[0]) : today;
  if (recurrence === "weekly" && days.length === 0) days.push(weekday(first));
  if (
    recurrence === "weekly" &&
    date &&
    days.length &&
    !days.includes(weekday(date))
  )
    first = nextWeekday(date, days[0]);

  const values = {
    title,
    category,
    date: first,
    start: clock(start),
    end: clock(end),
    location,
    recurrence,
    status: "planned",
    notes: "",
  };
  if (recurrence === "weekly") {
    values.weekdays = days.length ? days : [weekday(first)];
    values.weekInterval = 1;
    values.repeatUntil = addDays(first, repeatWeeks * 7 - 1);
  } else if (recurrence === "daily") {
    values.repeatUntil = addDays(first, repeatWeeks * 7 - 1);
  }
  const when =
    recurrence === "weekly"
      ? `${values.weekdays.map((d) => DAY_NAMES[d]).join(", ")} · lặp ${repeatWeeks} tuần`
      : recurrence === "daily"
        ? `Hằng ngày · ${repeatWeeks} tuần`
        : formatDate(first, true);
  return {
    entity: "events",
    values,
    summary: `${CATEGORY[category]} · ${when} · ${values.start}–${values.end}${
      location ? " · " + location : ""
    }`,
  };
}

// Recent distinct events the user has made before, newest first, so one tap
// can re-create them on another day.
export function recentTemplates(events, limit = 4) {
  const seen = new Set();
  const out = [];
  for (const e of [...events].reverse()) {
    if (e.demo || e.status === "cancelled") continue;
    const key = [normalTitle(e.title), e.start, e.end].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: e.title,
      category: e.category,
      start: e.start,
      end: e.end,
      location: e.location || "",
    });
    if (out.length >= limit) break;
  }
  return out;
}

export const guessCategory = (title, history = []) =>
  pickCategory(fold(title), title, history);

// End time for a new event: same length as the last similar one, never past
// midnight. Returns "" when no sensible end exists.
export function suggestEnd(start, category, title, history = []) {
  if (!/^\d{2}:\d{2}$/.test(start || "")) return "";
  const end = Math.min(
    toMinutes(start) + pickDuration(category, title, history),
    23 * 60 + 59,
  );
  return end > toMinutes(start) ? clock(end) : "";
}
