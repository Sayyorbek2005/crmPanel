import { useState } from "react";

import { statusVisual, stockVisual } from "./dashboardHelpers";
import { KpiCard, CustomTooltip } from "./DashboardWidgets";
import { translateText as tx } from "../locales/translateText";
import { useLanguage } from "../context/LanguageContext";

import "./Dashboard.css";

import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Plus,
  Download,
  Boxes,
  Wallet,
  HandCoins,
} from "lucide-react";

import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ComposedChart,
} from "recharts";

import {
  readDebtPayments,
  readPosSales,
  withDebtBalance,
} from "../data/debtPayments";

import { readStockProducts, stockAlerts } from "../data/stockStore";
import { formatCurrency } from "../data/currency";

function readBusinessList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function Dashboard({ onNavigate }) {
  const { t } = useLanguage();

  const [range, setRange] = useState("7d");

  const [activeCard, setActiveCard] = useState(() => {
    try {
      return sessionStorage.getItem("dashboardActiveCard") || null;
    } catch {
      return null;
    }
  });

  const dashboardSuppliers = readBusinessList("crm_suppliers");
  const dashboardReturns = readBusinessList("crm_returns");

  const productCosts = new Map(
    readBusinessList("crm_products").map((product) => [
      String(product.id),
      Number(product.cost || 0),
    ])
  );

  const lowStockItems = stockAlerts(readStockProducts());
  const payments = readDebtPayments();

  const liveSales = readPosSales()
    .map((sale) => withDebtBalance(sale, payments))
    .map((sale) => {
      const returnedItems = dashboardReturns.filter(
        (item) =>
          item.status === "approved" &&
          String(item.saleId) === String(sale.id)
      );

      const returnedAmount = returnedItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      const soldCost = sale.items?.length
        ? sale.items.reduce(
            (sum, item) =>
              sum +
              Number(item.qty || 0) *
                Number(productCosts.get(String(item.id)) || 0),
            0
          )
        : (sale.productIds || []).reduce(
            (sum, productId) =>
              sum + Number(productCosts.get(String(productId)) || 0),
            0
          );

      const returnedCost = returnedItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 1) *
            Number(productCosts.get(String(item.productId)) || 0),
        0
      );

      return {
        ...sale,
        returnedAmount,
        netAmount: Math.max(
          0,
          Number(sale.amount || 0) - returnedAmount
        ),
        netDebt: Math.max(
          0,
          Number(sale.debtBalance || 0) - returnedAmount
        ),
        netCost: Math.max(0, soldCost - returnedCost),
      };
    });

  const allDashboardSales = liveSales;
  const dashboardRecentSales = allDashboardSales.slice(0, 6);
  const today = new Date().toDateString();

  const isToday = (sale) => {
    const date = new Date(sale.createdAt || sale.date);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toDateString() === today
    );
  };

  const todaySales = liveSales
    .filter(isToday)
    .reduce((sum, sale) => sum + Number(sale.netAmount || 0), 0);

  const todayProfit = liveSales
    .filter(isToday)
    .reduce(
      (sum, sale) =>
        sum +
        Math.max(
          0,
          Number(sale.netAmount || 0) - Number(sale.netCost || 0)
        ),
      0
    );

  const customerDebt = liveSales.reduce(
    (sum, sale) => sum + Number(sale.netDebt || 0),
    0
  );

  const supplierDebt = dashboardSuppliers.reduce(
    (sum, supplier) => sum + Number(supplier.debt || 0),
    0
  );

  const asMoney = (amount) => formatCurrency(amount);

  const chartSalesData = liveSales.reduce((days, sale) => {
    const date = new Date(sale.createdAt || sale.date);

    if (Number.isNaN(date.getTime())) {
      return days;
    }

    const key = date.toISOString().slice(0, 10);

    const entry = days.get(key) || {
      date: `${date.getDate()}.${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      revenue: 0,
      profit: 0,
      expenses: 0,
    };

    entry.revenue += Number(sale.netAmount || 0);

    entry.profit += Math.max(
      0,
      Number(sale.netAmount || 0) - Number(sale.netCost || 0)
    );

    entry.expenses += Number(sale.netCost || 0);

    days.set(key, entry);

    return days;
  }, new Map());

  const salesData = Array.from(chartSalesData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);

  const monthlyData = salesData;

  const topProducts = Array.from(
    liveSales
      .reduce((items, sale) => {
        (sale.items || []).forEach((item) => {
          const current = items.get(String(item.id)) || {
            id: item.id,
            name: item.name || "Mahsulot",
            sold: 0,
            revenue: 0,
          };

          const returnedQuantity = dashboardReturns
            .filter(
              (record) =>
                record.status === "approved" &&
                String(record.saleId) === String(sale.id) &&
                String(record.productId) === String(item.id)
            )
            .reduce(
              (sum, record) => sum + Number(record.quantity || 1),
              0
            );

          const soldQuantity = Math.max(
            0,
            Number(item.qty || 0) - returnedQuantity
          );

          current.sold += soldQuantity;
          current.revenue += soldQuantity * Number(item.price || 0);

          items.set(String(item.id), current);
        });

        return items;
      }, new Map())
      .values()
  )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const navigateTo = (page) => {
    if (typeof onNavigate === "function") {
      onNavigate(page);
    }
  };

  const openRecentSale = (sale) => {
    const customerName = String(
      sale.customer || "Noma'lum mijoz"
    ).trim();

    const customerSales = allDashboardSales.filter(
      (item) =>
        String(item.customer || "").trim().toLowerCase() ===
        customerName.toLowerCase()
    );

    const debt = customerSales.reduce(
      (sum, item) => sum + Number(item.debtBalance || 0),
      0
    );

    const saleCustomer = {
      name: customerName,
      phone: "—",
      region: "—",
      purchases: customerSales.length,
      spent: customerSales.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
      debt,
      lastPurchase: sale.date,
      status: debt > 0 ? "debtor" : "regular",
      sales: customerSales,
      selectedSaleId: sale.id,
      initialTab:
        Number(sale.debtBalance || 0) > 0 ? "debt" : "purchases",
    };

    navigateTo(
      `customer-sale-${encodeURIComponent(
        JSON.stringify(saleCustomer)
      )}`
    );
  };

  // KPI navigation
  const handleKpiClick = (cardName, page) => {
    setActiveCard(cardName);

    try {
      sessionStorage.setItem("dashboardActiveCard", cardName);
    } catch {
      // Storage ishlamasa ham sahifa ishlashda davom etadi.
    }

    navigateTo(page);
  };

  // Chart data
  const data =
    range === "7d" || range === "30d" ? salesData : monthlyData;

  const ranges = [
    {
      key: "7d",
      label: t("dashboard.range.7d", "7 kun"),
    },
    {
      key: "30d",
      label: t("dashboard.range.30d", "30 kun"),
    },
    {
      key: "3m",
      label: t("dashboard.range.3m", "3 oy"),
    },
    {
      key: "1y",
      label: t("dashboard.range.1y", "1 yil"),
    },
  ];

  const statusBadge = {
    paid: {
      label: t("dashboard.status.paid", "To'landi"),
      ...statusVisual.paid,
    },
    debt: {
      label: t("dashboard.status.debt", "Qarz"),
      ...statusVisual.debt,
    },
    partial: {
      label: t("dashboard.status.partial", "Qisman"),
      ...statusVisual.partial,
    },
    returned: {
      label: t("dashboard.status.returned", "Qaytarilgan"),
      ...statusVisual.returned,
    },
  };

  const stockStatus = {
    critical: {
      label: t("dashboard.stock.critical", "Tugagan"),
      ...stockVisual.critical,
    },
    low: {
      label: t("dashboard.stock.low", "Kam qolgan"),
      ...stockVisual.low,
    },
    ok: {
      label: t("dashboard.stock.ok", "Yetarli"),
      ...stockVisual.ok,
    },
  };

  return (
    <div className="space-y-6 fade-in">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {tx(t("dashboard.welcome", "Xush kelibsiz, Admin"))}
          </h1>

          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {tx(
              t(
                "dashboard.subtitle",
                "Bugungi do'kon faoliyati haqida qisqacha ma'lumot."
              )
            )}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 dashboard-kpi-grid gap-4">
        <KpiCard
          icon={ShoppingBag}
          label={tx(t("dashboard.kpi.todaySales", "Bugungi savdo"))}
          value={asMoney(todaySales)}
          sub={t(
            "dashboard.kpi.todaySales.sub",
            "Kechagiga nisbatan"
          )}
          color="var(--brand)"
          bg="var(--brand-light)"
          active={activeCard === "todaySales"}
          onClick={() => handleKpiClick("todaySales", "sales-all")}
        />

        <KpiCard
          icon={TrendingUp}
          label={tx(t("dashboard.kpi.todayProfit", "Bugungi foyda"))}
          value={asMoney(todayProfit)}
          sub={t(
            "dashboard.kpi.todayProfit.sub",
            "Bugun hisoblangan"
          )}
          color="var(--success)"
          bg="var(--success-light)"
          active={activeCard === "todayProfit"}
          onClick={() =>
            handleKpiClick("todayProfit", "finance-revenue")
          }
        />

        <KpiCard
          icon={HandCoins}
          label={tx(t("dashboard.kpi.owedToUs", "Bizdan qarzdor"))}
          value={asMoney(customerDebt)}
          sub={t(
            "dashboard.kpi.owedToUs.sub",
            "Mijozlarning qarzi"
          )}
          color="var(--warning)"
          bg="var(--warning-light)"
          active={activeCard === "customerDebt"}
          onClick={() =>
            handleKpiClick("customerDebt", "customers-all")
          }
        />

        <KpiCard
          icon={Wallet}
          label={tx(t("dashboard.kpi.weOwe", "Biz qarzdor"))}
          value={asMoney(supplierDebt)}
          sub={t(
            "dashboard.kpi.weOwe.sub",
            "Ta'minotchilarga qarz"
          )}
          color="var(--danger)"
          bg="var(--danger-light)"
          active={activeCard === "supplierDebt"}
          onClick={() => handleKpiClick("supplierDebt", "suppliers")}
        />
      </div>

      {/* CHART + TOP PRODUCTS */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-2 rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}
        >
          {/* CHART HEADER */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                className="font-display font-semibold text-base"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                {tx(
                  t("dashboard.chart.title", "Sotuv ko'rsatkichlari")
                )}
              </h2>

              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-faint)" }}
              >
                {tx(
                  t(
                    "dashboard.chart.subtitle",
                    "Daromad, foyda va xarajatlar"
                  )
                )}
              </p>
            </div>

            <div
              className="flex items-center gap-1 rounded-xl p-1"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
              }}
            >
              {ranges.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    background:
                      range === r.key
                        ? "var(--surface)"
                        : "transparent",
                    color:
                      range === r.key
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    boxShadow:
                      range === r.key
                        ? "0 2px 6px rgba(15,23,42,0.10)"
                        : "none",
                  }}
                >
                  {tx(r.label)}
                </button>
              ))}
            </div>
          </div>

          {/* CHART */}
          <div
            style={{
              width: "100%",
              height: 250,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{
                  top: 15,
                  right: 10,
                  bottom: 5,
                  left: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="revenue"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--brand)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--brand)"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="profit"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--success)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--success)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />

                <XAxis
                  tickFormatter={(value) => tx(value)}
                  dataKey="date"
                  tick={{
                    fontSize: 11,
                    fill: "var(--text-faint)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  padding={{
                    left: 5,
                    right: 5,
                  }}
                />

                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{
                    fontSize: 11,
                    fill: "var(--text-faint)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  domain={[0, "auto"]}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={tx(t("dashboard.chart.revenue", "Daromad"))}
                  stroke="var(--brand)"
                  fill="url(#revenue)"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    strokeWidth: 2,
                    fill: "var(--surface)",
                  }}
                  activeDot={{ r: 5 }}
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  name={tx(t("dashboard.chart.profit", "Foyda"))}
                  stroke="var(--success)"
                  fill="url(#profit)"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    strokeWidth: 2,
                    fill: "var(--surface)",
                  }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="expenses"
                  name={tx(
                    t("dashboard.chart.expenses", "Xarajatlar")
                  )}
                  stroke="var(--warning)"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    strokeWidth: 2,
                    fill: "var(--surface)",
                  }}
                  activeDot={{ r: 5 }}
                  strokeDasharray="5 4"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* LEGEND */}
          <div className="flex items-center gap-5 mt-3">
            {[
              {
                color: "var(--brand)",
                label: t("dashboard.chart.revenue", "Daromad"),
              },
              {
                color: "var(--success)",
                label: t("dashboard.chart.profit", "Foyda"),
              },
              {
                color: "var(--warning)",
                label: t("dashboard.chart.expenses", "Xarajatlar"),
                dashed: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-6 h-0.5 rounded"
                  style={{
                    background: item.color,
                    borderStyle: item.dashed ? "dashed" : "solid",
                  }}
                />

                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tx(item.label)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP PRODUCTS */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-display font-semibold text-base"
              style={{
                fontFamily: "'Manrope', sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(
                t("dashboard.topProducts.title", "Eng ko'p sotilgan")
              )}
            </h2>

            <button
              type="button"
              onClick={() => navigateTo("products-all")}
              className="text-xs font-medium hover:underline cursor-pointer"
              style={{ color: "var(--brand)" }}
            >
              {tx(t("dashboard.recentSales.all", "Barchasi"))}
            </button>
          </div>

          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 cursor-pointer dashboard-product-row"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--warning-light)",
                  }}
                >
                  <Boxes
                    size={15}
                    strokeWidth={2}
                    style={{ color: "var(--warning)" }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {tx(p.sold)}{" "}
                      {tx(t("dashboard.topProducts.unit", "dona"))}
                    </span>

                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--brand)" }}
                    >
                      {formatCurrency(p.revenue)}
                    </span>
                  </div>

                  <div
                    className="mt-1 h-1 rounded-full overflow-hidden"
                    style={{
                      background: "var(--border-subtle)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (p.revenue / 3000000) * 100,
                          100
                        )}%`,
                        background: "var(--brand)",
                        opacity: 0.7 + i * 0.06,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT SALES + RIGHT SIDE */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-2 rounded-2xl overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              className="font-display font-semibold text-base"
              style={{
                fontFamily: "'Manrope', sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(t("dashboard.recentSales.title", "So'nggi sotuvlar"))}
            </h2>

            <button
              type="button"
              onClick={() => navigateTo("sales-all")}
              className="text-xs font-medium hover:underline cursor-pointer"
              style={{ color: "var(--brand)" }}
            >
              {tx(t("dashboard.recentSales.all", "Barchasi"))}
            </button>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--table-stripe)" }}>
                  {[
                    t("dashboard.table.id", "ID"),
                    t("dashboard.table.customer", "Mijoz"),
                    t("dashboard.table.amount", "Summa"),
                    t("dashboard.table.payment", "To'lov"),
                    t("dashboard.table.date", "Sana"),
                    t("dashboard.table.status", "Holat"),
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left px-5 py-3 text-xs font-semibold"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {tx(heading)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {dashboardRecentSales.map((sale) => {
                  const status =
                    statusBadge[sale.status] || statusBadge.paid;

                  return (
                    <tr
                      key={sale.id}
                      className="border-t hover:bg-blue-50 transition-colors cursor-pointer"
                      role="link"
                      tabIndex={0}
                      aria-label={tx(
                        `${sale.customer} xaridini ochish`
                      )}
                      onClick={() => openRecentSale(sale)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          openRecentSale(sale);
                        }
                      }}
                      style={{
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <td
                        className="px-5 py-3 text-xs font-mono font-semibold"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {sale.id}
                      </td>

                      <td
                        className="px-5 py-3 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {sale.customer}
                      </td>

                      <td
                        className="px-5 py-3 text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(sale.amount)}
                      </td>

                      <td
                        className="px-5 py-3 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {tx(sale.payment)}
                      </td>

                      <td
                        className="px-5 py-3 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {tx(sale.date)}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: status.bg,
                            color: status.color,
                          }}
                        >
                          {tx(status.label)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-4">
          {/* OMBOR */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  size={15}
                  style={{ color: "var(--warning)" }}
                />

                <h2
                  className="font-display font-semibold text-sm"
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    color: "var(--text-primary)",
                  }}
                >
                  {tx(
                    t(
                      "dashboard.lowStockPanel.title",
                      "Ombor ogohlantirishlari"
                    )
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("inventory")}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: "var(--brand)" }}
              >
                {tx(t("dashboard.lowStockPanel.view", "Ko'rish"))}
              </button>
            </div>

            <div className="p-4 space-y-3">
              {lowStockItems.length === 0 && (
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tx(
                    "Omborda kamaygan yoki tugagan mahsulot yo'q."
                  )}
                </p>
              )}

              {lowStockItems.map((item) => {
                const status =
                  stockStatus[item.status] || stockStatus.ok;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 cursor-pointer dashboard-stock-row"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: status.bg }}
                    >
                      <Boxes
                        size={14}
                        style={{ color: status.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.name}
                      </div>

                      <div
                        className="text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {tx(item.current)} / {tx(item.minimum)}{" "}
                        {tx(
                          t("dashboard.lowStockPanel.unit", "dona")
                        )}
                      </div>
                    </div>

                    <span
                      className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full"
                      style={{
                        background: status.bg,
                        color: status.color,
                      }}
                    >
                      {tx(status.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TEZKOR AMALLAR */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            }}
          >
            <h2
              className="font-display font-semibold text-sm mb-3"
              style={{
                fontFamily: "'Manrope', sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(
                t("dashboard.quickActions.title", "Tezkor amallar")
              )}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  key: "newSale",
                  label: t(
                    "dashboard.quickActions.newSale",
                    "Yangi sotuv"
                  ),
                  icon: ShoppingBag,
                  page: "sales-new",
                  color: "var(--brand)",
                  bg: "var(--brand-light)",
                },
                {
                  key: "product",
                  label: t(
                    "dashboard.quickActions.product",
                    "Mahsulot"
                  ),
                  icon: Plus,
                  page: "products-all",
                  color: "var(--violet)",
                  bg: "var(--violet-light)",
                },
                {
                  key: "customer",
                  label: t(
                    "dashboard.quickActions.customer",
                    "Mijoz"
                  ),
                  icon: Plus,
                  page: "customers-all",
                  color: "var(--success)",
                  bg: "var(--success-light)",
                },
                {
                  key: "report",
                  label: t(
                    "dashboard.quickActions.report",
                    "Hisobot"
                  ),
                  icon: Download,
                  page: "reports",
                  color: "var(--warning)",
                  bg: "var(--warning-light)",
                },
              ].map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => navigateTo(action.page)}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    background: action.bg,
                    color: action.color,
                  }}
                >
                  <action.icon size={14} />
                  {tx(action.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}