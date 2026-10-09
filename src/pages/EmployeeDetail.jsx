import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './EmployeeDetail.css';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Phone,
  Calendar,
  ShoppingCart,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  Save,
  UserCog,
  CheckCircle,
  Clock,
} from "lucide-react";
import { employees } from "../data/mockData";
import { readEmployees, saveEmployees } from "../data/employeeStore";
import { ACCESS_SECTIONS, createCredentials, getDirector } from "../data/accessStore";
import { dateKey, formatSalaryPeriod, monthKey, salaryMonthRows } from "../data/salaryHistory";
import { useToast } from "../context/ToastContext";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
const salesLog = [
  { id: "S-2847", customer: "Aziza Karimova", amount: 485000, payment: "Naqd", date: "08 Sep 2026", status: "paid" },
  { id: "S-2841", customer: "Eldor Rahimov", amount: 890000, payment: "Karta", date: "07 Sep 2026", status: "paid" },
  { id: "S-2836", customer: "Feruza Nazarova", amount: 640000, payment: "Click", date: "06 Sep 2026", status: "partial" },
  { id: "S-2829", customer: "Bobur Toshmatov", amount: 1250000, payment: "Naqd", date: "05 Sep 2026", status: "paid" },
];

const roleColors = {
  Admin: { bg: "var(--brand-light)", color: "var(--brand)" },
  Manager: { bg: "var(--violet-light)", color: "var(--violet)" },
  Kassir: { bg: "var(--success-light)", color: "var(--success)" },
  Ombor: { bg: "var(--warning-light)", color: "var(--warning)" },
};
const payStatus = {
  paid: { label: "To'landi", bg: "var(--success-light)", color: "var(--success)" },
  partial: { label: "Qisman", bg: "var(--warning-light)", color: "var(--warning)" },
};

