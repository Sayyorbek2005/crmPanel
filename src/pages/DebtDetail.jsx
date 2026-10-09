import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './DebtDetail.css';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Edit2,
  Trash2,
  X,
  Save,
  Clock,
  AlertTriangle,
  ShoppingCart,
} from "lucide-react";
import { customers } from "../data/mockData";
import { useToast } from "../context/ToastContext";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
const extraDebtors = [
  { id: 10, name: "Timur Sobirov", phone: "+998 90 111 22 33", purchases: 5, spent: 1200000, debt: 180000, paid: 60000, dueDate: "25 Sep 2026", overdue: false, daysPast: 0, lastPurchase: "02 Sep 2026", status: "debtor", region: "Toshkent" },
  { id: 11, name: "Umida Xoliqova", phone: "+998 91 222 33 44", purchases: 2, spent: 450000, debt: 90000, paid: 20000, dueDate: "15 Sep 2026", overdue: true, daysPast: 7, lastPurchase: "01 Sep 2026", status: "debtor", region: "Andijon" },
  { id: 12, name: "Vohid Tursunov", phone: "+998 93 333 44 55", purchases: 9, spent: 2800000, debt: 560000, paid: 200000, dueDate: "10 Sep 2026", overdue: true, daysPast: 22, lastPurchase: "28 Aug 2026", status: "debtor", region: "Toshkent" },
  { id: 13, name: "Xurshid Nishonov", phone: "+998 94 444 55 66", purchases: 3, spent: 620000, debt: 145000, paid: 50000, dueDate: "30 Sep 2026", overdue: false, daysPast: 0, lastPurchase: "05 Sep 2026", status: "debtor", region: "Samarqand" },
];
const allDebtors = [
  ...customers.filter((c) => c.debt > 0).map((c) => ({
    ...c,
    paid: Math.floor(c.spent * 0.08),
    dueDate: "20 Sep 2026",
    overdue: c.debt > 300000,
    daysPast: c.debt > 300000 ? 12 : 0,
  })),
  ...extraDebtors,
];

