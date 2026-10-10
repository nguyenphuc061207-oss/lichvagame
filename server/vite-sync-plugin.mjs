// Serves /api/sync from memory during `vite` and `vite preview`, so sync can
// be tried locally without a database. Data is lost when the server stops.
import { createMemoryDb, handleSync } from "./sync-core.mjs";

export function syncDevPlugin() {
  const db = createMemoryDb();
  const middleware = (req, res, next) => {
    if (!req.url?.startsWith("/api/sync")) return next();
    res.setHeader("Cache-Control", "no-store");
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", async () => {
      let body;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "invalid_json" }));
      }
      const result = await handleSync({
        method: req.method,
        code: req.headers["x-sync-code"],
        sinceRevision: req.headers["x-since-revision"],
        body,
        db,
      });
      res.statusCode = result.status;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(result.body));
    });
  };
  return {
    name: "tranaya-sync-dev-api",
    // Not returning anything: Vite treats a returned function as a post hook.
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
