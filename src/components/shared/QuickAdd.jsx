import { useMemo, useState } from "react";
import { CornerDownLeft, SlidersHorizontal } from "lucide-react";
import { todayISO } from "../../lib/dates.mjs";
import { getFormDefaults } from "../../features/forms/schema.mjs";
import { parseQuick, recentTemplates } from "../../lib/quickAdd.mjs";

const EXAMPLES = "Kế toán T2 T4 7h-9h · ca làm mai 18h · nộp bài thuế thứ 6";

export function QuickAdd({ ctx }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { state } = ctx;
  const draft = useMemo(
    () => parseQuick(text, { today: todayISO(), events: state.events }),
    [text, state.events],
  );
  const templates = useMemo(
    () => recentTemplates(state.events),
    [state.events],
  );
  const ready = draft?.entity;
  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      await ctx.save(draft.entity, {
        ...getFormDefaults(draft.entity),
        ...draft.values,
      });
      setText("");
    } catch {
      // The save hook already shows the error and keeps the text.
    } finally {
      setBusy(false);
    }
  };
  const addFromTemplate = async (tpl) => {
    if (busy) return;
    setBusy(true);
    try {
      await ctx.save("events", {
        ...getFormDefaults("events"),
        ...tpl,
        date: ctx.date,
        recurrence: "none",
        status: "planned",
        notes: "",
      });
    } catch {
      // Error already reported.
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="quick-add" onSubmit={submit}>
      <div className="quick-add-row">
        <input
          type="text"
          value={text}
          maxLength={200}
          disabled={busy}
          placeholder="Gõ một dòng để thêm lịch hoặc việc…"
          aria-label="Thêm nhanh lịch hoặc công việc"
          aria-describedby="quick-add-preview"
          onChange={(e) => setText(e.target.value)}
        />
        {ready && (
          <button
            type="button"
            className="icon-button"
            title="Mở form đầy đủ để chỉnh thêm"
            aria-label="Mở form đầy đủ"
            onClick={() => {
              ctx.edit(draft.entity, null, draft.values);
              setText("");
            }}
          >
            <SlidersHorizontal size={18} />
          </button>
        )}
        <button
          type="submit"
          className="button"
          disabled={!ready || busy}
          aria-label="Thêm"
        >
          <CornerDownLeft size={17} />
          <span>Thêm</span>
        </button>
      </div>
      <p
        id="quick-add-preview"
        className={
          draft?.error ? "quick-add-preview error" : "quick-add-preview"
        }
        aria-live="polite"
      >
        {draft?.summary
          ? `${draft.values.title} — ${draft.summary}`
          : draft?.error || EXAMPLES}
      </p>
      {!text && templates.length > 0 && (
        <div className="quick-add-chips" aria-label="Lịch hay dùng">
          <span>Thêm lại vào ngày đang xem:</span>
          {templates.map((t) => (
            <button
              type="button"
              key={[t.title, t.start, t.end].join("|")}
              disabled={busy}
              onClick={() => addFromTemplate(t)}
            >
              {t.title} · {t.start}–{t.end}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
