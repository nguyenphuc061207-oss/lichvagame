import { validateBackup } from "../lib/validation.mjs";
// Keep the original database name so existing TranAya records remain accessible.
const DB_NAME = "mimis-world";
let connection;
export class StaleStateError extends Error {
  constructor() {
    super(
      "Dữ liệu đã thay đổi ở tab khác. Bản mới đã được tải; hãy kiểm tra rồi lưu lại.",
    );
    this.name = "StaleStateError";
    this.code = "STALE_STATE";
  }
}
export function openDatabase() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      let settled = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("state"))
          db.createObjectStore("state");
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        settled = true;
        reject(request.error);
      };
      request.onblocked = () => {
        settled = true;
        reject(new Error("Đóng các tab TranAya khác rồi thử lại."));
      };
    }).catch((error) => {
      connection = null;
      throw error;
    });
  return connection;
}
export async function readSnapshot() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readonly"),
      store = tx.objectStore("state");
    const dataRequest = store.get("app"),
      revisionRequest = store.get("revision");
    tx.oncomplete = () => {
      try {
        resolve({
          state: dataRequest.result ? validateBackup(dataRequest.result) : null,
          revision: revisionRequest.result || 0,
        });
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Không đọc được dữ liệu."));
  });
}
export async function readState() {
  return (await readSnapshot()).state;
}
export async function writeState(state, { expectedRevision } = {}) {
  const validated = validateBackup(state);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite"),
      store = tx.objectStore("state");
    let nextRevision, failure;
    const request = store.get("revision");
    request.onsuccess = () => {
      try {
        const revision = request.result || 0;
        if (expectedRevision !== undefined && revision !== expectedRevision)
          throw new StaleStateError();
        nextRevision = revision + 1;
        store.put(validated, "app");
        store.put(nextRevision, "revision");
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(nextRevision);
    tx.onerror = () => reject(failure || tx.error);
    tx.onabort = () =>
      reject(failure || tx.error || new Error("Không thể lưu dữ liệu."));
  });
}
let initialLoad;
export function loadAppState(seed) {
  // Share only pending work (React StrictMode), never cache an outdated snapshot.
  if (!initialLoad)
    initialLoad = (async () => {
      const saved = await readSnapshot();
      if (saved.state) return saved;
      const state = seed();
      try {
        const revision = await writeState(state, {
          expectedRevision: saved.revision,
        });
        return { state, revision };
      } catch (error) {
        if (error.code === "STALE_STATE") return readSnapshot();
        throw error;
      }
    })().finally(() => {
      initialLoad = null;
    });
  return initialLoad;
}
