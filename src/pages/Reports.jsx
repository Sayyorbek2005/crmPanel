import { useState, useMemo } from "react";

import { createReportPdf } from "../locales/reportPdf";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";

import "./Reports.css";

import {
  Download,
  FileText,
  BarChart3,
  Users,
  Package,
  CreditCard,
  TrendingDown,
  ShoppingCart,
  Printer,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { readFinanceOperations } from "../data/financeStore";
import {
  readDebtPayments,
  readPosSales,
  withDebtBalance,
} from "../data/debtPayments";
import { formatCurrency } from "../data/currency";

const readBusinessList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const reportDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

const reportTypes = [
  {
    icon: ShoppingCart,
    label: "Sotuv hisoboti",
    desc: "Barcha sotuvlar va tranzaksiyalar",
    color: "var(--brand)",
    bg: "var(--brand-light)",
    primaryKey: "revenue",
    secondaryKey: "profit",
    primaryName: "Sotuv daromadi",
    secondaryName: "Sof foyda",
  },
  {
    icon: TrendingDown,
    label: "Foyda hisoboti",
    desc: "Daromad va xarajatlar tahlili",
    color: "var(--success)",
    bg: "var(--success-light)",
    primaryKey: "profit",
    secondaryKey: "expenses",
    primaryName: "Foyda",
    secondaryName: "Xarajatlar",
  },
  {
    icon: Package,
    label: "Inventar hisoboti",
    desc: "Mahsulotlar va stok holati",
    color: "var(--violet)",
    bg: "var(--violet-light)",
    primaryKey: "revenue",
    secondaryKey: "expenses",
    primaryName: "Mahsulot oboroti",
    secondaryName: "Stok xarajatlari",
  },
  {
    icon: Users,
    label: "Mijozlar hisoboti",
    desc: "Mijozlar faoliyati va xaridlar",
    color: "var(--info)",
    bg: "var(--info-light)",
    primaryKey: "revenue",
    secondaryKey: "profit",
    primaryName: "Mijozlar xaridi",
    secondaryName: "Mijozdan tushgan foyda",
  },
  {
    icon: BarChart3,
    label: "Xodimlar hisoboti",
    desc: "Xodimlar samaradorligi",
    color: "var(--warning)",
    bg: "var(--warning-light)",
    primaryKey: "profit",
    secondaryKey: "expenses",
    primaryName: "Xodimlar ulushi",
    secondaryName: "Maosh xarajatlari",
  },
  {
    icon: CreditCard,
    label: "Qarzdorlik hisoboti",
    desc: "Mijozlar va ta'minotchilar qarzi",
    color: "var(--danger)",
    bg: "var(--danger-light)",
    primaryKey: "expenses",
    secondaryKey: "profit",
    primaryName: "Ta'minotchi qarzi",
    secondaryName: "Mijozlar qarzi",
  },
];

// Mavjud davr bo'yicha filtrlash mantiqi.
const filterDataByRange = (data, range) => {
  if (!data || !data.length) {
    return [];
  }

  const days =
    range === "week"
      ? 7
      : range === "quarter"
        ? 90
        : range === "year"
          ? 365
          : 30;

  return data.slice(-days);
};

export default function Reports() {
  useUILanguage();

  const [selectedReport, setSelectedReport] = useState("Sotuv hisoboti");
  const [dateRange, setDateRange] = useState("month");

  const monthlyData = useMemo(() => {
    const payments = readDebtPayments();

    const sales = readPosSales().map((sale) =>
      withDebtBalance(sale, payments)
    );

    const finance = readFinanceOperations();

    const returns = readBusinessList("crm_returns").filter(
      (item) => item.status === "approved"
    );

    const returnedBySale = returns.reduce((totals, item) => {
      const saleId = String(item.saleId || "");

      totals[saleId] =
        (totals[saleId] || 0) + Number(item.amount || 0);

      return totals;
    }, {});

    const grouped = {};

    const add = (date, key, amount) => {
      const day = reportDate(date);

      if (!grouped[day]) {
        grouped[day] = {
          date: day,
          revenue: 0,
          profit: 0,
          expenses: 0,
        };
      }

      grouped[day][key] += Number(amount || 0);
    };

    sales.forEach((sale) => {
      add(
        sale.createdAt || sale.date,
        "revenue",
        Math.max(
          0,
          Number(sale.amount || 0) -
            Number(returnedBySale[String(sale.id)] || 0)
        )
      );
    });

    finance.incomes.forEach((item) => {
      add(item.date, "revenue", item.amount);
    });

    finance.expenses.forEach((item) => {
      add(item.date, "expenses", item.amount);
    });

    returns.forEach((item) => {
      add(item.createdAt || item.date, "expenses", item.amount);
    });

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        profit: item.revenue - item.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  // Tanlangan hisobot.
  const currentReportObj = useMemo(() => {
    return (
      reportTypes.find((report) => report.label === selectedReport) ||
      reportTypes[0]
    );
  }, [selectedReport]);

  // Tanlangan davr ma'lumotlari.
  const chartData = useMemo(() => {
    return filterDataByRange(monthlyData, dateRange);
  }, [monthlyData, dateRange]);

  // Xulosa kartochkalari.
  const summaryCards = useMemo(() => {
    const totalRev = chartData.reduce(
      (acc, item) => acc + (item[currentReportObj.primaryKey] || 0),
      0
    );

    const avgRev = chartData.length
      ? Math.round(totalRev / chartData.length)
      : 0;

    const top = chartData.reduce((best, item) => {
      if (
        !best ||
        Number(item[currentReportObj.primaryKey] || 0) >
          Number(best[currentReportObj.primaryKey] || 0)
      ) {
        return item;
      }

      return best;
    }, null);

    return [
      {
        label: `Umumiy (${currentReportObj.primaryName})`,
        value: formatCurrency(totalRev),
        change: "0%",
      },
      {
        label: "O'rtacha ko'rsatkich",
        value: formatCurrency(avgRev),
        change: "0%",
      },
      {
        label: "Eng yuqori ko'rsatkich",
        value: top
          ? formatCurrency(Number(top[currentReportObj.primaryKey] || 0))
          : "—",
        change: top ? top.date : "Ma'lumot yo'q",
      },
    ];
  }, [chartData, currentReportObj]);

  // Eksport.
  const mKeys = chartData.length ? Object.keys(chartData[0]) : [];

  const fmtVal = (value) =>
    typeof value === "number"
      ? formatCurrency(value)
      : tx(String(value));

  const columnLabel = (key) =>
    tx(
      {
        date: "Sana",
        revenue: "Daromad",
        profit: "Foyda",
        expenses: "Xarajatlar",
      }[key] || key
    );

  const periodLabel =
    dateRange === "week"
      ? "Hafta"
      : dateRange === "month"
        ? "Oy"
        : dateRange === "quarter"
          ? "Chorak"
          : "Yil";

  const fileBase = selectedReport.replace(/\s+/g, "-").toLowerCase();

  const handleExcel = () => {
    const rows = [mKeys.map(columnLabel).join(";")].concat(
      chartData.map((row) =>
        mKeys.map((key) => fmtVal(row[key])).join(";")
      )
    );

    const csv = "\uFEFF" + rows.join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileBase}-${dateRange}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    const head = mKeys
      .map((key) => "<th>" + columnLabel(key) + "</th>")
      .join("");

    const body = chartData
      .map(
        (row) =>
          "<tr>" +
          mKeys
            .map((key) => "<td>" + fmtVal(row[key]) + "</td>")
            .join("") +
          "</tr>"
      )
      .join("");

    const html =
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" +
      tx(selectedReport) +
      "</title><style>" +
      "body{font-family:Arial;color:#111;padding:24px}" +
      "h1{font-size:18px;margin:0 0 4px}" +
      "p{color:#555;font-size:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:14px}" +
      "th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}" +
      "th{background:#f3f4f6}" +
      "</style></head><body><h1>UyMarket — " +
      tx(selectedReport) +
      "</h1><p>" +
      tx("Davr:") +
      " " +
      tx(periodLabel) +
      "</p><table><thead><tr>" +
      head +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></body></html>";

    const printWindow = window.open(
      "",
      "_blank",
      "width=800,height=600"
    );

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handlePdf = () => {
    const lines = [
      {
        t: "UyMarket — " + tx(selectedReport),
        s: 15,
        b: true,
      },
      {
        t: tx("Davr:") + " " + tx(periodLabel),
        s: 10,
      },
      {
        t: mKeys.map(columnLabel).join("     "),
        s: 10,
        b: true,
      },
      ...chartData.map((row) => ({
        t: mKeys.map((key) => fmtVal(row[key])).join("     "),
        s: 10,
      })),
    ];

    const blob = createReportPdf(lines);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileBase}-${dateRange}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Sarlavha va eksport tugmalari */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {tx("Hisobotlar")}
          </h1>

          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >
            {tx("Analitika va biznes ko'rsatkichlari")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border hover:bg-gray-50 transition-colors"
            onClick={handlePrint}
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Printer size={14} />
            {tx(" Chop etish")}
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border hover:bg-gray-50 transition-colors"
            onClick={handlePdf}
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <FileText size={14} />
            {tx(" PDF")}
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            onClick={handleExcel}
            style={{
              background:
                "linear-gradient(135deg,var(--brand),var(--brand-hover))",
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
              cursor: "pointer",
            }}
          >
            <Download size={15} />
            {tx(" Excel")}
          </button>
        </div>
      </div>

      {/* Hisobot turlari */}
      <div className="grid grid-cols-3 gap-3">
        {reportTypes.map((report) => (
          <button
            key={report.label}
            type="button"
            onClick={() => setSelectedReport(report.label)}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
            style={{
              background:
                selectedReport === report.label
                  ? report.bg
                  : "var(--surface)",
              border: `1px solid ${
                selectedReport === report.label
                  ? "var(--brand-border)"
                  : "var(--border)"
              }`,
              boxShadow:
                selectedReport === report.label
                  ? "0 2px 12px rgba(37,99,235,0.12)"
                  : "0 2px 8px rgba(15,23,42,0.04)",
              cursor: "pointer",
            }}
          >
            <div
              className="p-2.5 rounded-xl shrink-0"
              style={{
                background:
                  selectedReport === report.label
                    ? report.color
                    : report.bg,
              }}
            >
              <report.icon
                size={16}
                color={
                  selectedReport === report.label
                    ? "white"
                    : report.color
                }
              />
            </div>

            <div>
              <div
                className="text-sm font-semibold"
                style={{
                  color:
                    selectedReport === report.label
                      ? report.color
                      : "var(--text-primary)",
                }}
              >
                {tx(report.label)}
              </div>

              <div
                className="text-xs mt-0.5"
                style={{
                  color: "var(--text-faint)",
                }}
              >
                {tx(report.desc)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Davr tanlovi va grafik */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="font-display font-semibold text-base"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(selectedReport)}
            </h2>

            <p
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-faint)",
              }}
            >
              {tx(periodLabel)}
              {tx(" ko'rsatkichlari")}
            </p>
          </div>

          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
            }}
          >
            {[
              { key: "week", label: "Hafta" },
              { key: "month", label: "Oy" },
              { key: "quarter", label: "Chorak" },
              { key: "year", label: "Yil" },
            ].map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => setDateRange(range.key)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background:
                    dateRange === range.key
                      ? "var(--surface)"
                      : "transparent",
                  color:
                    dateRange === range.key
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  boxShadow:
                    dateRange === range.key
                      ? "0 1px 3px rgba(15,23,42,0.08)"
                      : "none",
                  cursor: "pointer",
                }}
              >
                {tx(range.label)}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={chartData}
            margin={{
              top: 25,
              right: 10,
              bottom: 0,
              left: 10,
            }}
          >
            <defs>
              <linearGradient
                id="primColor"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={currentReportObj.color}
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor={currentReportObj.color}
                  stopOpacity={0}
                />
              </linearGradient>

              <linearGradient
                id="secColor"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--success)"
                  stopOpacity={0.15}
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
            />

            <YAxis
              domain={[0, 160000000]}
              ticks={[0, 35000000, 70000000, 105000000, 140000000]}
              tickFormatter={(value) => formatCurrency(value)}
              tick={{
                fontSize: 11,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={65}
            />

            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                tx(name),
              ]}
              labelFormatter={(value) => tx(value)}
              contentStyle={{
                background: "var(--text-primary)",
                border: "none",
                borderRadius: 12,
                color: "var(--surface-2)",
                fontSize: 12,
              }}
            />

            <Area
              type="monotone"
              dataKey={currentReportObj.primaryKey}
              name={tx(currentReportObj.primaryName)}
              stroke={currentReportObj.color}
              fill="url(#primColor)"
              strokeWidth={2.5}
              dot={false}
            />

            <Area
              type="monotone"
              dataKey={currentReportObj.secondaryKey}
              name={tx(currentReportObj.secondaryName)}
              stroke="var(--success)"
              fill="url(#secColor)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Xulosa kartochkalari */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            }}
          >
            <div
              className="text-xs mb-1"
              style={{
                color: "var(--text-faint)",
              }}
            >
              {tx(card.label)}
            </div>

            <div
              className="text-lg font-display font-bold"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(card.value)}
            </div>

            <div
              className="text-xs mt-1 font-semibold"
              style={{
                color: "var(--success)",
              }}
            >
              {tx(card.change)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}