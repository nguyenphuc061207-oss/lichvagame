import { Plus, Trash2, Pencil, ExternalLink, Star } from "lucide-react";
import { safeURL } from "../../lib/domain.mjs";

export function Button({
  children,
  icon: Icon,
  kind = "",
  type = "button",
  ...props
}) {
  return (
    <button type={type} className={`button ${kind}`} {...props}>
      {Icon && <Icon size={17} />}
      <span>{children}</span>
    </button>
  );
}

export function Empty({
  title = "Chưa có dữ liệu",
  text = "Thêm một mục để bắt đầu.",
  onAdd,
  label = "Thêm mới",
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {onAdd && (
        <Button icon={Plus} onClick={onAdd}>
          {label}
        </Button>
      )}
    </div>
  );
}

export function Progress({ value, label }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: Math.min(100, Math.max(0, value)) + "%" }} />
    </div>
  );
}

export function Pill({ children, kind = "" }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

export function RecordActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button
        className="icon-button"
        aria-label="Chỉnh sửa"
        title="Chỉnh sửa"
        onClick={onEdit}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-button delete"
        aria-label="Xóa"
        title="Xóa"
        onClick={onDelete}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function Section({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ResourceLink({ url }) {
  const safe = safeURL(url);
  return safe ? (
    <a
      className="text-link"
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
    >
      Mở liên kết
      <ExternalLink size={14} />
    </a>
  ) : null;
}

export function Favorite({ value, onClick }) {
  return (
    <button
      className={`icon-button ${value ? "favorite" : ""}`}
      onClick={onClick}
      aria-label={value ? "Bỏ yêu thích" : "Thêm yêu thích"}
      aria-pressed={value}
    >
      <Star size={18} fill={value ? "currentColor" : "none"} />
    </button>
  );
}
