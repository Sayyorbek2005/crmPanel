import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Finance.css';
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  // Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  X,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { expenseCategories as initialCategories } from "../data/mockData";
import { readFinanceOperations, saveFinanceOperations } from "../data/financeStore";
import { readDebtPayments, readPosSales, withDebtBalance } from "../data/debtPayments";
import { downloadCsv } from "../utils/csv";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
const readBusinessList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const readSupplierOrders = () => {
  try {
    return Object.keys(localStorage).filter((key) => key.startsWith("crm_supplier_orders_")).flatMap((key) => readBusinessList(key));
  } catch { return []; }
};

const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const fmt = (n) => (n / 1000000).toFixed(1) + " mln";

const CustomBarTooltip = ({ active, payload, label }) => {
  useUILanguage();
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        background: "var(--text-primary)",
        color: "var(--surface-2)",
        minWidth: 130,
      }}
    >
      <div
        className="font-semibold mb-2"
        style={{ color: "var(--text-faint)" }}
      >
        {tx(label)}
      </div>
      {payload.map((e) => (
        <div key={e.name} className="flex justify-between gap-4">
          <span style={{ color: e.color }}>{tx(e.name)}</span>
          <span className="font-semibold">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Finance() {
  useUILanguage();
  const modalRoot = document.getElementById("main-modal-root");
  const modalDialogRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "income" | "expense"
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("expense"); // "income" yoki "expense"
  const [editingIndex, setEditingIndex] = useState(null);

  // O'chirish modalining holati
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, type: null });

  useEffect(() => {
    if (!showModal && !deleteModal.isOpen) return;

    const closeOnOutsideClick = (event) => {
      if (modalDialogRef.current?.contains(event.target)) return;
      setShowModal(false);
      setDeleteModal({ isOpen: false, index: null, type: null });
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showModal, deleteModal.isOpen]);

  // Kirimlar ro'yxati
  const [incomes, setIncomes] = useState(() => readFinanceOperations().incomes);

  // Xarajatlar ro'yxati
  const [expenses, setExpenses] = useState(() => readFinanceOperations().expenses);
  const [, refreshLiveData] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const saved = readFinanceOperations();
      setIncomes(saved.incomes); setExpenses(saved.expenses); refreshLiveData((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 1500);
    window.addEventListener("storage", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", refresh); };
  }, []);

  useEffect(() => {
    saveFinanceOperations(incomes, expenses);
  }, [incomes, expenses]);

  // Modal ma'lumotlari
  const [formData, setFormData] = useState({
    category: "Savdo",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    employee: "Admin",
    description: "",
  });

  const payments = readDebtPayments(), supplierOrders = readSupplierOrders(), suppliers = readBusinessList("crm_suppliers");
  const sales = readPosSales().map((sale) => withDebtBalance(sale, payments));
  const approvedReturns = readBusinessList("crm_returns").filter((item) => item.status === "approved");
  const returnAmountBySale = approvedReturns.reduce((totals, item) => {
    const id = String(item.saleId || "");
    totals[id] = (totals[id] || 0) + Number(item.amount || 0);
    return totals;
  }, {});
  const automaticIncomes = sales.filter((sale) => Number(sale.initialPaidAmount || 0) > 0).map((sale) => ({
    id: `sale-${sale.id}`, category: "Savdo", amount: Number(sale.initialPaidAmount || 0),
    date: isoDate(sale.createdAt || sale.date), employee: "Tizim", description: `${sale.customer} — savdo to'lovi`, automatic: true, type: "income",
  })).concat(payments.filter((payment) => Number(payment.amount || 0) > 0).map((payment) => ({
    id: `payment-${payment.id || `${payment.saleId}-${payment.createdAt}`}`, category: "Qarz to'lovi", amount: Number(payment.amount || 0),
    date: isoDate(payment.createdAt || payment.date), employee: "Tizim", description: `${payment.customerName || "Mijoz"} — qarz to'lovi`, automatic: true, type: "income",
  })));
  const automaticExpenses = approvedReturns.filter((item) => Number(item.amount || 0) > 0).map((item) => ({
    id: `return-${item.id}`, category: "Qaytarish", amount: Number(item.amount || 0),
    date: isoDate(item.createdAt || item.date), employee: "Tizim", description: `${item.productName || item.product || "Mahsulot"} — qaytarildi`, automatic: true, type: "expense",
  })).concat(supplierOrders.map((order) => {
    const total = Number(order.amount || 0), remaining = Math.max(0, Number(order.remaining ?? (order.status === "debt" ? total : 0))), paid = order.status === "paid" ? total : Math.max(0, total - remaining);
    const supplier = suppliers.find((item) => String(item.id) === String(order.supplierId));
    return { id: `purchase-${order.supplierId}-${order.id}`, category: "Mahsulot xaridi", amount: paid, date: isoDate(order.date), employee: "Tizim", description: `${supplier?.name || "Ta'minotchi"} — mahsulot xaridi`, automatic: true, type: "expense" };
  }).filter((item) => item.amount > 0));
  const allIncomes = [...automaticIncomes, ...incomes.map((item, index) => ({ ...item, id: `income-${index}`, type: "income" }))];
  const allExpenses = [...automaticExpenses, ...expenses.map((item, index) => ({ ...item, id: `expense-${index}`, type: "expense" }))];
  const totalIncomeValue = allIncomes.reduce((total, item) => total + Number(item.amount || 0), 0);
  const totalExpenseValue = allExpenses.reduce((total, item) => total + Number(item.amount || 0), 0);
  const totalDebtValue = sales.reduce((total, sale) => total + Math.max(0, Number(sale.debtBalance || 0) - Number(returnAmountBySale[String(sale.id)] || 0)), 0);
  const monthlyData = (() => {
    const grouped = {};
    [...allIncomes, ...allExpenses].forEach((item) => {
      const date = item.date || isoDate();
      if (!grouped[date]) grouped[date] = { date, revenue: 0, profit: 0, expenses: 0 };
      if (item.type === "income") grouped[date].revenue += Number(item.amount || 0);
      else grouped[date].expenses += Number(item.amount || 0);
    });
    return Object.values(grouped).map((item) => ({ ...item, profit: item.revenue - item.expenses })).sort((a, b) => a.date.localeCompare(b.date));
  })();
  const currentExpenseCategories = (() => {
    const colors = new Map(initialCategories.map((item) => [item.name, item.color]));
    return Object.values(allExpenses.reduce((groups, item, index) => {
      if (!groups[item.category]) groups[item.category] = { name: item.category, value: 0, color: colors.get(item.category) || ["#f59e0b", "#8b5cf6", "#06b6d4"][index % 3] };
      groups[item.category].value += Number(item.amount || 0);
      return groups;
    }, {}));
  })();
  const monthKey = (offset = 0) => { const date = new Date(); date.setMonth(date.getMonth() + offset); return date.toISOString().slice(0, 7); };
  const monthTotal = (items, key) => items.filter((item) => String(item.date || "").startsWith(key)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const percentage = (current, previous) => previous ? `${current >= previous ? "+" : ""}${Math.round(((current - previous) / previous) * 100)}%` : current ? "+100%" : "0%";
  const currentIncome = monthTotal(allIncomes, monthKey()), previousIncome = monthTotal(allIncomes, monthKey(-1));
  const currentExpense = monthTotal(allExpenses, monthKey()), previousExpense = monthTotal(allExpenses, monthKey(-1));

  const kpis = [
    {
      label: "Jami kirim (Daromad)",
      value: formatCurrency(totalIncomeValue),
      change: percentage(currentIncome, previousIncome),
      icon: TrendingUp,
      color: "var(--brand)",
      bg: "var(--brand-light)",
    },
    {
      label: "Jami chiqim (Xarajat)",
      value: formatCurrency(totalExpenseValue),
      change: percentage(currentExpense, previousExpense),
      icon: TrendingDown,
      color: "var(--danger)",
      bg: "var(--danger-light)",
    },
    {
      label: "Sof foyda",
      value: formatCurrency(totalIncomeValue - totalExpenseValue),
      change: percentage(currentIncome - currentExpense, previousIncome - previousExpense),
      icon: DollarSign,
      color: "var(--success)",
      bg: "var(--success-light)",
    },
    {
      label: "Jami qarzdorlik",
      value: formatCurrency(totalDebtValue),
      change: "",
      icon: CreditCard,
      color: "var(--warning)",
      bg: "var(--warning-light)",
    },
  ];

  // CSV yuklash
  const handleExportCSV = () => {
    const headers = ["Turi", "Kategoriya", "Summa (so'm)", "Sana", "Xodim", "Tavsif"].map(tx);
    const rows = [
      ...allIncomes.map((item) => [tx("Kirim"), tx(item.category), formatCurrency(item.amount), item.date, item.employee, tx(item.description)]),
      ...allExpenses.map((item) => [tx("Chiqim"), tx(item.category), formatCurrency(item.amount), item.date, item.employee, tx(item.description)]),
    ];
    downloadCsv([headers, ...rows], `moliya_hisobot_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleOpenEditModal = (type, index, item) => {
    setModalType(type);
    setEditingIndex(index);
    setFormData({
      category: item.category,
      amount: item.amount,
      date: item.date,
      employee: item.employee,
      description: item.description,
    });
    setShowModal(true);
  };

  const handleOpenDeleteModal = (type, index) => {
    setDeleteModal({ isOpen: true, index, type });
  };

  const confirmDelete = () => {
    if (deleteModal.index !== null) {
      if (deleteModal.type === "income") {
        setIncomes(incomes.filter((_, i) => i !== deleteModal.index));
      } else {
        setExpenses(expenses.filter((_, i) => i !== deleteModal.index));
      }
    }
    setDeleteModal({ isOpen: false, index: null, type: null });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;

    const newItemData = {
      category: formData.category,
      amount: Number(formData.amount),
      date: formData.date,
      employee: formData.employee,
      description: formData.description || "Izohsiz",
    };

    if (modalType === "income") {
      if (editingIndex !== null) {
        const updated = [...incomes];
        updated[editingIndex] = newItemData;
        setIncomes(updated);
      } else {
        setIncomes([newItemData, ...incomes]);
      }
    } else {
      if (editingIndex !== null) {
        const updated = [...expenses];
        updated[editingIndex] = newItemData;
        setExpenses(updated);
      } else {
        setExpenses([newItemData, ...expenses]);
      }
    }

    setShowModal(false);
  };

  // Jadval uchun ma'lumotlarni birlashtirish yoki saralash
  const filteredTableData = (() => {
    const incs = allIncomes;
    const exps = allExpenses;
    
    let combined = [];
    if (activeTab === "all") combined = [...incs, ...exps];
    if (activeTab === "income") combined = incs;
    if (activeTab === "expense") combined = exps;

    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  })();

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Sarlavha va Tugmalar */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Moliya")}</h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >{tx("Kirim, chiqim va moliyaviy ko'rsatkichlar boshqaruvi")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Download size={14} />{tx(" Export")}</button>
        </div>
      </div>

      {/* KPI Kartochkalar */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl p-5 transition-card flex flex-col justify-between"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              minHeight: "135px",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: k.bg }}
              >
                <k.icon size={18} style={{ color: k.color }} />
              </div>
              <span
                className="text-xs font-semibold"
                style={{
                  color: k.change.startsWith("+") ? "var(--success)" : k.change.startsWith("-") ? "var(--danger)" : "var(--text-faint)",
                }}
              >
                {tx(k.change)}
              </span>
            </div>

            <div className="mt-auto pt-3">
              <div
                className="text-base sm:text-lg font-display font-bold leading-tight"
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  color: "var(--text-primary)",
                  wordBreak: "break-word",
                }}
              >
                {k.value}</div>
              <div
                className="text-xs mt-1 font-medium"
                style={{ color: "var(--text-faint)" }}
              >
                {tx(k.label)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grafiklar bo'limi */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daromad va xarajat bar chart */}
        <div
          className="col-span-2 rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}
        >
          <h2
            className="font-display font-semibold text-base mb-4"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Oylik moliyaviy ko'rsatkichlar")}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={monthlyData}
              margin={{ top: 15, right: 10, bottom: 0, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis tickFormatter={(value) => tx(value)}
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-faint)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: "var(--text-faint)" }}
                axisLine={false}
                tickLine={false}
                width={65}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="revenue"
                name={tx("Daromad")}
                fill="var(--brand)"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Bar
                dataKey="profit"
                name={tx("Foyda")}
                fill="var(--success)"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Bar
                dataKey="expenses"
                name={tx("Xarajatlar")}
                fill="var(--warning)"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Xarajatlar tarkibi */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}
        >
          <h2
            className="font-display font-semibold text-base mb-4"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Xarajatlar tarkibi")}</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={currentExpenseCategories}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                paddingAngle={3}
              >
                {currentExpenseCategories.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [formatCurrency(Number(v)), tx(name)]} labelFormatter={(value) => tx(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {currentExpenseCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: cat.color }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tx(cat.name)}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tx(fmt(cat.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operatsiyalar jadvali (Kirim va Chiqimlar) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            className="font-display font-semibold text-base"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Kirim va Chiqim operatsiyalari")}</h2>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "all" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
              style={{ cursor: "pointer" }}
            >{tx("Barchasi")}</button>
            <button
              onClick={() => setActiveTab("income")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "income" ? "bg-white shadow-sm text-green-600" : "text-gray-600"}`}
              style={{ cursor: "pointer" }}
            >{tx("Kirimlar")}</button>
            <button
              onClick={() => setActiveTab("expense")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "expense" ? "bg-white shadow-sm text-red-600" : "text-gray-600"}`}
              style={{ cursor: "pointer" }}
            >{tx("Chiqimlar")}</button>
          </div>
        </div>
        <div className="finance-operations-scroll" role="region" aria-label={tx("Kirim va chiqim operatsiyalari jadvali")} tabIndex="0">
        <table className="finance-operations-table w-full text-left border-collapse">
          <thead>
            <tr style={{ background: "var(--table-stripe)" }}>
              {["Turi", "Kategoriya", "Summa", "Sana", "Xodim", "Tavsif", "Amallar"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-xs font-semibold"
                  style={{ color: "var(--text-faint)" }}
                >
                  {tx(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTableData.map((item, i) => {
              const isIncome = item.type === "income";
              const cat = initialCategories.find((c) => c.name === item.category);
              return (
                <tr
                  key={i}
                  className="border-t hover:bg-blue-50/20 transition-colors"
                  style={{
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: isIncome ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: isIncome ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {isIncome ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {tx(isIncome ? "Kirim" : "Chiqim")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: isIncome ? "var(--success)" : (cat?.color || "var(--brand)"),
                        }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tx(item.category)}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm font-semibold"
                    style={{ color: isIncome ? "var(--success)" : "var(--danger)" }}
                  >
                    {tx(isIncome ? "+" : "-")}{formatCurrency(Number(item.amount))}</td>
                  <td
                    className="px-5 py-3.5 text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {tx(item.date)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.employee}
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tx(item.description)}
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      {!item.automatic && <button
                        onClick={() => handleOpenEditModal(item.type, isIncome ? incomes.indexOf(item) : expenses.indexOf(item), item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs font-medium"
                        style={{
                          color: "var(--brand)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                        title={tx("Tahrirlash")}
                      >
                        <Pencil size={13} />{tx(" Edit")}</button>}
                      {!item.automatic && <button
                        onClick={() => handleOpenDeleteModal(item.type, isIncome ? incomes.indexOf(item) : expenses.indexOf(item))}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-medium"
                        style={{
                          color: "var(--danger)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          cursor: "pointer",
                        }}
                        title={tx("O'chirish")}
                      >
                        <Trash2 size={13} />
                      </button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Qo'shish / Tahrirlash modali */}
      {showModal && modalRoot && createPortal(
        <div
          className="crm-content-modal"
        >
          <div
            ref={modalDialogRef}
            className="rounded-3xl p-6 w-full max-w-md slide-up"
            style={{
              background: "var(--surface)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.2)",
              maxHeight: "100%",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="font-display font-bold text-lg"
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                {tx(editingIndex !== null
                  ? (modalType === "income" ? "Kirimni tahrirlash" : "Xarajatni tahrirlash")
                  : (modalType === "income" ? "Kirim (daromad) qo'shish" : "Xarajat qo'shish"))}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                style={{ cursor: "pointer" }}
              >
                <X size={18} style={{ color: "var(--text-faint)" }} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >{tx("Kategoriya")}</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {modalType === "income" ? (
                    <>
                      <option value="Savdo">{tx("Savdo")}</option>
                      <option value="Buyurtmalar">{tx("Buyurtmalar")}</option>
                      <option value="Xizmatlar">{tx("Xizmatlar")}</option>
                      <option value="Boshqa daromad">{tx("Boshqa daromad")}</option>
                    </>
                  ) : (
                    <>
                      {initialCategories.map((c) => (
                        <option key={c.name} value={c.name}>
                          {tx(c.name)}
                        </option>
                      ))}
                      <option value="Inventar">{tx("Inventar")}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >{tx("Summa (so'm)")}</label>
                <input
                  type="number"
                  required
                  placeholder={tx("Miqdorni kiriting")}
                  value={moneyInputValue(formData.amount, false)}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: String(toBaseMoney(e.target.value)) })
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >{tx("Sana")}</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >{tx("Xodim")}</label>
                <select
                  value={formData.employee}
                  onChange={(e) =>
                    setFormData({ ...formData, employee: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {["Admin", "Barno T.", "Jasur N.", "Kamola Y."].map((o) => (
                    <option key={o} value={o}>
                      {tx(o)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >{tx("Tavsif")}</label>
                <textarea
                  rows={2}
                  placeholder={tx("Qo'shimcha ma'lumot...")}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >{tx("Bekor qilish")}</button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
                  style={{
                    background: modalType === "income" ? "var(--success)" : "var(--danger)",
                    cursor: "pointer",
                  }}
                >{tx("Saqlash")}</button>
              </div>
            </form>
          </div>
        </div>
      , modalRoot)}

      {/* O'chirishni tasdiqlash modali */}
      {deleteModal.isOpen && modalRoot && createPortal(
        <div
          className="crm-content-modal"
          onClick={() => setDeleteModal({ isOpen: false, index: null, type: null })}
        >
          <div
            ref={modalDialogRef}
            className="rounded-3xl p-6 w-full max-w-sm slide-up text-center"
            style={{
              background: "var(--surface)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.2)",
              maxHeight: "100%",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                color: "var(--danger)",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2
              className="font-display font-bold text-lg mb-2"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >{tx("Operatsiyani o'chirish")}</h2>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--text-muted)" }}
            >{tx("Haqiqatan ham ushbu yozuvni o'chirib tashlamoqchimisiz?")}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, index: null, type: null })}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  background: "var(--surface)",
                  cursor: "pointer",
                }}
              >{tx("Yo'q")}</button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity"
                style={{
                  background: "var(--danger)",
                  cursor: "pointer",
                }}
              >{tx("Ha, o'chirish")}</button>
            </div>
          </div>
        </div>
      , modalRoot)}
    </div>
  );
}
