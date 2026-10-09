const RESET_VERSION = "sale-ready-v4";

const BUSINESS_KEYS = [
  "crm_customers", "crm_products", "crm_suppliers", "crm_sales", "crm_returns",
  "crm_supplier_receipts", "crm_supplier_returns", "crm_debt_payments_v1",
  "crm_finance_operations_v1", "crm_pos_draft", "crm_employees",
];

export function prepareSaleReadyData() {
  try {
    if (localStorage.getItem("crm_sale_ready_reset") === RESET_VERSION) return;
    BUSINESS_KEYS.forEach((key) => localStorage.removeItem(key));
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("crm_supplier_orders_")) localStorage.removeItem(key);
    }
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith("crm_ai_chat_v1_")) sessionStorage.removeItem(key);
    }
    ["crm_customers", "crm_products", "crm_suppliers", "crm_sales", "crm_returns", "crm_supplier_receipts", "crm_supplier_returns", "crm_debt_payments_v1", "crm_employees"].forEach((key) => localStorage.setItem(key, "[]"));
    localStorage.setItem("crm_finance_operations_v1", JSON.stringify({ incomes: [], expenses: [] }));
    localStorage.setItem("crm_sale_ready_reset", RESET_VERSION);
  } catch {
    // Storage is optional; pages still use their empty-state behavior.
  }
}
