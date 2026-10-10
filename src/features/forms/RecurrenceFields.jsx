import { useMemo, useState } from "react";
import { addDays, formatDate, weekday, validDate } from "../../lib/dates.mjs";
import { inspectSchedule } from "../../lib/recurrence.mjs";
import { Button } from "../../components/ui/primitives.jsx";

export function RecurrenceFields({ values, set, state, busy, errors, id }) {
  const [skipDate, setSkipDate] = useState("");
  const inspection = useMemo(
    () => inspectSchedule({ ...values, id }, state),
    [values, id, state],
  );
  const days = values.weekdays?.length
    ? values.weekdays
    : validDate(values.date)
      ? [weekday(values.date)]
      : [];
  const skipped = values.excludedDates || [];
  return (
    <div className="recurrence-fields">
      {values.recurrence === "weekly" && (
        <>
          <fieldset disabled={busy} className="weekday-picker">
            <legend>Lặp vào các thứ</legend>
            <div className="weekday-buttons">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, day) => (
                <button
                  type="button"
                  key={day}
                  aria-label={`Lặp ${label}`}
                  aria-pressed={days.includes(day)}
                  onClick={() => {
                    const next = days.includes(day)
                      ? days.filter((d) => d !== day)
                      : [...days, day];
                    if (next.length) set("weekdays", next.sort());
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Chu kỳ tuần
            <select
              disabled={busy}
              value={values.weekInterval || 1}
              onChange={(e) => set("weekInterval", Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option value={n} key={n}>
                  {n === 1 ? "Mỗi tuần" : `Mỗi ${n} tuần`}
                </option>
              ))}
              {values.weekInterval > 4 && (
                <option value={values.weekInterval}>
                  Mỗi {values.weekInterval} tuần
                </option>
              )}
            </select>
          </label>
          {errors.weekInterval && (
            <p className="error">{errors.weekInterval}</p>
          )}
          {errors.weekdays && <p className="error">{errors.weekdays}</p>}
        </>
      )}
      {values.recurrence !== "none" && (
        <>
          <div className="duration-shortcuts">
            <span>Kết thúc sau</span>
            {[4, 8, 12, 16].map((n) => (
              <Button
                kind="secondary"
                key={n}
                disabled={busy || !values.date}
                onClick={() =>
                  set("repeatUntil", addDays(values.date, n * 7 - 1))
                }
              >
                {n} tuần
              </Button>
            ))}
          </div>
          <div className="skip-date-controls">
            <label className="field">
              Ngày nghỉ / bỏ buổi
              <input
                type="date"
                disabled={busy}
                value={skipDate}
                onChange={(e) => setSkipDate(e.target.value)}
                min={values.date}
                max={values.repeatUntil || undefined}
              />
            </label>
            <Button
              kind="secondary"
              disabled={
                busy ||
                !skipDate ||
                skipDate < values.date ||
                (values.repeatUntil && skipDate > values.repeatUntil)
              }
              onClick={() => {
                set(
                  "excludedDates",
                  [...new Set([...skipped, skipDate])].sort(),
                );
                setSkipDate("");
              }}
            >
              Bỏ ngày này
            </Button>
          </div>
          {!!skipped.length && (
            <div className="skip-date-list">
              {skipped.map((date) => (
                <Button
                  kind="secondary"
                  disabled={busy}
                  key={date}
                  onClick={() =>
                    set(
                      "excludedDates",
                      skipped.filter((d) => d !== date),
                    )
                  }
                  aria-label={`Khôi phục buổi ${date}`}
                >
                  {formatDate(date)} ×
                </Button>
              ))}
            </div>
          )}
          {errors.excludedDates && (
            <p className="error">{errors.excludedDates}</p>
          )}
          <p className="hint">
            Các buổi tiếp theo:{" "}
            {inspection.upcoming.map((date) => formatDate(date)).join(" · ") ||
              "Chưa có buổi trong khoảng đã chọn"}
            .
          </p>
          <p className="hint">
            Sửa giờ hoặc xóa lịch áp dụng toàn bộ chuỗi. Chọn ngày nghỉ để bỏ
            riêng từng buổi.
          </p>
        </>
      )}
      {!!inspection.conflicts.length && (
        <p className="notice warning" role="status">
          Trùng giờ vào{" "}
          {inspection.conflicts.map((date) => formatDate(date)).join(", ")}. Bạn
          vẫn có thể lưu.
        </p>
      )}
      {values.recurrence !== "none" && (
        <p className="hint">
          Kiểm tra trùng giờ đến {formatDate(inspection.checkedThrough)} (tối đa
          12 tháng từ ngày bắt đầu).
        </p>
      )}
    </div>
  );
}
