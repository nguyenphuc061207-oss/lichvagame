import { COLLECTIONS } from "./constants.mjs";
import { record, updateRecord } from "./state.mjs";
import { validateEntity } from "./validation.mjs";
import { categoryKey } from "./finance.mjs";
export function saveRecord(state, entity, values, id) {
  if (!COLLECTIONS.includes(entity))
    throw new Error("Loại dữ liệu không được hỗ trợ.");
  const {
    entity: displayEntity,
    occurrenceDate,
    id: displayId,
    createdAt,
    updatedAt,
    ...input
  } = values;
  // Display-only metadata never becomes persistent data.
  void displayEntity;
  void occurrenceDate;
  void displayId;
  void createdAt;
  void updatedAt;
  const data = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
  const errors = validateEntity(entity, data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (
    ["assignments", "exams", "grades"].includes(entity) &&
    !state.subjects.some((s) => s.id === data.subjectId)
  )
    throw new Error("Môn học không còn tồn tại. Hãy chọn lại môn học.");
  if (
    entity === "budgets" &&
    state.budgets.some(
      (b) =>
        b.id !== id &&
        b.month === data.month &&
        categoryKey(b.title) === categoryKey(data.title),
    )
  )
    throw new Error(
      "Danh mục này đã có ngân sách trong tháng. Hãy sửa ngân sách hiện có.",
    );
  if (id) {
    if (!state[entity].some((row) => row.id === id))
      throw new Error("Mục này đã bị xóa. Hãy tải lại danh sách.");
    return updateRecord(state, entity, id, { ...data, demo: false });
  }
  return {
    ...state,
    [entity]: [...state[entity], record({ ...data, demo: false })],
  };
}
export function toggleRecord(state, entity, id, key) {
  const row = state[entity]?.find((r) => r.id === id);
  if (!row || typeof row[key] !== "boolean")
    throw new Error("Không thể cập nhật mục đã bị xóa.");
  return updateRecord(state, entity, id, { [key]: !row[key] });
}
