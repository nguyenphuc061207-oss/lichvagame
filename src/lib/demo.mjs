import { emptyState, record, todayISO, addDays } from "./domain.mjs";
export function demoState() {
  const s = emptyState(),
    today = todayISO(),
    month = today.slice(0, 7);
  const seed = (key, rows) => {
    s[key] = rows.map((r) => record({ ...r, demo: true }));
  };
  seed("subjects", [
    {
      title: "Kế toán tài chính",
      code: "ACC201",
      lecturer: "Nguyễn Thu Hà",
      semester: "Học kỳ 1",
      notes: "Ôn định khoản và lập báo cáo tài chính.",
    },
    {
      title: "Nguyên lý kế toán",
      code: "ACC101",
      lecturer: "Trần Minh Anh",
      semester: "Học kỳ 1",
      notes: "Tài liệu chương 1–5.",
    },
  ]);
  const sid = s.subjects[0].id;
  seed("events", [
    {
      title: "Kế toán tài chính",
      date: today,
      start: "07:30",
      end: "09:30",
      category: "school",
      location: "Phòng B.204",
      notes: "Chương 4 · Kế toán hàng tồn kho",
      recurrence: "weekly",
      repeatUntil: addDays(today, 90),
      status: "planned",
    },
    {
      title: "Ôn tập & làm bài định khoản",
      date: today,
      start: "10:00",
      end: "11:00",
      category: "personal",
      location: "Thư viện",
      notes: "Dành thời gian cho bài tập nhóm.",
      recurrence: "none",
      repeatUntil: "",
      status: "planned",
    },
    {
      title: "Ca chiều ở quán cà phê",
      date: today,
      start: "14:00",
      end: "18:00",
      category: "work",
      location: "Quán cà phê gần trường",
      notes: "Mang theo tạp dề.",
      recurrence: "none",
      repeatUntil: "",
      status: "planned",
    },
    {
      title: "Một chút thời gian cho mình",
      date: today,
      start: "20:00",
      end: "20:30",
      category: "selfcare",
      location: "Ở nhà",
      notes: "Đọc sách, nghỉ ngơi và viết vài dòng.",
      recurrence: "daily",
      repeatUntil: "",
      status: "planned",
    },
  ]);
  seed("tasks", [
    {
      title: "Hoàn thành bài tập định khoản",
      due: today,
      priority: "high",
      category: "school",
      done: false,
      notes: "",
    },
    {
      title: "Chuẩn bị đồ cho ca làm",
      due: today,
      priority: "medium",
      category: "work",
      done: true,
      notes: "",
    },
    {
      title: "Đọc 10 trang sách",
      due: today,
      priority: "low",
      category: "personal",
      done: false,
      notes: "",
    },
  ]);
  seed("assignments", [
    {
      title: "Báo cáo phân tích tài chính",
      subjectId: sid,
      due: addDays(today, 3),
      done: false,
      notes: "Làm theo nhóm 3 người.",
    },
  ]);
  seed("exams", [
    {
      title: "Kiểm tra giữa kỳ",
      subjectId: sid,
      date: addDays(today, 7),
      start: "08:00",
      end: "09:30",
      location: "Phòng A.301",
      notes: "Ôn chương 1–4.",
    },
  ]);
  seed("grades", [
    { title: "Chuyên cần", subjectId: sid, weight: 10, score: 9 },
    { title: "Giữa kỳ", subjectId: sid, weight: 30, score: "" },
    { title: "Cuối kỳ", subjectId: sid, weight: 60, score: "" },
  ]);
  seed("transactions", [
    {
      title: "Lương ca làm tháng này",
      date: month + "-01",
      kind: "income",
      amount: 3200000,
      category: "Lương",
      payment: "Chuyển khoản",
      notes: "Dữ liệu mẫu",
      rate: 25000,
      hours: 120,
      tips: 200000,
      bonus: 0,
    },
    {
      title: "Ăn uống",
      date: today,
      kind: "expense",
      amount: 420000,
      category: "Ăn uống",
      payment: "Tiền mặt",
      notes: "",
    },
    {
      title: "Đi lại",
      date: today,
      kind: "expense",
      amount: 180000,
      category: "Đi lại",
      payment: "Ví điện tử",
      notes: "",
    },
    {
      title: "Sách & tài liệu",
      date: today,
      kind: "expense",
      amount: 250000,
      category: "Học tập",
      payment: "Chuyển khoản",
      notes: "",
    },
  ]);
  seed("budgets", [
    { title: "Ăn uống", month, amount: 1200000 },
    { title: "Đi lại", month, amount: 400000 },
    { title: "Học tập", month, amount: 600000 },
  ]);
  seed("savings", [
    {
      title: "Một chiếc laptop mới",
      target: 15000000,
      current: 4200000,
      deadline: addDays(today, 180),
    },
  ]);
  seed("habits", [
    { title: "Uống đủ nước", frequency: "daily" },
    { title: "Đọc 10 trang sách", frequency: "daily" },
    { title: "Đi bộ 20 phút", frequency: "daily" },
    { title: "Dọn góc học tập", frequency: "weekly" },
  ]);
  seed("habitLogs", [{ habitId: s.habits[0].id, date: today }]);
  seed("goals", [
    {
      title: "Hoàn thành khóa Excel kế toán",
      deadline: addDays(today, 30),
      progress: 45,
      notes: "Học 3 buổi mỗi tuần.",
    },
    {
      title: "Đọc 12 cuốn sách trong năm",
      deadline: addDays(today, 90),
      progress: 25,
      notes: "Đã đọc 3 cuốn.",
    },
  ]);
  seed("journals", [
    {
      title: "Một ngày nhỏ, nhiều điều vui",
      date: today,
      content:
        "Mình đã hiểu thêm một dạng bài định khoản. Tối nay sẽ dành thời gian nghỉ ngơi.",
      mood: "calm",
      kind: "daily",
    },
  ]);
  seed("resources", [
    {
      title: "Tài liệu kế toán",
      category: "Học tập",
      tags: "kế toán, tài liệu",
      url: "https://www.ifrs.org/",
      notes: "Nguồn tham khảo chuẩn mực kế toán quốc tế.",
      favorite: true,
    },
    {
      title: "Góc học Excel",
      category: "Công cụ",
      tags: "excel, kỹ năng",
      url: "https://support.microsoft.com/excel",
      notes: "Tài liệu học Excel chính thức.",
      favorite: true,
    },
  ]);
  return s;
}
