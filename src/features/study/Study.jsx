import { useState } from "react";
import { Plus, BookOpen, CalendarDays } from "lucide-react";
import {
  Button,
  Section,
  Empty,
  Progress,
  RecordActions,
} from "../../components/ui/primitives.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { TaskRows } from "../../components/shared/TaskRows.jsx";
import { SearchBox } from "../../components/shared/SearchBox.jsx";
import { formatDate, gradeSummary, percent } from "../../lib/domain.mjs";

export function Study({ ctx }) {
  const [semester, setSemester] = useState("all"),
    [search, setSearch] = useState("");
  const state = ctx.state;
  const subjects = state.subjects.filter(
    (s) =>
      (semester === "all" || s.semester === semester) &&
      `${s.title} ${s.notes} ${s.code}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <PageHeader
        title="Học tập"
        subtitle="Một góc nhỏ cho hành trình trở thành kế toán viên."
        action={
          <Button icon={Plus} onClick={() => ctx.edit("subjects")}>
            Thêm môn học
          </Button>
        }
      />
      <div className="filters">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm môn học hoặc ghi chú…"
        />
        <label className="filter-field">
          Học kỳ
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="all">Tất cả học kỳ</option>
            {[...new Set(state.subjects.map((s) => s.semester))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {!subjects.length && (
        <Section title="Các môn học">
          <Empty
            title="Hành trình học tập bắt đầu ở đây"
            text="Thêm môn học trước, sau đó ghi bài tập, lịch thi và điểm."
            onAdd={() => ctx.edit("subjects")}
            label="Thêm môn học"
          />
        </Section>
      )}
      <div className="subject-grid">
        {subjects.map((s) => {
          const assignments = state.assignments.filter(
              (a) => a.subjectId === s.id,
            ),
            grades = state.grades.filter((g) => g.subjectId === s.id),
            summary = gradeSummary(grades),
            exams = state.exams
              .filter((e) => e.subjectId === s.id)
              .sort((a, b) => a.date.localeCompare(b.date));
          return (
            <Section
              key={s.id}
              title={s.title}
              subtitle={`${s.code || "Chưa đặt mã môn"} · ${s.semester}`}
              action={
                <RecordActions
                  onEdit={() => ctx.edit("subjects", s)}
                  onDelete={() => ctx.remove("subjects", s.id)}
                />
              }
            >
              <div className="subject-meta">
                <BookOpen size={17} />
                <span>{s.lecturer || "Chưa đặt giảng viên"}</span>
              </div>
              <p className="subject-note">
                {s.notes || "Chưa có ghi chú cho môn này."}
              </p>
              <div className="subject-progress">
                <div className="between">
                  <span>Bài tập đã hoàn thành</span>
                  <strong>
                    {assignments.filter((a) => a.done).length}/
                    {assignments.length}
                  </strong>
                </div>
                <Progress
                  value={percent(
                    assignments.filter((a) => a.done).length,
                    assignments.length,
                  )}
                  label={"Tiến độ " + s.title}
                />
              </div>
              <div className="subsection-heading">
                <h3>Bài tập & hạn nộp</h3>
                <button
                  className="icon-button"
                  aria-label={"Thêm bài tập " + s.title}
                  onClick={() =>
                    ctx.edit("assignments", null, { subjectId: s.id })
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
              {assignments.length ? (
                <TaskRows
                  items={assignments.map((a) => ({
                    ...a,
                    entity: "assignments",
                    category: "school",
                  }))}
                  ctx={ctx}
                />
              ) : (
                <p className="hint">Chưa có bài tập.</p>
              )}
              <div className="subsection-heading">
                <h3>Lịch thi</h3>
                <button
                  className="icon-button"
                  aria-label={"Thêm lịch thi " + s.title}
                  onClick={() => ctx.edit("exams", null, { subjectId: s.id })}
                >
                  <Plus size={17} />
                </button>
              </div>
              {exams.map((e) => (
                <div className="simple-row" key={e.id}>
                  <div>
                    <strong>{e.title}</strong>
                    <p>
                      {formatDate(e.date)} · {e.start} – {e.end}
                    </p>
                    {e.location && <p>{e.location}</p>}
                  </div>
                  <RecordActions
                    onEdit={() => ctx.edit("exams", e)}
                    onDelete={() => ctx.remove("exams", e.id)}
                  />
                </div>
              ))}
              {!exams.length && <p className="hint">Chưa có lịch thi.</p>}
              <div className="subsection-heading">
                <h3>Điểm & trọng số</h3>
                <button
                  className="icon-button"
                  aria-label={"Thêm điểm " + s.title}
                  onClick={() => ctx.edit("grades", null, { subjectId: s.id })}
                >
                  <Plus size={17} />
                </button>
              </div>
              {grades.map((g) => (
                <div className="simple-row" key={g.id}>
                  <div>
                    <strong>{g.title}</strong>
                    <p>
                      {g.weight}% ·{" "}
                      {g.score === "" ? "Chưa có điểm" : g.score + "/10"}
                    </p>
                  </div>
                  <RecordActions
                    onEdit={() => ctx.edit("grades", g)}
                    onDelete={() => ctx.remove("grades", g.id)}
                  />
                </div>
              ))}
              {grades.length ? (
                <>
                  <p
                    className={
                      Math.abs(summary.weight - 100) > 0.001
                        ? "notice warning"
                        : "notice"
                    }
                  >
                    Tổng trọng số: {summary.weight}%
                    {Math.abs(summary.weight - 100) > 0.001
                      ? " · Cần điều chỉnh về 100%."
                      : ""}
                  </p>
                  <p className="hint">
                    {summary.average == null
                      ? "Chưa có điểm để tính."
                      : summary.complete
                        ? `Điểm tổng kết: ${summary.weighted.toFixed(2)}/10`
                        : `Trung bình phần đã chấm: ${summary.average.toFixed(2)}/10 (${summary.assessed}% trọng số). Chưa phải điểm tổng kết.`}
                  </p>
                </>
              ) : (
                <p className="hint">
                  Mỗi môn có cấu trúc đánh giá riêng. Thêm các thành phần và
                  trọng số để tính điểm.
                </p>
              )}
              <div className="subject-links">
                <Button
                  kind="secondary"
                  icon={CalendarDays}
                  onClick={() =>
                    ctx.edit("events", null, {
                      title: "Ôn tập " + s.title,
                      category: "school",
                    })
                  }
                >
                  Lên lịch ôn tập
                </Button>
                <Button
                  kind="ghost"
                  onClick={() =>
                    ctx.edit("resources", null, {
                      category: "Học tập",
                      tags: s.code || s.title,
                    })
                  }
                >
                  Thêm tài liệu
                </Button>
              </div>
            </Section>
          );
        })}
      </div>
    </>
  );
}
