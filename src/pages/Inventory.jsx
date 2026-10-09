import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import "./Inventory.css";
import { useState } from "react";
import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Package,
  DollarSign,
  X,
} from "lucide-react";
import { readStockProducts, stockAlerts, stockMinimum } from "../data/stockStore";
import { formatCurrency } from "../data/currency";

export default function Inventory() {
  useUILanguage();
  const [products, setProducts] = useState(readStockProducts);
  const [adjustError, setAdjustError] = useState("");
  const lowStockItems = stockAlerts(products);
  const [modal, setModal] = useState(null);
  const [, setAdjustProduct] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openModal = (type, product) => {
    setModal(type);
    setAdjustProduct(product || null);
    setSelectedProductId(product ? product.id : products[0]?.id || "");
    setQty("");
    setReason("");
    setNote("");
  };

  const closeModal = () => {
    setModal(null);
    setAdjustProduct(null);
    setAdjustError("");
  };

  const saveAdjustment = () => {
    const amount = Number(qty);
    const selected = products.find((product) => String(product.id) === String(selectedProductId));
    if (!selected || !Number.isInteger(amount) || amount <= 0) {
      setAdjustError("Mahsulotni va musbat butun miqdorni kiriting.");
      return;
    }
    if (modal === "out" && amount > Number(selected.stock || 0)) {
      setAdjustError("Chiqim miqdori ombordagi qoldiqdan oshmasin.");
      return;
    }
    const next = products.map((product) => {
      if (String(product.id) !== String(selectedProductId)) return product;
      const stock = Number(product.stock || 0) + (modal === "in" ? amount : -amount);
      const movementField = modal === "in" ? "stockIn" : "stockOut";
      return { ...product, stock, [movementField]: Number(product[movementField] || 0) + amount,
        status: stock === 0 ? "out" : stock < stockMinimum(product) ? "low" : "active" };
    });
    try {
      localStorage.setItem("crm_products", JSON.stringify(next));
      setProducts(next);
      closeModal();
    } catch {
      setAdjustError("O'zgarish saqlanmadi. Qayta urinib ko'ring.");
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Omborni boshqarish")}</h1>
          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Inventarizatsiya va stok nazorati")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal("out")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-red-50 cursor-pointer"
            style={{
              border: "1px solid var(--danger-border, var(--danger))",
              color: "var(--danger)",
            }}
          >
            <ArrowDownCircle size={15} />{tx(" Chiqim")}</button>
          <button
            onClick={() => openModal("in")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--success), #059669)",
              boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
            }}
          >
            <ArrowUpCircle size={15} />{tx(" Kirim")}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Jami mahsulotlar",
            value: products.length + " ta",
            icon: Package,
            color: "var(--brand)",
            bg: "var(--brand-light)",
          },
          {
            label: "Ombor qiymati",
            value: formatCurrency(totalValue),
            icon: DollarSign,
            color: "var(--success)",
            bg: "var(--success-light)",
          },
          {
            label: "Kam qolgan",
            value:
              lowStockItems.filter((i) => i.status === "low").length + " ta",
            icon: AlertTriangle,
            color: "var(--warning)",
            bg: "var(--warning-light)",
          },
          {
            label: "Tugagan",
            value: lowStockItems.filter((i) => i.status === "critical").length + " ta",
            icon: AlertTriangle,
            color: "var(--danger)",
            bg: "var(--danger-light)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 transition-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
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

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--warning-light)",
            border: "1px solid var(--warning-border, var(--warning))",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              size={16}
              style={{
                color: "var(--warning)",
              }}
            />
            <h3
              className="font-semibold text-sm"
              style={{
                color: "var(--warning-strong, var(--warning))",
              }}
            >{tx("Ombor ogohlantirishlari")}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: "var(--warning)",
                color: "white",
              }}
            >
              {tx(lowStockItems.length)}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--warning-border, var(--warning))",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  {item.name}
                </div>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      item.status === "critical"
                        ? "var(--danger-light)"
                        : "var(--warning-light)",
                    color:
                      item.status === "critical"
                        ? "var(--danger)"
                        : "var(--warning)",
                  }}
                >
                  {tx(item.current)}{tx(" dona")}</span>
                <button
                  onClick={() => openModal("in", item)}
                  className="text-xs font-semibold hover:underline cursor-pointer"
                  style={{
                    color: "var(--brand)",
                  }}
                >{tx("Buyurtma")}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              minWidth: 280,
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
              placeholder={tx("Mahsulot qidirish...")}
              className="bg-transparent outline-none text-sm flex-1"
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr
              style={{
                background: "var(--table-stripe)",
              }}
            >
              {[
                "Mahsulot",
                "SKU",
                "Kirim",
                "Chiqim",
                "Joriy qoldiq",
                "Min. qoldiq",
                "Holat",
                "Amallar",
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
            {filtered.map((p) => {
              const statusColor =
                Number(p.stock) === 0
                  ? "var(--danger)"
                  : Number(p.stock) < stockMinimum(p)
                  ? "var(--warning)"
                  : "var(--success)";
              const statusBg =
                Number(p.stock) === 0
                  ? "var(--danger-light)"
                  : Number(p.stock) < stockMinimum(p)
                  ? "var(--warning-light)"
                  : "var(--success-light)";
              const statusLabel =
                Number(p.stock) === 0
                  ? "Tugagan"
                  : Number(p.stock) < stockMinimum(p)
                  ? "Kam qolgan"
                  : "Yetarli";
              return (
                <tr
                  key={p.id}
                  className="border-t hover:bg-blue-50/20 transition-colors"
                  style={{
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tx(p.image)}</span>
                      <div>
                        <div
                          className="text-sm font-semibold"
                          style={{
                            color: "var(--text-primary)",
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{
                            color: "var(--text-faint)",
                          }}
                        >
                          {p.brand}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code
                      className="text-xs font-mono px-2 py-0.5 rounded-md"
                      style={{
                        background: "var(--border-subtle)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.sku}
                    </code>
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{
                      color: "var(--success)",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <ArrowUpCircle size={13} />
                      {tx(Number(p.stockIn || 0))}
                    </div>
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{
                      color: "var(--danger)",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <ArrowDownCircle size={13} />
                      {tx(Number(p.stockOut || 0))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-20 h-1.5 rounded-full"
                        style={{
                          background: "var(--border-subtle)",
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((p.stock / 200) * 100, 100)}%`,
                            background: statusColor,
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: "var(--text-primary)",
                        }}
                      >
                        {tx(p.stock)}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm"
                    style={{
                      color: "var(--text-muted)",
                    }}
                  >
                    {tx(stockMinimum(p))}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: statusBg,
                        color: statusColor,
                      }}
                    >
                      {tx(statusLabel)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal("in", p)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 cursor-pointer"
                        style={{
                          background: "var(--success-light)",
                          color: "var(--success)",
                        }}
                      >{tx("+Kirim")}</button>
                      <button
                        onClick={() => openModal("out", p)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 cursor-pointer"
                        style={{
                          background: "var(--danger-light)",
                          color: "var(--danger)",
                        }}
                      >{tx("-Chiqim")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjustment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-container slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="font-display font-bold text-lg"
                  style={{
                    fontFamily: "'Manrope',sans-serif",
                    color: "var(--text-primary)",
                  }}
                >
                  {tx(modal === "in" ? "Omborga kirim" : "Ombordan chiqim")}
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--text-faint)",
                  }}
                >{tx("Stok o'zgartirish")}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X
                  size={18}
                  style={{
                    color: "var(--text-faint)",
                  }}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >{tx("Mahsulot")}</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >{tx("Miqdor")}</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={tx("Miqdorni kiriting")}
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
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >{tx("Sabab")}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">{tx("Sabab tanlang")}</option>
                  {modal === "in"
                    ? [
                        "Ta'minotchidan keldi",
                        "Qaytarilgan tovar",
                        "Inventarizatsiya tuzatish",
                      ].map((o) => (
                        <option key={o} value={o}>
                          {tx(o)}
                        </option>
                      ))
                    : [
                        "Sotuv",
                        "Shikastlangan",
                        "Inventarizatsiya tuzatish",
                        "Boshqa",
                      ].map((o) => (
                        <option key={o} value={o}>
                          {tx(o)}
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >{tx("Izoh")}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={tx("Qo'shimcha izoh...")}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {adjustError && <p className="text-sm text-red-600 mt-3">{tx(adjustError)}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors hover:bg-gray-50 cursor-pointer"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >{tx("Bekor qilish")}</button>
              <button
                onClick={saveAdjustment}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 cursor-pointer"
                style={{
                  background:
                    modal === "in" ? "var(--success)" : "var(--danger)",
                }}
              >
                {tx(modal === "in" ? "Kirim qilish" : "Chiqim qilish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
