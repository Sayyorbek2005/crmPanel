import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Minus, Package, Plus, ShoppingCart, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translateText as tx } from "../locales/translateText";
import { formatCurrency } from "../data/currency";
import "./ProductQuickAddModal.css";

const readList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const toTime = (value) => {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
};

export default function ProductQuickAddModal({ product, suppliers, quantity, onQuantityChange, onAdd, onClose }) {
  useLanguage();
  const quantityRef = useRef(null);
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  const receipts = readList("crm_supplier_receipts")
    .map((receipt) => ({
      ...receipt,
      line: (Array.isArray(receipt.products) ? receipt.products : Array.isArray(receipt.productDetails) ? receipt.productDetails : [])
        .find((item) => String(item.id ?? item.productId) === String(product.id)),
    }))
    .filter((receipt) => receipt.line)
    .sort((a, b) => toTime(b.date) - toTime(a.date));
  const latestReceipt = receipts[0];
  const supplierId = product.supplierId ?? latestReceipt?.supplierId;
  const supplier = suppliers.find((item) => String(item.id) === String(supplierId));
  const supplierName = product.supplierName || latestReceipt?.supplier || supplier?.name || "";
  const receivedAt = latestReceipt?.date || product.lastReceivedAt || product.receivedAt || "";
  const receivedQuantity = latestReceipt?.line?.quantity;
  const receivedDate = receivedAt && toTime(receivedAt) ? new Date(receivedAt) : null;
  const formattedDate = receivedDate
    ? [String(receivedDate.getDate()).padStart(2, "0"), String(receivedDate.getMonth() + 1).padStart(2, "0"), receivedDate.getFullYear()].join(".")
    : "";

  useEffect(() => {
    quantityRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const setQuantity = (value) => {
    if (value === "") return onQuantityChange("");
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    onQuantityChange(String(Math.max(0, Math.min(stock, Math.floor(number)))));
  };

  return createPortal(
    <div className="crm-content-modal product-quick-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="product-quick-modal" role="dialog" aria-modal="true" aria-labelledby="product-quick-title">
        <header className="product-quick-header">
          <div><span>{tx("Mahsulot tafsilotlari")}</span><h2 id="product-quick-title">{product.name}</h2></div>
          <button type="button" className="product-quick-close" onClick={onClose} aria-label={tx("Oynani yopish")}><X size={20} /></button>
        </header>
        <div className="product-quick-body">
          <div className="product-quick-overview">
            <div className="product-quick-image" aria-hidden="true"><Package size={26} strokeWidth={1.8} /></div>
            <div><span>{tx(product.category || "Mahsulot")}</span><strong>{formatCurrency(product.price)}</strong>{product.sku && <small>{tx("Artikul")}: {product.sku}</small>}</div>
          </div>
          <dl className="product-quick-details">
            <div><dt>{tx("Ta'minotchi")}</dt><dd>{supplierName || tx("Ta'minotchi ko'rsatilmagan")}</dd></div>
            <div><dt>{tx("Omborga kelgan sana")}</dt><dd>{formattedDate || tx("Kirim sanasi qayd qilinmagan")}{receivedQuantity != null && <small>{tx("So'nggi kirim")}: {Number(receivedQuantity).toLocaleString()} {tx("dona")}</small>}</dd></div>
            <div><dt>{tx("Hozir omborda")}</dt><dd className={stock ? "is-available" : "is-empty"}>{stock.toLocaleString()} {tx("dona")}</dd></div>
          </dl>
          <div className="product-quick-quantity">
            <label htmlFor="product-quick-quantity">{tx("Kerakli miqdor")}</label>
            <div className="product-quick-stepper">
              <button type="button" aria-label={tx("Kamaytirish")} disabled={Number(quantity) <= 1 || !stock} onClick={() => setQuantity(Number(quantity || 1) - 1)}><Minus size={17} /></button>
              <input ref={quantityRef} id="product-quick-quantity" type="number" inputMode="numeric" min="1" max={stock} step="1" value={quantity} disabled={!stock} aria-label={tx("Kerakli miqdor")} onChange={(event) => setQuantity(event.target.value)} />
              <button type="button" aria-label={tx("Ko'paytirish")} disabled={!stock || Number(quantity) >= stock} onClick={() => setQuantity(Number(quantity || 0) + 1)}><Plus size={17} /></button>
            </div>
            <small>{stock ? `${tx("Mavjud")} ${stock.toLocaleString()} ${tx("dona")}` : tx("Mahsulot tugagan")}</small>
          </div>
        </div>
        <footer className="product-quick-footer">
          <button type="button" className="product-quick-cancel" onClick={onClose}>{tx("Bekor qilish")}</button>
          <button type="button" className="product-quick-add" disabled={!stock || !Number(quantity)} onClick={() => onAdd(Number(quantity))}><ShoppingCart size={17} />{tx("Savatga qo'shish")}</button>
        </footer>
      </section>
    </div>,
    document.getElementById("main-modal-root") || document.body,
  );
}
