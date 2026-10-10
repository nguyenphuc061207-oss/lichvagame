import { useState } from "react";
import { QuickAdd } from "../../components/shared/QuickAdd.jsx";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Section,
  RecordActions,
} from "../../components/ui/primitives.jsx";
import {
  todayISO,
  addDays,
  formatDate,
  CATEGORY,
  eventsOn,
  hasConflict,
  monthDays,
  weekday,
  weekStart,
} from "../../lib/domain.mjs";
import { EventRows } from "../../components/shared/EventRows.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";

export function Calendar({ ctx }) {
  const [view, setView] = useState("day"),
    [filter, setFilter] = useState("all");
  const first = ctx.date.slice(0, 7) + "-01";
  const dates =
    view === "month"
      ? Array.from({ length: monthDays(ctx.date) }, (_, i) => addDays(first, i))
      : view === "week"
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(ctx.date), i))
        : [ctx.date];
  const all = (date) =>
    eventsOn(ctx.state, date).filter(
      (e) => filter === "all" || e.category === filter,
    );
  const move = (n) => {
    if (view === "month") {
      const d = new Date(first + "T12:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + n);
      ctx.setDate(d.toISOString().slice(0, 10));
    } else ctx.setDate(addDays(ctx.date, n * (view === "week" ? 7 : 1)));
  };
  return (
    <>
      <PageHeader
        title="Lịch trình"
        subtitle="Chọn nhiều thứ, lặp theo tuần và bỏ riêng ngày nghỉ."
        action={
          <Button
            icon={Plus}
            onClick={() => ctx.edit("events", null, { date: ctx.date })}
          >
            Thêm lịch
          </Button>
        }
      />
      <QuickAdd ctx={ctx} />
      <div className="calendar-toolbar">
        <div className="date-navigation">
          <button
            className="icon-button"
            onClick={() => move(-1)}
            aria-label="Khoảng trước"
          >
            <ChevronLeft size={20} />
          </button>
          <strong>
            {view === "month"
              ? `Tháng ${Number(ctx.date.slice(5, 7))}, ${ctx.date.slice(0, 4)}`
              : view === "week"
                ? `${formatDate(dates[0])} – ${formatDate(dates[6])}`
                : formatDate(ctx.date, true)}
          </strong>
          <button
            className="icon-button"
            onClick={() => move(1)}
            aria-label="Khoảng sau"
          >
            <ChevronRight size={20} />
          </button>
          <Button kind="secondary" onClick={() => ctx.setDate(todayISO())}>
            Hôm nay
          </Button>
        </div>
        <div className="segmented" aria-label="Chế độ lịch">
          {[
            ["day", "Ngày"],
            ["week", "Tuần"],
            ["month", "Tháng"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={view === v ? "active" : ""}
              aria-pressed={view === v}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="filter-field">
          Phân loại
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả lịch</option>
            {Object.entries(CATEGORY).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="calendar-quick-add">
        <Button
          kind="secondary"
          onClick={() =>
            ctx.edit("events", null, {
              date: ctx.date,
              category: "school",
              recurrence: "weekly",
            })
          }
        >
          Lịch học theo tuần
        </Button>
        <Button
          kind="secondary"
          onClick={() =>
            ctx.edit("events", null, {
              date: ctx.date,
              category: "work",
              recurrence: "weekly",
              start: "17:00",
              end: "21:00",
            })
          }
        >
          Ca làm theo tuần
        </Button>
      </div>
      {view === "day" ? (
        <Section
          title="Lịch trong ngày"
          subtitle="Chỉnh sửa lịch lặp sẽ cập nhật toàn bộ chuỗi."
        >
          <EventRows events={all(ctx.date)} ctx={ctx} />
          {ctx.state.events.some((e) => e.status === "cancelled") && (
            <details className="cancelled">
              <summary>Lịch đã hủy (mọi ngày)</summary>
              {ctx.state.events
                .filter((e) => e.status === "cancelled")
                .map((e) => (
                  <div key={e.id} className="between">
                    <span>{e.title}</span>
                    <RecordActions
                      onEdit={() => ctx.edit("events", e)}
                      onDelete={() => ctx.remove("events", e.id)}
                    />
                  </div>
                ))}
            </details>
          )}
        </Section>
      ) : view === "month" ? (
        <div className="month-grid">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((w) => (
            <div className="month-weekday" key={w}>
              {w}
            </div>
          ))}
          {Array.from({ length: weekday(first) }, (_, i) => (
            <div className="month-cell blank" key={"blank" + i} />
          ))}
          {dates.map((d) => (
            <div
              key={d}
              className={`month-cell ${d === todayISO() ? "today-cell" : ""}`}
            >
              <button
                className="day-number"
                onClick={() => {
                  ctx.setDate(d);
                  setView("day");
                }}
                aria-label={"Xem " + formatDate(d, true)}
              >
                {Number(d.slice(-2))}
              </button>
              <div className="month-events">
                {all(d)
                  .slice(0, 3)
                  .map((e) => (
                    <button
                      className={`calendar-event ${e.category}`}
                      key={e.id}
                      onClick={() => ctx.edit(e.entity, e)}
                    >
                      <span>{e.start}</span>
                      {e.title}
                    </button>
                  ))}
                {all(d).length > 3 && (
                  <button
                    className="text-link"
                    onClick={() => {
                      ctx.setDate(d);
                      setView("day");
                    }}
                  >
                    +{all(d).length - 3} lịch
                  </button>
                )}
              </div>
              <button
                className="cell-add"
                aria-label={"Thêm lịch " + formatDate(d)}
                onClick={() => ctx.edit("events", null, { date: d })}
              >
                <Plus size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="week-grid">
          {dates.map((d) => (
            <Section
              key={d}
              title={formatDate(d)}
              subtitle={new Intl.DateTimeFormat("vi-VN", {
                weekday: "long",
                timeZone: "UTC",
              }).format(new Date(d + "T12:00Z"))}
              action={
                <button
                  className="icon-button"
                  aria-label={"Thêm lịch " + formatDate(d)}
                  onClick={() => ctx.edit("events", null, { date: d })}
                >
                  <Plus size={16} />
                </button>
              }
            >
              {all(d).map((e) => (
                <button
                  className={`week-event ${e.category}`}
                  key={e.id}
                  onClick={() => ctx.edit(e.entity, e)}
                >
                  <small>
                    {e.start} – {e.end}
                  </small>
                  <strong>{e.title}</strong>
                  {hasConflict(e, eventsOn(ctx.state, d)) && (
                    <span className="danger-text">Trùng giờ</span>
                  )}
                </button>
              ))}
              {!all(d).length && <p className="hint">Chưa có lịch</p>}
            </Section>
          ))}
        </div>
      )}
    </>
  );
}
