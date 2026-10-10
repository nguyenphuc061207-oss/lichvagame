// Client side of cross-device sync: sync codes, talking to /api/sync and
// deciding what to do when local and server copies differ. Pure logic only;
// the React side lives in hooks/useSync.js.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const CODE_LENGTH = 20;

export function createSyncCode(random = globalThis.crypto) {
  const bytes = new Uint8Array(CODE_LENGTH);
  random.getRandomValues(bytes);
  // 256 isn't a multiple of 32 only if the alphabet changes; masking keeps
  // every character equally likely for the current 32-letter alphabet.
  return Array.from(bytes, (byte) => ALPHABET[byte & 31]).join("");
}

// Accepts what a person types or pastes: spaces, dashes, lower case.
export function normalizeCode(input) {
  const code = String(input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code.length === CODE_LENGTH &&
    [...code].every((ch) => ALPHABET.includes(ch))
    ? code
    : null;
}

export const formatCode = (code) => code.match(/.{1,5}/g).join("-");

export class SyncError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "offline" | "not_found" | "server" | "unavailable"
  }
}

// base: "" for the same origin as the page, or a full URL (desktop app).
export function createSyncApi({
  base = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  const url = `${base}/api/sync`;
  async function call(method, code, { body, since } = {}) {
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          "x-sync-code": code,
          ...(since !== undefined ? { "x-since-revision": String(since) } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new SyncError("offline", "Không kết nối được máy chủ.");
    }
    const json = await response.json().catch(() => ({}));
    if (response.status === 503)
      throw new SyncError(
        "unavailable",
        "Máy chủ chưa cấu hình cơ sở dữ liệu.",
      );
    if (response.status >= 500)
      throw new SyncError("server", "Máy chủ đang lỗi, thử lại sau.");
    return { status: response.status, ...json };
  }
  return {
    // -> { status: 200, revision, data } | { status: 200, unchanged } | { status: 404 }
    get: (code, since) => call("GET", code, { since }),
    // -> { status: 200, revision } | { status: 409, revision, data } | { status: 400|413, error }
    put: (code, expectedRevision, data) =>
      call("PUT", code, { body: { expectedRevision, data } }),
  };
}

/**
 * What to do once we know the server's copy.
 *  meta:   { revision, dirty } as last synced from this device
 *  remote: { revision } or null when the server has nothing for this code
 * Returns "idle" | "push" | "pull" | "conflict".
 */
export function planSync(meta, remote) {
  if (!remote) return "push"; // server lost it or never had it: recreate
  if (remote.revision === meta.revision) return meta.dirty ? "push" : "idle";
  if (remote.revision > meta.revision) return meta.dirty ? "conflict" : "pull";
  return "conflict"; // server is behind us: it was reset; let the user pick
}

const KEY = "tranaya-sync";
export function loadMeta(storage = globalThis.localStorage) {
  try {
    const meta = JSON.parse(storage.getItem(KEY));
    return normalizeCode(meta?.code) && Number.isInteger(meta.revision)
      ? {
          code: normalizeCode(meta.code),
          revision: meta.revision,
          dirty: Boolean(meta.dirty),
          syncedAt: typeof meta.syncedAt === "string" ? meta.syncedAt : null,
        }
      : null;
  } catch {
    return null;
  }
}

export function saveMeta(meta, storage = globalThis.localStorage) {
  try {
    if (meta) storage.setItem(KEY, JSON.stringify(meta));
    else storage.removeItem(KEY);
  } catch {
    // Storage may be blocked (private mode): sync then lasts for this visit.
  }
}

// Look-and-feel choices belong to the device (a phone and a desktop rarely
// want the same theme or quality), so they never travel through sync.
export const DEVICE_PREFERENCES = [
  "theme",
  "quality",
  "accent",
  "compact",
  "decoration",
  "mascotVisible",
  "mascotMotion",
];

const withoutDevicePreferences = (state) => {
  const preferences = { ...state.preferences };
  for (const key of DEVICE_PREFERENCES) delete preferences[key];
  return { ...state, preferences };
};

// Changes to device-only preferences don't count as something to sync.
export const syncSignature = (state) =>
  JSON.stringify(withoutDevicePreferences(state));

// The server's data with this device's own appearance kept on top.
export function adoptRemote(remote, local) {
  if (!local) return remote;
  const kept = {};
  for (const key of DEVICE_PREFERENCES)
    if (key in local.preferences) kept[key] = local.preferences[key];
  return { ...remote, preferences: { ...remote.preferences, ...kept } };
}
