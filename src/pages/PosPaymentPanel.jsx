import ReceivingCardSelect from "../components/ReceivingCardSelect";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { FiCheckCircle, FiShoppingCart, FiX, FiCreditCard, FiCalendar } from "react-icons/fi";
import { formatDateInputValue } from './posHelpers';

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
export function PaymentSuccessAnimation({ amount, remainingDebt }) {
  useUILanguage();
  return (
    <div className="pos-faceid-backdrop" role="dialog" aria-modal="true" aria-label={tx("To'lov tasdiqlanmoqda")}>
      <div className="pos-faceid-modal">
        <div className="pos-faceid-orb" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle className="pos-faceid-track" cx="60" cy="60" r="46" />
            <circle className="pos-faceid-scan" cx="60" cy="60" r="46" />
            <path className="pos-faceid-check" d="M38 61.5 53 76 83 44" />
          </svg>
        </div>
        <div className="pos-faceid-copy">
          <strong>{tx("To'lov qabul qilindi")}</strong>
          <span>{formatCurrency(amount)}</span>
          {remainingDebt > 0 && <small>{tx("Qolgan qarz: ")}{formatCurrency(remainingDebt)}</small>}
        </div>
      </div>
    </div>
  );
}

export function PosPaymentPanel({
  cart,
  total,
  paymentAmount,
  setPaymentAmount,
  method,
  setMethod,
  selectedCardId, setSelectedCardId,
  debtDueDate,
  setDebtDueDate,
  error,
  setError,
  completed,
  paidAmount,
  onConfirm,
  onClose,
}) {
  useUILanguage();
  const [showProducts, setShowProducts] = useState(true);
  const saleTotal = Math.round(total);
  const enteredAmount = paymentAmount === ""
    ? saleTotal
    : Math.min(saleTotal, Math.max(0, Number(paymentAmount) || 0));
  const remaining = Math.max(0, saleTotal - (completed ? paidAmount : enteredAmount));
  return (
    <section className="pos-cart-section pos-order-panel pos-payment-panel" aria-label={tx("To'lovni qabul qilish")}>
      <div className="pos-payment-header">
        <h2>{tx("To'lovni qabul qilish")}</h2>
        <button type="button" onClick={onClose} aria-label={tx("To'lov oynasini yopish")}><FiX size={18} /></button>
      </div>

      <div className="pos-payment-body">
        <div className="pos-payment-summary">
          <div className="pos-payment-products-head">
            <span className="pos-payment-icon"><FiShoppingCart size={19} /></span>
            <div><strong>{tx("Olingan tovarlar")}</strong><small>{tx(cart.length)}{tx(" ta mahsulot")}</small></div>
            <button type="button" onClick={() => setShowProducts((open) => !open)} aria-expanded={showProducts}>{tx("Batafsil ")}<span aria-hidden="true">{tx(showProducts ? "⌄" : "›")}</span>
            </button>
          </div>
          {showProducts && (
            <ol className="pos-payment-products-list">
              {cart.map((item, index) => (
                <li key={item.cartKey}>
                  <span className="pos-payment-product-index">{tx(index + 1)}.</span>
                  <span>{item.name}</span>
                  <span>{tx(item.qty)}{tx(" dona")}</span>
                  <strong>{formatCurrency(item.price * item.qty)}</strong>
                </li>
              ))}
            </ol>
          )}
          <div className="pos-payment-totals">
            <div><span>{tx("Jami to'lov")}</span><strong>{formatCurrency(saleTotal)}</strong></div>
            <div><span>{tx("To'langan")}</span><strong className="is-paid">{formatCurrency(completed ? paidAmount : enteredAmount)}</strong></div>
            <div className="is-remaining"><span>{tx("Qolgan qarz")}</span><strong>{formatCurrency(remaining)}</strong></div>
          </div>
        </div>

        <div className="pos-payment-fieldset">
          <strong>{tx("To'lovni kiriting")}</strong>
          <label className="pos-payment-amount-input">
            <input
              type="text"
              inputMode="decimal"
              value={moneyInputValue(paymentAmount, false)}
              onChange={(event) => {
                const entered = event.target.value;
                if (entered === "") setPaymentAmount("");
                else setPaymentAmount(String(Math.min(saleTotal, Math.max(0, toBaseMoney(entered)))));
                setError("");
              }}
              placeholder={tx("Oldindan to'lov (ixtiyoriy)")}
              disabled={completed}
              aria-label={tx("To'lanadigan summa")}
            />
            <span>{tx("so'm")}</span>
          </label>
          <div className="pos-payment-calculation">
            <span>{tx("To'lovdan keyingi qarz")}</span>
            <strong>{formatCurrency(remaining)}</strong>
          </div>
          <small>{tx("Bo'sh qoldirilsa, buyurtma to'liq to'langan deb saqlanadi. Qisman to'lov kiritsangiz, qolgani qarzga yoziladi.")}</small>
        </div>

        <div className="pos-payment-fieldset pos-payment-due-date">
          <strong>{tx("Qaytarish muddati")}</strong>
          <label>
            <FiCalendar size={15} aria-hidden="true" />
            <input
              type="date"
              min={formatDateInputValue(new Date())}
              value={debtDueDate}
              onChange={(event) => {
                setDebtDueDate(event.target.value);
                setError("");
              }}
              disabled={completed || remaining === 0}
              required={remaining > 0}
            />
          </label>
          <small>{tx("Qolgan qarz shu sanagacha to'lanishi kerak")}</small>
        </div>

        <div className="pos-payment-fieldset">
          <strong>{tx("To'lov usuli")}</strong>
          <div className="pos-payment-choices">
            <button type="button" className={method === "cash" ? "is-active" : ""} aria-pressed={method === "cash"} onClick={() => { setMethod("cash"); setError(""); }} disabled={completed}>{tx("Naqd")}</button>
            <button type="button" className={method === "card" ? "is-active" : ""} aria-pressed={method === "card"} onClick={() => { setMethod("card"); setError(""); }} disabled={completed}><FiCreditCard size={15} />{tx(" Karta")}</button>
          </div>
        </div>

        {method === "card" && (
          <ReceivingCardSelect value={selectedCardId} onChange={setSelectedCardId} disabled={completed} />
        )}
        {error && <p className="pos-payment-error" role="alert">{tx(error)}</p>}
      </div>

      <div className="pos-payment-footer">
        {completed ? (
          <div className="pos-payment-complete" role="status"><FiCheckCircle size={18} /><strong>{tx(paidAmount === 0 ? "Qarz qayd etildi" : "To'lov qabul qilindi")}</strong><small>{tx(paidAmount === 0 ? "Sotuv qarz sifatida saqlandi." : "To'lov muvaffaqiyatli qayd etildi.")}</small></div>
        ) : (
          <button type="button" className="pos-payment-submit" onClick={onConfirm} disabled={saleTotal <= 0}><FiCheckCircle size={18} /> {tx(enteredAmount === 0 ? "Qarzga rasmiylashtirish" : "To'lovni qabul qilish")}</button>
        )}
      </div>
    </section>
  );
}
