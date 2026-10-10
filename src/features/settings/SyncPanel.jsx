import { useState } from "react";
import { Cloud, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button, Section } from "../../components/ui/primitives.jsx";
import { formatCode } from "../../lib/sync.mjs";

const STATUS = {
  idle: "Đã đồng bộ",
  syncing: "Đang đồng bộ…",
  offline: "Chưa có mạng, sẽ tự đồng bộ khi có lại",
  error: "Đồng bộ chưa thành công",
};

const time = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "chưa lần nào";

export function SyncPanel({ ctx }) {
  const sync = ctx.sync;
  const [input, setInput] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [shown, setShown] = useState(false);
  if (!sync?.available)
    return (
      <Section
        className="wide"
        title="Đồng bộ giữa các thiết bị"
        subtitle="Chưa dùng được trong bản cài đặt này. Hãy dùng bản web để đồng bộ."
      />
    );
  const code = sync.meta?.code;

  const guard = async (task) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    guard(async () => {
      await sync.createCode();
      ctx.notify("Đã tạo mã đồng bộ. Nhập mã này trên thiết bị khác.");
    });
  // Entering a code swaps this device's data for that code's data.
  const join = (event) => {
    event.preventDefault();
    guard(async () => {
      const found = await sync.lookup(input);
      if (found.code === code) throw new Error("Thiết bị này đang dùng mã đó.");
      ctx.confirm({
        title: "Chuyển sang dữ liệu của mã này?",
        message:
          "Dữ liệu trên thiết bị này sẽ được thay bằng dữ liệu của mã đồng bộ vừa nhập. Giao diện (sáng/tối, đồ họa) của máy này được giữ nguyên.",
        danger: true,
        run: async () => {
          await sync.adopt(found);
          setInput("");
          ctx.notify("Đã chuyển sang dữ liệu của mã đồng bộ.");
        },
      });
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      ctx.notify("Đã sao chép mã đồng bộ.");
    } catch {
      setShown(true);
      ctx.notify("Không sao chép được, hãy chép mã đang hiện.", "error");
    }
  };

  return (
    <Section
      className="wide"
      title="Đồng bộ giữa các thiết bị"
      subtitle={
        code
          ? "Mọi thay đổi tự động lưu lên máy chủ và đồng bộ sang thiết bị cùng mã."
          : "Dùng chung dữ liệu giữa điện thoại và máy tính bằng một mã."
      }
    >
      {code ? (
        <>
          <p className="muted">
            Mã đồng bộ của bạn (giữ kín, ai có mã đều xem được dữ liệu)
          </p>
          <div className="sync-code" role="group" aria-label="Mã đồng bộ">
            <code>{shown ? formatCode(code) : "•••••-•••••-•••••-•••••"}</code>
            <button
              type="button"
              className="icon-button"
              aria-label={shown ? "Ẩn mã" : "Hiện mã"}
              aria-pressed={shown}
              onClick={() => setShown(!shown)}
            >
              {shown ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Sao chép mã"
              onClick={copy}
            >
              <Copy size={17} />
            </button>
          </div>
          <p className="sync-status" role="status">
            <Cloud size={15} /> {STATUS[sync.status]}
            {sync.status === "error" && sync.message ? `: ${sync.message}` : ""}
            {" · Lần cuối: "}
            {time(sync.meta.syncedAt)}
          </p>
          <div className="sync-actions">
            <Button
              icon={RefreshCw}
              kind="secondary"
              disabled={busy || sync.status === "syncing"}
              onClick={() => guard(sync.syncNow)}
            >
              Đồng bộ ngay
            </Button>
            <Button
              kind="ghost"
              disabled={busy}
              onClick={() =>
                ctx.confirm({
                  title: "Tắt đồng bộ trên thiết bị này?",
                  message:
                    "Dữ liệu trên máy này được giữ nguyên nhưng sẽ không còn tự đồng bộ. Dữ liệu trên máy chủ không bị xóa.",
                  run: async () => sync.leave(),
                })
              }
            >
              Tắt đồng bộ
            </Button>
          </div>
        </>
      ) : (
        <div className="sync-actions">
          <Button icon={Cloud} disabled={busy} onClick={create}>
            Tạo mã đồng bộ
          </Button>
          <p className="muted">
            Bấm để đưa dữ liệu hiện tại lên và nhận một mã mới.
          </p>
        </div>
      )}

      <form className="sync-join" onSubmit={join}>
        <label>
          {code ? "Chuyển sang mã khác" : "Đã có mã từ thiết bị khác?"}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dán hoặc nhập mã đồng bộ"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={error ? "sync-error" : undefined}
          />
        </label>
        <Button type="submit" kind="secondary" disabled={busy || !input.trim()}>
          Dùng mã này
        </Button>
      </form>
      {error && (
        <p id="sync-error" className="error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}
