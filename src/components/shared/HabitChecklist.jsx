import { Check } from "lucide-react";
import { Empty } from "../ui/primitives.jsx";
import { habitDone } from "../../lib/domain.mjs";

export function HabitChecklist({ ctx, date }) {
  return ctx.state.habits.length ? (
    <div className="habit-checklist">
      {ctx.state.habits.map((h) => (
        <button
          key={h.id}
          onClick={() => ctx.logHabit(h, date)}
          className={habitDone(ctx.state, h, date) ? "habit-done" : ""}
          aria-pressed={habitDone(ctx.state, h, date)}
        >
          <span className="habit-checkbox">
            <Check size={13} />
          </span>
          <span>
            {h.title}
            <small>{h.frequency === "weekly" ? "Mỗi tuần" : "Mỗi ngày"}</small>
          </span>
        </button>
      ))}
    </div>
  ) : (
    <Empty
      title="Một thói quen nhỏ"
      text="Chọn điều khiến bạn cảm thấy tốt hơn."
      onAdd={() => ctx.edit("habits")}
    />
  );
}
