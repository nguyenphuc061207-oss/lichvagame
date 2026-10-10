import { addDays, validDate } from "./dates.mjs";
import { occursOn, eventsOn, hasConflict } from "./selectors.mjs";

export function inspectSchedule(event, state) {
  if (!validDate(event.date))
    return { upcoming: [], conflicts: [], checkedThrough: "" };
  const end =
    event.recurrence === "none"
      ? event.date
      : [event.repeatUntil || "9999-12-31", addDays(event.date, 365)].sort()[0];
  const upcoming = [],
    conflicts = [];
  for (let date = event.date; date <= end; date = addDays(date, 1)) {
    if (occursOn(event, date)) {
      if (upcoming.length < 6) upcoming.push(date);
      if (
        event.start &&
        event.end &&
        hasConflict(event, eventsOn(state, date)) &&
        conflicts.length < 5
      )
        conflicts.push(date);
    }
    if (date === "9999-12-31") break;
  }
  return { upcoming, conflicts, checkedThrough: end };
}