export default function DebtDetail({ debtorId, onBack }) {
  useUILanguage();
  const { success } = useToast();
  const modalRoot = document.getElementById("main-modal-root");
  const modalDialogRef = useRef(null);
  const initial = allDebtors.find((d) => d.id === debtorId) || allDebtors[0];
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState("payments");
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!showPay && !showEdit && !showDelete) return;

    const closeOnOutsideClick = (event) => {
      if (modalDialogRef.current?.contains(event.target)) return;
      setShowPay(false);
      setShowEdit(false);
      setShowDelete(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showPay, showEdit, showDelete]);
  const [payAmount, setPayAmount] = useState(initial.debt.toString());
  const [payMethod, setPayMethod] = useState("naqd");
  const [paidList, setPaidList] = useState([
    { id: "P-901", amount: 60000, method: "Naqd", date: "01 Sep 2026", note: "Birinchi to'lov" },
    { id: "P-874", amount: 40000, method: "Karta", date: "25 Aug 2026", note: "" },
  ]);
  const [form, setForm] = useState({ name: initial.name, phone: initial.phone, debt: initial.debt });

  const remaining = data.debt - paidList.reduce((s, p) => s + p.amount, 0);

  const handlePay = () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    setPaidList((prev) => [{ id: "P-" + Date.now(), amount: amt, method: payMethod, date: "08 Sep 2026", note: "" }, ...prev]);
    setShowPay(false);
    success("To'lov qabul qilindi", data.name + " — " + formatCurrency(amt));
    setPayAmount(data.debt.toString());
  };
  const saveEdit = () => {
    setData((d) => ({ ...d, name: form.name, phone: form.phone, debt: Number(form.debt) }));
    setShowEdit(false);
    success("Qarzdor yangilandi", form.name);
  };
  const doDelete = () => {
    setShowDelete(false);
    success("Qarzdor o'chirildi", data.name);
    if (onBack) onBack();
  };

  const tabs = [
    { key: "payments", label: "To'lovlar" },
    { key: "activity", label: "Faoliyat" },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <button
          type="button"
          onClick={onBack}
          aria-label={tx("Qarzdorlik ro‘yxatiga qaytish")}
          className="app-back-button"
        >
          <ArrowLeft size={16} aria-hidden="true" style={{ flexShrink: 0 }} />{tx("Orqaga")}</button>
        <h1 className="font-display font-bold text-2xl" style={{ fontFamily: "'Manrope',sans-serif", color: "var(--text-primary)" }}>{tx("Qarzdor profili")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tx("Qarzdorlik tarixi va to'lovlar")}</p>
      </div>

      <div className="grid gap-5 detail-grid" style={{ gridTemplateColumns: "300px 1fr" }}>
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, var(--danger), #b91c1c)" }}
            >
              {tx(data.name.split(" ").map((n) => n[0]).join("").slice(0, 2))}
            </div>
            <div className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{data.name}</div>
            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>{tx("Qarzdor")}</span>

            <div className="space-y-3 mt-5 text-left">
              <a
                href={"tel:" + data.phone.replace(/\s/g, "")}
                className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80"
                style={{ color: "var(--text-secondary)" }}
              >
                <span className="p-2 rounded-lg" style={{ background: "var(--brand-light)" }}>
                  <Phone size={13} style={{ color: "var(--brand)" }} />
                </span>
                {data.phone}
              </a>
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="p-2 rounded-lg" style={{ background: "var(--violet-light)" }}>
                  <MapPin size={13} style={{ color: "var(--violet)" }} />
                </span>
                {tx(data.region)}
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="p-2 rounded-lg" style={{ background: data.overdue ? "var(--danger-light)" : "var(--surface-2)" }}>
                  <Calendar size={13} style={{ color: data.overdue ? "var(--danger)" : "var(--text-muted)" }} />
                </span>{tx("Muddat: ")}{tx(data.dueDate)}
              </div>
            </div>

            <div className="grid gap-3 mt-5">
              <button
                onClick={() => setShowPay(true)}
                className="btn-primary text-sm justify-center"
                style={{ background: "var(--success)", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}
              >
                <CheckCircle size={14} />{tx(" To'lov qabul qilish")}</button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowEdit(true)} className="btn-ghost text-sm justify-center">
                  <Edit2 size={14} />{tx(" Tahrirlash")}</button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="btn-ghost text-sm justify-center"
                  style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  <Trash2 size={14} />{tx(" O'chirish")}</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Jami qarz", value: formatCurrency(data.debt), icon: CreditCard, color: "var(--danger)", bg: "var(--danger-light)" },
              { label: "To'langan", value: formatCurrency(paidList.reduce((s, p) => s + p.amount, 0)), icon: CheckCircle, color: "var(--success)", bg: "var(--success-light)" },
              { label: "Qoldi", value: formatCurrency(remaining), icon: AlertTriangle, color: "var(--warning)", bg: "var(--warning-light)" },
              { label: "Muddat", value: data.overdue ? data.daysPast + " kun o'tdi" : data.dueDate, icon: Clock, color: data.overdue ? "var(--danger)" : "var(--text-muted)", bg: data.overdue ? "var(--danger-light)" : "var(--surface-2)" },
            ].map((c) => (
              <div key={c.label} className="card p-4">
                <div className="p-2 rounded-xl w-fit mb-2" style={{ background: c.bg }}>
                  <c.icon size={15} style={{ color: c.color }} />
                </div>
                <div className="text-base font-display font-bold" style={{ color: "var(--text-primary)" }}>{tx(c.value)}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{tx(c.label)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-1 px-5 pt-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-3 text-sm font-medium transition-all"
                style={{
                  color: tab === t.key ? "var(--brand)" : "var(--text-muted)",
                  borderBottom: tab === t.key ? "2px solid var(--brand)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {tx(t.label)}
              </button>
            ))}
          </div>

          {tab === "payments" && (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["ID", "Summa", "Usul", "Sana", "Izoh"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>{tx(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidList.map((p) => (
                  <tr key={p.id} className="border-t table-row-hover" style={{ borderColor: "var(--border-subtle)" }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.id}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: "var(--success)" }}>{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{tx(p.method)}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--text-faint)" }}>{tx(p.date)}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{tx(p.note || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "activity" && (
            <div className="p-5 space-y-4">
              {[
                { t: "Qarz yaratildi — " + formatCurrency(data.debt), time: data.lastPurchase + ", 16:40", icon: CreditCard, color: "var(--danger)" },
                { t: "To'lov qabul qilindi — 60 000 so'm", time: "01 Sep 2026, 10:15", icon: CheckCircle, color: "var(--success)" },
                { t: "Yangi xarid — " + formatCurrency(data.spent), time: data.lastPurchase + ", 14:22", icon: ShoppingCart, color: "var(--brand)" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="p-2 rounded-xl shrink-0" style={{ background: "var(--surface-2)" }}>
                    <a.icon size={14} style={{ color: a.color }} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: "var(--text-primary)" }}>{tx(a.t)}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{tx(a.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPay && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div ref={modalDialogRef} className="rounded-3xl p-6 w-full max-w-md slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{tx("To'lov qabul qilish")}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tx("Qoldi: ")}<strong style={{ color: "var(--danger)" }}>{formatCurrency(remaining)}</strong>
                </p>
              </div>
              <button onClick={() => setShowPay(false)} className="p-2 rounded-xl hover:opacity-70" style={{ color: "var(--text-faint)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Summa")}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={moneyInputValue(payAmount, false)}
                    onChange={(e) => setPayAmount(String(toBaseMoney(e.target.value)))}
                    className="input-base"
                    style={{ fontWeight: 700, color: "var(--brand)" }}
                  />
                  <span className="absolute right-3 top-3 text-sm" style={{ color: "var(--text-muted)" }}>{tx("so'm")}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {[remaining, Math.round(remaining * 0.5), Math.round(remaining * 0.25)].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPayAmount(p.toString())}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: Number(payAmount) === p ? "var(--brand-light)" : "var(--surface-2)",
                        color: Number(payAmount) === p ? "var(--brand)" : "var(--text-muted)",
                        border: "1px solid " + (Number(payAmount) === p ? "var(--brand-border)" : "var(--border)"),
                      }}
                    >
                      {tx(i === 0 ? "To'liq" : i === 1 ? "50%" : "25%")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("To'lov usuli")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {["naqd", "karta", "click", "payme"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                      style={{
                        background: payMethod === m ? "var(--brand)" : "var(--surface-2)",
                        color: payMethod === m ? "white" : "var(--text-muted)",
                        border: "1px solid " + (payMethod === m ? "var(--brand)" : "var(--border)"),
                      }}
                    >
                      {tx(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPay(false)} className="btn-ghost flex-1 justify-center">{tx("Bekor")}</button>
              <button onClick={handlePay} className="btn-primary flex-1 justify-center" style={{ background: "var(--success)" }}>
                <CheckCircle size={15} />{tx(" Tasdiqlash")}</button>
            </div>
          </div>
        </div>
      , modalRoot)}

      {/* Edit modal */}
      {showEdit && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div ref={modalDialogRef} className="rounded-3xl p-6 w-full max-w-md slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{tx("Qarzdorni tahrirlash")}</h2>
              <button onClick={() => setShowEdit(false)} className="p-2 rounded-xl hover:opacity-70" style={{ color: "var(--text-faint)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Ism")}</label>
                <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Telefon")}</label>
                <input className="input-base" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Qarz summasi (so'm)")}</label>
                <input type="number" step="any" className="input-base" value={moneyInputValue(form.debt, false)} onChange={(e) => setForm({ ...form, debt: String(toBaseMoney(e.target.value)) })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="btn-ghost flex-1 justify-center">{tx("Bekor")}</button>
              <button onClick={saveEdit} className="btn-primary flex-1 justify-center">
                <Save size={15} />{tx(" Saqlash")}</button>
            </div>
          </div>
        </div>
      , modalRoot)}

      {/* Delete confirm */}
      {showDelete && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div ref={modalDialogRef} className="rounded-3xl p-6 w-full max-w-sm slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--danger-light)" }}>
              <Trash2 size={22} style={{ color: "var(--danger)" }} />
            </div>
            <h2 className="font-display font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{tx("O'chirishni tasdiqlang")}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{data.name}{tx(" qarzdorini o'chirmoqchimisiz?")}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} className="btn-ghost flex-1 justify-center">{tx("Bekor")}</button>
              <button onClick={doDelete} className="btn-primary flex-1 justify-center" style={{ background: "var(--danger)" }}>
                <Trash2 size={15} />{tx(" O'chirish")}</button>
            </div>
          </div>
        </div>
      , modalRoot)}
    </div>
  );
}
