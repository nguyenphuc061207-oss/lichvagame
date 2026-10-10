// Neon (Postgres) storage for the sync API. The table is created on first
// use, so there's nothing to set up by hand beyond connecting the database
// to the Vercel project (which provides DATABASE_URL).
import { neon } from "@neondatabase/serverless";

export function createNeonDb(connectionString) {
  const sql = neon(connectionString);
  let ready;
  const ensureTable = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS sync_docs (
        code_hash  TEXT PRIMARY KEY,
        revision   INTEGER NOT NULL DEFAULT 1,
        data       JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((error) => {
      ready = undefined; // retry on the next request
      throw error;
    }));
  return {
    async get(hash) {
      await ensureTable();
      const rows = await sql`
        SELECT revision, data, updated_at FROM sync_docs WHERE code_hash = ${hash}`;
      return rows[0]
        ? {
            revision: rows[0].revision,
            data: rows[0].data,
            updatedAt: new Date(rows[0].updated_at).toISOString(),
          }
        : null;
    },
    async insert(hash, data) {
      await ensureTable();
      const rows = await sql`
        INSERT INTO sync_docs (code_hash, data) VALUES (${hash}, ${JSON.stringify(data)}::jsonb)
        ON CONFLICT (code_hash) DO NOTHING RETURNING revision`;
      return rows.length > 0;
    },
    async update(hash, expectedRevision, data) {
      await ensureTable();
      const rows = await sql`
        UPDATE sync_docs
        SET data = ${JSON.stringify(data)}::jsonb, revision = revision + 1, updated_at = now()
        WHERE code_hash = ${hash} AND revision = ${expectedRevision}
        RETURNING revision`;
      return rows[0] ? rows[0].revision : null;
    },
  };
}
