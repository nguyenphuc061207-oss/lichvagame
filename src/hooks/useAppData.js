import { useCallback, useEffect, useRef, useState } from "react";
import { demoState } from "../lib/demo.mjs";
import {
  loadAppState,
  readSnapshot,
  writeState,
} from "../services/storage.mjs";
export function useAppData() {
  const [state, setState] = useState(null),
    [loadError, setLoadError] = useState(""),
    [saving, setSaving] = useState(false),
    [toast, setToast] = useState(null),
    [now, setNow] = useState(() => Date.now());
  const current = useRef(null),
    revision = useRef(0),
    queue = useRef(Promise.resolve()),
    timer = useRef(null),
    mounted = useRef(false);
  const notify = useCallback((message, kind = "success") => {
    clearTimeout(timer.current);
    if (!mounted.current) return;
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  const dismissToast = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  const reload = useCallback(async () => {
    try {
      const snapshot = await loadAppState(demoState);
      if (!mounted.current) return;
      current.current = snapshot.state;
      revision.current = snapshot.revision;
      setState(snapshot.state);
      setLoadError("");
      // Best effort: ask the browser not to clear this site's data when the
      // device runs low on space (Safari/Chrome may otherwise evict it).
      navigator.storage?.persist?.().catch(() => {});
    } catch (error) {
      if (mounted.current)
        setLoadError("Không đọc được dữ liệu: " + error.message);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(reload);
    const clock = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      mounted.current = false;
      clearInterval(clock);
      clearTimeout(timer.current);
    };
  }, [reload]);
  useEffect(() => {
    if (!state) return;
    const p = state.preferences;
    document.documentElement.dataset.theme = p.theme;
    document.documentElement.dataset.quality = p.quality || "hd";
    document.documentElement.dataset.accent = p.accent;
    document.documentElement.dataset.decoration = String(p.decoration);
  }, [state]);
  const commit = useCallback(
    (updater, message = "Đã lưu thay đổi.", { optimistic = false } = {}) => {
      const run = queue.current
        .catch(() => {})
        .then(async () => {
          if (!current.current) throw new Error("Dữ liệu chưa sẵn sàng.");
          if (mounted.current) setSaving(true);
          try {
            const next = updater(current.current);
            // Appearance changes show at once instead of waiting for storage,
            // which can be slow or blocked on weak phones; saving continues in
            // the background and a failure only raises the error toast.
            if (optimistic && mounted.current) setState(next);
            const nextRevision = await writeState(next, {
              expectedRevision: revision.current,
            });
            current.current = next;
            revision.current = nextRevision;
            if (mounted.current) setState(next);
            if (message) notify(message);
            return next;
          } catch (error) {
            if (error.code === "STALE_STATE") {
              const latest = await readSnapshot();
              current.current = latest.state;
              revision.current = latest.revision;
              if (mounted.current) setState(latest.state);
            }
            notify("Chưa lưu được. " + error.message, "error");
            throw error;
          } finally {
            if (mounted.current) setSaving(false);
          }
        });
      queue.current = run;
      return run;
    },
    [notify],
  );
  return {
    state,
    loadError,
    reload,
    commit,
    saving,
    toast,
    notify,
    dismissToast,
    now,
  };
}