export default function EmployeeDetail({ employeeId, onBack }) {
  useUILanguage();
  const { success, error } = useToast();
  const modalRoot = document.getElementById("main-modal-root");
  const modalDialogRef = useRef(null);
  const [initial] = useState(() => {
    try { return readEmployees().find((e) => String(e.id) === String(employeeId)) || employees[0]; }
    catch { return employees.find((e) => e.id === employeeId) || employees[0]; }
  });
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState("sales");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ period: monthKey(), paidAt: dateKey(), amount: "" });
  const [salaryError, setSalaryError] = useState("");

  useEffect(() => {
    if (!showEdit && !showDelete) return;

    const closeOnOutsideClick = (event) => {
      if (modalDialogRef.current?.contains(event.target)) return;
      setShowEdit(false);
      setShowDelete(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showEdit, showDelete]);
  const [form, setForm] = useState({ name: initial.name, role: initial.role, phone: initial.phone, status: initial.status, monthlySalary: initial.monthlySalary ?? "", salaryDueDay: initial.salaryDueDay ?? "", salaryStartMonth: initial.salaryStartMonth || monthKey(), login: initial.login || "", password: "", permissions: initial.permissions || [] });

  const rc = roleColors[data.role] || { bg: "var(--surface-2)", color: "var(--text-muted)" };

  const saveEdit = async () => {
    const name = form.name.trim();
    const login = form.login.trim().toLowerCase();
    if (!name) {
      error("Xodim ismini kiriting.");
      return;
    }
    if (form.password && form.password.length < 8) {
      error("Yangi parol kamida 8 belgidan iborat bo'lsin.");
      return;
    }
    if (form.password && !login) {
      error("Parol uchun xodim loginini ham kiriting.");
      return;
    }
    if (login && !form.password && !data.passwordHash) {
      error("Bu xodimga kirish parolini ham belgilang.");
      return;
    }
    const storedEmployees = readEmployees();
    if (login && (getDirector()?.login === login || storedEmployees.some((employee) => String(employee.id) !== String(data.id) && employee.login === login))) {
      error("Bu login allaqachon ishlatilmoqda.");
      return;
    }
    const monthlySalary = form.monthlySalary === "" ? null : Number(form.monthlySalary);
    if (monthlySalary !== null && (!Number.isSafeInteger(monthlySalary) || monthlySalary < 0)) {
      error("Oylik maoshni to'g'ri kiriting", "Musbat butun summa kiriting.");
      return;
    }
    const salaryDueDay = form.salaryDueDay === "" ? null : Number(form.salaryDueDay);
    if (salaryDueDay !== null && (!Number.isInteger(salaryDueDay) || salaryDueDay < 1 || salaryDueDay > 28)) {
      error("Oylik beriladigan kun 1 dan 28 gacha bo'lishi kerak.");
      return;
    }
    if (monthlySalary > 0 && salaryDueDay && !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.salaryStartMonth)) {
      error("Oylik hisobi boshlanadigan oyni kiriting.");
      return;
    }
    const { password, ...details } = form;
    let credentials = {};
    try {
      if (password) credentials = await createCredentials(login, password);
    } catch {
      error("Parolni saqlab bo'lmadi. Qayta urinib ko'ring.");
      return;
    }
    const updated = { ...data, ...details, name, login, permissions: [...form.permissions], monthlySalary, salaryDueDay, salaryStartMonth: monthlySalary > 0 && salaryDueDay ? form.salaryStartMonth : data.salaryStartMonth || "", ...credentials };
    try {
      saveEmployees(storedEmployees.map((employee) => String(employee.id) === String(data.id) ? updated : employee));
    } catch {
      error("Ma'lumot saqlanmadi", "Qayta urinib ko'ring.");
      return;
    }
    setData(updated);
    setForm({ ...updated, password: "", monthlySalary: updated.monthlySalary ?? "" });
    setShowEdit(false);
    success("Xodim yangilandi", form.name);
  };
  const doDelete = () => {
    setShowDelete(false);
    success("Xodim o'chirildi", data.name);
    if (onBack) onBack();
  };

  const recordSalaryPayment = (event) => {
    event.preventDefault();
    setSalaryError("");
    if (!(Number(data.monthlySalary) > 0) || !data.salaryDueDay) {
      setSalaryError("Avval xodimning oyligi va beriladigan kunini belgilang.");
      return;
    }
    const { period, paidAt } = salaryForm;
    const amount = Number(salaryForm.amount);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period > monthKey() || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt > dateKey()) {
      setSalaryError("Oy va to'lov sanasini to'g'ri kiriting.");
      return;
    }
    const previousPayments = Array.isArray(data.salaryPayments) ? data.salaryPayments : [];
    const monthPayments = previousPayments.filter((payment) => payment.period === period);
    const expectedAmount = Number(monthPayments[0]?.expectedAmount ?? data.monthlySalary);
    const alreadyPaid = monthPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > expectedAmount - alreadyPaid) {
      setSalaryError("To'lov summasi musbat va qolgan oylikdan oshmagan bo'lishi kerak.");
      return;
    }
    const payment = { id: crypto.randomUUID(), period, paidAt, amount, expectedAmount, dueDay: Number(monthPayments[0]?.dueDay ?? data.salaryDueDay) };
    const updated = { ...data, salaryPayments: [...previousPayments, payment] };
    try {
      const list = readEmployees();
      saveEmployees(list.map((employee) => String(employee.id) === String(data.id) ? updated : employee));
    } catch {
      setSalaryError("To'lov saqlanmadi. Qayta urinib ko'ring.");
      return;
    }
    setData(updated);
    setSalaryForm((current) => ({ ...current, amount: "" }));
    success("Oylik to'lovi qayd etildi");
  };

  const salaryRows = salaryMonthRows(data);

  const tabs = [
    { key: "sales", label: "Sotuvlar" },
    { key: "activity", label: "Faoliyat" },
    { key: "salary", label: "Oylik tarixi" },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="app-back-button"
          aria-label={tx("Oldingi sahifaga qaytish")}
          style={{ marginBottom: 0, flexShrink: 0 }}
        >
          <ArrowLeft size={16} aria-hidden="true" style={{ flexShrink: 0 }} />{tx("Orqaga")}</button>
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ fontFamily: "'Manrope',sans-serif", color: "var(--text-primary)" }}>{tx("Xodim profili")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tx("Xodim ma'lumotlari va ko'rsatkichlari")}</p>
        </div>
      </div>

      <div className="grid gap-5 detail-grid" style={{ gridTemplateColumns: "300px 1fr" }}>
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--violet))" }}
            >
              {tx(data.name.split(" ").map((n) => n[0]).join("").slice(0, 2))}
            </div>
            <div className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{data.name}</div>
            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: rc.bg, color: rc.color }}>
              {tx(data.role)}
            </span>

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
                <span className="p-2 rounded-lg" style={{ background: "var(--success-light)" }}>
                  <Clock size={13} style={{ color: "var(--success)" }} />
                </span>
                {tx(data.lastActive)}
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                  <Calendar size={13} style={{ color: "var(--text-muted)" }} />
                </span>{tx("Ro'yxatdan: 01 Yan 2026")}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => { setForm({ ...data, monthlySalary: data.monthlySalary ?? "", salaryDueDay: data.salaryDueDay ?? "", salaryStartMonth: data.salaryStartMonth || monthKey(), password: "", permissions: [...(data.permissions || [])] }); setShowEdit(true); }} className="btn-ghost text-sm justify-center">
                <Edit2 size={14} />{tx(" Tahrirlash")}</button>
              <button
                onClick={() => setShowDelete(true)}
                className="btn-ghost text-sm justify-center"
                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              >
                <Trash2 size={14} />{tx(" O'chirish")}</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Oylik maosh", value: data.monthlySalary == null ? "Tayinlanmagan" : formatCurrency(data.monthlySalary), icon: UserCog, color: "var(--brand)", bg: "var(--brand-light)" },
              { label: "Sotuvlar", value: data.sales > 0 ? data.sales + " ta" : "—", icon: ShoppingCart, color: "var(--violet)", bg: "var(--violet-light)" },
              { label: "Daromad", value: data.revenue > 0 ? (data.revenue / 1000000).toFixed(1) + " mln" : "—", icon: TrendingUp, color: "var(--success)", bg: "var(--success-light)" },
              { label: "Holat", value: data.status === "active" ? "Faol" : "Nofaol", icon: UserCog, color: data.status === "active" ? "var(--success)" : "var(--text-muted)", bg: data.status === "active" ? "var(--success-light)" : "var(--surface-2)" },
              { label: "Faollik", value: data.lastActive, icon: Clock, color: "var(--brand)", bg: "var(--brand-light)" },
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

          {tab === "sales" && (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["ID", "Mijoz", "Summa", "To'lov", "Sana", "Holat"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>{tx(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesLog.map((o) => {
                  const ps = payStatus[o.status] || payStatus.paid;
                  return (
                    <tr key={o.id} className="border-t table-row-hover" style={{ borderColor: "var(--border-subtle)" }}>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{o.id}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{o.customer}</td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(o.amount)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{tx(o.payment)}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--text-faint)" }}>{tx(o.date)}</td>
                      <td className="px-5 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: ps.bg, color: ps.color }}>{tx(ps.label)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "activity" && (
            <div className="p-5 space-y-4">
              {[
                { t: "Yangi sotuv — 485 000 so'm", time: "08 Sep 2026, 14:22", icon: ShoppingCart, color: "var(--brand)" },
                { t: "Kassani yopdi — 5 230 000 so'm", time: "07 Sep 2026, 22:10", icon: CheckCircle, color: "var(--success)" },
                { t: "Tizimga kirdi", time: "07 Sep 2026, 08:55", icon: UserCog, color: "var(--violet)" },
                { t: "Profil yangilandi", time: "01 Sep 2026, 11:00", icon: Edit2, color: "var(--text-muted)" },
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

          {tab === "salary" && (
            <div className="p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{tx("Oylik tarixi")}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{tx("To'lovlar, qolgan summa va kechikkan kunlar.")}</p>
                </div>
                {salaryRows.some((row) => row.overdueDays > 0) && (
                  <span className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ color: "var(--danger)", background: "var(--danger-light)" }}>
                    {tx(Math.max(...salaryRows.map((row) => row.overdueDays)))}{tx(" kun kechikyapti")}</span>
                )}
              </div>

              {!(Number(data.monthlySalary) > 0) || !data.salaryDueDay ? (
                <div className="p-4 rounded-xl text-sm" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{tx("Oylik hisobini boshlash uchun «Tahrirlash» oynasida oylik summasi, beriladigan kun va boshlanish oyini belgilang.")}</div>
              ) : (
                <form onSubmit={recordSalaryPayment} className="p-4 rounded-2xl space-y-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{tx("Oylik to'lovini qayd etish")}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{tx("Qaysi oy uchun")}<input className="input-base mt-1" type="month" value={salaryForm.period} max={monthKey()} onChange={(event) => setSalaryForm({ ...salaryForm, period: event.target.value })} required />
                    </label>
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{tx("To'langan sana")}<input className="input-base mt-1" type="date" value={salaryForm.paidAt} max={dateKey()} onChange={(event) => setSalaryForm({ ...salaryForm, paidAt: event.target.value })} required />
                    </label>
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{tx("Summa (so'm)")}<input className="input-base mt-1" type="number" min="1" step="any" inputMode="decimal" value={moneyInputValue(salaryForm.amount, false)} onChange={(event) => setSalaryForm({ ...salaryForm, amount: String(toBaseMoney(event.target.value)) })} required />
                    </label>
                  </div>
                  {salaryError && <p role="alert" className="text-xs" style={{ color: "var(--danger)" }}>{tx(salaryError)}</p>}
                  <div className="flex justify-end"><button type="submit" className="btn-primary"><Save size={14} />{tx(" To'lovni saqlash")}</button></div>
                </form>
              )}

              {salaryRows.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tx("Hozircha oylik tarixi yo'q.")}</p>
              ) : salaryRows.map((row) => {
                const status = row.remaining === 0 && row.expected > 0
                  ? row.latePaidDays > 0 ? `${row.latePaidDays} kun kech to'langan` : "To'liq to'langan"
                  : row.overdueDays > 0 ? `${row.overdueDays} kun kechikyapti`
                    : row.paid > 0 ? "Qisman to'langan" : "To'lov kutilmoqda";
                const delayed = row.overdueDays > 0 || row.latePaidDays > 0;
                return (
                  <div key={row.period} className="p-4 rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{tx(formatSalaryPeriod(row.period))}</div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tx("To'lov muddati: ")}{tx(row.dueDate || "Belgilanmagan")}</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: delayed ? "var(--danger)" : row.remaining === 0 ? "var(--success)" : "var(--text-muted)", background: delayed ? "var(--danger-light)" : row.remaining === 0 ? "var(--success-light)" : "var(--surface-2)" }}>{tx(status)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                      <div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{tx("Oylik")}</div><strong>{formatCurrency(row.expected)}</strong></div>
                      <div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{tx("To'langan")}</div><strong style={{ color: "var(--success)" }}>{formatCurrency(row.paid)}</strong></div>
                      <div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{tx("Qolgan")}</div><strong style={{ color: row.remaining > 0 ? "var(--danger)" : "var(--text-primary)" }}>{formatCurrency(row.remaining)}</strong></div>
                    </div>
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {row.entries.length ? row.entries.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                          <span>{tx("Olingan: ")}{tx(payment.paidAt)}</span><strong>{formatCurrency(Number(payment.amount))}</strong>
                        </div>
                      )) : <span className="text-xs" style={{ color: "var(--text-faint)" }}>{tx("To'lov qayd etilmagan")}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEdit && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div ref={modalDialogRef} className="rounded-3xl p-6 w-full max-w-md slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>{tx("Xodimni tahrirlash")}</h2>
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
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Lavozim")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {["Admin", "Manager", "Kassir", "Ombor"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setForm({ ...form, role: r })}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: form.role === r ? "var(--brand)" : "var(--surface-2)",
                        color: form.role === r ? "white" : "var(--text-muted)",
                        border: "1px solid " + (form.role === r ? "var(--brand)" : "var(--border)"),
                      }}
                    >
                      {tx(r)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Telefon")}</label>
                <input className="input-base" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label htmlFor="employee-login" className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Kirish logini")}</label>
                <input id="employee-login" className="input-base" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoComplete="off" placeholder={tx("Masalan: sayyorbek")} />
              </div>
              <div>
                <label htmlFor="employee-new-password" className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Yangi parol")}</label>
                <input id="employee-new-password" className="input-base" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" placeholder={tx("O'zgartirmaslik uchun bo'sh qoldiring")} />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tx("Yangi parol kamida 8 belgi bo'lishi kerak.")}</p>
              </div>
              <fieldset>
                <legend className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Foydalanish mumkin bo'lgan bo'limlar")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ACCESS_SECTIONS.filter((section) => section.id !== "employees" && section.id !== "settings").map((section) => (
                    <label key={section.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <input type="checkbox" checked={form.permissions.includes(section.id)} onChange={() => setForm((current) => ({ ...current, permissions: current.permissions.includes(section.id) ? current.permissions.filter((id) => id !== section.id) : [...current.permissions, section.id] }))} />
                      {tx(section.label)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="employee-monthly-salary" className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Oylik maosh")}</label>
                <div style={{ position: "relative" }}>
                  <input id="employee-monthly-salary" className="input-base" type="number" min="0" step="any" inputMode="decimal" placeholder={tx("Masalan: 3000000")} value={moneyInputValue(form.monthlySalary, false)} onChange={(e) => setForm({ ...form, monthlySalary: String(toBaseMoney(e.target.value)) })} style={{ paddingRight: 60 }} />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>{tx("so'm")}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="employee-salary-due-day" className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Oylik beriladigan kun")}</label>
                  <input id="employee-salary-due-day" className="input-base" type="number" min="1" max="28" step="1" inputMode="numeric" placeholder={tx("Masalan: 5")} value={form.salaryDueDay} onChange={(event) => setForm({ ...form, salaryDueDay: event.target.value })} />
                </div>
                <div>
                  <label htmlFor="employee-salary-start-month" className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Hisob boshlanadigan oy")}</label>
                  <input id="employee-salary-start-month" className="input-base" type="month" value={form.salaryStartMonth} onChange={(event) => setForm({ ...form, salaryStartMonth: event.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{tx("Holat")}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ k: "active", l: "Faol" }, { k: "inactive", l: "Nofaol" }].map((s) => (
                    <button
                      key={s.k}
                      onClick={() => setForm({ ...form, status: s.k })}
                      className="py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: form.status === s.k ? "var(--brand)" : "var(--surface-2)",
                        color: form.status === s.k ? "white" : "var(--text-muted)",
                        border: "1px solid " + (form.status === s.k ? "var(--brand)" : "var(--border)"),
                      }}
                    >
                      {tx(s.l)}
                    </button>
                  ))}
                </div>
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

      {showDelete && modalRoot && createPortal(
        <div className="crm-content-modal">
          <div ref={modalDialogRef} className="rounded-3xl p-6 w-full max-w-sm slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--danger-light)" }}>
              <Trash2 size={22} style={{ color: "var(--danger)" }} />
            </div>
            <h2 className="font-display font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{tx("O'chirishni tasdiqlang")}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{data.name}{tx(" xodimini o'chirmoqchimisiz?")}</p>
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
