import { translateText as tx } from "../locales/translateText";
import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import "./Suppliers.css";
import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Truck,
  Package,
  DollarSign,
  AlertCircle,
} from "lucide-react";

import Modal, { Field } from "../components/Modal";
import PhoneInput from "../components/PhoneInput";
import { useToast } from "../context/ToastContext";
import DateRangeFilter, { matchesDateRange } from "../components/DateRangeFilter";

const statusMap = {
  active: {
    label: "Faol",
    bg: "var(--success-light)",
    color: "var(--success)",
  },
  inactive: {
    label: "Nofaol",
    bg: "var(--border-subtle)",
    color: "var(--text-muted)",
  },
};

const emptyProduct = {
  productName: "", brand: "", sku: "", category: "", packaging: "piece",
  receivedQuantity: "", unitsPerPackage: "", liters: "", weight: "", volume: "",
  length: "", width: "", height: "", cost: "", price: "",
};

const measurementOptions = [
  { key: "unitsPerPackage", label: "Har qadoqdagi dona", placeholder: "Masalan: 12" },
  { key: "liters", label: "Litr (birligi uchun)", placeholder: "Masalan: 1.5" },
  { key: "weight", label: "Og'irligi, kg (birligi uchun)", placeholder: "Masalan: 25" },
  { key: "volume", label: "Hajmi, m³ (birligi uchun)", placeholder: "Masalan: 0.5" },
  { key: "length", label: "Uzunligi, sm", placeholder: "Masalan: 100" },
  { key: "width", label: "Kengligi, sm", placeholder: "Masalan: 50" },
  { key: "height", label: "Balandligi, sm", placeholder: "Masalan: 30" },
];

const pickProduct = (source) => Object.fromEntries(
  Object.keys(emptyProduct).map((key) => [key, source[key]])
);
const readList = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
const moneyValue = (value) => Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;
const moneyText = (value) => formatCurrency(value);

const capitalizeStart = (value = "") => value ? value[0].toLocaleUpperCase("uz-UZ") + value.slice(1) : "";

