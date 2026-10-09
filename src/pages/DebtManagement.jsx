import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './DebtManagement.css';
import { useState } from "react";
import {
  Search,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  X,
  Phone,
  Copy,
} from "lucide-react";
import { readDebtPayments, readPosSales, withDebtBalance } from "../data/debtPayments";
import { useToast } from "../context/ToastContext";
import DateRangeFilter, { matchesDateRange } from "../components/DateRangeFilter";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
const readBusinessList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const isToday = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
};

function PaymentModal({ debtor, onClose, onPay }) {
  useUILanguage();
  const [amount, setAmount] = useState(debtor.debt.toString());
  const [method, setMethod] = useState("naqd");
  const [note, setNote] = useState("");
  const presets = [
    debtor.debt,
    Math.round(debtor.debt * 0.5),
    Math.round(debtor.debt * 0.25),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="rounded-3xl p-6 w-full max-w-md slide-up"
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              className="font-display font-bold text-lg"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >{tx("To'lov qabul qilish")}</h2>
            <p
              className="text-sm mt-0.5"
              style={{
                color: "var(--text-muted)",
              }}
            >{tx("Qarzdorlik:")}{" "}
              <strong
                style={{
                  color: "var(--danger)",
                }}
              >
                {formatCurrency(debtor.debt)}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:opacity-70 transition-opacity"
            style={{
              color: "var(--text-faint)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Debtor info */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-5"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{
              background: "var(--brand)",
            }}
          >
            {tx(debtor.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2))}
          </div>
          <div>
            <div
              className="font-semibold text-sm"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {debtor.name}
            </div>
            <div
              className="text-xs"
              style={{
                color: "var(--text-muted)",
              }}
            >
              {debtor.phone}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{
                color: "var(--text-secondary)",
              }}
            >{tx("To'lov miqdori")}</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={moneyInputValue(amount, false)}
                onChange={(e) => setAmount(String(toBaseMoney(e.target.value)))}
                className="input-base pr-16"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--brand)",
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{
                  color: "var(--text-muted)",
                }}
              >{tx("so'm")}</span>
            </div>
            {/* Preset amounts */}
            <div className="flex items-center gap-2 mt-2">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(p.toString())}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background:
                      amount === p.toString()
                        ? "var(--brand-light)"
                        : "var(--surface-2)",
                    color:
                      amount === p.toString()
                        ? "var(--brand)"
                        : "var(--text-muted)",
                    border: `1px solid ${amount === p.toString() ? "var(--brand-border)" : "var(--border)"}`,
                  }}
                >
                  {tx(i === 0 ? "To'liq" : i === 1 ? "50%" : "25%")}
                  <br />
                  <span className="font-normal">{formatCurrency(p)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{
                color: "var(--text-secondary)",
              }}
            >{tx("To'lov usuli")}</label>
            <div className="grid grid-cols-4 gap-2">
              {["naqd", "karta", "click", "payme"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={{
                    background:
                      method === m ? "var(--brand)" : "var(--surface-2)",
                    color: method === m ? "white" : "var(--text-muted)",
                    border: `1px solid ${method === m ? "var(--brand)" : "var(--border)"}`,
                  }}
                >
                  {tx(m === "naqd"
                    ? "💵 Naqd"
                    : m === "karta"
                      ? "💳 Karta"
                      : m === "click"
                        ? "🔵 Click"
                        : "🟢 Payme")}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{
                color: "var(--text-secondary)",
              }}
            >{tx("Izoh (ixtiyoriy)")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tx("Qo'shimcha izoh...")}
              rows={2}
              className="input-base resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">{tx("Bekor qilish")}</button>
          <button
            onClick={() => onPay(Number(amount), method)}
            className="btn-primary flex-1 justify-center"
            style={{
              background: "var(--success)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
            }}
          >
            <CheckCircle size={15} />{tx("To'lovni tasdiqlash")}</button>
        </div>
      </div>
    </div>
  );
}

