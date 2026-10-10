import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
export function Modal({ title, onClose, children, busy = false }) {
  const ref = useRef(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby={titleId}
      aria-busy={busy}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="icon-button"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
