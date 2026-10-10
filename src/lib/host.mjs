// Data lives in the browser per web address (origin). Vercel also publishes
// every deployment at its own one-off address (lichvagame-abc123-….vercel.app),
// and each of those starts with an empty store, which looks like data loss
// after every update. Only the production address keeps one store for good.
export const PRODUCTION_HOST =
  import.meta.env?.VITE_PRODUCTION_HOST || "lichvagame.vercel.app";

// True on a Vercel address that isn't the production one.
export function isTemporaryHost(hostname, productionHost = PRODUCTION_HOST) {
  const host = String(hostname || "").toLowerCase();
  return (
    Boolean(productionHost) &&
    host !== productionHost.toLowerCase() &&
    host.endsWith(".vercel.app")
  );
}

export const productionUrl = (productionHost = PRODUCTION_HOST) =>
  `https://${productionHost}/#home`;
