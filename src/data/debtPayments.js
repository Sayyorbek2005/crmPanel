const STORAGE_KEY = "crm_debt_payments_v1";

export function readDebtPayments() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveDebtPayment(payment) {
  const payments = [payment, ...readDebtPayments()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  return payments;
}

export function readPosSales() {
  try {
    const saved = JSON.parse(localStorage.getItem("crm_sales") || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.map((sale) => {
      const amount = Number(sale.amount ?? sale.total ?? 0);
      const status = sale.status || (Number(sale.debtBalance || 0) > 0 ? "partial" : "paid");
      const initialPaidAmount = Number(sale.initialPaidAmount ?? sale.paidAmount ?? (status === "paid" ? amount : 0));
      const parsedDate = sale.date ? new Date(sale.date) : null;
      return {
        ...sale,
        createdAt: sale.date || "",
        id: String(sale.id ?? sale.receiptNumber),
        customer: sale.customer || sale.customerName || "Noma'lum mijoz",
        products: Number(sale.products ?? sale.items?.length ?? 0),
        productIds: sale.productIds || (sale.items || []).map((item) => item.id),
        amount,
        payment: sale.payment || sale.paymentMethod || "Naqd",
        date: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : sale.date || "—",
        status,
        initialPaidAmount,
        paidAmount: Number(sale.paidAmount ?? initialPaidAmount),
        debtBalance: Number(sale.debtBalance ?? Math.max(0, amount - initialPaidAmount)),
      };
    });
  } catch {
    return [];
  }
}

export function withDebtBalance(sale, payments) {
  const salePayments = payments.filter((payment) => payment.saleId === sale.id);
  if (sale.status !== "debt" && sale.initialPaidAmount === undefined && salePayments.length === 0) return sale;

  const additionalPaid = salePayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );
  const paidAmount = Math.min(Number(sale.amount || 0), Number(sale.initialPaidAmount || 0) + additionalPaid);
  const debtBalance = Math.max(0, Number(sale.amount || 0) - paidAmount);
  return {
    ...sale,
    paidAmount,
    debtBalance,
    status: debtBalance === 0 ? "paid" : paidAmount > 0 ? "partial" : "debt",
  };
}
