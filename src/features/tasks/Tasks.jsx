import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Section } from "../../components/ui/primitives.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { TaskRows } from "../../components/shared/TaskRows.jsx";
import { CATEGORY, PRIORITY, todayISO, taskPool } from "../../lib/domain.mjs";
import { SearchBox } from "../../components/shared/SearchBox.jsx";

export function Tasks({ ctx }) {
  const [view, setView] = useState("today"),
    [search, setSearch] = useState(""),
    [priority, setPriority] = useState("all"),
    [category, setCategory] = useState("all"),
    [due, setDue] = useState("");
  const today = todayISO();
  const rows = taskPool(ctx.state)
    .filter((t) =>
      view === "completed"
        ? t.done
        : view === "all"
          ? !t.done
          : view === "today"
            ? !t.done && t.due === today
            : view === "upcoming"
              ? !t.done && t.due > today
              : !t.done && t.due && t.due < today,
    )
    .filter(
      (t) =>
        (!search ||
          t.title
            .toLocaleLowerCase("vi")
            .includes(search.toLocaleLowerCase("vi"))) &&
        (priority === "all" || t.priority === priority) &&
        (category === "all" || t.category === category) &&
        (!due || t.due === due),
    )
    .sort(
      (a, b) =>
        (a.due || "9999").localeCompare(b.due || "9999") ||
        { high: 0, medium: 1, low: 2 }[a.priority] -
          { high: 0, medium: 1, low: 2 }[b.priority],
    );
  return (
    <>
      <PageHeader
        title="Công việc"
        subtitle="Một việc mỗi lần. Bạn đang làm tốt rồi."
        action={
          <Button icon={Plus} onClick={() => ctx.edit("tasks")}>
            Thêm công việc
          </Button>
        }
      />
      <div className="tab-strip">
        {[
          ["today", "Hôm nay"],
          ["upcoming", "Sắp tới"],
          ["overdue", "Quá hạn"],
          ["completed", "Đã xong"],
          ["all", "Tất cả chưa xong"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => setView(v)}
            aria-pressed={view === v}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="filters">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm công việc…"
        />
        <label className="filter-field">
          Ưu tiên
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {Object.entries(PRIORITY).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          Phân loại
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {Object.entries(CATEGORY).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          Hạn cụ thể
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        {due && (
          <Button kind="ghost" onClick={() => setDue("")}>
            Bỏ ngày lọc
          </Button>
        )}
      </div>
      <Section title={`${rows.length} công việc`}>
        <TaskRows items={rows} ctx={ctx} />
      </Section>
    </>
  );
}
