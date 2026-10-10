export const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function financeSummary(state, month) {
  const records = state.transactions.filter((t) => t.date.startsWith(month));
  const income = records
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = records
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const budget = state.budgets
    .filter((b) => b.month === month)
    .reduce((s, b) => s + b.amount, 0);
  return {
    income,
    expense,
    net: income - expense,
    budget,
    available: budget - expense,
  };
}

export function payroll(rate, hours, tips = 0, bonus = 0) {
  return Math.round(rate * hours + tips + bonus);
}

export const percent = (n, total) =>
  total > 0 ? Math.min(100, Math.max(0, (n / total) * 100)) : 0;

export function csvTransactions(rows) {
  const esc = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      [
        "Ngày",
        "Loại",
        "Nội dung",
        "Danh mục",
        "Số tiền VND",
        "Thanh toán",
        "Ghi chú",
      ],
      ...rows.map((t) => [
        t.date,
        t.kind,
        t.title,
        t.category,
        t.amount,
        t.payment,
        t.notes,
      ]),
    ]
      .map((row) => row.map(esc).join(","))
      .join("\r\n")
  );
}
export const categoryKey = (value) =>
  String(value).trim().normalize("NFC").toLocaleLowerCase("vi");
export function budgetSpent(state, budget) {
  return state.transactions
    .filter(
      (t) =>
        t.kind === "expense" &&
        t.date.startsWith(budget.month) &&
        categoryKey(t.category) === categoryKey(budget.title),
    )
    .reduce((sum, t) => sum + t.amount, 0);
}
