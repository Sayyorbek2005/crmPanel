export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
export const dateKey = (date = new Date()) => `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;

const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
const dayNumber = (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 28
  ? Number(value) : null;
const utcDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  return new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
};
const daysBetween = (from, to) => {
  const start = utcDay(from);
  const end = utcDay(to);
  return start === null || end === null ? 0 : Math.max(0, Math.floor((end - start) / 86400000));
};

export function salaryMonthRows(employee, today = new Date()) {
  const payments = Array.isArray(employee.salaryPayments) ? employee.salaryPayments : [];
  const current = monthKey(today);
  const periods = new Set(payments.map((payment) => payment.period).filter(validMonth));
  const start = validMonth(employee.salaryStartMonth) ? employee.salaryStartMonth : current;
  if (Number(employee.monthlySalary) > 0 && start <= current) {
    const [year, month] = start.split("-").map(Number);
    for (let offset = 0; offset < 120; offset += 1) {
      const period = monthKey(new Date(year, month - 1 + offset, 1));
      if (period > current) break;
      periods.add(period);
    }
  }

  return [...periods].sort().reverse().map((period) => {
    const entries = payments.filter((payment) => payment.period === period)
      .sort((a, b) => (a.paidAt || "").localeCompare(b.paidAt || ""));
    const expected = Number(entries[0]?.expectedAmount ?? employee.monthlySalary) || 0;
    const paid = entries.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const remaining = Math.max(0, expected - paid);
    const dueDay = dayNumber(entries[0]?.dueDay ?? employee.salaryDueDay);
    const dueDate = dueDay ? `${period}-${String(dueDay).padStart(2, "0")}` : null;
    const overdueDays = dueDate && remaining > 0 ? daysBetween(dueDate, dateKey(today)) : 0;
    const latePaidDays = dueDate && remaining === 0 && entries.length
      ? daysBetween(dueDate, entries[entries.length - 1].paidAt) : 0;
    return { period, entries, expected, paid, remaining, dueDate, overdueDays, latePaidDays };
  });
}

export function formatSalaryPeriod(period) {
  if (!validMonth(period)) return period;
  const [year, month] = period.split("-").map(Number);
  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  return `${monthNames[month - 1]} ${year}`;
}