export default function DebtManagement({ onNavigate }) {
  useUILanguage();
  const { success } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(null);
  const [paid, setPaid] = useState({});

  const debtPayments = readDebtPayments();
  const approvedReturns = readBusinessList("crm_returns").filter((item) => item.status === "approved");
  const returnedBySale = approvedReturns.reduce((totals, item) => {
    const id = String(item.saleId || "");
    totals[id] = (totals[id] || 0) + Number(item.amount || 0);
    return totals;
  }, {});
  const posDebtSales = readPosSales()
    .map((sale) => {
      const balanced = withDebtBalance(sale, debtPayments);
      const returnedAmount = Number(returnedBySale[String(balanced.id)] || 0);
      return {
        ...balanced,
        amount: Math.max(0, Number(balanced.amount || 0) - returnedAmount),
        debtBalance: Math.max(0, Number(balanced.debtBalance || 0) - returnedAmount),
        paidAmount: Math.min(Math.max(0, Number(balanced.amount || 0) - returnedAmount), Number(balanced.paidAmount || 0)),
      };
    })
    .filter((sale) => Number(sale.debtBalance || 0) > 0);
  const posDebtGroups = Object.values(posDebtSales.reduce((groups, sale) => {
    const key = String(sale.customer || sale.customerName || "Noma'lum mijoz").trim().toLowerCase();
    const dueDateValue = sale.debtDueDate || "";
    const dueDate = dueDateValue ? new Date(`${dueDateValue}T23:59:59`) : null;
    const today = new Date();
    const overdue = !!dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < today;
    const daysPast = overdue ? Math.max(1, Math.ceil((today - dueDate) / 86400000)) : 0;
    if (!groups[key]) {
      groups[key] = {
        id: `pos-${sale.customerId || sale.id}`,
        customerId: sale.customerId,
        name: sale.customer || sale.customerName || "Noma'lum mijoz",
        phone: sale.customerPhone || "Ko'rsatilmagan",
        region: sale.deliveryAddress || "Ko'rsatilmagan",
        purchases: 0,
        spent: 0,
        debt: 0,
        paid: 0,
        dueDate: dueDateValue || "Ko'rsatilmagan",
        dueDateValue,
        overdue: false,
        daysPast: 0,
        lastPurchase: sale.date,
        status: "debtor",
        isPosDebt: true,
        sales: [],
      };
    }
    const group = groups[key];
    group.purchases += 1;
    group.spent += Number(sale.amount || 0);
    group.debt += Number(sale.debtBalance || 0);
    group.paid += Number(sale.paidAmount || 0);
    group.sales.push(sale);
    if (overdue) {
      group.overdue = true;
      group.daysPast = Math.max(group.daysPast, daysPast);
    }
    if (dueDateValue && (!group.dueDateValue || dueDateValue < group.dueDateValue)) {
      group.dueDateValue = dueDateValue;
      group.dueDate = dueDateValue;
    }
    return groups;
  }, {}));
  const allDebts = posDebtGroups;

  const openDebtor = (debtor) => {
    if (!debtor.isPosDebt) {
      onNavigate?.(`debt-${debtor.id}`);
      return;
    }
    const saleCustomer = {
      name: debtor.name,
      phone: debtor.phone,
      region: debtor.region,
      purchases: debtor.purchases,
      spent: debtor.spent,
      debt: debtor.debt,
      lastPurchase: debtor.lastPurchase,
      status: "debtor",
      sales: debtor.sales,
      selectedSaleId: debtor.sales[0]?.id,
      initialTab: "debt",
    };
    onNavigate?.(`customer-sale-${encodeURIComponent(JSON.stringify(saleCustomer))}`);
  };

  const handlePay = (amount, method) => {
    if (!selected) return;
    setPaid((prev) => ({
      ...prev,
      [selected.id]: (prev[selected.id] || 0) + amount,
    }));
    setSelected(null);
    success(
      "To'lov qabul qilindi",
      `${selected.name} — ${formatCurrency(amount)} (${method})`,
    );
  };

  const filtered = allDebts.filter((d) => {
    const remaining = d.debt - (paid[d.id] || 0);
    if (remaining <= 0) return false;
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    const matchFilter =
      filter === "all" ? true : filter === "overdue" ? d.overdue : !d.overdue;
    return matchSearch && matchFilter && matchesDateRange(d.lastPurchase, dateFrom, dateTo);
  });

  const totalDebt = allDebts.reduce(
    (s, d) => s + d.debt - (paid[d.id] || 0),
    0,
  );
  const totalPaid = debtPayments
    .filter((payment) => isToday(payment.createdAt || payment.date))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    + readPosSales()
      .filter((sale) => isToday(sale.createdAt || sale.date))
      .reduce((sum, sale) => sum + Number(sale.initialPaidAmount || 0), 0)
    + Object.values(paid).reduce((sum, value) => sum + Number(value || 0), 0);
  const overdueAmt = allDebts
    .filter((d) => d.overdue)
    .reduce((s, d) => s + d.debt - (paid[d.id] || 0), 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display font-bold text-2xl"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Qarzdorlik boshqaruvi")}</h1>
          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Mijozlar qarzdorligi va to'lovlar nazorati")}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="debt-stats grid grid-cols-4 gap-4">
        {[
          {
            label: "Jami qarzdorlik",
            value: totalDebt,
            icon: CreditCard,
            color: "var(--danger)",
            bg: "var(--danger-light)",
            fmt: true,
          },
          {
            label: "Bugun to'landi",
            value: totalPaid,
            icon: CheckCircle,
            color: "var(--success)",
            bg: "var(--success-light)",
            fmt: true,
          },
          {
            label: "Muddati o'tgan",
            value: overdueAmt,
            icon: AlertTriangle,
            color: "var(--warning)",
            bg: "var(--warning-light)",
            fmt: true,
          },
          {
            label: "Qarzdor mijozlar",
            value: filtered.length,
            icon: Users,
            color: "var(--brand)",
            bg: "var(--brand-light)",
            fmt: false,
          },
        ].map((k) => (
          <div key={k.label} className="debt-stat-card card p-4">
            <div className="flex items-center justify-between mb-3">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  background: k.bg,
                }}
              >
                <k.icon
                  size={16}
                  style={{
                    color: k.color,
                  }}
                />
              </div>
            </div>
            <div
              className="text-xl font-display font-bold count-up"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(k.fmt ? (k.value / 1000000).toFixed(2) + " mln" : k.value)}
            </div>
            <div
              className="text-xs mt-1"
              style={{
                color: "var(--text-faint)",
              }}
            >
              {tx(k.label)}
            </div>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {allDebts.some((d) => d.overdue) && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "var(--warning-light)",
            border: "1px solid var(--warning)",
            borderColor: "var(--warning-border, var(--warning))",
          }}
        >
          <AlertTriangle
            size={18}
            style={{
              color: "var(--warning)",
            }}
          />
          <div>
            <span
              className="text-sm font-semibold"
              style={{
                color: "var(--warning-strong, var(--warning))",
              }}
            >
              {
                tx(allDebts.filter(
                  (d) => d.overdue && d.debt - (paid[d.id] || 0) > 0,
                ).length)
              }{" "}{tx("ta mijozning to'lov muddati o'tgan.")}</span>
            <span
              className="text-sm ml-1"
              style={{
                color: "var(--warning-strong, var(--warning))",
              }}
            >{tx("Ular bilan bog'laning.")}</span>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="debt-list-card card-flat overflow-hidden rounded-2xl">
        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-wrap"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1 min-w-48"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              maxWidth: 300,
            }}
          >
            <Search
              size={14}
              style={{
                color: "var(--text-faint)",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tx("Ism yoki telefon...")}
              className="bg-transparent outline-none text-sm flex-1"
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            {[
              {
                key: "all",
                label: "Barchasi",
              },
              {
                key: "overdue",
                label: "Muddati o'tgan",
              },
              {
                key: "upcoming",
                label: "Kelayotgan",
              },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background:
                    filter === f.key ? "var(--surface)" : "transparent",
                  color:
                    filter === f.key
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  boxShadow: filter === f.key ? "var(--shadow-xs)" : "none",
                }}
              >
                {tx(f.label)}
              </button>
            ))}
          </div>

          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

          <span
            className="text-xs ml-auto"
            style={{
              color: "var(--text-faint)",
            }}
          >
            {tx(filtered.length)}{tx(" ta natija")}</span>
        </div>

        {/* Table */}
        <div className="debt-table-scroll overflow-x-auto" role="region" aria-label={tx("Qarzdor mijozlar jadvali")} tabIndex="0">
          <table className="debt-table w-full border-collapse">
            <thead>
              <tr
                style={{
                  background: "var(--table-stripe)",
                }}
              >
                {[
                  "Mijoz",
                  "Telefon",
                  "Jami qarz",
                  "To'langan",
                  "Qolgan",
                  "Muddat",
                  "Holat",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold whitespace-nowrap"
                    style={{
                      color: "var(--text-faint)",
                    }}
                  >
                    {tx(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                        style={{
                          background: "var(--success-light)",
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
                          color: "var(--text-primary)",
                        }}
                      >{tx("Hamma to'lovlar qabul qilingan!")}</p>
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--text-muted)",
                        }}
                      >{tx("Hozircha faol qarzdorlik yo'q")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const remaining = d.debt - (paid[d.id] || 0);
                  const paidAmt = d.paid + (paid[d.id] || 0);
                  const progress = Math.min(
                    (paidAmt / (d.debt + d.paid)) * 100,
                    100,
                  );
                  return (
                    <tr
                      onClick={() => openDebtor(d)}
                      key={d.id}
                      className="border-t table-row-hover row-anim"
                      style={{
                        cursor: "pointer",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      {/* Name */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                              background: d.overdue
                                ? "var(--danger)"
                                : "var(--brand)",
                            }}
                          >
                            {tx(d.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2))}
                          </div>
                          <div>
                            <div
                              className="text-sm font-semibold"
                              style={{
                                color: "var(--text-primary)",
                              }}
                            >
                              {d.name}
                            </div>
                            <div
                              className="text-xs mt-0.5"
                              style={{
                                color: "var(--text-faint)",
                              }}
                            >
                              {tx(d.region)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 whitespace-nowrap" style={{ minWidth: "210px" }}>
                        <div className="flex items-center gap-2 flex-nowrap">
                          <span
                            className="text-sm font-mono shrink-0"
                            style={{
                              color: "var(--text-secondary)",
                            }}
                          >
                            {d.phone}
                          </span>
                          <a
                            href={"tel:" + d.phone.replace(/\s/g, "")}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity flex items-center justify-center shrink-0"
                            title={tx("Qo'ng'iroq qilish")}
                            style={{ background: "var(--surface-2)" }}
                          >
                            <Phone size={13} style={{ color: "var(--brand)" }} />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard &&
                                navigator.clipboard.writeText(d.phone);
                            }}
                            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity flex items-center justify-center shrink-0"
                            title={tx("Nusxalash")}
                            style={{ background: "var(--surface-2)" }}
                          >
                            <Copy
                              size={13}
                              style={{
                                color: "var(--text-faint)",
                              }}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Total debt */}
                      <td
                        className="px-5 py-4 text-sm font-semibold whitespace-nowrap"
                        style={{
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(d.debt + d.paid)}</td>

                      {/* Paid */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{
                              color: "var(--success)",
                            }}
                          >
                            {formatCurrency(paidAmt)}</div>
                          <div
                            className="w-20 h-1 rounded-full mt-1.5 overflow-hidden"
                            style={{
                              background: "var(--border)",
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                background: "var(--success)",
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td
                        className="px-5 py-4 text-sm font-bold whitespace-nowrap"
                        style={{
                          color: "var(--danger)",
                        }}
                      >
                        {formatCurrency(remaining)}</td>

                      {/* Due date - Yonma-yon va bir qatorda */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock
                            size={12}
                            className="shrink-0"
                            style={{
                              color: d.overdue
                                ? "var(--danger)"
                                : "var(--text-faint)",
                            }}
                          />
                          <span
                            className="text-xs whitespace-nowrap"
                            style={{
                              color: d.overdue
                                ? "var(--danger)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {tx(d.dueDate)}
                            {d.overdue && (
                              <span className="ml-1 font-semibold whitespace-nowrap">
                                ({tx(d.daysPast)}{tx("k kechikdi)")}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap"
                          style={{
                            background: d.overdue
                              ? "var(--danger-light)"
                              : "var(--warning-light)",
                            color: d.overdue
                              ? "var(--danger)"
                              : "var(--warning)",
                          }}
                        >
                          {tx(d.overdue ? "Muddati o'tgan" : "Kutilmoqda")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <PaymentModal
          debtor={selected}
          onClose={() => setSelected(null)}
          onPay={handlePay}
        />
      )}
    </div>
  );
}
