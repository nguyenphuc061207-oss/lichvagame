import { useCallback, useEffect, useState } from "react";
const readPage = (pages) =>
  Object.hasOwn(pages, location.hash.slice(1))
    ? location.hash.slice(1)
    : "home";
export function useNavigation(pages) {
  const [page, setPage] = useState(() => readPage(pages)),
    [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const update = () => {
      setPage(readPage(pages));
      setMobileOpen(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pages]);
  const navigate = useCallback(
    (next) => {
      if (!Object.hasOwn(pages, next)) return;
      location.hash = next;
      setPage(next);
      setMobileOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [pages],
  );
  return { page, navigate, mobileOpen, setMobileOpen };
}
