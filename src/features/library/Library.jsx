import { useState } from "react";
import { Plus, Star } from "lucide-react";
import {
  Button,
  Section,
  Empty,
  Pill,
  RecordActions,
  ResourceLink,
  Favorite,
} from "../../components/ui/primitives.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SearchBox } from "../../components/shared/SearchBox.jsx";

export function Library({ ctx }) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [favorite, setFavorite] = useState(false);
  const rows = ctx.state.resources
    .filter(
      (r) =>
        (category === "all" || r.category === category) &&
        (!favorite || r.favorite) &&
        `${r.title} ${r.tags} ${r.notes}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
    )
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <PageHeader
        title="Kho lưu trữ"
        subtitle="Những liên kết và điều hữu ích, luôn trong tầm tay."
        action={
          <Button icon={Plus} onClick={() => ctx.edit("resources")}>
            Thêm tài nguyên
          </Button>
        }
      />
      <div className="filters">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm tên, thẻ hoặc nội dung…"
        />
        <label className="filter-field">
          Danh mục
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {[...new Set(ctx.state.resources.map((r) => r.category))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <Button
          icon={Star}
          kind={favorite ? "" : "secondary"}
          aria-pressed={favorite}
          onClick={() => setFavorite((v) => !v)}
        >
          Yêu thích
        </Button>
      </div>
      {rows.length ? (
        <div className="resource-grid">
          {rows.map((r) => (
            <article className="resource-card" key={r.id}>
              <div className="between">
                <Pill>{r.category}</Pill>
                <Favorite
                  value={r.favorite}
                  onClick={() => ctx.toggle("resources", r.id, "favorite")}
                />
              </div>
              <h2>{r.title}</h2>
              <p className="resource-notes">{r.notes}</p>
              <div className="tag-list">
                {r.tags
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((t, i) => (
                    <span key={t + i}>#{t}</span>
                  ))}
              </div>
              <div className="between resource-footer">
                <ResourceLink url={r.url} />
                <RecordActions
                  onEdit={() => ctx.edit("resources", r)}
                  onDelete={() => ctx.remove("resources", r.id)}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Section title="Tài nguyên của bạn">
          <Empty
            title="Giữ lại những điều hữu ích"
            text="Thêm liên kết, ghi chú hoặc danh sách mua sắm."
            onAdd={() => ctx.edit("resources")}
          />
        </Section>
      )}
    </>
  );
}
