import { AlertTriangle, CheckCircle2, X } from "lucide-react";
export function Toast({ value, onClose }) {
  return (
    <div
      className={`toast ${value.kind}`}
      role={value.kind === "error" ? "alert" : "status"}
    >
      {value.kind === "error" ? (
        <AlertTriangle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}
      <span>{value.message}</span>
      <button
        className="icon-button"
        aria-label="Đóng thông báo"
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  );
}
