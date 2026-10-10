import { useState } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./primitives.jsx";

// Shown when two devices changed the data before syncing: nothing is
// overwritten until the person picks a side.
export function SyncConflict({ onResolve }) {
  const [busy, setBusy] = useState(false);
  const pick = async (choice) => {
    setBusy(true);
    try {
      await onResolve(choice);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      busy={busy}
      title="Dữ liệu ở thiết bị khác đã thay đổi"
      onClose={() => {}}
    >
      <p className="confirmation-copy">
        Thiết bị khác đã lưu thay đổi trong khi máy này cũng có thay đổi chưa
        đồng bộ. Bạn muốn giữ bản nào?
      </p>
      <div className="modal-footer">
        <Button kind="secondary" disabled={busy} onClick={() => pick("remote")}>
          Dùng bản từ thiết bị khác
        </Button>
        <Button disabled={busy} onClick={() => pick("local")}>
          Giữ bản trên máy này
        </Button>
      </div>
    </Modal>
  );
}
