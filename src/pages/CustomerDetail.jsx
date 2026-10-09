import { formatCardNumber, resolveReceivingCard } from "../data/directorCards";
import { returnKeyFor, returnedQuantityFor } from './customerDetailHelpers';
import { SaleProductList } from './CustomerSaleProducts';
import { DebtPaymentModal } from './CustomerDebtPaymentModal';
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import "./CustomerDetail.css";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Crown,
  ShoppingBag,
  DollarSign,
  CreditCard,
  TrendingUp,
  Edit2,
  CheckCircle,
  Copy,
  Clock,
  X,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  readDebtPayments,
  readPosSales,
  saveDebtPayment,
  withDebtBalance,
} from "../data/debtPayments";
import { useToast } from "../context/ToastContext";
import { uzbekRegions } from "../data/regions";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
export default function CustomerDetail({ customerId, saleCustomer, onBack, onNavigate }) {
  useUILanguage();
  const modalRoot = document.getElementById("main-modal-root");
  const modalDialogRef = useRef(null);
  let savedCustomers = [];
  try {
    const saved = JSON.parse(localStorage.getItem("crm_customers") || "[]");
    if (Array.isArray(saved)) savedCustomers = saved;
  } catch {
    // Use the shared customer data if saved data is unavailable.
  }
  const matchesSale = (c) =>
    c.name?.trim().toLowerCase() === saleCustomer?.name?.trim().toLowerCase();
  const originalCustomer = saleCustomer
    ? savedCustomers.find(matchesSale) || saleCustomer
    : savedCustomers.find((c) => String(c.id) === String(customerId)) || { name: "Mijoz", phone: "", region: "", purchases: 0, spent: 0, debt: 0 };

  const { success, error } = useToast();

  const [returnRecords, setReturnRecords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_returns") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [pendingReturn, setPendingReturn] = useState(null);
  const [expandedReturnId, setExpandedReturnId] = useState(null);

  const [customer, setCustomer] = useState(originalCustomer);
  const customerReturns = returnRecords.filter((record) =>
    record.status === "approved" && record.customer?.trim().toLowerCase() === customer.name.trim().toLowerCase()
  );

  const [tab, setTab] = useState(saleCustomer?.initialTab || "purchases");
  const [selectedSaleId, setSelectedSaleId] = useState(saleCustomer?.selectedSaleId || null);
  const [expandedSaleId, setExpandedSaleId] = useState(saleCustomer?.selectedSaleId || null);
  const [debtDetailSaleId, setDebtDetailSaleId] = useState(
    saleCustomer?.initialTab === "debt" ? saleCustomer.selectedSaleId : null
  );
  const [paymentRecords, setPaymentRecords] = useState(readDebtPayments);
  const [, refreshProfile] = useState(0);
  useEffect(() => {
    const refresh = () => {
      setPaymentRecords(readDebtPayments());
      try { const records = JSON.parse(localStorage.getItem("crm_returns") || "[]"); setReturnRecords(Array.isArray(records) ? records : []); } catch { setReturnRecords([]); }
      refreshProfile((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 1500);
    window.addEventListener("storage", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", refresh); };
  }, []);
  const liveCustomerSales = readPosSales().filter((sale) =>
    sale.customer.trim().toLowerCase() === customer.name.trim().toLowerCase()
  );
  const profileSales = (liveCustomerSales.length > 0 ? liveCustomerSales : (saleCustomer?.sales || []))
    .map((sale) => withDebtBalance(sale, paymentRecords)).map((sale) => {
        const saleReturnedAmount = customerReturns
          .filter((record) => String(record.saleId) === String(sale.id))
          .reduce((sum, record) => sum + Number(record.amount || 0), 0);
        if (saleReturnedAmount <= 0) return sale;
        const amount = Math.max(0, Number(sale.amount || 0) - saleReturnedAmount);
        const debtBalance = Math.max(0, Number(sale.debtBalance || 0) - saleReturnedAmount);
        const paidAmount = Math.min(amount, Number(sale.paidAmount || 0));
        return {
          ...sale,
          amount,
          paidAmount,
          debtBalance,
          status: debtBalance > 0 ? (paidAmount > 0 ? "partial" : "debt") : "paid",
        };
      });
  const totalPurchased = profileSales.reduce((sum, sale) => sum + (Array.isArray(sale.items)
    ? sale.items.reduce((total, item, index) => {
      const quantity = Number(item.qty || 0);
      const returned = item.returned ? quantity : returnedQuantityFor(returnRecords, returnKeyFor(sale.id, item.id, index), quantity);
      return total + Math.max(0, quantity - returned);
    }, 0)
    : Number(sale.products || 0)), 0);
  const customerSpentAfterReturns = profileSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const debtSales = profileSales.filter((sale) => Number(sale.debtBalance || 0) > 0);
  const activeDebtSale = debtSales.find((sale) => sale.id === debtDetailSaleId);
  const debtAmount = profileSales.some((sale) => sale.debtBalance !== undefined)
    ? debtSales.reduce((sum, sale) => sum + sale.debtBalance, 0)
    : Number(customer.debt || 0);
  const [paymentModalSale, setPaymentModalSale] = useState(null);
  const paymentSale = paymentModalSale || activeDebtSale || (debtSales.length === 1 ? debtSales[0] : null);
  const toggleSale = (id) => {
    setSelectedSaleId(id);
    setExpandedSaleId((current) => current === id ? null : id);
  };

  const requestProductReturn = (sale, item, index) => {
    const returnKey = returnKeyFor(sale.id, item.id, index);
    const quantity = Number(item.qty || 1);
    const returned = item.returned ? quantity : returnedQuantityFor(returnRecords, returnKey, quantity);
    const remainingQuantity = Math.max(0, quantity - returned);
    if (!remainingQuantity) return;
    setPendingReturn({ sale, item, index, returnKey, quantity: "1", returned, remainingQuantity });
  };

  const confirmProductReturn = () => {
    if (!pendingReturn) return;
    const { sale, item, returnKey, returned, remainingQuantity } = pendingReturn;
    const quantity = Number(pendingReturn.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > remainingQuantity) {
      error("Miqdorni tekshiring", `1 dan ${remainingQuantity} gacha butun son kiriting.`);
      return;
    }

    const record = {
      id: `R-${Date.now()}`,
      returnKey,
      saleId: sale.id,
      customer: customer.name,
      productId: item.id,
      product: item.name,
      purchaseDate: sale.createdAt || sale.date || "",
      quantity,
      amount: Number(item.price || 0) * quantity,
      deliveryAddress: item.deliveryAddress || sale.deliveryAddress || "Manzil biriktirilmagan",
      reason: "Mijoz tovarni qaytardi",
      date: new Date().toISOString(),
      status: "approved",
    };
    const updated = [record, ...returnRecords];
    localStorage.setItem("crm_returns", JSON.stringify(updated));
    setReturnRecords(updated);

    try {
      const savedSales = JSON.parse(localStorage.getItem("crm_sales") || "[]");
      if (Array.isArray(savedSales)) {
        const sales = savedSales.map((savedSale) => {
          if (String(savedSale.id) !== String(sale.id)) return savedSale;
          return {
            ...savedSale,
            items: (savedSale.items || []).map((savedItem, savedIndex) =>
              String(savedItem.id) === String(item.id) && savedIndex === pendingReturn.index
                ? {
                  ...savedItem,
                  returnedQuantity: returned + quantity,
                  returned: returned + quantity >= Number(savedItem.qty || 1),
                  returnedAt: record.date,
                }
                : savedItem
            ),
          };
        });
        localStorage.setItem("crm_sales", JSON.stringify(sales));
      }

      const savedProducts = JSON.parse(localStorage.getItem("crm_products") || "[]");
      if (Array.isArray(savedProducts)) {
        const products = savedProducts.map((product) =>
          String(product.id) === String(item.id)
            ? { ...product, stock: Number(product.stock || 0) + quantity }
            : product
        );
        localStorage.setItem("crm_products", JSON.stringify(products));
      }
    } catch {
      // The return record remains valid even if older saved sale data is malformed.
    }

    setPendingReturn(null);
    success("Tovar qaytarildi", item.name);
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const paymentTimerRef = useRef(null);
  const paymentSubmittingRef = useRef(false);

  useEffect(() => () => clearTimeout(paymentTimerRef.current), []);

  // Tahrirlash modali
  const [showEditModal, setShowEditModal] = useState(false);

  const closePaymentModal = useCallback(() => {
    clearTimeout(paymentTimerRef.current);
    setShowPaymentModal(false);
    setPaymentComplete(false);
    setPaymentMethod("cash");
    setSelectedCardId("");
    setPayAmount("");
    setPaymentModalSale(null);
    paymentSubmittingRef.current = false;
  }, []);

  useEffect(() => {
    if (!showPaymentModal && !showEditModal) return;

    const closeOnOutsideClick = (event) => {
      if (modalDialogRef.current?.contains(event.target)) return;
      closePaymentModal();
      setShowEditModal(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showPaymentModal, showEditModal, closePaymentModal]);

  const [editForm, setEditForm] = useState({
    name: originalCustomer.name || "",
    phone: originalCustomer.phone || "",
    region: originalCustomer.region || "",
  });

  const statusMap = {
    vip: {
      label: "VIP",
      bg: "var(--violet-light)",
      color: "var(--violet)",
    },
    debtor: {
      label: "Qarzdor",
      bg: "var(--danger-light)",
      color: "var(--danger)",
    },
    active: {
      label: "Faol",
      bg: "var(--success-light)",
      color: "var(--success)",
    },
    regular: {
      label: "Oddiy",
      bg: "var(--surface-2)",
      color: "var(--text-muted)",
    },
  };

  const displayStatus = debtAmount > 0
    ? customer.status === "vip" ? "vip" : "debtor"
    : customer.status === "debtor" ? "active" : customer.status;
  const st = statusMap[displayStatus] || statusMap.active;

  // =========================
  // COPY
  // =========================
  const handleCopy = (val, label) => {
    navigator.clipboard?.writeText(val);
    success(`${label} nusxalandi`);
  };

  // =========================
  // PAYMENT
  // =========================
  const openPaymentModal = () => {
    if (debtSales.length > 1 && !activeDebtSale) {
      setTab("debt");
      return;
    }
    setPaymentModalSale(paymentSale);
    if (paymentSale) setDebtDetailSaleId(paymentSale.id);
    setPaymentComplete(false);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    if (paymentComplete || paymentSubmittingRef.current) return;

    if (!paymentSale) {
      if (!payAmount || Number(payAmount) <= 0) return;
      success("To'lov qabul qilindi", `${customer.name} — ${formatCurrency(payAmount)}`);
      closePaymentModal();
      return;
    }

    const amount = Math.min(paymentSale.debtBalance, Number(String(payAmount || "").replace(/\D/g, "")) || 0);
    if (amount <= 0) return;

    let receivingCard = null;
    if (paymentMethod === "card") {
      try {
        receivingCard = resolveReceivingCard(selectedCardId);
      } catch (cause) {
        error(tx(cause.message));
        return;
      }
    }

    const record = {
      id: `PAY-${Date.now()}`,
      saleId: paymentSale.id,
      customer: customer.name,
      amount,
      method: paymentMethod === "card" ? "Karta" : "Naqd",
      receivingCard,
      cardLast4: receivingCard?.number.slice(-4) || "",
      createdAt: new Date().toISOString(),
    };
    let updatedPayments;
    paymentSubmittingRef.current = true;
    try {
      updatedPayments = saveDebtPayment(record);
    } catch {
      paymentSubmittingRef.current = false;
      error("To'lov saqlanmadi", "Qayta urinib ko'ring.");
      return;
    }

    setPaymentRecords(updatedPayments);
    const remainingDebt = Math.max(0, debtAmount - amount);
    setCustomer((prev) => ({
      ...prev,
      debt: remainingDebt,
      status: remainingDebt > 0 ? "debtor" : prev.status === "debtor" ? "active" : prev.status,
    }));
    try {
      const saved = JSON.parse(localStorage.getItem("crm_customers") || "null");
      const list = Array.isArray(saved) ? saved : [];
      localStorage.setItem("crm_customers", JSON.stringify(list.map((item) =>
        item.name?.trim().toLowerCase() === customer.name.trim().toLowerCase()
          ? { ...item, debt: remainingDebt, status: remainingDebt > 0 ? "debtor" : item.status === "debtor" ? "active" : item.status }
          : item
      )));
    } catch {
      // The payment is saved even if the separate customer list cannot be updated.
    }

    setPaymentComplete(true);
    success("To'lov qabul qilindi", `${customer.name} — ${formatCurrency(amount)}`);
    paymentTimerRef.current = setTimeout(() => {
      closePaymentModal();
      setDebtDetailSaleId(null);
      onNavigate?.("sales-new");
    }, 1200);
  };

  // =========================
  // EDIT MODAL OPEN
  // =========================
  const handleOpenEdit = () => {
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      region: customer.region || "",
    });

    setShowEditModal(true);
  };

  // =========================
  // EDIT SAVE
  // =========================
  const handleSaveEdit = (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      return;
    }

    setCustomer((prev) => ({
      ...prev,
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      region: editForm.region.trim(),
    }));

    setShowEditModal(false);

    success("Mijoz ma'lumotlari muvaffaqiyatli yangilandi!");
  };

  // =========================
  // TABS
  // =========================
  const tabs = [
    {
      key: "purchases",
      label: "Xaridlar",
    },
    {
      key: "debt",
      label: "Qarzdorlik",
    },
    {
      key: "payments",
      label: "To'lovlar",
    },
    {
      key: "activity",
      label: "Faoliyat",
    },
    {
      key: "returns",
      label: "Qaytarilgan tovarlar",
    },
  ];
  const recordedPayments = paymentRecords
    .filter((payment) => profileSales.some((sale) => sale.id === payment.saleId))
    .map((payment) => ({
      ...payment,
      isDebtPayment: true,
      date: new Date(payment.createdAt).toLocaleDateString("uz-UZ"),
      method: payment.receivingCard ? `${tx("Karta")} ${formatCardNumber(payment.receivingCard.number)}` : payment.cardLast4 ? `Karta •••• ${payment.cardLast4}` : payment.method,
    }));
  const initialPayments = profileSales
    .filter((sale) => Number(sale.initialPaidAmount || 0) > 0)
    .map((sale) => ({
      id: `sale-payment-${sale.id}`,
      saleId: sale.id,
      amount: Number(sale.initialPaidAmount),
      method: sale.receivingCard ? `${tx("Karta")} ${formatCardNumber(sale.receivingCard.number)}` : sale.payment || "Naqd",
      date: sale.date,
      createdAt: sale.date,
      isDebtPayment: false,
    }));
  const displayedPayments = [...recordedPayments, ...initialPayments];
  const displayedActivity = [
    ...profileSales.map((sale) => ({
      type: "sale",
      text: `Yangi sotuv amalga oshirildi — ${formatCurrency(sale.amount)}`,
      time: sale.date,
      icon: ShoppingBag,
      color: "var(--brand)",
    })),
    ...displayedPayments.map((payment) => ({
      type: "payment",
      text: `${payment.isDebtPayment ? "Qarz to'lovi qabul qilindi" : "To'lov qabul qilindi"} — ${formatCurrency(payment.amount)} (${payment.saleId})`,
      time: payment.date,
      icon: CheckCircle,
      color: "var(--success)",
    })),
    ...profileSales.filter((sale) => Number(sale.debtBalance || 0) > 0).map((sale) => ({
      type: "debt",
      text: `Qarzdorlik yaratildi — ${formatCurrency(sale.debtBalance)} (${sale.id})`,
      time: sale.date,
      icon: CreditCard,
      color: "var(--danger)",
    })),
  ];

  return (
    <div className="space-y-6 fade-in">

      {/* =========================
          BACK + HEADER
      ========================= */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="app-back-button"
          aria-label={tx("Oldingi sahifaga qaytish")}
          style={{ marginBottom: 0, flexShrink: 0 }}
        >
          <ArrowLeft size={16} aria-hidden="true" style={{ flexShrink: 0 }} />{tx("Orqaga")}</button>

        <div>
          <h1
            className="font-display font-bold text-2xl"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Mijoz profili")}</h1>

          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Mijoz tarixi va batafsil ma'lumotlari")}</p>
        </div>
      </div>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <div
        className="customer-detail-layout grid gap-5"
      >

        {/* =========================
            LEFT PANEL
        ========================= */}
        <div className="customer-detail-summary space-y-4">

          {/* PROFILE CARD */}
          <div className="card p-5 text-center">

            <div className="relative inline-block mb-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto"
                style={{
                  background:
                    customer.status === "vip"
                      ? "linear-gradient(135deg, var(--violet), var(--violet))"
                      : "linear-gradient(135deg, var(--brand), var(--brand-hover))",
                }}
              >
                {tx(customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2))}
              </div>

              {customer.status === "vip" && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--warning)",
                  }}
                >
                  <Crown size={13} color="white" />
                </div>
              )}
            </div>

            <div
              className="font-display font-bold text-lg mb-1"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {customer.name}
            </div>

            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: st.bg,
                color: st.color,
              }}
            >
              {customer.status === "vip" && <Crown size={10} />}
              {tx(st.label)}
            </span>

            {/* CUSTOMER INFO */}
            <div className="mt-5 space-y-3 text-left">
              {[
                {
                  icon: Phone,
                  label: customer.phone,
                  action: () =>
                    handleCopy(customer.phone, "Telefon"),
                },
                {
                  icon: MapPin,
                  label: customer.region,
                  action: undefined,
                },
                {
                  icon: Calendar,
                  label: `Ro'yxatdan: ${customer.lastPurchase}`,
                  action: undefined,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--surface-2)",
                    }}
                  >
                    <item.icon
                      size={14}
                      style={{
                        color: "var(--text-muted)",
                      }}
                    />
                  </div>

                  <span
                    className="text-sm flex-1"
                    style={{
                      color: "var(--text-secondary)",
                    }}
                  >
                    {tx(item.label)}
                  </span>

                  {item.action && (
                    <button
                      onClick={item.action}
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        cursor: "pointer",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      <Copy
                        size={12}
                        style={{
                          color: "var(--text-faint)",
                        }}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2 mt-5">

              <button
                onClick={openPaymentModal}
                className="btn-primary flex-1 justify-center text-xs"
                style={{
                  background: "var(--success)",
                  boxShadow:
                    "0 2px 8px rgba(16,185,129,0.25)",
                  cursor: "pointer",
                }}
              >
                <CheckCircle size={13} />{tx("To'lov")}</button>

              {/* TAHIRLASH */}
              <button
                onClick={handleOpenEdit}
                className="btn-ghost text-xs flex-1 justify-center"
                style={{
                  cursor: "pointer",
                }}
              >
                <Edit2 size={13} />{tx("Tahrirlash")}</button>

            </div>
          </div>

          {/* =========================
              STATS
          ========================= */}
          <div className="card p-4 space-y-3">
            {[
              {
                icon: ShoppingBag,
                label: "Jami xaridlar",
                value: `${totalPurchased} ta`,
                color: "var(--brand)",
                bg: "var(--brand-light)",
              },
              {
                icon: DollarSign,
                label: "Jami xarajat",
                value: formatCurrency(customerSpentAfterReturns),
                color: "var(--success)",
                bg: "var(--success-light)",
              },
              {
                icon: CreditCard,
                label: "Joriy qarz",
                value:
                  debtAmount > 0
                    ? formatCurrency(debtAmount)
                    : "—",
                color:
                  debtAmount > 0
                    ? "var(--danger)"
                    : "var(--success)",
                bg:
                  debtAmount > 0
                    ? "var(--danger-light)"
                    : "var(--success-light)",
              },
              {
                icon: TrendingUp,
                label: "O'rtacha xarid",
                value: formatCurrency(Math.round(
                  customerSpentAfterReturns /
                  Math.max(profileSales.length, 1)
                )),
                color: "var(--violet)",
                bg: "var(--violet-light)",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: s.bg,
                  }}
                >
                  <s.icon
                    size={14}
                    style={{
                      color: s.color,
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs"
                    style={{
                      color: s.label === "Joriy qarz" ? s.color : "var(--text-faint)",
                    }}
                  >
                    {tx(s.label)}
                  </div>

                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: s.label === "Joriy qarz" ? s.color : "var(--text-primary)",
                    }}
                  >
                    {tx(s.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================
            RIGHT PANEL
        ========================= */}
        <div className="customer-detail-history card-flat rounded-2xl overflow-hidden">

          {/* TAB BAR */}
          <div
            className="flex items-center gap-1 px-5 py-3"
            style={{
              borderBottom:
                "1px solid var(--border-subtle)",
            }}
          >
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background:
                    tab === item.key
                      ? "var(--brand-light)"
                      : "transparent",
                  color:
                    tab === item.key
                      ? "var(--brand)"
                      : "var(--text-muted)",
                  fontWeight:
                    tab === item.key ? 600 : 400,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {tx(item.label)}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="fade-in">

            {/* PURCHASES */}
            {tab === "purchases" && (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        background:
                          "var(--table-stripe)",
                      }}
                    >
                      {[
                        "ID",
                        "Mahsulotlar",
                        "Summa",
                        "To'lov",
                        "Sana",
                        "Holat",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-xs font-semibold"
                          style={{
                            color:
                              "var(--text-faint)",
                          }}
                        >
                          {tx(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {profileSales.map((s) => {
                      const statusMap2 = {
                        paid: {
                          label: "To'landi",
                          bg: "var(--success-light)",
                          color: "var(--success)",
                        },
                        debt: {
                          label: "Qarz",
                          bg: "var(--danger-light)",
                          color: "var(--danger)",
                        },
                        partial: {
                          label: "Qisman",
                          bg: "var(--warning-light)",
                          color: "var(--warning)",
                        },
                        returned: {
                          label: "Qaytarilgan",
                          bg: "var(--surface-2)",
                          color: "var(--text-muted)",
                        },
                      };

                      const ss =
                        statusMap2[s.status] ||
                        statusMap2.paid;

                      return (
                        <Fragment key={s.id}>
                        <tr
                          className={`border-t table-row-hover row-anim customer-purchase-row ${selectedSaleId === s.id ? "is-selected" : ""}`}
                          onClick={() => toggleSale(s.id)}
                          style={{
                            borderColor:
                              "var(--border-subtle)",
                          }}
                        >
                          <td
                            className="px-5 py-3.5 font-mono text-xs font-semibold"
                            style={{
                              color:
                                "var(--text-muted)",
                            }}
                          >
                            {s.id}
                          </td>

                          <td
                            className="px-5 py-3.5 text-sm"
                            style={{
                              color:
                                "var(--text-secondary)",
                            }}
                          >
                            <button
                              type="button"
                              className="customer-purchase-toggle"
                              aria-expanded={expandedSaleId === s.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleSale(s.id);
                              }}
                            >
                              {tx(s.products)}{tx(" ta mahsulot")}</button>
                          </td>

                          <td
                            className="px-5 py-3.5 text-sm font-semibold"
                            style={{
                              color:
                                "var(--text-primary)",
                            }}
                          >
                            {formatCurrency(s.amount)}</td>

                          <td
                            className="px-5 py-3.5 text-sm"
                            style={{
                              color:
                                "var(--text-secondary)",
                            }}
                          >
                            {tx(s.payment)}
                          </td>

                          <td
                            className="px-5 py-3.5 text-xs"
                            style={{
                              color:
                                "var(--text-faint)",
                            }}
                          >
                            {tx(s.date)}
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: ss.bg,
                                color: ss.color,
                              }}
                            >
                              {tx(ss.label)}
                            </span>
                          </td>
                        </tr>
                        {expandedSaleId === s.id && (
                          <tr className="customer-purchase-detail">
                            <td colSpan={6}>
                              <SaleProductList
                                sale={s}
                                returnRecords={returnRecords}
                                onReturn={requestProductReturn}
                              />
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                    {profileSales.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-6 text-sm">{tx("Xaridlar mavjud emas")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "returns" && (
              <div className="customer-returns-panel">
                {customerReturns.length > 0 ? customerReturns.map((record) => {
                  const expanded = expandedReturnId === record.id;
                  const sale = profileSales.find((item) => String(item.id) === String(record.saleId));
                  const purchaseDate = record.purchaseDate || sale?.createdAt || sale?.date;
                  const dateLabel = (value) => value && Number.isFinite(new Date(value).getTime())
                    ? new Date(value).toLocaleDateString("uz-UZ")
                    : "—";
                  return (
                    <div
                      className="customer-return-card"
                      key={record.id}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={() => setExpandedReturnId(expanded ? null : record.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedReturnId(expanded ? null : record.id);
                        }
                      }}
                    >
                      <div className="customer-return-icon"><RotateCcw size={18} /></div>
                      <div className="customer-return-main">
                        <strong>{record.product}</strong>
                        <small>{record.quantity || 1} {tx("dona qaytarildi")}</small>
                        <span><MapPin size={14} /> {tx(record.deliveryAddress || "Manzil biriktirilmagan")}</span>
                      </div>
                      <div className="customer-return-meta">
                        <strong>{formatCurrency(Number(record.amount || 0))}</strong>
                        <span>{tx(dateLabel(record.date))}</span>
                      </div>
                      {expanded && (
                        <div className="customer-return-details">
                          <div><span>{tx("Xarid qilingan sana")}</span><strong>{tx(dateLabel(purchaseDate))}</strong></div>
                          <div><span>{tx("Qaytarilgan sana")}</span><strong>{tx(dateLabel(record.date))}</strong></div>
                          <div><span>{tx("Qaytarilgan miqdor")}</span><strong>{record.quantity || 1} {tx("dona")}</strong></div>
                          <div><span>{tx("Qaytarilgan pul")}</span><strong>{formatCurrency(Number(record.amount || 0))}</strong></div>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="customer-returns-empty">
                    <RotateCcw size={28} />
                    <strong>{tx("Qaytarilgan tovarlar yo'q")}</strong>
                    <span>{tx("Mijoz qaytargan tovarlar shu yerda ko'rinadi.")}</span>
                  </div>
                )}
              </div>
            )}

            {/* DEBT */}
            {tab === "debt" && (
              <div className="p-5">
                {debtAmount > 0 ? (
                  <div className="space-y-4">
                    {activeDebtSale && (
                      <button
                        type="button"
                        className="app-back-button customer-debt-back"
                        onClick={() => setDebtDetailSaleId(null)}
                        aria-label={tx("Qarzga olingan xaridlar ro'yxatiga qaytish")}
                      >
                        <ArrowLeft size={16} />{tx(" Orqaga")}</button>
                    )}
                    <div
                      className="p-4 rounded-2xl"
                      style={{
                        background:
                          "var(--danger-light)",
                        border:
                          "1px solid var(--danger-border, var(--danger))",
                      }}
                    >
                      <div
                        className="text-sm font-semibold mb-1"
                        style={{
                          color: "var(--danger)",
                        }}
                      >
                        {tx(activeDebtSale ? "Tanlangan xarid qarzi" : "Joriy qarzdorlik")}
                      </div>

                      <div
                        className="text-2xl font-display font-bold"
                        style={{
                          fontFamily:
                            "'Manrope',sans-serif",
                          color: "var(--danger)",
                        }}
                      >
                        {formatCurrency(activeDebtSale ? activeDebtSale.debtBalance : debtAmount)}</div>
                    </div>

                    {activeDebtSale ? (
                      <>
                        <div className="customer-debt-purchases">
                          <h3>{tx("Qarzga olingan xarid")}</h3>
                          <div className="customer-debt-purchase is-selected">
                            <span>{activeDebtSale.id} · {tx(activeDebtSale.products)}{tx(" ta mahsulot")}</span>
                            <strong>{formatCurrency(activeDebtSale.debtBalance)}</strong>
                          </div>
                          <SaleProductList
                            sale={activeDebtSale}
                            returnRecords={returnRecords}
                            onReturn={requestProductReturn}
                          />
                        </div>

                        <div className="space-y-2">
                          {[
                            { label: "Qarz yaratilgan sana", value: activeDebtSale.date },
                            { label: "To'lov muddati", value: activeDebtSale.debtDueDate || "Ko'rsatilmagan" },
                            { label: "Kechikish", value: "0 kun" },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between py-2"
                              style={{ borderBottom: "1px solid var(--border-subtle)" }}
                            >
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                                {tx(item.label)}
                              </span>
                              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                {tx(item.value)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={openPaymentModal}
                          className="btn-primary w-full justify-center"
                          style={{ background: "var(--success)", cursor: "pointer" }}
                        >
                          <CheckCircle size={15} />{tx("Qarzni to'lash")}</button>
                      </>
                    ) : (
                      <div className="customer-debt-purchases">
                        <h3>{tx("Qarzga olingan xaridlar")}</h3>
                        {debtSales.length > 0 ? debtSales.map((sale) => (
                          <button
                            key={sale.id}
                            type="button"
                            className="customer-debt-purchase"
                            onClick={() => {
                              setSelectedSaleId(sale.id);
                              setDebtDetailSaleId(sale.id);
                            }}
                          >
                            <span>{sale.id} · {tx(sale.products)}{tx(" ta mahsulot")}</span>
                            <strong>{formatCurrency(sale.debtBalance)}</strong>
                          </button>
                        )) : (
                          <p>{tx("Bu qarzga tegishli xarid tafsilotlari kiritilmagan.")}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{
                        background:
                          "var(--success-light)",
                      }}
                    >
                      <CheckCircle
                        size={24}
                        style={{
                          color: "var(--success)",
                        }}
                      />
                    </div>

                    <p
                      className="text-sm font-semibold mb-1"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >{tx("Qarzdorlik yo'q")}</p>

                    <p
                      className="text-xs"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >{tx("Bu mijozning hech qanday qarzdorligi mavjud emas")}</p>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENTS */}
            {tab === "payments" && (
              <div className="p-5">
                <div className="space-y-3">
                  {displayedPayments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3.5 rounded-xl"
                      style={{
                        background:
                          "var(--surface-2)",
                        border:
                          "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            background:
                              "var(--success-light)",
                          }}
                        >
                          <CheckCircle
                            size={16}
                            style={{
                              color:
                                "var(--success)",
                            }}
                          />
                        </div>

                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{
                              color:
                                "var(--text-primary)",
                            }}
                          >
                            {formatCurrency(p.amount)}</div>

                          <div
                            className="text-xs"
                            style={{
                              color:
                                "var(--text-faint)",
                            }}
                          >
                            {tx(p.method)} · {tx(p.date)}{tx(p.saleId ? ` · ${p.saleId}` : "")}
                          </div>
                        </div>
                      </div>

                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background:
                            "var(--success-light)",
                          color:
                            "var(--success)",
                        }}
                      >{tx("Qabul qilindi")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            {tab === "activity" && (
              <div className="p-5">
                <div className="relative pl-6 space-y-0">

                  <div
                    className="absolute left-2.5 top-4 bottom-4 w-0.5"
                    style={{
                      background:
                        "var(--border)",
                    }}
                  />

                  {displayedActivity.map((item, i) => (
                    <div
                      key={i}
                      className="relative pb-5"
                    >
                      <div
                        className="absolute left-[-22px] w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: item.color,
                          top: 2,
                        }}
                      >
                        <item.icon
                          size={10}
                          color="white"
                        />
                      </div>

                      <div
                        className="text-sm font-medium"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {tx(item.text)}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock
                          size={11}
                          style={{
                            color:
                              "var(--text-faint)",
                          }}
                        />

                        <span
                          className="text-xs"
                          style={{
                            color:
                              "var(--text-faint)",
                          }}
                        >
                          {tx(item.time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          TAHIRLASH MODALI
      ===================================================== */}
      {showEditModal && modalRoot && createPortal(
        <div
          className="crm-content-modal"
          onClick={() => setShowEditModal(false)}
        >
          <div
            ref={modalDialogRef}
            className="customer-detail-edit-modal"
            style={{ maxWidth: "100%", maxHeight: "100%", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="font-display font-bold text-lg"
                  style={{
                    color:
                      "var(--text-primary)",
                    fontFamily:
                      "'Manrope',sans-serif",
                  }}
                >{tx("Mijozni tahrirlash")}</h2>

                <p
                  className="text-xs mt-1"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >{tx("Mijoz ma'lumotlarini o'zgartiring")}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEditModal(false)
                }
                className="p-2 rounded-xl transition-opacity hover:opacity-70"
                style={{
                  color:
                    "var(--text-faint)",
                  background:
                    "var(--surface-2)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              className="space-y-4"
            >

              {/* NAME */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >{tx("Mijoz ismi")}</label>

                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      name: e.target.value,
                    })
                  }
                  placeholder={tx("Masalan: Ali Valiyev")}
                  className="input-base"
                  autoFocus
                />
              </div>

              {/* PHONE */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >{tx("Telefon raqam")}</label>

                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      phone: e.target.value,
                    })
                  }
                  placeholder={tx("+998 90 123 45 67")}
                  className="input-base"
                />
              </div>

              {/* REGION */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >{tx("Manzil / Viloyat")}</label>

                <select
                  value={editForm.region || ""}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  className="input-base"
                >
                  <option value="">{tx("Viloyatni tanlang")}</option>
                  {editForm.region && !uzbekRegions.includes(editForm.region) && (
                    <option value={editForm.region}>{editForm.region}</option>
                  )}
                  {uzbekRegions.map((region) => <option key={region} value={region}>{tx(region)}</option>)}
                </select>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                  className="btn-ghost flex-1 justify-center"
                  style={{
                    cursor: "pointer",
                  }}
                >{tx("Bekor qilish")}</button>

                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center"
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <Save size={14} />{tx("Saqlash")}</button>

              </div>
            </form>
          </div>
        </div>
      , modalRoot)}

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}
      {showPaymentModal && paymentSale && modalRoot && createPortal(
        <DebtPaymentModal
          sale={paymentSale}
          paymentAmount={payAmount}
          setPaymentAmount={setPayAmount}
          method={paymentMethod}
          setMethod={setPaymentMethod}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          completed={paymentComplete}
          onSubmit={handlePayment}
          onClose={closePaymentModal}
          dialogRef={modalDialogRef}
        />,
        modalRoot
      )}

      {pendingReturn && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div className="customer-return-confirm" role="dialog" aria-modal="true" aria-labelledby="return-confirm-title">
            <div className="customer-return-confirm-icon"><RotateCcw size={24} /></div>
            <h2 id="return-confirm-title">{tx("Tovarni qaytarishni tasdiqlaysizmi?")}</h2>
            <p><strong>{pendingReturn.item.name}</strong> — {pendingReturn.quantity} {tx("dona qaytarilsinmi?")}</p>
            <label className="customer-return-quantity">
              <span>{tx("Qaytariladigan miqdor")}</span>
              <input
                type="number"
                min="1"
                max={pendingReturn.remainingQuantity}
                step="1"
                inputMode="numeric"
                className="input-base"
                value={pendingReturn.quantity}
                onChange={(event) => setPendingReturn({ ...pendingReturn, quantity: event.target.value })}
              />
              <small>{tx("Qolgan miqdor")}: {pendingReturn.remainingQuantity} {tx("dona")}</small>
            </label>
            <div className="customer-return-confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setPendingReturn(null)}>{tx("Bekor qilish")}</button>
              <button type="button" className="customer-return-confirm-button" onClick={confirmProductReturn}>
                <RotateCcw size={15} />{tx(" Ha, qaytarish")}</button>
            </div>
          </div>
        </div>,
        modalRoot
      )}
      {showPaymentModal && !paymentSale && modalRoot && createPortal(
        <div
          className="crm-content-modal"
        >
          <div
            ref={modalDialogRef}
            className="rounded-3xl p-6 w-full max-w-sm slide-up"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--shadow-lg)",
              border:
                "1px solid var(--border)",
              maxHeight: "100%",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >

            <div className="flex items-center justify-between mb-5">

              <h2
                className="font-display font-bold text-lg"
                style={{
                  fontFamily:
                    "'Manrope',sans-serif",
                  color:
                    "var(--text-primary)",
                }}
              >{tx("To'lov qabul qilish")}</h2>

              <button
                onClick={closePaymentModal}
                className="p-2 rounded-xl hover:opacity-70"
                style={{
                  color:
                    "var(--text-faint)",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >{tx("Miqdor")}</label>

                <input
                  type="number"
                  min="1"
                  value={moneyInputValue(payAmount, false)}
                  onChange={(e) => setPayAmount(String(toBaseMoney(e.target.value)))}
                  className="input-base"
                  placeholder={tx("0")}
                />
              </div>

              <button
                onClick={handlePayment}
                disabled={!payAmount}
                className="btn-primary w-full justify-center"
                style={{
                  background:
                    "var(--success)",
                  opacity:
                    !payAmount ? 0.5 : 1,
                  cursor: payAmount
                    ? "pointer"
                    : "not-allowed",
                }}
              >
                <CheckCircle size={15} />{tx("Tasdiqlash")}</button>

            </div>
          </div>
        </div>
      , modalRoot)}
    </div>
  );
}
