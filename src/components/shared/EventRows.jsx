import {
  MapPin,
  CalendarDays,
  BookOpen,
  BriefcaseBusiness,
  Heart,
  Sun,
  AlertTriangle,
} from "lucide-react";
import { Empty, Pill, RecordActions } from "../ui/primitives.jsx";
import { CATEGORY, eventsOn, hasConflict } from "../../lib/domain.mjs";

const ICONS = {
  school: BookOpen,
  work: BriefcaseBusiness,
  personal: Sun,
  selfcare: Heart,
  other: CalendarDays,
};
export function EventRows({ events, ctx, compact = false }) {
  return events.length ? (
    <div className={`event-list ${compact ? "compact" : ""}`}>
      {events.map((e) => {
        const Icon = ICONS[e.category] || CalendarDays;
        return (
          <article
            className={`event-row ${e.category} ${e.status === "done" ? "finished" : ""}`}
            key={e.id}
          >
            <div className="event-time">
              <strong>{e.start}</strong>
              <span>{e.end}</span>
            </div>
            <div className="event-rail" />
            <div className="event-body">
              <div className="event-category">
                <Icon size={14} />
                {e.entity === "exams" ? "Lịch thi" : CATEGORY[e.category]}
                {e.recurrence && e.recurrence !== "none" && (
                  <span>· Lặp lại</span>
                )}
                {e.status === "done" && <Pill>Hoàn thành</Pill>}
              </div>
              <h3>{e.title}</h3>
              {e.location && (
                <p className="event-place">
                  <MapPin size={13} />
                  {e.location}
                </p>
              )}
              {!compact && e.notes && <p className="muted">{e.notes}</p>}
              {hasConflict(
                e,
                eventsOn(ctx.state, e.occurrenceDate || e.date || ctx.date),
              ) && (
                <span className="conflict">
                  <AlertTriangle size={13} />
                  Trùng giờ với lịch khác
                </span>
              )}
            </div>
            {!compact && (
              <div className="event-actions">
                <RecordActions
                  onEdit={() => ctx.edit(e.entity || "events", e)}
                  onDelete={() => ctx.remove(e.entity || "events", e.id)}
                />
                {e.entity !== "exams" &&
                  e.recurrence &&
                  e.recurrence !== "none" && (
                    <button
                      className="text-link"
                      onClick={() =>
                        ctx.skipOccurrence(e, e.occurrenceDate || ctx.date)
                      }
                      aria-label={`Bỏ buổi ${e.title} ngày ${e.occurrenceDate || ctx.date}`}
                    >
                      Bỏ buổi
                    </button>
                  )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  ) : (
    <Empty
      title="Một ngày còn nhiều khoảng trống"
      text="Thêm lịch học, ca làm hoặc một cuộc hẹn cho bạn."
      onAdd={() => ctx.edit("events", null, { date: ctx.date })}
      label="Thêm lịch"
    />
  );
}