export default function Suppliers({ onNavigate }) {
  useUILanguage();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_suppliers") || "null");
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [pendingProducts, setPendingProducts] = useState([]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    ...emptyProduct,
    status: "active",
  });

  const [err, setErr] = useState("");
  const [productErr, setProductErr] = useState("");
  const [productForm, setProductForm] = useState({ supplierId: "", ...emptyProduct, packaging: "Dona" });
  const [productQueue, setProductQueue] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDebtInput, setSupplierDebtInput] = useState("");
  const [newSupplierDebtInput, setNewSupplierDebtInput] = useState("");
  const [newSupplierMetric, setNewSupplierMetric] = useState("");
  const knownProducts = readList("crm_products");
  const productSuggestions = productForm.productName.trim()
    ? knownProducts.filter((item) => String(item.name || "").toLocaleLowerCase("uz-UZ").startsWith(productForm.productName.toLocaleLowerCase("uz-UZ"))).filter((item, index, list) => list.findIndex((match) => String(match.name || "").toLocaleLowerCase("uz-UZ") === String(item.name || "").toLocaleLowerCase("uz-UZ")) === index).slice(0, 6)
    : [];
  const chooseProduct = (product) => setProductForm((current) => ({ ...current, productName: product.name, brand: current.brand || product.brand || "", category: current.category || product.category || "", packaging: current.packaging || product.packaging || "Dona", sku: current.sku || product.sku || "", cost: current.cost || product.cost || "", price: current.price || product.price || "" }));
  const receiptDrafts = [...productQueue, ...(productForm.productName.trim() ? [productForm] : [])];
  const receiptTotal = receiptDrafts.reduce((sum, item) => sum + Math.max(0, Number(item.receivedQuantity) || 0) * moneyValue(item.cost), 0);
  const receiptDebt = Math.min(receiptTotal, moneyValue(supplierDebtInput));
  const receiptCash = Math.max(0, receiptTotal - receiptDebt);
  const newSupplierDrafts = [...pendingProducts, ...(form.productName.trim() ? [pickProduct(form)] : [])];
  const newSupplierTotal = newSupplierDrafts.reduce((sum, item) => sum + Math.max(0, Number(item.receivedQuantity) || 0) * moneyValue(item.cost), 0);
  const newSupplierDebt = Math.min(newSupplierTotal, moneyValue(newSupplierDebtInput));
  const newSupplierCash = Math.max(0, newSupplierTotal - newSupplierDebt);
  const selectedNewSupplierMetric = measurementOptions.find((item) => item.key === newSupplierMetric);

  const toast = useToast();

  const digits = form.phone.replace(/\D/g, "");
  const phoneValid = digits.length === 12;

  const productError = (product) => {
    const quantity = Number(product.receivedQuantity);
    const cost = Number(product.cost);
    if (!product.productName.trim() || !product.receivedQuantity || !product.cost) {
      return "Tovar nomi, qabul qilingan miqdor va tan narxini kiriting";
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost < 0) {
      return "Miqdor va tan narxini to'g'ri kiriting";
    }
    return "";
  };

  const addPendingProduct = () => {
    const product = pickProduct(form);
    const error = productError(product);
    if (error) return setErr(error);
    setPendingProducts((items) => [...items, { ...product, key: `${Date.now()}-${items.length}` }]);
    setForm((current) => ({ ...current, ...emptyProduct }));
    setNewSupplierMetric("");
    setErr("");
  };

  const queueProduct = () => {
    if (!productForm.productName.trim()) return setProductErr("Mahsulot nomini kiriting");
    setProductQueue((items) => [...items, { ...pickProduct(productForm), key: `${Date.now()}-${items.length}` }]);
    setProductForm((current) => ({ ...current, ...emptyProduct, packaging: "Dona" }));
    setProductErr("");
  };

  const addProductToSupplier = () => {
    const supplier = suppliers.find((item) => String(item.id) === String(productForm.supplierId));
    if (!supplier) return setProductErr("Ta'minotchini tanlang");
    const drafts = [...productQueue, ...(productForm.productName.trim() ? [pickProduct(productForm)] : [])];
    if (!drafts.length) return setProductErr("Kamida bitta mahsulot nomini kiriting");

    const createdAt = new Date().toISOString(), savedProducts = readList("crm_products");
    const productsToSave = drafts.map((draft, index) => {
      const quantity = Math.max(0, Number(draft.receivedQuantity) || 0);
      const existing = savedProducts.find((item) => String(item.supplierId) === String(supplier.id) && String(item.name || "").trim().toLowerCase() === draft.productName.trim().toLowerCase());
      if (existing) return { ...existing, stock: Number(existing.stock || 0) + quantity, brand: capitalizeStart(draft.brand.trim()) || existing.brand, sku: capitalizeStart(draft.sku.trim()) || existing.sku, category: capitalizeStart(draft.category.trim()) || existing.category, packaging: capitalizeStart(draft.packaging.trim()) || existing.packaging, cost: Number(draft.cost) || existing.cost, price: Number(draft.price) || existing.price };
      return {
        id: `${Date.now()}-manual-${index}`, name: capitalizeStart(draft.productName.trim()),
        brand: draft.brand.trim(), sku: draft.sku.trim() || `SKU-${Date.now().toString().slice(-6)}-${index + 1}`,
        category: draft.category.trim() || "Boshqa", packaging: capitalizeStart(draft.packaging.trim()) || "Dona",
        price: Number(draft.price) || 0, cost: Number(draft.cost) || 0, stock: quantity,
        status: quantity > 0 && quantity < 10 ? "low" : "active", supplierId: supplier.id,
        supplierName: supplier.name, unitsPerPackage: Number(draft.unitsPerPackage) || 0,
        liters: Number(draft.liters) || 0, weight: Number(draft.weight) || 0,
        volume: Number(draft.volume) || 0, length: Number(draft.length) || 0,
        width: Number(draft.width) || 0, height: Number(draft.height) || 0, createdAt,
      };
    });
    const receiptLines = drafts.map((draft, index) => ({ id: productsToSave[index].id, name: productsToSave[index].name, quantity: Math.max(0, Number(draft.receivedQuantity) || 0), cost: Number(draft.cost) || productsToSave[index].cost || 0 }));
    const totalAmount = receiptLines.reduce((sum, item) => sum + item.quantity * item.cost, 0), debtAmount = Math.min(totalAmount, moneyValue(supplierDebtInput)), cashAmount = Math.max(0, totalAmount - debtAmount);
    const order = { id: `PO-${Date.now().toString().slice(-6)}`, supplierId: supplier.id, items: receiptLines.reduce((sum, item) => sum + item.quantity, 0), productCount: receiptLines.length, productNames: receiptLines.map((item) => item.name), productIds: receiptLines.map((item) => item.id), productDetails: receiptLines, amount: totalAmount, remaining: debtAmount, payment: cashAmount === totalAmount ? "Naqd" : cashAmount ? "Qisman" : "Qarz", status: debtAmount === 0 ? "paid" : cashAmount ? "partial" : "debt", received: true, date: createdAt };
    const receipt = { id: `REC-${Date.now()}`, supplierId: supplier.id, supplier: supplier.name, orderId: order.id, items: order.items, products: order.productDetails, amount: order.amount, date: createdAt };
    const updated = suppliers.map((item) => item.id === supplier.id ? {
      ...item, products: (Number(item.products) || 0) + productsToSave.filter((product) => !savedProducts.some((saved) => String(saved.id) === String(product.id))).length,
      purchases: (Number(item.purchases) || 0) + order.amount, debt: (Number(item.debt) || 0) + debtAmount, lastOrder: createdAt,
    } : item);
    try {
      localStorage.setItem("crm_products", JSON.stringify([...productsToSave.filter((product) => !savedProducts.some((saved) => String(saved.id) === String(product.id))), ...savedProducts.map((saved) => productsToSave.find((product) => String(product.id) === String(saved.id)) || saved)]));
      localStorage.setItem("crm_suppliers", JSON.stringify(updated));
      localStorage.setItem(`crm_supplier_orders_${supplier.id}`, JSON.stringify([order, ...readList(`crm_supplier_orders_${supplier.id}`)]));
      localStorage.setItem("crm_supplier_receipts", JSON.stringify([receipt, ...readList("crm_supplier_receipts")]));
    } catch { return setProductErr("Mahsulot saqlanmadi. Qayta urinib ko'ring."); }
    setSuppliers(updated);
    setProductForm({ supplierId: "", ...emptyProduct, packaging: "Dona" });
    setProductQueue([]);
    setSupplierSearch("");
    setSupplierDebtInput("");
    setProductErr("");
    setProductOpen(false);
    toast.success && toast.success(`${productsToSave.length} ta mahsulot ta'minotchiga biriktirildi`);
  };

  const submit = () => {
    if (!form.name.trim()) {
      return setErr("Ta'minotchi nomini kiriting");
    }

    if (!phoneValid) {
      return setErr("Telefon raqamini to'liq kiriting");
    }

    const productDrafts = newSupplierDrafts;
    if (!productDrafts.length) return setErr("Kamida bitta tovarni qabulga qo'shing");
    const invalid = productDrafts.map(productError).find(Boolean);
    if (invalid) return setErr(invalid);

    setErr("");

    const prev = suppliers;
    const createdAt = new Date().toISOString();
    const updated = [
      {
        id:
          Math.max(
            0,
            ...prev.map((x) => Number(x.id) || 0)
          ) + 1,

        name: form.name.trim(),
        phone: form.phone,
        products: productDrafts.length,
        purchases: productDrafts.reduce((sum, item) => sum + Number(item.receivedQuantity) * Number(item.cost), 0),
        debt: newSupplierDebt,
        lastOrder: createdAt,
        createdAt,
        status: "active",
      },
      ...prev,
    ];
    const supplierId = updated[0].id;
    const productsForReceipt = productDrafts.map((item, index) => {
      const receivedQuantity = Number(item.receivedQuantity);
      return {
        id: `${Date.now()}-${index}`,
        name: item.productName.trim(), brand: item.brand.trim(),
        sku: item.sku.trim() || `SKU-${Date.now().toString().slice(-6)}-${index + 1}`,
        category: item.category.trim() || "Boshqa",
        price: Number(item.price) || 0, cost: Number(item.cost), stock: receivedQuantity,
        status: receivedQuantity < 10 ? "low" : "active", supplierId,
        supplierName: form.name.trim(), packaging: item.packaging,
        unitsPerPackage: Number(item.unitsPerPackage) || 0, liters: Number(item.liters) || 0,
        weight: Number(item.weight) || 0, volume: Number(item.volume) || 0,
        length: Number(item.length) || 0, width: Number(item.width) || 0, height: Number(item.height) || 0,
      };
    });
    const totalQuantity = productsForReceipt.reduce((sum, item) => sum + item.stock, 0);
    const totalAmount = productsForReceipt.reduce((sum, item) => sum + item.stock * item.cost, 0);
    const order = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      supplierId,
      items: totalQuantity,
      productCount: productsForReceipt.length,
      productNames: productsForReceipt.map((item) => item.name),
      productIds: productsForReceipt.map((item) => item.id),
      productDetails: productsForReceipt.map((item) => ({ id: item.id, name: item.name, quantity: item.stock, cost: item.cost })),
      amount: totalAmount,
      remaining: newSupplierDebt,
      payment: newSupplierCash === totalAmount ? "Naqd" : newSupplierCash ? "Qisman" : "Qarz",
      status: newSupplierDebt === 0 ? "paid" : newSupplierCash ? "partial" : "debt",
      received: true,
      date: createdAt,
    };
    const receipt = {
      id: `REC-${Date.now()}`,
      supplierId,
      supplier: form.name.trim(),
      orderId: order.id,
      items: totalQuantity,
      productCount: productsForReceipt.length,
      products: productsForReceipt.map((item) => ({ id: item.id, name: item.name, quantity: item.stock, cost: item.cost })),
      amount: order.amount,
      date: createdAt,
    };
    try {
      localStorage.setItem("crm_suppliers", JSON.stringify(updated));
      const savedProducts = JSON.parse(localStorage.getItem("crm_products") || "null");
      const products = Array.isArray(savedProducts) ? savedProducts : [];
      localStorage.setItem("crm_products", JSON.stringify([...productsForReceipt, ...products]));
      localStorage.setItem(`crm_supplier_orders_${supplierId}`, JSON.stringify([order]));
      const savedReceipts = JSON.parse(localStorage.getItem("crm_supplier_receipts") || "[]");
      localStorage.setItem("crm_supplier_receipts", JSON.stringify([receipt, ...(Array.isArray(savedReceipts) ? savedReceipts : [])]));
    }
    catch { setErr("Ta'minotchi saqlanmadi. Qayta urinib ko'ring."); return; }
    setSuppliers(updated);

    setForm({
      name: "",
      phone: "",
      ...emptyProduct,
      status: "active",
    });
    setPendingProducts([]);
    setNewSupplierDebtInput("");
    setNewSupplierMetric("");

    setOpen(false);

    toast.success &&
      toast.success("Ta'minotchi qo'shildi");
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    matchesDateRange(s.lastOrder || s.createdAt, dateFrom, dateTo)
  );

  return (
    <div className="space-y-6 fade-in">

      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Ta'minotchilar")}</h1>

          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Yetkazib beruvchilar va shartnomalar")}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setProductForm({ supplierId: "", ...emptyProduct, packaging: "Dona" }); setProductQueue([]); setSupplierSearch(""); setSupplierDebtInput(""); setProductErr(""); setProductOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--brand-light)", color: "var(--brand)", border: "1px solid var(--brand)" }}
          >
            <Package size={15} />{tx("Mahsulot qo'shish")}</button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-hover))", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
          >
            <Plus size={15} />{tx("Ta'minotchi qo'shish")}</button>
        </div>
      </div>

      {/* Analitika kartalari */}
      <div className="suppliers-stats grid grid-cols-4 gap-4">
        {[
          {
            label: "Jami ta'minotchilar",
            value: suppliers.length,
            icon: Truck,
            color: "var(--brand)",
            bg: "var(--brand-light)",
          },
          {
            label: "Jami mahsulotlar",
            value: suppliers.reduce(
              (s, x) => s + x.products,
              0
            ),
            icon: Package,
            color: "var(--violet)",
            bg: "var(--violet-light)",
          },
          {
            label: "Jami xaridlar",
            value:
              (
                suppliers.reduce(
                  (s, x) => s + x.purchases,
                  0
                ) / 1000000
              ).toFixed(0) + " mln",
            icon: DollarSign,
            color: "var(--success)",
            bg: "var(--success-light)",
          },
          {
            label: "Qarz",
            value:
              (
                suppliers
                  .filter((s) => s.debt > 0)
                  .reduce(
                    (s, x) => s + x.debt,
                    0
                  ) / 1000000
              ).toFixed(1) + " mln",
            icon: AlertCircle,
            color: "var(--danger)",
            bg: "var(--danger-light)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="supplier-stat-card rounded-2xl p-4 transition-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow:
                "0 2px 8px rgba(15,23,42,0.04)",
            }}
          >
            <div
              className="p-2.5 rounded-xl w-fit mb-3"
              style={{
                background: s.bg,
              }}
            >
              <s.icon
                size={18}
                style={{
                  color: s.color,
                }}
              />
            </div>

            <div
              className="text-xl font-display font-bold"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(s.value)}
            </div>

            <div
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-faint)",
              }}
            >
              {tx(s.label)}
            </div>
          </div>
        ))}
      </div>

      {/* Jadval */}
      <div
        className="suppliers-list-card rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow:
            "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        {/* Qidiruv */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-wrap"
          style={{
            borderBottom:
              "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              minWidth: 260,
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
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={tx("Ta'minotchi qidirish...")}
              className="bg-transparent outline-none text-sm flex-1"
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>

        {/* Table */}
        <div className="suppliers-table-scroll" role="region" aria-label={tx("Ta'minotchilar jadvali")} tabIndex="0">
        <table className="suppliers-table w-full">
          <thead>
            <tr
              style={{
                background: "var(--table-stripe)",
              }}
            >
              {[
                "Ta'minotchi",
                "Telefon",
                "Mahsulotlar",
                "Jami xaridlar",
                "Qarzdorlik",
                "So'nggi buyurtma",
                "Holat",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold"
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
            {filtered.map((s) => {
              const st =
                statusMap[s.status] ||
                statusMap.active;

              return (
                <tr
                  onClick={() =>
                    onNavigate &&
                    onNavigate("supplier-" + s.id)
                  }
                  key={s.id}
                  className="border-t table-row-hover transition-colors"
                  style={{
                    cursor: "pointer",
                    borderColor:
                      "var(--border-subtle)",
                  }}
                >
                  {/* Ta'minotchi */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg,var(--brand),var(--violet))",
                        }}
                      >
                        {tx(s.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join(""))}
                      </div>

                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {s.name}
                      </span>
                    </div>
                  </td>

                  {/* Telefon */}
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {s.phone}
                  </td>

                  {/* Mahsulotlar */}
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {tx(s.products)}{tx(" ta")}</td>

                  {/* Xaridlar */}
                  <td
                    className="px-5 py-3.5 text-sm font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    {formatCurrency(s.purchases)}</td>

                  {/* Qarzdorlik */}
                  <td className="px-5 py-3.5">
                    {s.debt > 0 ? (
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--danger)",
                        }}
                      >
                        {tx((s.debt / 1000000).toFixed(
                          1
                        ))}{" "}{tx("mln")}</span>
                    ) : (
                      <span
                        className="text-sm"
                        style={{
                          color:
                            "var(--success)",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>

                  {/* So'nggi buyurtma */}
                  <td
                    className="px-5 py-3.5 text-xs"
                    style={{
                      color:
                        "var(--text-faint)",
                    }}
                  >
                    {tx(s.lastOrder)}
                  </td>

                  {/* Holat */}
                  <td className="px-5 py-3.5">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {tx(st.label)}
                    </span>
                  </td>

                  {/* More */}
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{
                        color:
                          "var(--text-faint)",
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* ============================= */}
      {/* TA'MINOTCHI QO'SHISH MODALI */}
      {/* ============================= */}

      <Modal
        contentOnly
        open={open}
        onClose={() => {
          setOpen(false);
          setErr("");
          setPendingProducts([]);
          setNewSupplierDebtInput("");
          setNewSupplierMetric("");
        }}
        title={tx("Yangi ta'minotchi qo'shish")}
        subtitle={tx("Yetkazib beruvchi ma'lumotlari")}
        icon={Truck}
        width={760}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <Field label={tx("Ta'minotchi nomi")}>
            <input
              className="input-base"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder={tx("Global Import MChJ")}
            />
          </Field>

          <Field
            label={tx("Telefon raqami")}
            hint={tx("Faqat raqam kiritiladi")}
          >
            <PhoneInput
              value={form.phone}
              onChange={(v) =>
                setForm({
                  ...form,
                  phone: v,
                })
              }
            />
          </Field>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{tx("Tovarni qabul qilish")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>{tx("Bir yetkazib beruvchidan kelgan barcha mahsulotlarni bitta qabulga qo'shing")}</div>

            {pendingProducts.length > 0 && (
              <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: "var(--brand-light)", border: "1px solid var(--brand-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
                  <span>{tx("Qabulga qo'shilgan mahsulotlar")}</span>
                  <span>{pendingProducts.length} {tx("xil")}</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {pendingProducts.map((item, index) => (
                    <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "7px 9px", borderRadius: 8, background: "var(--surface)", fontSize: 12, color: "var(--text-secondary)" }}>
                      <span><b style={{ color: "var(--text-primary)" }}>{index + 1}. {item.productName}</b> · {item.receivedQuantity} {tx("ta")}</span>
                      <button type="button" onClick={() => setPendingProducts((items) => items.filter((product) => product.key !== item.key))} style={{ border: 0, background: "transparent", color: "var(--danger)", fontWeight: 700, cursor: "pointer" }}>{tx("O'chirish")}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <Field label={tx("Tovar nomi")}> <input className="input-base" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder={tx("Masalan: Kir yuvish kukuni")} /> </Field>
              <Field label={tx("Brend")}> <input className="input-base" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder={tx("Masalan: Ariel")} /> </Field>
              <Field label={tx("SKU kodi")}> <input className="input-base" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder={tx("Ixtiyoriy")} /> </Field>
              <Field label={tx("Kategoriya")}> <input className="input-base" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={tx("Masalan: Maishiy kimyo")} /> </Field>
              <Field label={tx("Qadoq turi")}> <select className="input-base" value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })}><option value="piece">{tx("Dona")}</option><option value="box">{tx("Karobka")}</option><option value="pack">{tx("Paket")}</option><option value="bottle">{tx("Butilka")}</option><option value="bag">{tx("Qop")}</option><option value="roll">{tx("Rulon")}</option></select> </Field>
              <Field label={tx("Qabul qilingan miqdor")}> <input className="input-base" type="number" min="0.001" step="any" value={form.receivedQuantity} onChange={(e) => setForm({ ...form, receivedQuantity: e.target.value })} placeholder={tx("Masalan: 20")} /> </Field>
              <Field label={tx("Qo'shimcha o'lchov")}>
                <select className="input-base" value={newSupplierMetric} onChange={(e) => setNewSupplierMetric(e.target.value)}>
                  <option value="">{tx("Tanlanmagan")}</option>
                  {measurementOptions.map((item) => <option key={item.key} value={item.key}>{tx(item.label)}</option>)}
                </select>
              </Field>
              {selectedNewSupplierMetric && (
                <Field label={tx(selectedNewSupplierMetric.label)}>
                  <input className="input-base" type="number" min="0" step="any" value={form[selectedNewSupplierMetric.key]} onChange={(e) => setForm({ ...form, [selectedNewSupplierMetric.key]: e.target.value })} placeholder={tx(selectedNewSupplierMetric.placeholder)} />
                </Field>
              )}
              <Field label={tx("Tan narxi (majburiy)")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 52 }} inputMode="decimal" value={moneyInputValue(form.cost, false)} onChange={(e) => setForm({ ...form, cost: String(toBaseMoney(e.target.value)) })} placeholder="0" /><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span></div></Field>
              <Field label={tx("Sotuv narxi (ixtiyoriy)")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 52 }} inputMode="decimal" value={moneyInputValue(form.price, false)} onChange={(e) => setForm({ ...form, price: String(toBaseMoney(e.target.value)) })} placeholder="0" /><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span></div></Field>
            </div>

            <button type="button" className="btn-ghost" onClick={addPendingProduct} style={{ marginTop: 14, width: "100%", justifyContent: "center", border: "1px dashed var(--brand)", color: "var(--brand)" }}>
              <Plus size={16} />{tx("Yana mahsulot qo'shish")}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)" }}><small style={{ color: "var(--text-muted)" }}>{tx("Umumiy summa")}</small><b style={{ display: "block", marginTop: 4 }}>{moneyText(newSupplierTotal)}</b></div>
            <Field label={tx("Qarzga yoziladi")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 48 }} inputMode="decimal" value={moneyInputValue(newSupplierDebtInput, false)} onChange={(event) => setNewSupplierDebtInput(String(Math.min(newSupplierTotal, toBaseMoney(event.target.value))))} placeholder="0"/><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)" }}>{tx("so'm")}</span></div></Field>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)" }}><small style={{ color: "var(--text-muted)" }}>{tx("Naqd to'lov")}</small><b style={{ display: "block", marginTop: 4 }}>{moneyText(newSupplierCash)}</b></div>
          </div>

          {err && (
            <div
              style={{
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background:
                  "var(--danger-light)",
                color: "var(--danger)",
                border:
                  "1px solid var(--danger-border)",
              }}
            >
              {tx(err)}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                setErr("");
                setPendingProducts([]);
                setNewSupplierDebtInput("");
                setNewSupplierMetric("");
              }}
            >{tx("Bekor qilish")}</button>

            <button
              type="button"
              className="btn-primary"
              onClick={submit}
            >
              <Plus size={15} />{tx("Ta'minotchi va mahsulotlarni saqlash")}</button>
          </div>
        </div>
      </Modal>

      <Modal
        contentOnly
        open={productOpen}
        onClose={() => { setProductOpen(false); setProductErr(""); setProductQueue([]); setSupplierSearch(""); setSupplierDebtInput(""); }}
        title={tx("Ta'minotchiga mahsulot qo'shish")}
        subtitle={tx("Mahsulotni mavjud ta'minotchiga biriktiring")}
        icon={Package}
        width={680}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, background: "var(--brand-light)", color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
            {tx("Faqat mahsulot nomi va ta'minotchini tanlash majburiy. Qolgan ma'lumotlarni hozir yoki keyin kiritishingiz mumkin.")}
          </div>

          <Field label={tx("Ta'minotchi *")}>
            <div style={{ position: "relative" }}>
              <input className="input-base" value={supplierSearch} onChange={(e) => { const value = capitalizeStart(e.target.value); setSupplierSearch(value); setProductForm({ ...productForm, supplierId: "" }); }} placeholder={tx("Ismini yozib qidiring...")} autoComplete="off" />
              {supplierSearch && !productForm.supplierId && (
                <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "calc(100% + 4px)", maxHeight: 156, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", boxShadow: "0 8px 22px rgba(15,23,42,.12)" }}>
                  {suppliers.filter((supplier) => supplier.name.toLocaleLowerCase("uz-UZ").includes(supplierSearch.toLocaleLowerCase("uz-UZ"))).map((supplier) => (
                    <button key={supplier.id} type="button" onClick={() => { setProductForm({ ...productForm, supplierId: supplier.id }); setSupplierSearch(supplier.name); }} style={{ width: "100%", padding: "10px 12px", textAlign: "left", border: 0, background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>{supplier.name}</button>
                  ))}
                  {!suppliers.some((supplier) => supplier.name.toLocaleLowerCase("uz-UZ").includes(supplierSearch.toLocaleLowerCase("uz-UZ"))) && <div style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: 12 }}>{tx("Ta'minotchi topilmadi")}</div>}
                </div>
              )}
            </div>
          </Field>

          {productQueue.length > 0 && (
            <div style={{ padding: 12, borderRadius: 12, background: "var(--brand-light)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}><span>{tx("Qo'shilgan mahsulotlar")}</span><span>{productQueue.length} {tx("xil")}</span></div>
              <div style={{ display: "grid", gap: 6 }}>{productQueue.map((item, index) => <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 9px", borderRadius: 8, background: "var(--surface)", fontSize: 12 }}><span>{index + 1}. <b>{item.productName}</b></span><button type="button" onClick={() => setProductQueue((items) => items.filter((product) => product.key !== item.key))} style={{ border: 0, background: "transparent", color: "var(--danger)", cursor: "pointer" }}>{tx("O'chirish")}</button></div>)}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label={tx("Mahsulot nomi *")}>
              <div style={{ position: "relative" }}><input className="input-base" value={productForm.productName} onChange={(e) => setProductForm({ ...productForm, productName: capitalizeStart(e.target.value) })} placeholder={tx("Masalan: Kir yuvish kukuni")} autoComplete="off" />{productSuggestions.length > 0 && <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "calc(100% + 4px)", maxHeight: 156, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", boxShadow: "0 8px 22px rgba(15,23,42,.12)" }}>{productSuggestions.map((product) => <button key={product.id} type="button" onClick={() => chooseProduct(product)} style={{ width: "100%", padding: "10px 12px", textAlign: "left", border: 0, background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</button>)}</div>}</div>
            </Field>
            <Field label={tx("Qadoq turi")}> <input className="input-base" value={productForm.packaging} onChange={(e) => setProductForm({ ...productForm, packaging: capitalizeStart(e.target.value) })} placeholder={tx("Masalan: Karobka")} /> </Field>
            <Field label={tx("Brend")}> <input className="input-base" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: capitalizeStart(e.target.value) })} placeholder={tx("Ixtiyoriy")} /> </Field>
            <Field label={tx("Kategoriya")}> <input className="input-base" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: capitalizeStart(e.target.value) })} placeholder={tx("Ixtiyoriy")} /> </Field>
            <Field label={tx("SKU kodi")}> <input className="input-base" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: capitalizeStart(e.target.value) })} placeholder={tx("Ixtiyoriy")} /> </Field>
            <Field label={tx("Tan narxi")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 52 }} type="number" min="0" step="any" value={moneyInputValue(productForm.cost, false)} onChange={(e) => setProductForm({ ...productForm, cost: String(toBaseMoney(e.target.value)) })} placeholder={tx("Ixtiyoriy")} /><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span></div></Field>
            <Field label={tx("Sotuv narxi")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 52 }} type="number" min="0" step="any" value={moneyInputValue(productForm.price, false)} onChange={(e) => setProductForm({ ...productForm, price: String(toBaseMoney(e.target.value)) })} placeholder={tx("Ixtiyoriy")} /><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span></div></Field>
          </div>

          <button type="button" className="btn-ghost" onClick={queueProduct} style={{ width: "100%", justifyContent: "center", border: "1px dashed var(--brand)", color: "var(--brand)" }}><Plus size={16} />{tx("Yana mahsulot qo'shish")}</button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)" }}><small style={{ color: "var(--text-muted)" }}>{tx("Umumiy summa")}</small><b style={{ display: "block", marginTop: 4 }}>{moneyText(receiptTotal)}</b></div>
            <Field label={tx("Qarzga yoziladi")}><div style={{ position: "relative" }}><input className="input-base" style={{ paddingRight: 48 }} inputMode="decimal" value={moneyInputValue(supplierDebtInput, false)} onChange={(event) => setSupplierDebtInput(String(Math.min(receiptTotal, toBaseMoney(event.target.value))))} placeholder="0"/><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)" }}>{tx("so'm")}</span></div></Field>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-2)" }}><small style={{ color: "var(--text-muted)" }}>{tx("Naqd to'lov")}</small><b style={{ display: "block", marginTop: 4 }}>{moneyText(receiptCash)}</b></div>
          </div>

          {productErr && <div style={{ fontSize: 12, padding: "10px 12px", borderRadius: 10, background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}>{tx(productErr)}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={() => { setProductOpen(false); setProductQueue([]); setSupplierDebtInput(""); }}>{tx("Bekor qilish")}</button>
            <button type="button" className="btn-primary" onClick={addProductToSupplier}><Plus size={15} />{tx("Mahsulotlarni saqlash")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
