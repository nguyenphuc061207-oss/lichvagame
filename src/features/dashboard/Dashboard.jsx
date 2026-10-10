import { Plus, Clock, BookOpen } from "lucide-react";
import { Button, Section, Progress } from "../../components/ui/primitives.jsx";
import {
  todayISO,
  formatDate,
  CATEGORY,
  eventsOn,
  taskPool,
  dueReminders,
} from "../../lib/domain.mjs";
import { EventRows } from "../../components/shared/EventRows.jsx";
import { TaskRows } from "../../components/shared/TaskRows.jsx";
import { QuickAdd } from "../../components/shared/QuickAdd.jsx";
import { HabitChecklist } from "../../components/shared/HabitChecklist.jsx";

export function Dashboard({ ctx }) {
  const { state, date, setDate } = ctx;
  const schedule = eventsOn(state, date);
  const reminders = dueReminders(state, ctx.now);
  const tasks = taskPool(state)
    .filter((t) => !t.done && t.due && t.due <= date)
    .sort((a, b) => a.due.localeCompare(b.due));
  const upcoming = taskPool(state)
    .filter((t) => !t.done && t.due > date)
    .sort((a, b) => a.due.localeCompare(b.due));
  const exams = state.exams
    .filter((e) => e.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="greeting">
        <div>
          <h1>TranAya</h1>
          <p className="subtitle">{formatDate(date, true)}</p>
        </div>
        <div className="day-controls">
          <label className="date-control">
            Ngày{" "}
            <input
              type="date"
              aria-label="Ngày xem lịch"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <Button kind="secondary" onClick={() => setDate(todayISO())}>
            Hôm nay
          </Button>
        </div>
      </div>
      <QuickAdd ctx={ctx} />
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <Section
            title={
              date === todayISO()
                ? "Lịch hôm nay"
                : "Lịch ngày " + formatDate(date)
            }
            action={
              <Button
                icon={Plus}
                onClick={() => ctx.edit("events", null, { date })}
              >
                Thêm lịch
              </Button>
            }
          >
            <EventRows events={schedule} ctx={ctx} compact />
            <button
              className="text-link"
              onClick={() => ctx.navigate("calendar")}
            >
              Xem toàn bộ lịch
            </button>
          </Section>
          {reminders.length > 0 && (
            <Section title="Đến giờ nhắc việc">
              <TaskRows
                items={reminders.map((t) => ({ ...t, entity: "tasks" }))}
                ctx={ctx}
              />
            </Section>
          )}
          <Section
            title="Việc cần làm"
            action={
              <Button
                kind="secondary"
                icon={Plus}
                onClick={() => ctx.edit("tasks")}
              >
                Thêm việc
              </Button>
            }
          >
            <TaskRows items={tasks} ctx={ctx} limit={5} />
            <button className="text-link" onClick={() => ctx.navigate("tasks")}>
              Xem tất cả công việc
            </button>
          </Section>
        </div>
        <div className="dashboard-aside">
          <Section title="Sắp đến hạn">
            <div className="deadline-stack">
              {upcoming.slice(0, 3).map((t) => (
                <button
                  className="deadline-item"
                  key={t.id}
                  onClick={() => ctx.edit(t.entity, t)}
                >
                  <span className="deadline-date">
                    <Clock size={13} />
                    {formatDate(t.due)}
                  </span>
                  <strong>{t.title}</strong>
                  <span>{CATEGORY[t.category]}</span>
                </button>
              ))}
              {exams.slice(0, 1).map((e) => (
                <button
                  className="deadline-item exam"
                  key={e.id}
                  onClick={() => ctx.edit("exams", e)}
                >
                  <span className="deadline-date">
                    <BookOpen size={13} />
                    Thi · {formatDate(e.date)}
                  </span>
                  <strong>{e.title}</strong>
                  <span>
                    {e.start} – {e.end}
                  </span>
                </button>
              ))}
              {!upcoming.length && !exams.length && (
                <p className="muted">Chưa có hạn nộp hay lịch thi sắp tới.</p>
              )}
            </div>
          </Section>
        </div>
      </div>
      {(state.preferences.widgets.habits ||
        state.preferences.widgets.goals) && (
        <details className="overview-more">
          <summary>Tổng quan thêm</summary>
          <div className="overview-extra-grid">
            {state.preferences.widgets.habits && (
              <Section title="Thói quen">
                <HabitChecklist ctx={ctx} date={date} />
              </Section>
            )}
            {state.preferences.widgets.goals && (
              <Section
                title="Mục tiêu"
                action={
                  <button
                    className="text-link"
                    onClick={() => ctx.navigate("growth")}
                  >
                    Chi tiết
                  </button>
                }
              >
                {state.goals.slice(0, 2).map((g) => (
                  <div className="goal-preview" key={g.id}>
                    <div className="between">
                      <h3>{g.title}</h3>
                      <span>{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} label={g.title} />
                  </div>
                ))}
                {!state.goals.length && (
                  <button
                    className="text-link"
                    onClick={() => ctx.edit("goals")}
                  >
                    Thêm mục tiêu
                  </button>
                )}
              </Section>
            )}
          </div>
        </details>
      )}
    </>
  );
}
