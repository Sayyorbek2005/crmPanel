import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Customers.css";
import {
  Search,
  Plus,
  Crown,
  UserX,
  Copy,
  Users,
  CreditCard,
  X,
  UserPlus,
  Trash2,
} from "lucide-react";
import { customers as initialCustomers } from "../data/mockData";
import { useToast } from "../context/ToastContext";
import PhoneInput from "../components/PhoneInput";
import { uzbekRegions } from "../data/regions";

import { formatCurrency } from "../data/currency";
const formatName = (value) => value
  .replace(/[^\p{L}\s'ʻʼ’‘-]/gu, "")
  .replace(/\s+/g, " ")
  .replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase("uz-UZ"));

const putSurnameLast = (value) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const index = parts.findIndex((part) => /(?:ov|ova|ev|eva|yev|yeva)$/iu.test(part));
  if (index >= 0 && index < parts.length - 1) parts.push(parts.splice(index, 1)[0]);
  return parts.join(" ");
};

const statusMap = {
  vip: {
    label: "VIP",
    bg: "var(--violet-light)",
    color: "var(--violet)",
    icon: Crown,
  },
  debtor: {
    label: "Qarzdor",
    bg: "var(--danger-light)",
    color: "var(--danger)",
    icon: UserX,
  },
  active: {
    label: "Faol",
    bg: "var(--success-light)",
    color: "var(--success)",
  },
  regular: {
    label: "Oddiy",
    bg: "var(--surface-2)",
    color: "var(--text-muted)",
  },
};

