import ReceivingCardSelect from "../components/ReceivingCardSelect";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { useState } from "react";
import { ShoppingBag, CreditCard, ChevronRight, CheckCircle, X } from "lucide-react";
import { products as catalogProducts } from "../data/mockData";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
export function DebtPaymentModal({ sale, paymentAmount, setPaymentAmount, method, setMethod, selectedCardId, setSelectedCardId, completed, onSubmit, onClose, dialogRef }) {
  useUILanguage();
  const [showProducts, setShowProducts] = useState(true);
  const names = sale.items?.length
    ? sale.items.map((item) => item.name).filter(Boolean)
    : (sale.productIds || [])
      .map((id) => catalogProducts.find((product) => product.id === id)?.name)
      .filter(Boolean);
  const amount = Math.min(sale.debtBalance, Number(String(paymentAmount || "").replace(/\D/g, "")) || 0);
  return (
    <div className="crm-content-modal">
      <div ref={dialogRef} className="customer-payment-modal slide-up" role="dialog" aria-modal="true" aria-labelledby="customer-payment-title">
        <div className="customer-payment-header">
          <h2 id="customer-payment-title">{tx("To'lovni qabul qilish")}</h2>
          <button type="button" onClick={onClose} aria-label={tx("Oynani yopish")}><X size={18} /></button>
        </div>

        <div className="customer-payment-summary">
          <div className="customer-payment-products-head">
            <span className="customer-payment-icon"><ShoppingBag size={20} /></span>
            <div><strong>{tx("Olingan tovarlar")}</strong><small>{tx(sale.products)}{tx(" ta mahsulot · ")}{sale.id}</small></div>
            <button type="button" onClick={() => setShowProducts((value) => !value)} aria-expanded={showProducts}>{tx("Batafsil ")}<ChevronRight size={15} className={showProducts ? "is-open" : ""} />
            </button>
          </div>
          {showProducts && (
            <ol className="customer-payment-products-list">
              {names.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
              {names.length === 0 && <li>{tx("Mahsulot nomlari kiritilmagan")}</li>}
            </ol>
          )}
          <div className="customer-payment-totals">
            <div><span>{tx("Jami qarz")}</span><strong>{formatCurrency(sale.amount)}</strong></div>
            <div><span>{tx("To'langan")}</span><strong className="is-paid">{formatCurrency(Number(sale.paidAmount || 0))}</strong></div>
            <div className="is-remaining"><span>{tx("Qolgan qarz")}</span><strong>{formatCurrency(sale.debtBalance)}</strong></div>
          </div>
        </div>

        <div className="customer-payment-fieldset">
          <strong>{tx("Qaytariladigan summa")}</strong>
          <div style={{ position: "relative", marginTop: 10 }}>
            <input
              className="input-base"
              style={{ paddingRight: 54 }}
              inputMode="decimal"
              value={moneyInputValue(paymentAmount, false)}
              onChange={(event) => setPaymentAmount(String(Math.min(sale.debtBalance, toBaseMoney(event.target.value))))}
              placeholder="0"
              disabled={completed}
            />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span>
          </div>
          <div className="customer-payment-selected">
            <span className="customer-payment-percent-icon">✓</span>
            <span>{tx("Qabul qilinadigan summa: ")}<strong>{formatCurrency(amount)}</strong><small>{tx("Qolgan qarz: ")}{formatCurrency(Math.max(0, sale.debtBalance - amount))}</small></span>
          </div>
        </div>

        <div className="customer-payment-fieldset">
          <strong>{tx("To'lov usuli")}</strong>
          <div className="customer-payment-choices">
            <button type="button" className={method === "cash" ? "is-active" : ""} aria-pressed={method === "cash"} onClick={() => setMethod("cash")} disabled={completed}>{tx("Naqd")}</button>
            <button type="button" className={method === "card" ? "is-active" : ""} aria-pressed={method === "card"} onClick={() => setMethod("card")} disabled={completed}><CreditCard size={16} />{tx(" Karta")}</button>
          </div>
        </div>

        {method === "card" && (
          <ReceivingCardSelect value={selectedCardId} onChange={setSelectedCardId} disabled={completed} />
        )}

        <button type="button" className={`customer-payment-submit ${completed ? "is-complete" : ""}`} onClick={onSubmit} disabled={completed || amount <= 0}>
          <CheckCircle size={18} /> {tx(completed ? "To'lov qabul qilindi" : "To'lovni qabul qilish")}
        </button>
        {completed && <p className="customer-payment-complete">{tx("To'lov muvaffaqiyatli qayd etildi.")}</p>}
      </div>
    </div>
  );
}
