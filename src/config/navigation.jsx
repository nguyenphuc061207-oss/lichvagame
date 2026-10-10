import { lazy } from "react";
import {
  Home as HomeIcon,
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  BookOpen,
  Heart,
  Archive,
  Gamepad2,
  Settings as SettingsIcon,
} from "lucide-react";
import { Dashboard } from "../features/dashboard/Dashboard.jsx";
import { Home } from "../features/home/Home.jsx";
import { Calendar } from "../features/calendar/Calendar.jsx";
import { Tasks } from "../features/tasks/Tasks.jsx";
import { Study } from "../features/study/Study.jsx";
import { Growth } from "../features/growth/Growth.jsx";
import { Library } from "../features/library/Library.jsx";
import { Settings } from "../features/settings/Settings.jsx";

export const NAV = [
  ["home", "Trang chủ", HomeIcon],
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["calendar", "Lịch trình", CalendarDays],
  ["tasks", "Công việc", ListTodo],
  ["study", "Học tập", BookOpen],
  ["growth", "Phát triển bản thân", Heart],
  ["library", "Kho lưu trữ", Archive],
  ["game", "Giải trí", Gamepad2],
  ["settings", "Cài đặt", SettingsIcon],
];
export const VIEWS = {
  home: Home,
  dashboard: Dashboard,
  calendar: Calendar,
  tasks: Tasks,
  study: Study,
  growth: Growth,
  library: Library,
  // The mini-game is split into its own chunk and loaded on first visit.
  game: lazy(() =>
    import("../features/game/Game.jsx").then((m) => ({ default: m.Game })),
  ),
  settings: Settings,
};
