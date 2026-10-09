import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './ProductDetail.css';
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Package,
  BarChart3,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle,
  // Copy,
  // Pointer,
} from "lucide-react";  
import { products,  } from "../data/mockData";
import Modal, { Field } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
// import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
const readList = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
};
const parsedDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
const sameDay = (left, right) => left?.toDateString() === right.toDateString();
const saleItems = (sale, productId) => Array.isArray(sale.items)
  ? sale.items.filter((item) => String(item.id) === String(productId) && !item.returned)
  : [];
const saleQuantity = (sale, productId) => Array.isArray(sale.items)
  ? saleItems(sale, productId).reduce((sum, item) => sum + Number(item.qty || 0), 0)
  : (sale.productIds || []).filter((id) => String(id) === String(productId)).length;
const saleAmount = (sale, productId) => saleItems(sale, productId).reduce((sum, item) => sum + Number(item.total ?? Number(item.qty || 0) * Number(item.price || 0)), 0);
const receiptQuantity = (receipt, productId) => (receipt.products || []).filter((item) => String(item.id) === String(productId)).reduce((sum, item) => sum + Number(item.quantity ?? item.stock ?? 0), 0);
const findProduct = (productId) => {
  let list = products;
  try {
    const saved = JSON.parse(localStorage.getItem("crm_products") || "null");
    if (Array.isArray(saved)) list = saved;
  } catch { /* Use the catalog when storage is unavailable. */ }
  return list.find((item) => String(item.id) === String(productId)) || products[0];
};
const EmptyData = ({ icon: Icon, text }) => <div className="py-10 text-center"><Icon size={24} className="mx-auto mb-2" style={{ color: "var(--text-faint)" }}/><p className="text-sm" style={{ color: "var(--text-muted)" }}>{tx(text)}</p></div>;

