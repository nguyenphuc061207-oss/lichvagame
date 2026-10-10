import { useState } from "react";
import { FORMS } from "../features/forms/schema.mjs";
import { COLLECTIONS } from "../lib/constants.mjs";
import {
  emptyState,
  deleteRecord,
  removeDemo,
  record,
  updateRecord,
} from "../lib/state.mjs";
import { saveRecord, toggleRecord } from "../lib/actions.mjs";
import { todayISO, validDate, weekStart, addDays } from "../lib/dates.mjs";
import { habitDone, occursOn } from "../lib/selectors.mjs";
import { demoState } from "../lib/demo.mjs";
import { categoryKey } from "../lib/finance.mjs";
export function useAppActions({ state, commit, notify, navigate, setDate }) {
  const [editor, setEditor] = useState(null),
    [confirmation, setConfirmation] = useState(null);
  const confirm = (value) => setConfirmation(value);
  const edit = (entity, item = null, defaults = {}) => {
    if (
      ["assignments", "exams", "grades"].includes(entity) &&
      !state.subjects.length
    ) {
      notify(
        "Thêm môn học trước khi thêm bài tập, lịch thi hoặc điểm.",
        "error",
      );
      navigate("study");
      return;
    }
    setEditor({ entity, item, defaults });
  };
  const save = (entity, values, id) =>
    commit((s) => saveRecord(s, entity, values, id));
  const remove = (entity, id) => {
    const item = state[entity]?.find((r) => r.id === id);
    if (!item) return;
    confirm({
      title: "Xóa " + FORMS[entity].label + "?",
      message: `“${item.title}” sẽ bị xóa.${entity === "subjects" ? " Bài tập, lịch thi và điểm của môn này cũng sẽ bị xóa." : ""}${entity === "habits" ? " Lịch sử ghi nhận của thói quen cũng sẽ bị xóa." : ""}${entity === "events" && item.recurrence !== "none" ? " Thao tác này xóa toàn bộ lịch lặp." : ""}`,
      run: () => commit((s) => deleteRecord(s, entity, id), "Đã xóa."),
    });
  };
  const toggle = (entity, id, key) =>
    commit((s) => toggleRecord(s, entity, id, key)).catch(() => {});
  const skipOccurrence = (event, date) =>
    confirm({
      title: "Bỏ riêng buổi này?",
      message: `“${event.title}” vào ngày ${date} sẽ được bỏ qua. Các buổi khác giữ nguyên; có thể khôi phục trong phần sửa lịch.`,
      run: () =>
        commit((s) => {
          const saved = s.events.find((row) => row.id === event.id);
          if (!saved || !validDate(date) || !occursOn(saved, date))
            throw new Error("Buổi này không còn trong lịch.");
          return updateRecord(s, "events", saved.id, {
            excludedDates: [
              ...new Set([...(saved.excludedDates || []), date]),
            ].sort(),
            demo: false,
          });
        }, "Đã bỏ riêng buổi này."),
    });
  const logHabit = (habit, date) => {
    if (!validDate(date) || date > todayISO()) {
      notify("Chỉ ghi nhận thói quen hôm nay hoặc ngày trước đó.", "error");
      return;
    }
    commit((s) => {
      const saved = s.habits.find((h) => h.id === habit.id);
      if (!saved) throw new Error("Thói quen này đã bị xóa.");
      if (habitDone(s, saved, date)) {
        const start = saved.frequency === "weekly" ? weekStart(date) : date,
          end = saved.frequency === "weekly" ? addDays(start, 6) : date;
        return {
          ...s,
          habitLogs: s.habitLogs.filter(
            (l) =>
              !(l.habitId === saved.id && l.date >= start && l.date <= end),
          ),
        };
      }
      return {
        ...s,
        habitLogs: [...s.habitLogs, record({ habitId: saved.id, date })],
      };
    }, "Đã cập nhật thói quen.").catch(() => {});
  };
  const clearAll = () =>
    confirm({
      title: "Xóa toàn bộ dữ liệu?",
      message:
        "Lịch, giao dịch, nhật ký và dữ liệu cá nhân sẽ bị xóa. Hãy xuất bản sao lưu JSON trước nếu cần giữ lại. Thao tác này không thể hoàn tác.",
      danger: true,
      run: async () => {
        await commit(
          () => emptyState(),
          "Đã xóa dữ liệu. Bạn có thể bắt đầu lại.",
        );
        setDate(todayISO());
        navigate("dashboard");
      },
    });
  const loadDemo = () =>
    commit((s) => {
      if (COLLECTIONS.some((k) => s[k].some((r) => r.demo)))
        throw new Error("Dữ liệu mẫu đã có trong ứng dụng.");
      const sample = demoState();
      sample.budgets = sample.budgets.filter(
        (budget) =>
          !s.budgets.some(
            (existing) =>
              existing.month === budget.month &&
              categoryKey(existing.title) === categoryKey(budget.title),
          ),
      );
      return {
        ...s,
        ...Object.fromEntries(
          COLLECTIONS.map((k) => [k, [...s[k], ...sample[k]]]),
        ),
      };
    }, "Đã thêm dữ liệu mẫu.").catch(() => {});
  const clearDemo = () =>
    confirm({
      title: "Xóa dữ liệu mẫu?",
      message: "Chỉ xóa các mục mẫu. Dữ liệu bạn tự thêm sẽ được giữ lại.",
      run: () => commit(removeDemo, "Đã xóa dữ liệu mẫu."),
    });
  return {
    editor,
    confirmation,
    edit,
    save,
    remove,
    toggle,
    skipOccurrence,
    logHabit,
    confirm,
    clearAll,
    loadDemo,
    clearDemo,
    closeEditor: () => setEditor(null),
    closeConfirmation: () => setConfirmation(null),
  };
}
