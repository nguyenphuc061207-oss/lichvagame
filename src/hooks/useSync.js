import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateBackup } from "../lib/validation.mjs";
import {
  SyncError,
  adoptRemote,
  createSyncApi,
  createSyncCode,
  loadMeta,
  normalizeCode,
  planSync,
  saveMeta,
  syncSignature,
} from "../lib/sync.mjs";

const PUSH_DELAY_MS = 2000;
const POLL_MS = 60000;

// "" = same origin as the page. The desktop app has no API of its own, so it
// needs VITE_SYNC_URL (the deployed site); without it sync is unavailable.
function syncBase() {
  const configured = import.meta.env?.VITE_SYNC_URL;
  if (configured) return String(configured).replace(/\/$/, "");
  return location.protocol === "app:" ? null : "";
}

const explain = (error) =>
  error instanceof SyncError
    ? error.kind === "offline"
      ? "Không có kết nối mạng."
      : error.message
    : error.message || "Đồng bộ chưa thành công.";

export function useSync({ state, commit, notify }) {
  const base = syncBase();
  const api = useMemo(
    () => (base === null ? null : createSyncApi({ base })),
    [base],
  );
  const [meta, setMetaState] = useState(() => loadMeta()),
    [status, setStatus] = useState("idle"), // idle | syncing | offline | error
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(null);
  const metaRef = useRef(meta),
    stateRef = useRef(state),
    baseline = useRef(null), // signature of what the server is known to hold
    queue = useRef(Promise.resolve()),
    pushTimer = useRef(null),
    ready = state !== null;

  const setMeta = useCallback((next) => {
    metaRef.current = next;
    setMetaState(next);
    saveMeta(next);
  }, []);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Serialise network work so a poll never races a push.
  const enqueue = useCallback((task) => {
    const run = queue.current.then(task);
    queue.current = run.catch(() => {});
    return run;
  }, []);

  const succeeded = useCallback(
    (patch) => {
      setMeta({
        ...metaRef.current,
        ...patch,
        syncedAt: new Date().toISOString(),
      });
      setStatus("idle");
      setMessage("");
    },
    [setMeta],
  );

  // Replace local data with the server's copy, keeping this device's look.
  const applyRemote = useCallback(
    async (code, remote) => {
      const data = adoptRemote(validateBackup(remote.data), stateRef.current);
      baseline.current = syncSignature(data);
      await commit(() => data, null);
      setMeta({
        code,
        revision: remote.revision,
        dirty: false,
        syncedAt: new Date().toISOString(),
      });
      setStatus("idle");
      setMessage("");
    },
    [commit, setMeta],
  );

  // Store this device's data under `code` (revision 0 = "create it").
  const createOnServer = useCallback(
    async (code) => {
      const snapshot = stateRef.current;
      const res = await api.put(code, 0, snapshot);
      if (res.status === 409) return setConflict({ remote: res });
      if (res.status !== 200) throw new Error("Không tạo được bản đồng bộ.");
      baseline.current = syncSignature(snapshot);
      succeeded({ code, revision: res.revision, dirty: false });
    },
    [api, succeeded],
  );

  const pushNow = useCallback(async () => {
    const m = metaRef.current;
    const snapshot = stateRef.current;
    if (!api || !m || !snapshot) return;
    const res = await api.put(m.code, m.revision, snapshot);
    if (res.status === 200) {
      const sig = syncSignature(snapshot);
      baseline.current = sig;
      const stale = syncSignature(stateRef.current) !== sig;
      // Edits made mid-push were already queued by the change watcher below.
      succeeded({ revision: res.revision, dirty: stale });
    } else if (res.status === 409 || res.status === 404) {
      if (res.status === 409) setConflict({ remote: res });
      else await createOnServer(m.code); // server lost the code: recreate
    } else {
      throw new Error(
        res.status === 413
          ? "Dữ liệu quá lớn để đồng bộ."
          : "Máy chủ từ chối dữ liệu.",
      );
    }
  }, [api, succeeded, createOnServer]);

  const run = useCallback(
    (task) => {
      setStatus("syncing");
      return enqueue(task)
        .then((result) => {
          setStatus((now) => (now === "syncing" ? "idle" : now));
          return result;
        })
        .catch((error) => {
          setStatus(
            error instanceof SyncError && error.kind === "offline"
              ? "offline"
              : "error",
          );
          setMessage(explain(error));
          throw error;
        });
    },
    [enqueue],
  );

  const conflictRef = useRef(null);
  useEffect(() => {
    conflictRef.current = conflict;
  }, [conflict]);

  const schedulePush = useCallback(() => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (metaRef.current && !conflictRef.current) run(pushNow).catch(() => {});
    }, PUSH_DELAY_MS);
  }, [pushNow, run]);

  // Compare with the server and do whatever it takes to agree.
  const syncNow = useCallback(
    () =>
      run(async () => {
        const m = metaRef.current;
        if (!api || !m || !stateRef.current) return;
        const remote = await api.get(m.code, m.revision);
        if (remote.status === 404) return createOnServer(m.code);
        if (remote.unchanged)
          return m.dirty ? pushNow() : succeeded({ dirty: false });
        const plan = planSync(m, remote);
        if (plan === "idle") return succeeded({ dirty: false });
        if (plan === "push") return pushNow();
        if (plan === "pull") {
          await applyRemote(m.code, remote);
          notify("Đã cập nhật dữ liệu từ thiết bị khác.");
          return;
        }
        setStatus("idle");
        setConflict({ remote });
      }),
    [api, applyRemote, createOnServer, notify, pushNow, run, succeeded],
  );

  // Edits mark the data as unsynced and start the push countdown.
  useEffect(() => {
    if (!ready) return;
    if (baseline.current === null) {
      baseline.current = syncSignature(state);
      return;
    }
    const m = metaRef.current;
    if (!m || syncSignature(state) === baseline.current) return;
    if (!m.dirty) setMeta({ ...m, dirty: true });
    schedulePush();
  }, [state, ready, schedulePush, setMeta]);

  // Pull on start, when coming back to the tab, when the network returns,
  // and every minute while the tab is visible.
  const code = meta?.code;
  useEffect(() => {
    if (!api || !code || !ready) return;
    const go = () => {
      if (!document.hidden && !conflictRef.current) syncNow().catch(() => {});
    };
    go();
    const timer = setInterval(go, POLL_MS);
    document.addEventListener("visibilitychange", go);
    window.addEventListener("online", go);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", go);
      window.removeEventListener("online", go);
    };
  }, [api, code, ready, syncNow]);
  useEffect(() => () => clearTimeout(pushTimer.current), []);

  return {
    available: Boolean(api),
    meta,
    status,
    message,
    conflict,
    syncNow,
    // Start syncing this device's data under a brand-new code.
    async createCode() {
      const fresh = createSyncCode();
      await run(() => createOnServer(fresh));
      return fresh;
    },
    // Look up a code someone typed. Throws a readable error if it is wrong.
    async lookup(input) {
      const normalized = normalizeCode(input);
      if (!normalized)
        throw new Error("Mã không hợp lệ: mã gồm 20 chữ cái và số.");
      let remote;
      try {
        remote = await api.get(normalized);
      } catch (error) {
        throw new Error(explain(error));
      }
      if (remote.status === 404)
        throw new Error(
          "Không tìm thấy mã này. Kiểm tra lại hoặc tạo mã mới ở thiết bị gốc.",
        );
      if (remote.status !== 200) throw new Error("Không đọc được mã này.");
      return { code: normalized, remote };
    },
    // Switch this device to the code's data (after the user confirmed).
    adopt: ({ code: next, remote }) => run(() => applyRemote(next, remote)),
    async resolveConflict(choice) {
      const pending = conflict;
      const m = metaRef.current;
      if (!pending || !m) return;
      setConflict(null);
      if (choice === "remote")
        return run(() => applyRemote(m.code, pending.remote));
      // Keep this device's copy: build on the server's revision and overwrite.
      setMeta({ ...m, revision: pending.remote.revision, dirty: true });
      return run(pushNow);
    },
    leave() {
      clearTimeout(pushTimer.current);
      setConflict(null);
      setMeta(null);
      setStatus("idle");
      setMessage("");
    },
  };
}
