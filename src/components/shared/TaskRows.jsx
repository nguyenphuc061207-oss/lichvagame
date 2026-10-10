import { Check } from "lucide-react";
import { Empty, RecordActions } from "../ui/primitives.jsx";
import { todayISO, formatDate, CATEGORY } from "../../lib/domain.mjs";

export function TaskRows({ items, ctx, limit }) {
  const visible = limit ? items.slice(0, limit) : items;
  return visible.length ? (
    <div className="task-list">
      {visible.map((t) => (
        <article className={`task-row ${t.done ? "finished" : ""}`} key={t.id}>
          <button
            className={`check-button ${t.done ? "checked" : ""}`}
            aria-label={`${t.done ? "Mở lại" : "Hoàn thành"}: ${t.title}`}
            aria-pressed={t.done}
            onClick={() => ctx.toggle(t.entity || "tasks", t.id, "done")}
          >
            <Check size={14} />
          </button>
          <div className="task-body">
            <h3>{t.title}</h3>
            <p>
              <span>{CATEGORY[t.category] || "Học tập"}</span>
              {t.due && (
                <span
                  className={!t.done && t.due < todayISO() ? "danger-text" : ""}
                >
                  {t.due === todayISO() ? "Hôm nay" : formatDate(t.due)}
                </span>
              )}
              {t.priority === "high" && !t.done && (
                <span className="rose-text">Ưu tiên cao</span>
              )}
            </p>
          </div>
          <RecordActions
            onEdit={() => ctx.edit(t.entity || "tasks", t)}
            onDelete={() => ctx.remove(t.entity || "tasks", t.id)}
          />
        </article>
      ))}
    </div>
  ) : (
    <Empty
      title="Chưa có công việc ở đây"
      text="Một danh sách ngắn giúp ngày của bạn nhẹ nhàng hơn."
      onAdd={() => ctx.edit("tasks")}
    />
  );
}
