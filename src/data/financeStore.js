export const FINANCE_STORAGE_KEY = "crm_finance_operations_v1";

export const defaultIncomes = [
  { category: "Savdo", amount: 45000000, date: "2026-09-09", employee: "Admin", description: "Do'kon asosiy savdosi" },
  { category: "Buyurtmalar", amount: 25000000, date: "2026-09-05", employee: "Jasur N.", description: "Onlayn buyurtmalar tushumi" },
];

export const defaultExpenses = [
  { category: "Inventar", amount: 4500000, date: "2026-09-09", employee: "Jasur N.", description: "Adidas kiyim va jihozlar xaridi" },
  { category: "Ijara", amount: 8500000, date: "2026-09-01", employee: "Admin", description: "Sentyabr oyi ijarasi" },
  { category: "Maosh", amount: 18200000, date: "2026-09-05", employee: "Admin", description: "Sentyabr oylik maoshlari" },
  { category: "Transport", amount: 1200000, date: "2026-09-06", employee: "Jasur N.", description: "Ta'minotchi yetkazib berish" },
  { category: "Reklama", amount: 800000, date: "2026-09-07", employee: "Alisher Q.", description: "Instagram reklama" },
  { category: "Kommunal", amount: 650000, date: "2026-09-08", employee: "Admin", description: "Elektr va gaz" },
];

export function readFinanceOperations() {
  try {
    const saved = JSON.parse(localStorage.getItem(FINANCE_STORAGE_KEY) || "null");
    if (Array.isArray(saved?.incomes) && Array.isArray(saved?.expenses)) return saved;
  } catch { /* Use defaults when storage is invalid. */ }
  return { incomes: [], expenses: [] };
}

export function saveFinanceOperations(incomes, expenses) {
  localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify({ incomes, expenses }));
}