// Mark the main content container with data-customers-content if it is not a <main>.
function ContentModal({ anchorRef, onClose, children }) {
  const [bounds, setBounds] = useState(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const page = anchorRef.current;
    if (!page) return;
    const host = page.closest('[data-customers-content], main, [role="main"]') || page;
    let frame;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportLeft = viewport?.offsetLeft || 0;
      const top = Math.max(viewportTop, rect.top);
      const left = Math.max(viewportLeft, rect.left);
      const right = Math.min(viewportLeft + (viewport?.width || window.innerWidth), rect.right);
      const bottom = Math.min(viewportTop + (viewport?.height || window.innerHeight), rect.bottom);
      const next = { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
      setBounds(previous => previous && Object.keys(next).every(key => previous[key] === next[key]) ? previous : next);
    };
    // Track sidebar transitions as well as resizing and scrolling.
    const track = () => { measure(); frame = requestAnimationFrame(track); };
    track();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorRef]);

  if (!bounds) return null;
  return createPortal(
    <div className="customers-modal-overlay" style={bounds} onClick={onClose}>
      {children}
    </div>,
    document.body
  );
}
export default function Customers({ filter, onNavigate }) {
  useUILanguage();
  const pageRef = useRef(null);
  const toastContext = useToast();
  const success = toastContext?.success || (() => { });
  const error = toastContext?.error || (() => { });

  // Mijozlar ro'yxatini LocalStorage dan o'qib olish
  const [customerList, setCustomerList] = useState(() => {
    const saved = localStorage.getItem("crm_customers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse customers from localStorage", e);
      }
    }
    return initialCustomers || [];
  });

  // Ro'yxat o'zgarganda LocalStorage ga saqlash
  useEffect(() => {
    localStorage.setItem("crm_customers", JSON.stringify(customerList));
  }, [customerList]);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(
    filter === "vip" ? "vip" : filter === "debt" ? "debtor" : "all"
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    region: "Toshkent shahri",
    status: "regular",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Yangi mijoz qo'shish
  const handleAddCustomer = (e) => {
    e.preventDefault();

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!/\p{L}/u.test(formData.name)) {
      error("Ismni tekshiring", "Ism va familiyada harflardan foydalaning.");
      return;
    }
    if (!phoneDigits.startsWith("998") || phoneDigits.length !== 12) {
      error("Telefon raqamini tekshiring", "+998 dan keyin 9 ta raqam kiriting.");
      return;
    }

    const newCustomer = {
      id: Date.now(),
      name: putSurnameLast(formData.name),
      phone: formData.phone.trim(),
      region: formData.region,
      status: formData.status,
      purchases: 0,
      spent: 0,
      debt: 0,
      lastPurchase: "Hali xarid qilmadi",
    };

    const updatedList = [newCustomer, ...customerList];
    setCustomerList(updatedList);
    localStorage.setItem("crm_customers", JSON.stringify(updatedList));

    setIsModalOpen(false);
    setFormData({
      name: "",
      phone: "",
      region: "Toshkent shahri",
      status: "regular",
    });

    success("Yangi mijoz muvaffaqiyatli saqlandi!");
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;

    const updatedList = customerList.filter(
      (customer) => customer.id !== customerToDelete.id
    );
    setCustomerList(updatedList);
    localStorage.setItem("crm_customers", JSON.stringify(updatedList));

    setIsDeleteModalOpen(false);
    success(`${customerToDelete.name} o'chirildi`);
    setCustomerToDelete(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  const filtered = customerList.filter((c) => {
    const q = search.toLowerCase().trim();
    const cleanPhone = c.phone.replace(/\D/g, "");
    const cleanSearchPhone = q.replace(/\D/g, "");

    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (cleanSearchPhone && cleanPhone.includes(cleanSearchPhone));

    const matchTab = tab === "all" || c.status === tab;

    return matchSearch && matchTab;
  });

  const totalDebt = customerList
    .filter((c) => c.debt > 0)
    .reduce((s, c) => s + c.debt, 0);

  return (
    <div ref={pageRef} className="customers-page space-y-6 fade-in relative">
      {/* Sarlavha qismi */}
      <div className="flex items-center justify-between relative w-full">
        <div>
          <h1
            className="font-bold text-2xl"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Mijozlar")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{tx("CRM — mijozlar bazasi va tarixi")}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm cursor-pointer shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl"
        >
          <Plus size={15} />{tx(" Mijoz qo'shish")}</button>
      </div>

      {/* Analitika kartalari (Bitta qatorda buzilmaydigan qilib joylashtirildi) */}
      <div className="customers-stats">
        {[
          {
            label: "Jami mijozlar",
            value: customerList.length,
            icon: Users,
            color: "var(--brand)",
            bg: "var(--brand-light)",
          },
          {
            label: "VIP mijozlar",
            value: customerList.filter((c) => c.status === "vip").length,
            icon: Crown,
            color: "var(--violet)",
            bg: "var(--violet-light)",
          },
          {
            label: "Qarzdor",
            value: customerList.filter((c) => c.debt > 0).length,
            icon: UserX,
            color: "var(--danger)",
            bg: "var(--danger-light)",
          },
          {
            label: "Jami qarzdorlik",
            value: formatCurrency(totalDebt),
            icon: CreditCard,
            color: "var(--warning)",
            bg: "var(--warning-light)",
          },
        ].map((s) => (
          <div key={s.label} className="customers-stat">
            <div
              className="customers-stat__icon"
              style={{ background: s.bg, color: s.color }}
            >
              <s.icon size={18} />
            </div>
            <div className="customers-stat__content">
              <div className="customers-stat__value">{tx(s.value)}</div>
              <div className="customers-stat__label">{tx(s.label)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Qidiruv va Tablar */}
      <div className="customers-list-card card-flat rounded-2xl overflow-hidden shadow-sm border border-[var(--border-subtle)]">
        <div
          className="flex items-center gap-3 px-5 py-4 flex-wrap"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              minWidth: 260,
            }}
          >
            <Search size={14} style={{ color: "var(--text-faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tx("Ism yoki telefon...")}
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            {[
              { key: "all", label: "Barchasi" },
              { key: "vip", label: "VIP" },
              { key: "debtor", label: "Qarzdorlar" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                style={{
                  background:
                    tab === t.key ? "var(--surface)" : "transparent",
                  color:
                    tab === t.key
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  boxShadow: tab === t.key ? "var(--shadow-xs)" : "none",
                }}
              >
                {tx(t.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Jadval */}
        <div className="customers-table-scroll overflow-x-auto" role="region" aria-label={tx("Mijozlar jadvali")} tabIndex="0">
          <table className="customers-table w-full text-left border-collapse">
            <thead>
              <tr style={{ background: "var(--table-stripe)" }}>
                {[
                  "Mijoz",
                  "Telefon",
                  "Xaridlar",
                  "Jami xarajat",
                  "Qarzdorlik",
                  "So'nggi xarid",
                  "Holat",
                  "Amallar",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-5 py-3 text-xs font-semibold"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {tx(h)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((c) => {
                  const st = statusMap[c.status] || statusMap.regular;
                  const StatusIcon = st.icon;

                  return (
                    <tr
                      key={c.id}
                      className="border-t table-row-hover row-anim cursor-pointer"
                      style={{ borderColor: "var(--border-subtle)" }}
                      onClick={() => {
                        if (typeof onNavigate === "function") onNavigate("customer-" + c.id);
                        else success(`${c.name} tanlandi`);
                      }}
                    >
                      {/* Mijoz ismi (Bosganda ishlaydigan qilib to'g'irlandi) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                            style={{
                              background:
                                c.status === "vip"
                                  ? "linear-gradient(135deg, var(--violet), var(--brand))"
                                  : "var(--brand)",
                            }}
                          >
                            {tx(c.name
                              ? c.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                              : "M")}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {c.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--text-faint)" }}
                            >
                              {tx(c.region)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm font-mono"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {c.phone}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard?.writeText(c.phone);
                              success("Telefon raqami nusxalandi!");
                            }}
                            className="hover:opacity-70 transition-opacity cursor-pointer p-1"
                            title={tx("Nusxalash")}
                          >
                            <Copy size={11} style={{ color: "var(--text-faint)" }} />
                          </button>
                        </div>
                      </td>

                      {/* Xaridlar soni */}
                      <td
                        className="px-5 py-3.5 text-sm font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {tx(c.purchases)}{tx(" ta")}</td>

                      {/* Jami xarajat */}
                      <td
                        className="px-5 py-3.5 text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(Number(c.spent || 0))}</td>

                      {/* Qarzdorlik */}
                      <td className="px-5 py-3.5">
                        {c.debt > 0 ? (
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--danger)" }}
                          >
                            {formatCurrency(Number(c.debt))}</span>
                        ) : (
                          <span
                            className="text-sm"
                            style={{ color: "var(--success)" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* So'nggi xarid */}
                      <td
                        className="px-5 py-3.5 text-xs"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {tx(c.lastPurchase)}
                      </td>

                      {/* Holat */}
                      <td className="px-5 py-3.5">
                        <span
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {StatusIcon && <StatusIcon size={10} />}
                          {tx(st.label)}
                        </span>
                      </td>

                      {/* O'chirish tugmasi */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(c);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={{
                            background: "var(--danger-light)",
                            color: "var(--danger)",
                          }}
                          title={tx("Mijozni o'chirish")}
                        >
                          <Trash2 size={13} />{tx(" O'chirish")}</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>{tx("Mijozlar topilmadi")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>{tx("Jami ")}{tx(filtered.length)}{tx(" ta mijoz ko'rsatilmoqda")}</span>
        </div>
      </div>

      {/* Mijoz qo'shish modali */}
      {isModalOpen && (
        <ContentModal anchorRef={pageRef} onClose={() => setIsModalOpen(false)}>
          <div role="dialog" aria-label={tx("Yangi mijoz qo'shish")} className="customers-modal-panel"
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "460px",
              padding: "clamp(12px, 3vw, 24px)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand)",
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{tx("Yangi mijoz qo'shish")}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tx("Mijoz ma'lumotlarini to'ldiring")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{tx("F.I.SH (Ismi va Familiyasi) *")}</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder={tx("Masalan: Ali Valiyev")}
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: formatName(event.target.value) }))}
                  autoComplete="name"
                  autoCapitalize="words"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{tx("Telefon raqami *")}</label>
                <PhoneInput
                  name="phone"
                  required
                  placeholder="+998 90 123 45 67"
                  value={formData.phone}
                  onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none transition-all font-mono"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{tx("Viloyat / Hudud")}</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm rounded-xl outline-none transition-all cursor-pointer"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {uzbekRegions.map((region) => <option key={region} value={region}>{tx(region)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{tx("Mijoz maqomi")}</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm rounded-xl outline-none transition-all cursor-pointer"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="regular">{tx("Oddiy")}</option>
                    <option value="active">{tx("Faol")}</option>
                    <option value="vip">{tx("VIP")}</option>
                    <option value="debtor">{tx("Qarzdor")}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-muted)",
                  }}
                >{tx("Bekor qilish")}</button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                >{tx("Saqlash")}</button>
              </div>
            </form>
          </div>
        </ContentModal>
      )}

      {/* O'chirishni tasdiqlash modali */}
      {isDeleteModalOpen && customerToDelete && (
        <ContentModal anchorRef={pageRef} onClose={handleCancelDelete}>
          <div role="dialog" aria-label={tx("Mijozni o'chirish")} className="customers-modal-panel"
            style={{
              width: "100%",
              maxWidth: "390px",
              background: "var(--surface)",
              borderRadius: "20px",
              padding: "clamp(12px, 3vw, 24px)",
              border: "1px solid var(--border)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 16px",
                borderRadius: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--danger-light)",
                color: "var(--danger)",
              }}
            >
              <Trash2 size={23} />
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >{tx("Mijozni o'chirasizmi?")}</h3>

            <p
              style={{
                marginTop: "8px",
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-muted)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>
                {customerToDelete.name}
              </strong>{" "}{tx("mijozini o'chirishni tasdiqlaysizmi?")}<br />{tx("Bu amalni ortga qaytarib bo'lmaydi.")}</p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                onClick={handleCancelDelete}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "11px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >{tx("Yo'q")}</button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "11px",
                  border: "none",
                  background: "var(--danger)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >{tx("Ha, o'chirish")}</button>
            </div>
          </div>
        </ContentModal>
      )}
    </div>
  );
}
