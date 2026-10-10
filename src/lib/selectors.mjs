import { localMinute, weekday, weekStart, addDays } from "./dates.mjs";

export const dueReminders = (state, now) =>
  state.tasks
    .filter((t) => !t.done && t.reminder && t.reminder <= localMinute(now))
    .sort((a, b) => a.reminder.localeCompare(b.reminder));

export function occursOn(event, date) {
  if (event.status === "cancelled" || date < event.date) return false;
  if (event.excludedDates?.includes(date)) return false;
  if (event.repeatUntil && date > event.repeatUntil) return false;
  if (event.recurrence === "daily") return true;
  if (event.recurrence === "weekly") {
    const days = event.weekdays?.length
      ? event.weekdays
      : [weekday(event.date)];
    const weeks = Math.round(
      (Date.parse(weekStart(date)) - Date.parse(weekStart(event.date))) /
        604800000,
    );
    return (
      days.includes(weekday(date)) && weeks % (event.weekInterval || 1) === 0
    );
  }
  return event.date === date;
}

export function eventsOn(state, date) {
  const stored = state.events
    .filter((e) => occursOn(e, date))
    .map((e) => ({ ...e, occurrenceDate: date, entity: "events" }));
  const exams = state.exams
    .filter((e) => e.date === date)
    .map((e) => ({ ...e, category: "school", entity: "exams" }));
  return [...stored, ...exams].sort((a, b) => a.start.localeCompare(b.start));
}

export function hasConflict(event, events) {
  if (event.status === "cancelled") return false;
  return events.some(
    (e) =>
      e.id !== event.id &&
      e.status !== "cancelled" &&
      e.start < event.end &&
      event.start < e.end,
  );
}

export function habitDone(state, habit, date) {
  const start = habit.frequency === "weekly" ? weekStart(date) : date;
  const end = habit.frequency === "weekly" ? addDays(start, 6) : date;
  return state.habitLogs.some(
    (l) => l.habitId === habit.id && l.date >= start && l.date <= end,
  );
}

export function taskPool(state) {
  return [
    ...state.tasks.map((t) => ({ ...t, entity: "tasks" })),
    ...state.assignments.map((t) => ({
      ...t,
      category: "school",
      priority: "high",
      entity: "assignments",
    })),
  ];
}
