import { useState } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./primitives.jsx";
export function Confirmation({ value, onClose }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal busy={busy} title={value.title} onClose={() => !busy && onClose()}>
      <p className="confirmation-copy">{value.message}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <Button kind="secondary" disabled={busy} onClick={onClose}>
          Hủy
        </Button>
        <Button
          kind={value.danger ? "danger" : ""}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await value.run();
              onClose();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </Button>
      </div>
    </Modal>
  );
}
