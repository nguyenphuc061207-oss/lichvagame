export const todayISO = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const localMinute = (now = Date.now()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(now))
    .replace(" ", "T");

export const addDays = (date, n) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const validDate = (date) => {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
  } catch {
    return false;
  }
};

export const formatDate = (date, long = false) =>
  date
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "numeric",
        month: long ? "long" : "2-digit",
        ...(long ? { weekday: "long", year: "numeric" } : {}),
        timeZone: "UTC",
      }).format(new Date(date + "T12:00:00Z"))
    : "Chưa đặt ngày";

export const monthDays = (date) => {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const weekday = (date) =>
  (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;

export const weekStart = (date) => addDays(date, -weekday(date));
