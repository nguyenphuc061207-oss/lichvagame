// Vercel Function: GET/PUT /api/sync. The sync code travels in the
// x-sync-code header over HTTPS and is only ever stored hashed.
import { handleSync } from "../server/sync-core.mjs";
import { createNeonDb } from "../server/neon-db.mjs";

let db;
const getDb = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  return (db ??= createNeonDb(url));
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, x-sync-code, x-since-revision",
  );
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const database = getDb();
  if (!database) return res.status(503).json({ error: "no_database" });
  try {
    const result = await handleSync({
      method: req.method,
      code: req.headers["x-sync-code"],
      sinceRevision: req.headers["x-since-revision"],
      body: req.body,
      db: database,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("sync error", error);
    return res.status(500).json({ error: "server_error" });
  }
}
