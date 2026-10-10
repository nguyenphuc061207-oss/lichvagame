import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Section,
  Empty,
  Pill,
  Progress,
  RecordActions,
} from "../../components/ui/primitives.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { HabitChecklist } from "../../components/shared/HabitChecklist.jsx";
import { todayISO, formatDate } from "../../lib/domain.mjs";

export function Growth({ ctx }) {
  const [date, setDate] = useState(todayISO()),
    [kind, setKind] = useState("all");
  const state = ctx.state,
    logs = state.journals
      .filter((j) => kind === "all" || j.kind === kind)
      .sort((a, b) => b.date.localeCompare(a.date));
  const moodLabel = {
    happy: "Vui vẻ",
    calm: "Bình yên",
    tired: "Mệt một chút",
    sad: "Cần được vỗ về",
  };
  return (
    <>
      <PageHeader
        title="Phát triển bản thân"
        subtitle="Chăm mình bằng những điều nhỏ. Không cần hoàn hảo."
        action={
          <Button icon={Plus} onClick={() => ctx.edit("journals")}>
            Viết nhật ký
          </Button>
        }
      />
      <div className="two-columns">
        <Section
          title="Những thói quen dịu dàng"
          action={
            <button
              className="icon-button"
              aria-label="Thêm thói quen"
              onClick={() => ctx.edit("habits")}
            >
              <Plus size={19} />
            </button>
          }
        >
          <label className="filter-field">
            Ngày ghi nhận
            <input
              type="date"
              max={todayISO()}
              value={date}
              required
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          <HabitChecklist ctx={ctx} date={date} />
          <details className="manage-habits">
            <summary>Chỉnh sửa thói quen</summary>
            {state.habits.map((h) => (
              <div className="simple-row" key={h.id}>
                <span>{h.title}</span>
                <RecordActions
                  onEdit={() => ctx.edit("habits", h)}
                  onDelete={() => ctx.remove("habits", h.id)}
                />
              </div>
            ))}
          </details>
          <p className="hint">
            Thói quen tuần chỉ cần ghi nhận một lần trong tuần. Một ngày bỏ lỡ
            không xóa những tiến bộ trước đó.
          </p>
        </Section>
        <Section
          title="Điều mình đang hướng đến"
          action={
            <button
              className="icon-button"
              aria-label="Thêm mục tiêu"
              onClick={() => ctx.edit("goals")}
            >
              <Plus size={19} />
            </button>
          }
        >
          {state.goals.length ? (
            <div className="budget-list">
              {state.goals.map((g) => (
                <article key={g.id}>
                  <div className="between">
                    <h3>{g.title}</h3>
                    <RecordActions
                      onEdit={() => ctx.edit("goals", g)}
                      onDelete={() => ctx.remove("goals", g.id)}
                    />
                  </div>
                  <Progress value={g.progress} label={g.title} />
                  <p className="muted">
                    {g.progress}%
                    {g.deadline ? " · " + formatDate(g.deadline) : ""}
                  </p>
                  {g.notes && <p className="hint">{g.notes}</p>}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Một mục tiêu cho riêng bạn"
              text="Nhỏ thôi cũng được. Bắt đầu từ điều bạn quan tâm."
              onAdd={() => ctx.edit("goals")}
            />
          )}
        </Section>
      </div>
      <Section
        title="Những trang viết riêng tư"
        subtitle="Lưu trong trình duyệt này. Không gửi tới AI hoặc dịch vụ bên ngoài."
        action={
          <Button
            kind="secondary"
            onClick={() =>
              ctx.edit("journals", null, {
                kind: "weekly",
                title: "Nhìn lại tuần của mình",
              })
            }
          >
            Nhìn lại tuần
          </Button>
        }
      >
        <div className="tab-strip">
          {[
            ["all", "Tất cả"],
            ["daily", "Nhật ký ngày"],
            ["weekly", "Nhìn lại tuần"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={v === kind ? "active" : ""}
              onClick={() => setKind(v)}
              aria-pressed={v === kind}
            >
              {l}
            </button>
          ))}
        </div>
        {logs.length ? (
          <div className="journal-grid">
            {logs.map((j) => (
              <article className="journal-card" key={j.id}>
                <div className="between">
                  <span className="hint">
                    {formatDate(j.date)} ·{" "}
                    {j.kind === "weekly" ? "Nhìn lại tuần" : "Nhật ký ngày"}
                  </span>
                  <RecordActions
                    onEdit={() => ctx.edit("journals", j)}
                    onDelete={() => ctx.remove("journals", j.id)}
                  />
                </div>
                <h3>{j.title}</h3>
                {j.mood && <Pill>{moodLabel[j.mood]}</Pill>}
                <p className="journal-content">{j.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Một trang dành riêng cho bạn"
            text="Ghi lại niềm vui, một ý tưởng, hoặc điều bạn muốn buông xuống."
            onAdd={() => ctx.edit("journals")}
          />
        )}
      </Section>
    </>
  );
}
