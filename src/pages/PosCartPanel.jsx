import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { createPortal } from "react-dom";
import React, { useEffect, useRef, useState } from "react";
import {
  FiPlus,
  FiMinus,
  FiTrash2,
  FiShoppingCart,
  FiTag,
  FiUser,
  FiPhone,
  FiX,
  FiFileText,
  FiMapPin,
  FiCreditCard,
} from "react-icons/fi";
import { addressPhoneDigits } from './posHelpers';
import { PosPaymentPanel } from './PosPaymentPanel';

import { formatCurrency } from "../data/currency";
export function CartPanelContent({
  cart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  addresses,
  selectedAddressId,
  setSelectedAddressId,
  addDeliveryAddress,
  confirmDeliveryAddresses,
  moveItemToAddress,
  deliveryAddress,
  setDeliveryAddress,
  addressConfirmed,
  setAddressConfirmed,
  addressError,
  setAddressError,
  updateQty,
  setExactQty,
  removeItem,
  clearCart,
  globalDiscount,
  setGlobalDiscount,
  subtotal,
  discountAmt,
  total,
  handleCheckout,
  handleOpenReceipt,
  customerError,
  paymentOpen,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  selectedCardId,
  setSelectedCardId,
  debtDueDate,
  setDebtDueDate,
  paymentError,
  setPaymentError,
  paymentComplete,
  paidAmount,
  confirmPayment,
  closePayment,
}) {
  useUILanguage();
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [tempQty, setTempQty] = useState("");
  const [allItemsOpen, setAllItemsOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: "", address: "", phone: "" });
  const [addressFormError, setAddressFormError] = useState("");
  const addressInputRef = useRef(null);
  const cartItemsRef = useRef(null);

  useEffect(() => {
    cartItemsRef.current?.scrollTo({ top: 0 });
  }, [addresses.length]);

  const handleQtyClick = (item) => {
    setEditingQtyId(item.cartKey);
    setTempQty(String(item.qty));
  };

  const commitQty = (id) => {
    const value = Number(tempQty);
    if (tempQty !== "" && Number.isSafeInteger(value) && value > 0) {
      setExactQty(id, value);
    }
    setEditingQtyId(null);
  };

  const handleQtySubmit = (id, e) => {
    e.preventDefault();
    commitQty(id);
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setCustomerPhone((digits.startsWith("998") && digits.length > 9
      ? digits.slice(3)
      : digits).slice(0, 9));
  };

  const confirmAddress = () => {
    if (!confirmDeliveryAddresses() && addresses.length < 2) {
      addressInputRef.current?.focus();
    }
  };

  const saveAddress = (event) => {
    event.preventDefault();
    if (!addressForm.name.trim()) {
      setAddressFormError("Manzil nomini kiriting.");
      return;
    }
    const localPhone = addressPhoneDigits(addressForm.phone);
    if (localPhone && localPhone.length !== 9) {
      setAddressFormError("Telefon raqamini +998 dan keyin 9 ta raqam bilan kiriting.");
      return;
    }
    addDeliveryAddress({
      name: addressForm.name.trim(),
      address: addressForm.address.trim(),
      phone: localPhone ? `998${localPhone}` : "",
    });
    setAddressFormOpen(false);
    setAddressForm({ name: "", address: "", phone: "" });
    setAddressFormError("");
  };

  return (
    <>
      <section className="pos-cart-section pos-cart-items-panel" aria-label={tx("Savatchadagi mahsulotlar")} inert={paymentOpen}>
      <div className="cart-header">
        <FiShoppingCart size={20} className="cart-icon" />
        <h2>{tx("Savatcha")}</h2>
        <button
          type="button"
          className="cart-count pos-cart-show-all"
          onClick={() => setAllItemsOpen(true)}
          disabled={cart.length === 0}
          title={tx("Savatchadagi barcha mahsulotlar")}
        >
          ({tx(cart.length)})
        </button>
        <button
          type="button"
          className="pos-cart-clear"
          onClick={clearCart}
          disabled={cart.length === 0}
          title={tx("Savatchani tozalash")}
          aria-label={tx("Savatchani tozalash")}
        >
          <FiTrash2 size={15} />
        </button>
      </div>
        <div className="pos-cart-items-body">
        {/* =====================================================
            CART ITEMS
        ===================================================== */}

        <div className="cart-items-scroll-area" ref={cartItemsRef}>
          <div className="cart-items-list">
            {cart.length === 0 ? (
              <div
                className="pos-empty-cart"
                style={{ padding: "20px 0" }}
              >
                <FiShoppingCart
                  size={32}
                  className="pos-empty-icon"
                />

                <p
                  className="pos-empty-title"
                  style={{
                    fontSize: "14px",
                    margin: "6px 0 2px",
                  }}
                >{tx("Savatcha bo'sh")}</p>

                <p
                  className="pos-empty-subtitle"
                  style={{ fontSize: "12px" }}
                >{tx("Mahsulot qo'shish uchun bosing")}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartKey}
                  className="cart-item"
                >
                  <div className="item-details">
                    <div className="item-name">
                      {item.name}
                    </div>
                    <div className="pos-cart-item-qty-label">{tx(item.qty)}{tx(" dona")}</div>
                    {addresses.length > 1 && (
                      <select
                        className="pos-cart-address-select"
                        value={item.addressId || addresses[0].id}
                        onChange={(event) => moveItemToAddress(item.cartKey, event.target.value)}
                        aria-label={tx(item.name + " uchun yetkazib berish manzili")}
                      >
                        {addresses.map((address) => (
                          <option value={address.id} key={address.id}>{address.name}</option>
                        ))}
                      </select>
                    )}

                    <div className="pos-item-controls">
                      <div className="pos-qty-controls">
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() =>
                            updateQty(item.cartKey, -1)
                          }
                        >
                          <FiMinus size={12} />
                        </button>

                        {editingQtyId === item.cartKey ? (
                          <form
                            onSubmit={(e) =>
                              handleQtySubmit(
                                item.cartKey,
                                e
                              )
                            }
                            className="pos-qty-form"
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              aria-label={tx(item.name + " soni")}
                              autoFocus
                              value={tempQty}
                              onChange={(e) => {
                                if (/^\d*$/.test(e.target.value)) {
                                  setTempQty(e.target.value);
                                }
                              }}
                              onBlur={() => commitQty(item.cartKey)}
                              className="pos-qty-input-edit"
                              style={{
                                outline: "none",
                              }}
                            />
                          </form>
                        ) : (
                          <span
                            className="pos-qty-value"
                            onClick={() =>
                              handleQtyClick(item)
                            }
                          >
                            {tx(item.qty)}
                          </span>
                        )}

                        <button
                          type="button"
                          className="pos-qty-btn primary"
                          onClick={() =>
                            updateQty(item.cartKey, 1)
                          }
                        >
                          <FiPlus size={12} />
                        </button>
                      </div>

                      <span className="pos-item-total">
                        {formatCurrency(item.price * item.qty)}</span>

                      <button
                        type="button"
                        className="pos-delete-btn"
                        onClick={() =>
                          removeItem(item.cartKey)
                        }
                        aria-label={tx(item.name + " mahsulotini savatchadan o'chirish")}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
        <div className="pos-cart-items-footer">
        <div className="pos-discount-wrap">
          <FiTag
            size={15}
            className="pos-discount-icon"
          />

          <input
            type="number"
            min="0"
            max="100"
            value={globalDiscount || ""}
            onChange={(e) =>
              setGlobalDiscount(
                Math.min(
                  100,
                  Math.max(
                    0,
                    Number(e.target.value)
                  )
                )
              )
            }
            placeholder={tx("Chegirma")}
            className="pos-discount-input"
            style={{ outline: "none" }}
          />

          <span className="pos-discount-unit">
            %
          </span>
        </div>
        </div>
      </section>

      {paymentOpen ? (
        <PosPaymentPanel
          cart={cart}
          total={total}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          method={paymentMethod}
          setMethod={setPaymentMethod}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          debtDueDate={debtDueDate}
          setDebtDueDate={setDebtDueDate}
          error={paymentError}
          setError={setPaymentError}
          completed={paymentComplete}
          paidAmount={paidAmount}
          onConfirm={confirmPayment}
          onClose={closePayment}
        />
      ) : (
      <section className="pos-cart-section pos-order-panel" aria-label={tx("Buyurtma ma'lumotlari")}>
      <div className="cart-header">
        <FiShoppingCart size={20} className="cart-icon" />
        <h2>{tx("Savatcha")}</h2>
        <span className="cart-count">({tx(cart.length)})</span>
        <button
          type="button"
          className="pos-cart-clear"
          onClick={clearCart}
          disabled={cart.length === 0}
          title={tx("Savatchani tozalash")}
          aria-label={tx("Savatchani tozalash")}
        >
          <FiTrash2 size={15} />
        </button>
      </div>
        <div className="pos-order-body">
          <h3 className="pos-order-heading">{tx("Buyurtma ma'lumotlari")}</h3>
        {/* =====================================================
            CUSTOMER
        ===================================================== */}

        <div className="customer-input-wrapper">
          <div className="pos-cart-field-title">{tx("Mijoz ma'lumotlari")}</div>
          <div className="customer-input-box">
            <FiUser
              size={15}
              className="customer-input-icon"
            />

            <input
              type="text"
              placeholder={tx("Ism (majburiy)")}
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
              }}
              className="customer-input"
              style={{ outline: "none" }}
            />
          </div>

          <div className="customer-input-box">
            <FiPhone
              size={15}
              className="customer-input-icon"
            />

            {customerPhone && <span className="phone-prefix">+998</span>}

            <input
              type="text"
              inputMode="numeric"
              placeholder={tx("Telefon raqami")}
              value={customerPhone}
              onChange={handlePhoneChange}
              className="customer-input phone-input"
              style={{ outline: "none" }}
            />
          </div>

          {customerError && (
            <span className="customer-error-text">
              {tx(customerError)}
            </span>
          )}
        </div>

        <div className="pos-delivery-section">
          <div className="pos-delivery-header">
            <div className="pos-delivery-title">
              <FiMapPin size={17} />
              <span>{tx("Yetkazib berish manzili (ixtiyoriy)")}</span>
            </div>
            <button
              type="button"
              className="pos-address-add"
              onClick={() => {
                setAddressFormOpen((open) => !open);
                setAddressFormError("");
              }}
              aria-expanded={addressFormOpen}
            >
              <FiPlus size={14} />{tx(" Manzil qo'shish")}</button>
          </div>
          {addressFormOpen && (
              <form className="pos-address-popover" onSubmit={saveAddress}>
                <div className="pos-address-popover-title">
                  <strong>{tx("Yangi manzil qo'shish")}</strong>
                  <button type="button" onClick={() => setAddressFormOpen(false)} aria-label={tx("Manzil oynasini yopish")}>
                    <FiX size={15} />
                  </button>
                </div>
                <label className="pos-address-form-row">{tx("Manzil nomi")}<input
                    type="text"
                    value={addressForm.name}
                    onChange={(event) => setAddressForm({ ...addressForm, name: event.target.value })}
                    placeholder={tx("Masalan: Ofis, Do'kon, Uy")}
                  />
                </label>
                <label className="pos-address-form-row">{tx("Manzil manzili (ixtiyoriy)")}<input
                    type="text"
                    value={addressForm.address}
                    onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })}
                    placeholder={tx("To'liq manzilni kiriting...")}
                  />
                </label>
                <label className="pos-address-form-row">{tx("Telefon (ixtiyoriy)")}<input
                    type="tel"
                    inputMode="numeric"
                    value={addressForm.phone}
                    onFocus={() => {
                      if (!addressForm.phone) {
                        setAddressForm((current) => ({ ...current, phone: "+998 " }));
                      }
                    }}
                    onChange={(event) => {
                      const localDigits = addressPhoneDigits(event.target.value);
                      setAddressForm((current) => ({ ...current, phone: `+998 ${localDigits}` }));
                      setAddressFormError("");
                    }}
                    placeholder={tx("+998 90 123 45 67")}
                  />
                </label>
                {addressFormError && <span className="pos-address-form-error">{tx(addressFormError)}</span>}
                <button type="submit" className="pos-address-save">{tx("Saqlash")}</button>
              </form>
          )}
          {addresses.length < 2 ? (
            <div className="pos-address-box">
              <FiMapPin size={16} />
              <textarea
                ref={addressInputRef}
                rows={2}
                placeholder={tx("Manzil kiriting (ixtiyoriy)")}
                value={deliveryAddress}
                onChange={(event) => {
                  setDeliveryAddress(event.target.value);
                  setAddressConfirmed(false);
                  setAddressError("");
                }}
                aria-label={tx("Yetkazib berish manzili")}
              />
            </div>
          ) : (
            <div className="pos-address-list" aria-label={tx("Yetkazib berish manzillari")}>
              {addresses.map((address, index) => {
                const productCount = cart.filter(
                  (item) => item.addressId === address.id || (!item.addressId && index === 0)
                ).length;
                return (
                  <button
                    type="button"
                    key={address.id}
                    className={"pos-address-card" + (selectedAddressId === address.id ? " is-selected" : "")}
                    onClick={() => {
                      setSelectedAddressId(address.id);
                      setAddressConfirmed(false);
                    }}
                    aria-pressed={selectedAddressId === address.id}
                    title={tx("Keyingi mahsulotlar uchun manzilni tanlash")}
                  >
                    <span className={"pos-address-number address-" + (index % 4)}>{tx(index + 1)}</span>
                    <span className="pos-address-card-copy">
                      <strong>{address.name}</strong>
                      <small>{tx(address.address)}</small>
                    </span>
                    <span className="pos-address-card-count">{tx(productCount)}{tx(" ta mahsulot")}</span>
                  </button>
                );
              })}
            </div>
          )}
          {addressError && <span className="customer-error-text">{tx(addressError)}</span>}
          <button
            type="button"
            className={addressConfirmed ? "pos-address-confirm is-confirmed" : "pos-address-confirm"}
            onClick={confirmAddress}
          >
            {tx(addressConfirmed ? "Manzil tasdiqlandi" : "Manzilni tasdiqlash")}
          </button>
        </div>
        </div>
        <div className="pos-order-footer">
          <div className="cart-checkout-section">
        <div className="pos-summary-list">
          <div className="summary-row">
            <span>{tx("Jami")}</span>

            <span>
              {formatCurrency(subtotal)}</span>
          </div>

          {globalDiscount > 0 && (
            <div className="summary-row discount">
              <span>{tx("Chegirma (")}{tx(globalDiscount)}%)
              </span>

              <span>
                -{formatCurrency(discountAmt)}</span>
            </div>
          )}

          <div className="summary-row">
            <span>{tx("Yetkazib berish")}</span>
            <span>{tx("0 so'm")}</span>
          </div>

          <div className="summary-row total">
            <span>{tx("To'lov")}</span>

            <span className="total-price">
              {formatCurrency(total)}</span>
          </div>
        </div>
        {/* SOTUVNI YAKUNLASH */}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="checkout-btn"
        >
          <FiCreditCard size={17} />{tx("To'lov qabul qilish")}</button>
          </div>
        </div>
      </section>
      )}
      {allItemsOpen && createPortal(
        <div className="pos-cart-all-overlay" onClick={() => setAllItemsOpen(false)}>
          <div className="pos-cart-all-dialog" role="dialog" aria-modal="true" aria-label={tx("Savatchadagi barcha mahsulotlar")} onClick={(event) => event.stopPropagation()}>
            <div className="pos-cart-all-title">
              <strong>{tx("Mahsulotlar (")}{tx(cart.length)})</strong>
              <button type="button" onClick={() => setAllItemsOpen(false)} aria-label={tx("Yopish")}><FiX size={18} /></button>
            </div>
            <div className="pos-cart-all-list">
              {cart.map((item) => (
                <div key={item.cartKey}>
                  <span>{item.name} · {tx(item.qty)}{tx(" dona")}</span>
                  <strong>{formatCurrency(item.price * item.qty)}</strong>
                </div>
              ))}
            </div>
            <div className="pos-cart-all-total"><span>{tx("Jami")}</span><strong>{formatCurrency(total)}</strong></div>
            <button
              type="button"
              className="pos-cart-all-receipt"
              onClick={() => {
                setAllItemsOpen(false);
                handleOpenReceipt();
              }}
            >
              <FiFileText size={16} />{tx(" Chek chiqarish")}</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
