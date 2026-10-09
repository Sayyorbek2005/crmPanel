import { readPosSales, readDebtPayments, withDebtBalance } from "./debtPayments";
import { readStockProducts, stockAlerts } from "./stockStore";
import { readFinanceOperations } from "./financeStore";

const sum = (rows, field) => rows.reduce((total, row) => total + Number(row?.[field] || 0), 0);

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function buildBusinessSnapshot() {
  const payments = readDebtPayments();
  const sales = readPosSales().map((sale) => withDebtBalance(sale, payments));
  const products = readStockProducts();
  const alerts = stockAlerts(products);
  const returns = readList("crm_returns");
  const customers = readList("crm_customers");
  const { incomes, expenses } = readFinanceOperations();
  const income = sum(incomes, "amount");
  const expense = sum(expenses, "amount");
  const salesRevenue = sum(sales, "amount");
  const debt = sum(sales, "debtBalance");
  const approvedReturns = returns.filter((item) => item.status === "approved");
  const expenseByCategory = Object.entries(expenses.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + Number(item.amount || 0);
    return result;
  }, {})).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

  return {
    generatedAt: new Date().toISOString(),
    currency: "UZS", scope: "Brauzerdagi barcha yozuvlar. Namunaviy ma'lumotlar bo'lishi mumkin. Moliya va POS summalarini qo'shmang. Tannarx va ombor harakati tarixi to'liq emas; kirim minus chiqim sof foyda emas.",
    finance: { income, expense, balance: income - expense, expenseByCategory },
    sales: { count: sales.length, revenue: salesRevenue, collected: salesRevenue - debt, debt },
    inventory: {
      products: products.length,
      units: sum(products, "stock"),
      retailValue: products.reduce((total, item) => total + Number(item.stock || 0) * Number(item.price || 0), 0),
      lowStockCount: alerts.length,
      lowStockItems: alerts.slice(0, 8).map(({ name, current, minimum, status }) => ({ name, current, minimum, status })),
    },
    customers: { count: customers.length },
    returns: { count: returns.length, approvedCount: approvedReturns.length, approvedAmount: sum(approvedReturns, "amount") },
  };
}

export const formatMoney = (value) => `${Math.round(Number(value || 0)).toLocaleString("ru-RU")} so'm`;

export function localFinancialAnswer(question, snapshot) {
  const { finance, sales, inventory, returns } = snapshot;
  const biggest = finance.expenseByCategory[0];
  const q = question.toLowerCase();
  if (q.includes("qarz") || /долг|задолж|взыск/.test(q)) return `Hozirgi savdolardan qolgan qarzdorlik ${formatMoney(sales.debt)}. Undirilgan summa ${formatMoney(sales.collected)}. Eng avval katta va muddati o'tgan qarzlarni alohida ro'yxat qilib, mijozlarga bosqichma-bosqich eslatma yuborishni tavsiya qilaman.`;
  if (q.includes("ombor") || q.includes("mahsulot") || q.includes("zaxira") || /склад|запас|товар/.test(q)) return `Omborda ${inventory.products} turdagi ${inventory.units} dona mahsulot bor. ${inventory.lowStockCount} ta mahsulot minimal zaxiradan past. Avval tez sotiladigan kam qolgan mahsulotlarni to'ldiring, sekin aylanadigan tovarlarga yangi xaridni vaqtincha kamaytiring.`;
  if (q.includes("xarajat") || q.includes("harajat") || q.includes("kamaytir") || /расход|сократ|затрат/.test(q)) return `Jami xarajat ${formatMoney(finance.expense)}. Eng katta yo'nalish ${biggest ? `${biggest.category} — ${formatMoney(biggest.amount)}` : "hali aniqlanmagan"}. Shu kategoriya bo'yicha 5–10% limit qo'yish, xaridlarni birlashtirish va haftalik reja–amal solishtiruvini boshlash eng tez natija beradi.`;
  return `CRM bo'yicha jami kirim ${formatMoney(finance.income)}, chiqim ${formatMoney(finance.expense)}, kirim va chiqim farqi ${formatMoney(finance.balance)} (bu sof foyda emas). Qarzdorlik ${formatMoney(sales.debt)}, tasdiqlangan qaytarishlar ${formatMoney(returns.approvedAmount)}. Keyingi qadam sifatida eng katta xarajat kategoriyasini qisqartirish va qarzlarni undirish rejasini tuzishni tavsiya qilaman.`;
}

