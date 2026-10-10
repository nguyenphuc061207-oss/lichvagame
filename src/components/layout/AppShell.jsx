import { Suspense, lazy, useEffect, useRef } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { NAV } from "../../config/navigation.jsx";
import { COLLECTIONS } from "../../lib/constants.mjs";
import { ThemeToggle } from "../ui/ThemeToggle.jsx";
import { Sunflower } from "../ui/Sunflower.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { Crocodile } from "../ui/Crocodile.jsx";
// Loaded only when Ultra HD is chosen: its SVG artwork is ~70 kB of markup.
const UltraScene = lazy(() =>
  import("../ui/UltraScene.jsx").then((m) => ({ default: m.UltraScene })),
);
export function AppShell({
  state,
  page,
  navigate,
  mobileOpen,
  setMobileOpen,
  commit,
  saving,
  clearDemo,
  overlays,
  children,
}) {
  const main = useRef(null),
    menuButton = useRef(null),
    sidebarElement = useRef(null);
  const compact = state.preferences.compact,
    demo = COLLECTIONS.some((k) => state[k].some((r) => r.demo));
  useEffect(() => {
    document.title =
      (NAV.find((n) => n[0] === page)?.[1] || "Tổng quan") + " · TranAya";
    main.current?.focus();
  }, [page]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const update = (e) => {
      if (e.matches) setMobileOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [setMobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const returnTarget = menuButton.current,
      sidebar = sidebarElement.current;
    sidebar?.querySelector(".mobile-close")?.focus();
    const trap = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const elements = [...sidebar.querySelectorAll("a,button")].filter(
            (el) => el.getClientRects().length,
          ),
          first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      returnTarget?.focus();
    };
  }, [mobileOpen, setMobileOpen]);
  return (
    <div
      className={`app-shell page-${page} ${compact ? "sidebar-compact" : ""}`}
    >
      {state.preferences.quality === "hd" && (
        <div className="hd-scene" aria-hidden="true">
          <div className="ultra-day">
            <Crocodile />
          </div>
          <div className="ultra-night">
            <Crocodile sleeping />
          </div>
        </div>
      )}
      {state.preferences.quality === "ultra" && (
        <Suspense fallback={null}>
          <UltraScene />
        </Suspense>
      )}
      {mobileOpen && (
        <button
          className="nav-scrim"
          aria-label="Đóng điều hướng"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarElement}
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Điều hướng chính"
      >
        <a className="brand" href="#home" onClick={() => navigate("home")}>
          <span className="brand-icon">
            <Sunflower size={30} />
          </span>
          <span className="brand-copy">TranAya</span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <nav>
          {NAV.map(([key, label, Icon]) => (
            <a
              href={"#" + key}
              key={key}
              onClick={() => navigate(key)}
              className={`nav-item ${page === key ? "active" : ""}`}
              aria-current={page === key ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === key && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="profile-link"
            onClick={() => navigate("settings")}
            aria-label="Mở hồ sơ và cài đặt"
          >
            <Avatar />
            <span>{state.preferences.name}</span>
            <ChevronRight size={15} />
          </button>
          <button
            className="collapse-button icon-button"
            onClick={() =>
              commit(
                (s) => ({
                  ...s,
                  preferences: {
                    ...s.preferences,
                    compact: !s.preferences.compact,
                  },
                }),
                null,
              ).catch(() => {})
            }
            aria-label={compact ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            {compact ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={mobileOpen}>
        <header className="app-topbar">
          <button
            ref={menuButton}
            className="mobile-menu icon-button"
            aria-label="Mở điều hướng"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            <strong className={page === "home" ? "home-brand" : undefined}>
              {page === "home" ? "TranAya" : NAV.find((n) => n[0] === page)[1]}
            </strong>
          </div>
          <span className="storage-status" role="status">
            <span className={saving ? "saving" : ""} />
            {saving ? "Đang lưu…" : "Lưu trên thiết bị"}
          </span>
          <ThemeToggle
            theme={state.preferences.theme}
            quality={state.preferences.quality || "auto"}
            commit={commit}
            disabled={saving}
            showQuality={false}
          />
        </header>
        <main ref={main} tabIndex={-1} className="main-content">
          {demo && page !== "home" && (
            <div className="demo-banner">
              <span>Dữ liệu mẫu</span>
              <button onClick={clearDemo}>
                Xóa dữ liệu mẫu
                <X size={14} />
              </button>
            </div>
          )}
          {children}
        </main>
        {page !== "home" && page !== "game" && <Mascot />}
      </div>
      {overlays}
    </div>
  );
}
