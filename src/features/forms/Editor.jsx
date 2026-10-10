import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { validateEntity, payroll } from "../../lib/domain.mjs";
import { FORMS, getFormDefaults } from "./schema.mjs";
import { Button } from "../../components/ui/primitives.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { guessCategory, suggestEnd } from "../../lib/quickAdd.mjs";
import { RecurrenceFields } from "./RecurrenceFields.jsx";

const errorsInExtra = (errors, extra) => extra.some((f) => errors[f.name]);

export function Editor({ entity, item, defaults, state, onClose, onSave }) {
  const schema = FORMS[entity];
  const [values, setValues] = useState(() => ({
    ...getFormDefaults(entity),
    ...defaults,
    ...item,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // Fields the user has set by hand are never overwritten by guesses.
  const touched = useRef(new Set());
  const set = (name, value) => {
    touched.current.add(name);
    setValues((v) => {
      const next = { ...v, [name]: value };
      if (entity !== "events" || item) return next;
      const events = state.events;
      if (name === "title" && !touched.current.has("category"))
        next.category = guessCategory(value, events);
      if (
        ["title", "category", "start"].includes(name) &&
        !touched.current.has("end")
      )
        next.end =
          suggestEnd(next.start, next.category, next.title, events) || v.end;
      if (name === "category") touched.current.add("category");
      return next;
    });
  };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const next = { ...values };
    if (entity === "events" && next.recurrence === "none") {
      next.repeatUntil = "";
      next.excludedDates = [];
      next.weekdays = [];
      next.weekInterval = 1;
    }
    for (const f of schema.fields)
      if (typeof next[f.name] === "string") next[f.name] = next[f.name].trim();
    const errs = validateEntity(entity, next);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setBusy(true);
    try {
      await onSave(entity, next, item?.id);
      onClose();
    } catch (e) {
      setErrors({ form: e.message });
    } finally {
      setBusy(false);
    }
  };
  const visible = (f) =>
    entity !== "events" ||
    f.name !== "repeatUntil" ||
    values.recurrence !== "none";
  // Lazy-friendly: a new item only asks for the essentials; everything else
  // sits under "Thêm chi tiết" with sensible defaults already filled in.
  const essentials = schema.essentials;
  const primary = schema.fields.filter(
    (f) => !essentials || item || essentials.includes(f.name),
  );
  const extra = schema.fields.filter(
    (f) => essentials && !item && !essentials.includes(f.name) && visible(f),
  );
  const renderField = (f) => {
    if (!visible(f)) return null;
    const opts =
      f.type === "subject"
        ? state.subjects.map((s) => ({ value: s.id, label: s.title }))
        : f.options;
    const errorId = "error-" + f.name;
    return (
      <label
        key={f.name}
        className={`field ${f.type === "textarea" ? "wide" : ""}`}
      >
        {f.label}
        {f.required && <span className="required"> *</span>}
        {opts ? (
          <select
            disabled={busy}
            value={values[f.name] ?? ""}
            onChange={(e) => set(f.name, e.target.value)}
            required={f.required}
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? errorId : undefined}
          >
            {f.type === "subject" && <option value="">Chọn môn học</option>}
            {opts.map((o) => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : f.type === "textarea" ? (
          <textarea
            disabled={busy}
            rows={4}
            maxLength={10000}
            value={values[f.name] ?? ""}
            required={f.required}
            onChange={(e) => set(f.name, e.target.value)}
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? errorId : undefined}
          />
        ) : (
          <input
            disabled={busy}
            type={f.type}
            required={f.required}
            min={f.min}
            max={f.max}
            step={f.step}
            list={f.list}
            maxLength={f.type === "text" ? 200 : undefined}
            value={values[f.name] ?? ""}
            onChange={(e) =>
              set(
                f.name,
                f.type === "number"
                  ? e.target.value === "" && f.name === "score"
                    ? ""
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
            aria-invalid={!!errors[f.name]}
            aria-describedby={errors[f.name] ? errorId : undefined}
          />
        )}{" "}
        {errors[f.name] && (
          <small className="error" id={errorId}>
            {errors[f.name]}
          </small>
        )}
      </label>
    );
  };
  const recurrence = entity === "events" && (
    <RecurrenceFields
      values={values}
      set={set}
      state={state}
      busy={busy}
      errors={errors}
      id={item?.id}
    />
  );
  return (
    <Modal
      busy={busy}
      title={`${item ? "Sửa" : "Thêm"} ${schema.label}`}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit} className="editor-form">
        <div className="form-grid">{primary.map(renderField)}</div>
        {extra.length > 0 ? (
          <details
            className="more-fields"
            open={!!errorsInExtra(errors, extra)}
          >
            <summary>Thêm chi tiết</summary>
            <div className="form-grid">{extra.map(renderField)}</div>
            {recurrence}
          </details>
        ) : (
          recurrence
        )}
        <datalist id="finance-categories">
          {[
            "Ăn uống",
            "Đi lại",
            "Học tập",
            "Học phí",
            "Mua sắm",
            "Giải trí",
            "Chăm sóc bản thân",
            "Lương",
            "Tips",
            "Thưởng",
            ...state.transactions.map((t) => t.category),
            ...state.budgets.map((b) => b.title),
          ]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((v) => (
              <option key={v} value={v} />
            ))}
        </datalist>
        {entity === "transactions" && values.kind === "income" && (
          <fieldset className="payroll">
            <legend>Tính thu nhập ca làm (tùy chọn)</legend>
            <div className="form-grid">
              {[
                ["rate", "Lương / giờ (VND)"],
                ["hours", "Số giờ"],
                ["tips", "Tips (VND)"],
                ["bonus", "Thưởng (VND)"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    disabled={busy}
                    type="number"
                    min="0"
                    step={key === "hours" ? 0.25 : 1}
                    value={values[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
            <Button
              type="button"
              disabled={busy}
              kind="secondary"
              onClick={() =>
                set(
                  "amount",
                  payroll(values.rate, values.hours, values.tips, values.bonus),
                )
              }
            >
              Áp dụng vào số tiền
            </Button>
            <p className="hint">
              Bạn vẫn có thể sửa số tiền theo lương thực nhận.
            </p>
          </fieldset>
        )}
        {entity === "tasks" && (
          <p className="hint">
            Nhắc việc xuất hiện trên tổng quan khi đến giờ và app đang mở. Không
            có thông báo nền.
          </p>
        )}
        {entity === "resources" && (
          <p className="hint">
            Không lưu mật khẩu hoặc thông tin đăng nhập ngân hàng ở đây.
          </p>
        )}
        {entity === "savings" && (
          <p className="hint">
            Số đã tiết kiệm được cập nhật thủ công, không tạo giao dịch thu
            nhập.
          </p>
        )}
        {errors.form && (
          <p className="error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="modal-footer">
          <Button
            type="button"
            kind="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={busy} icon={Check}>
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
