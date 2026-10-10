import { COLLECTIONS } from "./constants.mjs";

export function emptyState() {
  return {
    schemaVersion: 1,
    preferences: {
      name: "Mimi",
      avatar: "M",
      theme: "system",
      accent: "rose",
      compact: false,
      decoration: true,
      widgets: { finance: true, habits: true, goals: true },
    },
    ...Object.fromEntries(COLLECTIONS.map((k) => [k, []])),
  };
}

export const record = (data) => ({
  ...data,
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function updateRecord(state, entity, id, values) {
  return {
    ...state,
    [entity]: state[entity].map((r) =>
      r.id === id
        ? {
            ...r,
            ...values,
            id: r.id,
            createdAt: r.createdAt,
            updatedAt: new Date().toISOString(),
          }
        : r,
    ),
  };
}

export function deleteRecord(state, entity, id) {
  const next = { ...state, [entity]: state[entity].filter((r) => r.id !== id) };
  if (entity === "subjects")
    for (const k of ["assignments", "exams", "grades"])
      next[k] = state[k].filter((r) => r.subjectId !== id);
  if (entity === "habits")
    next.habitLogs = state.habitLogs.filter((r) => r.habitId !== id);
  return next;
}

export function removeDemo(state) {
  const next = {
    ...state,
    ...Object.fromEntries(
      COLLECTIONS.map((k) => [k, state[k].filter((r) => !r.demo)]),
    ),
  };
  const subjects = new Set(
      ["assignments", "exams", "grades"].flatMap((k) =>
        next[k].map((r) => r.subjectId),
      ),
    ),
    habits = new Set(next.habitLogs.map((r) => r.habitId));
  next.subjects = state.subjects
    .filter((s) => !s.demo || subjects.has(s.id))
    .map((s) => (s.demo ? { ...s, demo: false } : s));
  next.habits = state.habits
    .filter((h) => !h.demo || habits.has(h.id))
    .map((h) => (h.demo ? { ...h, demo: false } : h));
  return next;
}
