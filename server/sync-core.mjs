// Sync API logic, independent of Vercel and of the database so it can be
// tested directly. One JSON snapshot per sync code, guarded by a revision
// number so two devices can never silently overwrite each other.
import { createHash } from "node:crypto";
import { validateBackup } from "../src/lib/validation.mjs";

export const MAX_BYTES = 3 * 1024 * 1024;
// 20 characters from an alphabet without look-alikes (no 0/O, 1/I).
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{20}$/;

// Only a hash of the code is stored, so the table alone can't be used to
// open anyone's data.
export const hashCode = (code) =>
  createHash("sha256").update(code).digest("hex");

const reply = (status, body) => ({ status, body });

/**
 * db: { get(hash) -> { revision, data, updatedAt } | null,
 *       insert(hash, data) -> boolean (false if it already exists),
 *       update(hash, expectedRevision, data) -> new revision | null }
 */
export async function handleSync({ method, code, sinceRevision, body, db }) {
  if (method !== "GET" && method !== "PUT")
    return reply(405, { error: "method_not_allowed" });
  if (typeof code !== "string" || !CODE_PATTERN.test(code))
    return reply(400, { error: "invalid_code" });
  const hash = hashCode(code);

  if (method === "GET") {
    const row = await db.get(hash);
    if (!row) return reply(404, { error: "not_found" });
    // Polling devices send the revision they have; skip the payload if the
    // data hasn't changed.
    if (sinceRevision !== undefined && Number(sinceRevision) === row.revision)
      return reply(200, { revision: row.revision, unchanged: true });
    return reply(200, {
      revision: row.revision,
      data: row.data,
      updatedAt: row.updatedAt,
    });
  }

  const expected = body?.expectedRevision;
  if (!Number.isInteger(expected) || expected < 0)
    return reply(400, { error: "invalid_revision" });
  let data;
  try {
    data = validateBackup(body.data);
  } catch (error) {
    return reply(400, { error: "invalid_data", message: error.message });
  }
  if (JSON.stringify(data).length > MAX_BYTES)
    return reply(413, { error: "too_large" });

  if (expected === 0) {
    if (await db.insert(hash, data)) return reply(200, { revision: 1 });
  } else {
    const revision = await db.update(hash, expected, data);
    if (revision !== null) return reply(200, { revision });
  }
  // Someone else saved first (or the code doesn't exist): hand back the
  // latest copy so the app can let the user decide.
  const latest = await db.get(hash);
  if (!latest) return reply(404, { error: "not_found" });
  return reply(409, {
    error: "conflict",
    revision: latest.revision,
    data: latest.data,
    updatedAt: latest.updatedAt,
  });
}

// In-memory database for tests and the local dev/preview server.
export function createMemoryDb() {
  const rows = new Map();
  return {
    async get(hash) {
      const row = rows.get(hash);
      return row ? structuredClone(row) : null;
    },
    async insert(hash, data) {
      if (rows.has(hash)) return false;
      rows.set(hash, {
        revision: 1,
        data: structuredClone(data),
        updatedAt: new Date().toISOString(),
      });
      return true;
    },
    async update(hash, expectedRevision, data) {
      const row = rows.get(hash);
      if (!row || row.revision !== expectedRevision) return null;
      row.revision += 1;
      row.data = structuredClone(data);
      row.updatedAt = new Date().toISOString();
      return row.revision;
    },
  };
}
