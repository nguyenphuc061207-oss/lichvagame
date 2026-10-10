import { Monitor, Moon, Sun } from "lucide-react";

const THEMES = [
  ["light", "Chế độ sáng", Sun],
  ["system", "Theo hệ thống", Monitor],
  ["dark", "Chế độ tối", Moon],
];
const QUALITIES = [
  ["auto", "Auto", "Nền đơn sắc"],
  ["hd", "HD", "Nền hoa hướng dương"],
  ["ultra", "Ultra HD", "Nền động ngày và đêm với hoa, chuồn chuồn và đom đóm"],
];

export function ThemeToggle({
  theme,
  quality = "auto",
  commit,
  disabled,
  showTheme = true,
  showQuality = true,
}) {
  const choose = (key, value) =>
    commit(
      (state) => ({
        ...state,
        preferences: { ...state.preferences, [key]: value },
      }),
      null,
    ).catch(() => {});
  return (
    <div className="appearance-controls">
      {showTheme && (
        <div
          className="theme-segments"
          role="group"
          aria-label="Chế độ giao diện"
        >
          {THEMES.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={theme === value}
              disabled={disabled}
              onClick={() => choose("theme", value)}
            >
              <Icon size={21} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      )}
      {showQuality && (
        <div
          className="quality-segments"
          role="group"
          aria-label="Chất lượng hiển thị"
        >
          {QUALITIES.map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              aria-pressed={quality === value}
              disabled={disabled}
              onClick={() => choose("quality", value)}
              title={`${label} — ${description}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
