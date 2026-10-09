import { formatCardNumber } from "../data/directorCards";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { createPortal } from "react-dom";
import "./Sales.css";
import { useState } from "react";
import {
  Search,
  Download,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { readDebtPayments, readPosSales, withDebtBalance } from "../data/debtPayments";
import DateRangeFilter, { matchesDateRange } from "../components/DateRangeFilter";

import { formatCurrency } from "../data/currency";
const statusBadge = {
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
    bg: "var(--border-subtle)",
    color: "var(--text-muted)",
  },
};

export default function Sales({ onNavigate }) {
  useUILanguage();
  const [sales, setSales] = useState(() => {
    const payments = readDebtPayments();
    return [...readPosSales()].map((sale) => withDebtBalance(sale, payments));
  });

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [deleteSale, setDeleteSale] = useState(null);

  const [editSale, setEditSale] = useState(null);

  const openCustomerProfile = (sale) => {
    const name = sale.customer.trim();
    const sameName = (customer) =>
      customer.name.trim().toLowerCase() === name.toLowerCase();
    const customerSales = sales.filter((item) => sameName({ name: item.customer }));
    const debtAmount = customerSales
      .reduce((sum, item) => sum + Number(item.debtBalance || 0), 0);
    const saleCustomer = {
      name,
      phone: "—",
      region: "—",
      purchases: customerSales.length,
      spent: customerSales.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      debt: debtAmount,
      lastPurchase: sale.date,
      status: debtAmount > 0 ? "debtor" : "regular",
      sales: customerSales,
      selectedSaleId: sale.id,
      initialTab: Number(sale.debtBalance || 0) > 0 ? "debt" : "purchases",
    };
    onNavigate?.(`customer-sale-${encodeURIComponent(JSON.stringify(saleCustomer))}`);
  };

  /* ================= FILTER ================= */

  const filtered = sales.filter((sale) => {
    const searchText = search.toLowerCase();

    const matchSearch =
      sale.customer.toLowerCase().includes(searchText) ||
      sale.id.toLowerCase().includes(searchText);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "debt"
        ? Number(sale.debtBalance || 0) > 0
        : sale.status === statusFilter);

    return matchSearch && matchStatus && matchesDateRange(sale.createdAt || sale.date, dateFrom, dateTo);
  });

  /* ================= DELETE ================= */

  const handleDelete = () => {
    if (!deleteSale) return;

    setSales((prev) =>
      prev.filter((sale) => sale.id !== deleteSale.id)
    );

    setDeleteSale(null);
  };

  /* ================= EDIT ================= */

  const handleEditSave = () => {
    if (!editSale) return;

    setSales((prev) =>
      prev.map((sale) =>
        sale.id === editSale.id ? editSale : sale
      )
    );

    setEditSale(null);
  };

  /* ================= EXPORT ================= */

  const handleExport = () => {
    if (!filtered.length) return;

    const headers = [
      "Sotuv ID",
      "Mijoz",
      "Mahsulotlar soni",
      "Summa (so'm)",
      "To'lov turi",
      "Sana",
      "Holat",
    ];

    const rows = filtered.map((sale) => [
      sale.id,
      `"${sale.customer}"`,
      sale.products,
      formatCurrency(sale.amount),
      `"${tx(sale.payment)}"`,
      `"${tx(sale.date)}"`,
      `"${tx(statusBadge[sale.status]?.label || sale.status)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.map(value => tx(value)).join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

    const link = document.createElement("a");

    link.href = encodeURI(csvContent);

    link.download = `sotuvlar_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  /* ================= STATS ================= */

  const returns = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_returns") || "[]");
      return Array.isArray(saved) ? saved.filter((item) => item.status === "approved") : [];
    } catch { return []; }
  })();
  const adjustedSales = sales.map((sale) => {
    const returnedAmount = returns
      .filter((item) => String(item.saleId) === String(sale.id))
      .reduce((total, item) => total + Number(item.amount || 0), 0);
    return { ...sale, returnedAmount, netAmount: Math.max(0, Number(sale.amount || 0) - returnedAmount) };
  });
  const totalSalesAmount = adjustedSales.reduce((total, sale) => total + sale.netAmount, 0);
  const today = new Date().toDateString();
  const todaySalesAmount = adjustedSales
    .filter((sale) => {
      const date = new Date(sale.createdAt || sale.date);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today;
    })
    .reduce((total, sale) => total + sale.netAmount, 0);
  const totalReturnedAmount = returns.reduce((total, item) => total + Number(item.amount || 0), 0);

  const stats = [
    {
      label: "Jami sotuvlar",
      value: formatCurrency(totalSalesAmount),
      change: "0%",
      icon: DollarSign,
      color: "var(--brand)",
      bg: "var(--brand-light)",
    },

    {
      label: "Bugun",
      value: formatCurrency(todaySalesAmount),
      change: "0%",
      icon: TrendingUp,
      color: "var(--success)",
      bg: "var(--success-light)",
    },

    {
      label: "Buyurtmalar",
      value: `${sales.length} ta`,
      change: "0%",
      icon: ShoppingCart,
      color: "var(--violet)",
      bg: "var(--violet-light)",
    },

    {
      label: "Qaytarilgan",
      value: formatCurrency(totalReturnedAmount),
      change: "0%",
      icon: RefreshCw,
      color: "var(--warning)",
      bg: "var(--warning-light)",
    },
  ];

  return (
    <div className="space-y-6 fade-in">

      {/* ================= HEADER ================= */}

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Sotuvlar")}</h1>

          <p
            className="text-sm mt-1"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Barcha savdolar va tranzaksiyalar")}</p>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={handleExport}
            className="sales-header-btn"
          >
            <Download size={15} />{tx("Export")}</button>

          <button
            onClick={() => onNavigate("sales-new")}
            className="sales-new-btn"
          >{tx("+ Yangi sotuv")}</button>

        </div>
      </div>

      {/* ================= STATS ================= */}

      <div className="sales-stats-grid">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="sales-stat-card"
            >

              <div className="sales-stat-top">

                <div
                  className="sales-stat-icon"
                  style={{
                    background: stat.bg,
                  }}
                >
                  <Icon
                    size={17}
                    style={{
                      color: stat.color,
                    }}
                  />
                </div>

                <span
                  className="sales-stat-change"
                  style={{
                    color: stat.change.startsWith("+")
                      ? "var(--success)"
                      : "var(--danger)",
                  }}
                >
                  {tx(stat.change)}
                </span>

              </div>

              <div className="sales-stat-value">
                {tx(stat.value)}
              </div>

              <div className="sales-stat-label">
                {tx(stat.label)}
              </div>

            </div>
          );
        })}

      </div>

      {/* ================= TABLE ================= */}

      <div className="sales-table-box">

        {/* SEARCH */}

        <div className="sales-toolbar flex-wrap">

          <div className="sales-search">

            <Search
              size={15}
              style={{
                color: "var(--text-faint)",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={tx("Sotuv yoki mijoz qidirish...")}
            />

          </div>

          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

          <div className="sales-filters">

            {[
              ["all", "Barchasi"],
              ["paid", "To'landi"],
              ["debt", "Qarz"],
              ["partial", "Qisman"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  setStatusFilter(key)
                }
                className={
                  statusFilter === key
                    ? "sales-filter active"
                    : "sales-filter"
                }
              >
                {tx(label)}
              </button>
            ))}

          </div>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[950px]">

            <thead>
              <tr className="sales-table-head">

                {[
                  "Sotuv ID",
                  "Mijoz",
                  "Mahsulotlar",
                  "Summa",
                  "To'lov",
                  "Sana",
                  "Holat",
                  "Amallar",
                ].map((title) => (
                  <th key={title}>
                    {tx(title)}
                  </th>
                ))}

              </tr>
            </thead>

            <tbody>

              {filtered.map((sale) => {

                const status =
                  statusBadge[sale.status];

                return (
                  <tr
                    key={sale.id}
                    className="sales-table-row sales-table-row-link"
                    role="link"
                    tabIndex={0}
                    aria-label={tx(`${sale.customer} profilini ochish`)}
                    onClick={() => openCustomerProfile(sale)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openCustomerProfile(sale);
                      }
                    }}
                  >

                    <td className="sales-id">
                      {sale.id}
                    </td>

                    <td>
                      <div className="sales-customer">

                        <div className="sales-avatar">
                          {tx(sale.customer
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2))}
                        </div>

                        <span>
                          {sale.customer}
                        </span>

                      </div>
                    </td>

                    <td className="sales-muted">
                      {tx(sale.products)}{tx(" ta")}</td>

                    <td className="sales-amount">
                      {formatCurrency(sale.amount)}</td>

                    <td className="sales-muted">
                      {tx(sale.payment)}
                      {sale.receivingCard && <small style={{ display: "block" }}>{formatCardNumber(sale.receivingCard.number)}<br />{formatCurrency(sale.initialPaidAmount ?? sale.paidAmount ?? 0)}</small>}
                    </td>

                    <td className="sales-date">
                      {tx(sale.date)}
                    </td>

                    <td>
                      <span
                        className="sales-status"
                        style={{
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {tx(status.label)}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td>

                      <div className="sales-actions">

                        {/* EDIT */}

                        <button
                          type="button"
                          className="sales-action edit"
                          title={tx("Tahrirlash")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditSale({
                              ...sale,
                            });
                          }}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          className="sales-action delete"
                          title={tx("O'chirish")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteSale(sale);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="sales-empty"
                  >{tx("Sotuvlar topilmadi")}</td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

        {/* FOOTER */}

        <div className="sales-footer">

          <span>{tx("Jami ")}{tx(filtered.length)}{tx(" ta sotuv")}</span>

          <div className="sales-pagination">

            {[1, 2, 3, "...", 12].map(
              (page, index) => (
                <button
                  key={index}
                  className={
                    page === 1
                      ? "active"
                      : ""
                  }
                >
                  {tx(page)}
                </button>
              )
            )}

          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* DELETE MODAL */}
      {/* ================================================= */}

      {deleteSale && (

        createPortal(
        <div className="crm-content-modal">

          <div
            className="sales-delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              <AlertTriangle size={19} />
            </div>

            <button
              type="button"
              className="modal-x"
              onClick={() =>
                setDeleteSale(null)
              }
            >
              <X size={16} />
            </button>

            <h3>{tx("Sotuvni o'chirasizmi?")}</h3>

            <p>
              <b>{deleteSale.id}</b>{tx(" sotuvini o'chirishni tasdiqlaysizmi?")}</p>

            <div className="modal-buttons">

              <button
                type="button"
                className="modal-no"
                onClick={() =>
                  setDeleteSale(null)
                }
              >{tx("Yo'q")}</button>

              <button
                type="button"
                className="modal-yes"
                onClick={handleDelete}
              >{tx("Ha, o'chirish")}</button>

            </div>

          </div>

        </div>,
        document.getElementById("main-modal-root")
      )

      )}

      {/* ================================================= */}
      {/* EDIT MODAL */}
      {/* ================================================= */}

      {editSale && (

        createPortal(
        <div className="crm-content-modal">

          <div
            className="sales-edit-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="edit-modal-header">

              <div>
                <h3>{tx("Sotuvni tahrirlash")}</h3>

                <span>
                  {editSale.id}
                </span>
              </div>

              <button
                type="button"
                className="modal-x"
                onClick={() =>
                  setEditSale(null)
                }
              >
                <X size={16} />
              </button>

            </div>

            <div className="edit-fields">

              <div className="edit-field full">
                <label>{tx("Mijoz")}</label>

                <input
                  value={editSale.customer}
                  onChange={(e) =>
                    setEditSale({
                      ...editSale,
                      customer:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div className="edit-field">
                <label>{tx("Mahsulotlar")}</label>

                <input
                  type="number"
                  min="1"
                  value={editSale.products}
                  onChange={(e) =>
                    setEditSale({
                      ...editSale,
                      products:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                />
              </div>

              <div className="edit-field">
                <label>{tx("Summa")}</label>

                <input
                  type="number"
                  min="0"
                  value={editSale.amount}
                  onChange={(e) =>
                    setEditSale({
                      ...editSale,
                      amount:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                />
              </div>

              <div className="edit-field">
                <label>{tx("To'lov")}</label>

                <select
                  value={editSale.payment}
                  onChange={(e) =>
                    setEditSale({
                      ...editSale,
                      payment:
                        e.target.value,
                    })
                  }
                >
                  <option value="Naqd">{tx("Naqd")}</option>

                  <option value="Karta">{tx("Karta")}</option>

                  <option value="Payme">
                    Payme
                  </option>

                  <option value="Click">
                    Click
                  </option>

                  <option value="Qarz">{tx("Qarz")}</option>
                </select>
              </div>

              <div className="edit-field">
                <label>{tx("Holat")}</label>

                <select
                  value={editSale.status}
                  onChange={(e) =>
                    setEditSale({
                      ...editSale,
                      status:
                        e.target.value,
                    })
                  }
                >
                  <option value="paid">{tx("To'landi")}</option>

                  <option value="debt">{tx("Qarz")}</option>

                  <option value="partial">{tx("Qisman")}</option>

                  <option value="returned">{tx("Qaytarilgan")}</option>
                </select>
              </div>

            </div>

            <div className="edit-modal-footer">

              <button
                type="button"
                className="modal-no"
                onClick={() =>
                  setEditSale(null)
                }
              >{tx("Bekor qilish")}</button>

              <button
                type="button"
                className="modal-save"
                onClick={handleEditSave}
              >{tx("Saqlash")}</button>

            </div>

          </div>

        </div>,
        document.getElementById("main-modal-root")
      )

      )}

    </div>
  );
}
