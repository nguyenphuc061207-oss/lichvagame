import { CATEGORY, PRIORITY, todayISO } from "../../lib/domain.mjs";
export const options = (object) =>
  Object.entries(object).map(([value, label]) => ({ value, label }));
const field = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const title = field("title", "Tên / nội dung", "text", { required: true });
const date = field("date", "Ngày", "date", { required: true });
const notes = field("notes", "Ghi chú", "textarea");
const category = field("category", "Phân loại", "select", {
  options: options(CATEGORY),
});
const subject = field("subjectId", "Môn học", "subject", { required: true });
const timeFields = [
  field("start", "Bắt đầu", "time", { required: true }),
  field("end", "Kết thúc", "time", { required: true }),
];
export const FORMS = {
  events: {
    label: "lịch trình",
    essentials: ["title", "date", "start", "end"],
    defaults: {
      title: "",
      date: "",
      start: "08:00",
      end: "09:00",
      category: "school",
      location: "",
      notes: "",
      recurrence: "none",
      repeatUntil: "",
      status: "planned",
    },
    fields: [
      title,
      category,
      field("date", "Ngày bắt đầu", "date", { required: true }),
      ...timeFields,
      field("location", "Địa điểm"),
      field("recurrence", "Lặp lại", "select", {
        options: options({
          none: "Không lặp",
          daily: "Hằng ngày",
          weekly: "Hằng tuần",
        }),
      }),
      field("repeatUntil", "Lặp đến ngày (tùy chọn)", "date"),
      field("status", "Trạng thái", "select", {
        options: options({
          planned: "Đã lên lịch",
          done: "Hoàn thành",
          cancelled: "Đã hủy",
        }),
      }),
      notes,
    ],
  },
  tasks: {
    label: "công việc",
    essentials: ["title", "due"],
    defaults: {
      title: "",
      due: "",
      priority: "medium",
      category: "personal",
      notes: "",
      done: false,
      reminder: "",
    },
    fields: [
      title,
      field("due", "Hạn hoàn thành", "date"),
      category,
      field("priority", "Mức ưu tiên", "select", {
        options: options(PRIORITY),
      }),
      field("reminder", "Nhắc trong app (tùy chọn)", "datetime-local"),
      notes,
    ],
  },
  transactions: {
    label: "giao dịch",
    defaults: {
      title: "",
      date: "",
      kind: "expense",
      amount: 0,
      category: "Ăn uống",
      payment: "Tiền mặt",
      notes: "",
      rate: 0,
      hours: 0,
      tips: 0,
      bonus: 0,
    },
    fields: [
      title,
      field("kind", "Loại giao dịch", "select", {
        options: options({
          expense: "Chi tiêu",
          income: "Thu nhập",
          transfer: "Chuyển tiền giữa tài khoản",
        }),
      }),
      date,
      field("amount", "Số tiền (VND)", "number", {
        required: true,
        min: 1,
        step: 1,
      }),
      field("category", "Danh mục", "text", {
        required: true,
        list: "finance-categories",
      }),
      field("payment", "Phương thức thanh toán", "select", {
        options: ["Tiền mặt", "Chuyển khoản", "Ví điện tử", "Khác"].map(
          (v) => ({ value: v, label: v }),
        ),
      }),
      notes,
    ],
  },
  budgets: {
    label: "ngân sách",
    defaults: { title: "Ăn uống", month: "", amount: 0 },
    fields: [
      field("title", "Danh mục ngân sách", "text", {
        required: true,
        list: "finance-categories",
      }),
      field("month", "Tháng", "month", { required: true }),
      field("amount", "Hạn mức (VND)", "number", {
        required: true,
        min: 1,
        step: 1,
      }),
    ],
  },
  savings: {
    label: "mục tiêu tiết kiệm",
    defaults: { title: "", target: 0, current: 0, deadline: "" },
    fields: [
      title,
      field("target", "Mục tiêu (VND)", "number", {
        required: true,
        min: 1,
        step: 1,
      }),
      field("current", "Đã tiết kiệm (VND)", "number", { min: 0, step: 1 }),
      field("deadline", "Ngày mục tiêu", "date"),
    ],
  },
  subjects: {
    label: "môn học",
    defaults: {
      title: "",
      semester: "Học kỳ 1",
      code: "",
      lecturer: "",
      notes: "",
    },
    fields: [
      title,
      field("semester", "Học kỳ", "text", { required: true }),
      field("code", "Mã môn"),
      field("lecturer", "Giảng viên"),
      notes,
    ],
  },
  assignments: {
    label: "bài tập",
    defaults: {
      title: "",
      subjectId: "",
      due: "",
      done: false,
      notes: "",
    },
    fields: [
      title,
      subject,
      field("due", "Hạn nộp", "date", { required: true }),
      notes,
    ],
  },
  exams: {
    label: "lịch thi",
    defaults: {
      title: "",
      subjectId: "",
      date: "",
      start: "08:00",
      end: "09:30",
      location: "",
      notes: "",
    },
    fields: [
      title,
      subject,
      date,
      ...timeFields,
      field("location", "Địa điểm"),
      notes,
    ],
  },
  grades: {
    label: "điểm thành phần",
    defaults: { title: "", subjectId: "", weight: 0, score: "" },
    fields: [
      title,
      subject,
      field("weight", "Trọng số (%)", "number", {
        required: true,
        min: 0,
        max: 100,
        step: 0.1,
      }),
      field("score", "Điểm (0–10, để trống nếu chưa có)", "number", {
        min: 0,
        max: 10,
        step: 0.1,
      }),
    ],
  },
  habits: {
    label: "thói quen",
    defaults: { title: "", frequency: "daily" },
    fields: [
      title,
      field("frequency", "Tần suất", "select", {
        options: options({ daily: "Mỗi ngày", weekly: "Mỗi tuần" }),
      }),
    ],
  },
  goals: {
    label: "mục tiêu",
    defaults: { title: "", deadline: "", progress: 0, notes: "" },
    fields: [
      title,
      field("deadline", "Ngày mục tiêu", "date"),
      field("progress", "Tiến độ (%)", "number", { min: 0, max: 100, step: 1 }),
      notes,
    ],
  },
  journals: {
    label: "nhật ký",
    defaults: {
      title: "",
      date: "",
      content: "",
      mood: "",
      kind: "daily",
    },
    fields: [
      title,
      date,
      field("kind", "Loại ghi chép", "select", {
        options: options({ daily: "Nhật ký ngày", weekly: "Nhìn lại tuần" }),
      }),
      field("mood", "Tâm trạng (tùy chọn)", "select", {
        options: options({
          "": "Không chọn",
          happy: "Vui vẻ",
          calm: "Bình yên",
          tired: "Mệt một chút",
          sad: "Cần được vỗ về",
        }),
      }),
      field("content", "Những điều bạn muốn ghi lại", "textarea", {
        required: true,
      }),
    ],
  },
  resources: {
    label: "tài nguyên",
    defaults: {
      title: "",
      category: "Học tập",
      tags: "",
      url: "",
      notes: "",
      favorite: false,
    },
    fields: [
      title,
      field("category", "Danh mục", "text", { required: true }),
      field("tags", "Thẻ (phân cách bằng dấu phẩy)"),
      field("url", "Liên kết (tùy chọn)", "url"),
      field("notes", "Nội dung / danh sách mua sắm", "textarea"),
    ],
  },
};

export function getFormDefaults(entity, date = todayISO()) {
  const values = { ...FORMS[entity].defaults };
  if ("date" in values) values.date = date;
  if ("due" in values) values.due = date;
  if ("month" in values) values.month = date.slice(0, 7);
  return values;
}