export default function ProductDetail({ productId, onBack }) {
  useUILanguage();
  const [product, setProduct] = useState(() => findProduct(productId));
  const [, refreshMetrics] = useState(0);
  useEffect(() => {
    const refresh = () => { setProduct(findProduct(productId)); refreshMetrics((value) => value + 1); };
    refresh();
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(refresh, 1500);
    return () => { window.removeEventListener("storage", refresh); window.clearInterval(timer); };
  }, [productId]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const { success, error } = useToast();
  const { t } = useLanguage();
  const [tab, setTab] = useState("overview");
  const statusMap = {
    active: {
      label: t("productDetail.status.active", "Faol"),
      bg: "var(--success-light)",
      color: "var(--success)",
    },
    low: {
      label: t("productDetail.status.low", "Kam qolgan"),
      bg: "var(--warning-light)",
      color: "var(--warning)",
    },
    out: {
      label: t("productDetail.status.out", "Tugagan"),
      bg: "var(--danger-light)",
      color: "var(--danger)",
    },
  };
  const st = statusMap[product.status];
  const margin = product.price > 0
    ? Math.round(((product.price - product.cost) / product.price) * 100)
    : 0;
  const now = new Date(), sales = readList("crm_sales"), receipts = readList("crm_supplier_receipts"), customerReturns = readList("crm_returns"), supplierReturns = readList("crm_supplier_returns");
  const productSales = sales.map((sale) => ({ sale, date: parsedDate(sale.date), qty: saleQuantity(sale, product.id), amount: saleAmount(sale, product.id) }));
  const productReceipts = receipts.map((receipt) => ({ receipt, date: parsedDate(receipt.date), qty: receiptQuantity(receipt, product.id) }));
  const soldToday = productSales.filter(({ date }) => sameDay(date, now)).reduce((sum, item) => sum + item.qty, 0);
  const soldTotal = productSales.reduce((sum, item) => sum + item.qty, 0);
  const receivedToday = receipts.filter((receipt) => sameDay(parsedDate(receipt.date), now)).reduce((sum, receipt) => sum + receiptQuantity(receipt, product.id), 0);
  const receivedThisMonth = productReceipts.filter(({ date }) => date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()).reduce((sum, item) => sum + item.qty, 0);
  const minimumStock = Number(product.minStock ?? product.minStockLevel ?? product.minQuantity ?? 0);
  const vatRate = Number(product.vat ?? product.vatRate ?? 0);
  const productCustomerReturns = customerReturns.filter((item) => item.status === "approved" && String(item.productId) === String(product.id));
  const productSupplierReturns = supplierReturns.filter((item) => String(item.productId) === String(product.id));
  const money = (value) => formatCurrency(value);
  const dateLabel = (value) => parsedDate(value)?.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" }) || "—";
  const historyEvents = [
    ...productReceipts.filter((item) => item.qty > 0).map((item) => ({ ...item, type: "in", reason: "Ta'minotchidan qabul qilindi" })),
    ...productSales.filter((item) => item.qty > 0).map((item) => ({ ...item, type: "out", reason: "Sotuv" })),
    ...productCustomerReturns.map((item) => ({ date: parsedDate(item.date), qty: Number(item.quantity || 0), type: "in", reason: "Mijoz qaytarishi" })),
    ...productSupplierReturns.map((item) => ({ date: parsedDate(item.returnedAt), qty: Number(item.items || 0), type: "out", reason: "Ta'minotchiga qaytarildi" })),
  ].sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0));
  const movements = historyEvents.slice(0, 8);
  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const v = productSales.filter(({ date }) => date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()).reduce((sum, item) => sum + item.qty, 0);
    return { d: month.toLocaleDateString("uz-UZ", { month: "short" }), v };
  });
  const previousMonth = monthlySales[4]?.v || 0, currentMonth = monthlySales[5]?.v || 0;
  const salesChange = previousMonth ? `${currentMonth >= previousMonth ? "+" : ""}${Math.round(((currentMonth - previousMonth) / previousMonth) * 100)}%` : currentMonth ? "+100%" : "0%";
  const tabs = [
    {
      key: "overview",
      label: t("productDetail.tabs.overview", "Umumiy"),
    },
    {
      key: "pricing",
      label: t("productDetail.tabs.pricing", "Narxlash"),
    },
    {
      key: "inventory",
      label: t("productDetail.tabs.inventory", "Inventar"),
    },
    {
      key: "sales",
      label: t("productDetail.tabs.sales", "Sotuv statistikasi"),
    },
    {
      key: "history",
      label: t("productDetail.tabs.history", "Tarix"),
    },
  ];
  const openEdit = () => {
    setEditForm({
      name: product.name || "",
      brand: product.brand || "",
      sku: product.sku || "",
      category: product.category || "",
      price: product.price ?? "",
      cost: product.cost ?? "",
      stock: product.stock ?? "",
    });
    setIsEditOpen(true);
  };
  const saveEdit = () => {
    if (!editForm.name.trim() || editForm.price === "" || editForm.cost === "" || editForm.stock === "") {
      error("Mahsulot nomi, narxlari va qoldig'ini kiriting");
      return;
    }
    const updatedProduct = {
      ...product,
      ...editForm,
      name: editForm.name.trim(),
      brand: editForm.brand.trim(),
      sku: editForm.sku.trim(),
      category: editForm.category.trim(),
      price: Number(editForm.price),
      cost: Number(editForm.cost),
      stock: Number(editForm.stock),
    };
    try {
      let list = products;
      const saved = JSON.parse(localStorage.getItem("crm_products") || "null");
      if (Array.isArray(saved)) list = saved;
      localStorage.setItem("crm_products", JSON.stringify(list.map((item) => String(item.id) === String(product.id) ? updatedProduct : item)));
      setProduct(updatedProduct);
      setIsEditOpen(false);
      success("Mahsulot tahrirlandi");
    } catch {
      error("Mahsulot saqlanmadi. Qayta urinib ko'ring.");
    }
  };
  const deleteProduct = () => {
    if (!window.confirm(`“${product.name}” mahsulotini o'chirmoqchimisiz?`)) return;
    try {
      let list = products;
      const saved = JSON.parse(localStorage.getItem("crm_products") || "null");
      if (Array.isArray(saved)) list = saved;
      localStorage.setItem("crm_products", JSON.stringify(list.filter((item) => String(item.id) !== String(product.id))));
      success("Mahsulot o'chirildi");
      onBack?.();
    } catch {
      error("Mahsulot o'chirilmadi. Qayta urinib ko'ring.");
    }
  };
  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="app-back-button"
          aria-label={tx("Oldingi sahifaga qaytish")}
          style={{ marginBottom: 12 }}
        >
          <ArrowLeft size={16} aria-hidden="true" style={{ flexShrink: 0 }} />{tx("Orqaga")}</button>
        <div>
          <h1
            className="font-display font-bold text-2xl"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: st.bg,
                color: st.color,
                cursor:"Pointer",
              }}
            >
              {tx(st.label)}
            </span>
          </div>
        </div>
      </div>

      {/* Top section */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: "1fr 2fr",
        }}
      >
        {/* Product card */}
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
            <Package size={30} strokeWidth={1.8} aria-label={tx("Mahsulot")}/>
          </div>
          <div
            className="font-display font-bold text-lg mb-1"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {product.name}
          </div>
          <div
            className="text-sm mb-1"
            style={{
              color: "var(--text-muted)",
            }}
          >
            {product.brand} · {tx(product.category)}
          </div>

          <div className="w-full mt-5 space-y-3">
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: "var(--brand-light)",
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: "var(--brand)",
                }}
              >
                {tx(t("productDetail.sellPrice", "Sotuv narxi"))}
              </span>
              <span
                className="font-display font-bold text-base"
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  color: "var(--brand)",
                }}
              >
                {formatCurrency(product.price)}
              </span>
            </div>
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: "var(--surface-2)",
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                {tx(t("productDetail.costPrice", "Tan narxi"))}
              </span>
              <span
                className="font-semibold text-sm"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                {formatCurrency(product.cost)}
              </span>
            </div>
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: "var(--success-light)",
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: "var(--success)",
                }}
              >
                {tx(t("productDetail.margin", "Marja"))}
              </span>
              <span
                className="font-bold text-sm"
                style={{
                  color: "var(--success)",
                }}
              >
                {tx(margin)}%
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={openEdit} className="btn-ghost flex-1 justify-center cursor-pointer" title={tx("Tahrirlash")}>
                <Edit2 size={15} />{tx("Tahrirlash")}
              </button>
              <button type="button" onClick={deleteProduct} className="flex flex-1 items-center justify-center gap-2 cursor-pointer" title={tx("O'chirish")} style={{ minHeight: 42, border: "1px solid var(--danger-border)", borderRadius: 12, background: "var(--danger-light)", color: "var(--danger)", fontWeight: 600 }}>
                <Trash2 size={15} />{tx("O'chirish")}
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 content-start">
          {[
            {
              icon: ShoppingCart,
              label: "Bugun sotilgan",
              value: `${soldToday} ${t("productDetail.kpi.unit", "dona")}`,
              color: "var(--brand)",
              bg: "var(--brand-light)",
            },
            {
              icon: ShoppingCart,
              label: "Jami sotilgan",
              value: `${soldTotal} ${t("productDetail.kpi.unit", "dona")}`,
              color: "var(--success)",
              bg: "var(--success-light)",
            },
            {
              icon: Package,
              label: t("productDetail.kpi.stockLeft", "Ombordagi qoldiq"),
              value: `${product.stock} ${product.measurementType === "weight" ? "kg" : t("productDetail.kpi.unit", "dona")}`,
              color: product.stock < 10 ? "var(--danger)" : "var(--violet)",
              bg:
                product.stock < 10
                  ? "var(--danger-light)"
                  : "var(--violet-light)",
            },
            {
              icon: ArrowUpCircle,
              label: "Bugun qabul qilingan",
              value: `${receivedToday} ${t("productDetail.kpi.unit", "dona")}`,
              color: "var(--warning)",
              bg: "var(--warning-light)",
            },
          ].map((k) => (
            <div key={k.label} className="card p-4">
              <div
                className="p-2.5 rounded-xl w-fit mb-3"
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
              <div
                className="text-xl font-display font-bold count-up mb-0.5"
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                {tx(k.value)}
              </div>
              <div
                className="text-xs"
                style={{
                  color: "var(--text-faint)",
                }}
              >
                {tx(k.label)}
              </div>
            </div>
          ))}

          {/* Mini sparkline */}
          <div className="col-span-2 card p-4 pd-sales-trend">
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-semibold"
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {tx(t("productDetail.salesTrend", "Oylik sotuv dinamikasi"))}
              </span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: "var(--success)",
                }}
              >
                {salesChange}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart
                data={monthlySales}
                margin={{
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                }}
              >
                <defs>
                  <linearGradient id="sparkg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--brand)"
                  fill="url(#sparkg)"
                  strokeWidth={2}
                  dot={false}
                />
                <XAxis tickFormatter={(value) => tx(value)}
                  dataKey="d"
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-faint)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 11,
                    color: "var(--text-primary)",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-flat rounded-2xl overflow-hidden">
        <div
          className="flex items-center gap-1 px-5 py-3"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background:
                  tab === tb.key ? "var(--brand-light)" : "transparent",
                color: tab === tb.key ? "var(--brand)" : "var(--text-muted)",
                fontWeight: tab === tb.key ? 600 : 400,
              }}
            >
              {tx(tb.label)}
            </button>
          ))}
        </div>

        <div className="p-5 fade-in">
          {tab === "overview" && (
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <h3
                  className="font-semibold text-sm"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  {tx(t("productDetail.info.title", "Mahsulot ma'lumotlari"))}
                </h3>
                {[
                  {
                    label: t("productDetail.info.name", "Nomi"),
                    value: product.name, preserveText: true,
                  },
                  {
                    label: "Ta'minotchi",
                    value: product.supplierName || "Ko'rsatilmagan", preserveText: Boolean(product.supplierName),
                  },
                  {
                    label: t("productDetail.info.sku", "SKU"),
                    value: product.sku,
                  },
                  {
                    label: t("productDetail.info.category", "Kategoriya"),
                    value: product.category,
                  },
                  {
                    label: t("productDetail.info.brand", "Brend"),
                    value: product.brand, preserveText: true,
                  },
                  {
                    label: t("productDetail.info.status", "Holat"),
                    value: st.label,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between py-2"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {tx(row.label)}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.preserveText ? row.value : tx(row.value)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3
                  className="font-semibold text-sm"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  {tx(t("productDetail.price.title", "Narx ma'lumotlari"))}
                </h3>
                {[
                  {
                    label: t("productDetail.sellPrice", "Sotuv narxi"),
                    value: formatCurrency(product.price),
                  },
                  {
                    label: t("productDetail.costPrice", "Tan narxi"),
                    value: formatCurrency(product.cost),
                  },
                  {
                    label: t("productDetail.price.profit", "Foyda"),
                    value: formatCurrency(product.price - product.cost),
                  },
                  {
                    label: t("productDetail.price.margin", "Marja"),
                    value: `${margin}%`,
                  },
                  {
                    label: t("productDetail.price.vat", "QQS"),
                    value: vatRate ? `${vatRate}%` : "Belgilanmagan",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between py-2"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {tx(row.label)}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.preserveText ? row.value : tx(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "inventory" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: t("productDetail.inv.current", "Joriy qoldiq"),
                    value: product.stock,
                    icon: Package,
                    color: "var(--brand)",
                  },
                  {
                    label: t("productDetail.inv.min", "Min. qoldiq"),
                    value: minimumStock,
                    icon: ArrowDownCircle,
                    color: "var(--warning)",
                  },
                  {
                    label: t("productDetail.inv.inThisMonth", "Bu oy kirim"),
                    value: receivedThisMonth,
                    icon: ArrowUpCircle,
                    color: "var(--success)",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-4 rounded-2xl"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="text-2xl font-display font-bold mb-1"
                      style={{
                        fontFamily: "'Manrope',sans-serif",
                        color: s.color,
                      }}
                    >
                      {tx(s.value)}
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {tx(s.label)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: "var(--surface-2)",
                }}
              >
                <h4
                  className="text-sm font-semibold mb-3"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  {tx(t("productDetail.inv.recentActivity", "So'nggi harakatlar"))}
                </h4>
                {movements.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                    style={{
                      borderBottom:
                        i < movements.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {m.type === "in" ? (
                        <ArrowUpCircle
                          size={14}
                          style={{
                            color: "var(--success)",
                          }}
                        />
                      ) : (
                        <ArrowDownCircle
                          size={14}
                          style={{
                            color: "var(--danger)",
                          }}
                        />
                      )}
                      <span
                        className="text-sm"
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        {tx(m.reason)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--text-faint)",
                        }}
                      >
                        {m.date?.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            m.type === "in"
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {tx(m.type === "in" ? "+" : "-")}
                        {m.qty} {tx(product.measurementType === "weight" ? "kg" : "dona")}
                      </span>
                    </div>
                  </div>
                ))}{!movements.length && <p className="py-4 text-sm text-center" style={{ color: "var(--text-muted)" }}>{tx("Harakatlar hali mavjud emas")}</p>}
              </div>
            </div>
          )}

          {tab === "pricing" && <div className="grid md:grid-cols-2 gap-4">{[["Sotuv narxi", money(product.price)], ["Tan narxi", money(product.cost)], ["Har birlik foyda", money(Number(product.price || 0) - Number(product.cost || 0))], ["Marja", `${margin}%`], ["QQS", vatRate ? `${vatRate}%` : "Belgilanmagan"], ["Oxirgi kirim tannarxi", money(productReceipts.find((item) => item.qty > 0)?.receipt?.products?.find((item) => String(item.id) === String(product.id))?.cost ?? product.cost)]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 p-4 rounded-xl" style={{ background: "var(--surface-2)" }}><span className="text-sm" style={{ color: "var(--text-muted)" }}>{tx(label)}</span><b className="text-sm">{value}</b></div>)}</div>}

          {tab === "sales" && <div className="space-y-4"><div className="grid grid-cols-3 gap-3">{[["Bugun sotilgan", soldToday], ["Jami sotilgan", soldTotal], ["Jami daromad", money(productSales.reduce((sum, item) => sum + item.amount, 0))]].map(([label, value]) => <div key={label} className="p-4 rounded-xl" style={{ background: "var(--surface-2)" }}><small style={{ color: "var(--text-muted)" }}>{tx(label)}</small><b className="block mt-1 text-lg">{typeof value === "number" ? `${value} dona` : value}</b></div>)}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ background: "var(--surface-2)" }}>{["Sana", "Mijoz", "Miqdor", "Summa", "To'lov"].map((label) => <th className="text-left p-3 text-xs" key={label}>{tx(label)}</th>)}</tr></thead><tbody>{productSales.filter((item) => item.qty > 0).sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0)).map(({ sale, date, qty, amount }) => <tr key={sale.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}><td className="p-3">{dateLabel(date)}</td><td className="p-3">{sale.customer || sale.customerName || "—"}</td><td className="p-3">{qty} dona</td><td className="p-3">{money(amount)}</td><td className="p-3">{tx(sale.payment || sale.paymentMethod || "—")}</td></tr>)}</tbody></table></div>{!productSales.some((item) => item.qty > 0) && <EmptyData icon={BarChart3} text="Bu mahsulot hali sotilmagan"/>}</div>}

          {tab === "history" && <div className="space-y-2">{historyEvents.map((event, index) => <div key={`${event.type}-${event.date?.getTime()}-${index}`} className="flex justify-between items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface-2)" }}><div className="flex items-center gap-3">{event.type === "in" ? <ArrowUpCircle size={18} style={{ color: "var(--success)" }}/> : <ArrowDownCircle size={18} style={{ color: "var(--danger)" }}/>}<div><b className="text-sm">{tx(event.reason)}</b><small className="block mt-1" style={{ color: "var(--text-muted)" }}>{dateLabel(event.date)}</small></div></div><b style={{ color: event.type === "in" ? "var(--success)" : "var(--danger)" }}>{event.type === "in" ? "+" : "−"}{event.qty} dona</b></div>)}{!historyEvents.length && <EmptyData icon={Package} text="Bu mahsulot bo'yicha harakatlar hali mavjud emas"/>}</div>}
        </div>
      </div>
      <Modal contentOnly open={isEditOpen} onClose={() => setIsEditOpen(false)} title={tx("Mahsulotni tahrirlash")} subtitle={tx("Mahsulot ma'lumotlarini yangilang")} icon={Package}>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label={tx("Mahsulot nomi")}><input className="input-base" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tx("Brend")}><input className="input-base" value={editForm.brand || ""} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} /></Field>
            <Field label={tx("SKU kodi")}><input className="input-base" value={editForm.sku || ""} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} /></Field>
            <Field label={tx("Kategoriya")}><input className="input-base" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></Field>
            <Field label={tx("Qoldiq")}><input type="number" min="0" className="input-base" value={editForm.stock ?? ""} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} /></Field>
            <Field label={tx("Sotuv narxi")}><input type="number" min="0" step="any" className="input-base" value={moneyInputValue(editForm.price, false)} onChange={(e) => setEditForm({ ...editForm, price: String(toBaseMoney(e.target.value)) })} /></Field>
            <Field label={tx("Tan narxi")}><input type="number" min="0" step="any" className="input-base" value={moneyInputValue(editForm.cost, false)} onChange={(e) => setEditForm({ ...editForm, cost: String(toBaseMoney(e.target.value)) })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost cursor-pointer" onClick={() => setIsEditOpen(false)}>{tx("Bekor qilish")}</button><button type="button" className="btn-primary cursor-pointer" onClick={saveEdit}><Edit2 size={15} />{tx("Saqlash")}</button></div>
        </div>
      </Modal>
    </div>
  );
}
