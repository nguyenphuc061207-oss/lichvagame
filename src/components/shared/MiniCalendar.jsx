import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayISO, formatDate, monthDays, weekday } from "../../lib/domain.mjs";

export function MiniCalendar({ date, onDate }) {
  const first = date.slice(0, 7) + "-01",
    cells = Array.from({ length: weekday(first) }, () => null).concat(
      Array.from(
        { length: monthDays(date) },
        (_, i) => first.slice(0, 8) + String(i + 1).padStart(2, "0"),
      ),
    );
  const shift = (n) => {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    onDate(d.toISOString().slice(0, 10));
  };
  return (
    <div className="mini-calendar">
      <div className="mini-calendar-heading">
        <button
          className="icon-button"
          onClick={() => shift(-1)}
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} />
        </button>
        <strong>
          Tháng {Number(date.slice(5, 7))}, {date.slice(0, 4)}
        </strong>
        <button
          className="icon-button"
          onClick={() => shift(1)}
          aria-label="Tháng sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mini-calendar-grid">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              className={`${d === date ? "selected" : ""} ${d === todayISO() ? "is-today" : ""}`}
              onClick={() => onDate(d)}
              aria-label={formatDate(d, true)}
              aria-pressed={d === date}
            >
              {Number(d.slice(-2))}
            </button>
          ) : (
            <span key={"blank" + i} />
          ),
        )}
      </div>
    </div>
  );
}
