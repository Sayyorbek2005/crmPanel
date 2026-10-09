import Modal from "../components/Modal";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Returns.css';
import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, RotateCcw, AlertCircle, CheckCircle, X, Plus } from "lucide-react";
import { useToast } from "../context/ToastContext";
import DateRangeFilter, { matchesDateRange } from "../components/DateRangeFilter";

import { formatCurrency } from "../data/currency";
const reasonOptions = [
  "Nosoz / ishlamaydi",
  "Sifat muammosi",
  "Hajm/o'lcham to'g'ri kelmadi",
  "Noto'g'ri mahsulot yetkazildi",
  "Mijoz fikri o'zgardi",
  "Boshqa",
];

const statusMap = {
  approved: {
    label: "Qabul qilindi",
    bg: "var(--success-light)",
    color: "var(--success)",
    icon: CheckCircle,
  },
  pending: {
    label: "Kutilmoqda",
    bg: "var(--warning-light)",
    color: "var(--warning)",
    icon: AlertCircle,
  },
  rejected: {
    label: "Rad etildi",
    bg: "var(--danger-light)",
    color: "var(--danger)",
    icon: X,
  },
};

const normalizeText = (value) => String(value ?? "").trim().toLocaleLowerCase("uz-UZ");
const capitalizeName = (value) => String(value ?? "").replace(/\s+/g, " ").trim().split(" ").map((part) => part ? part[0].toLocaleUpperCase("uz-UZ") + part.slice(1).toLocaleLowerCase("uz-UZ") : "").join(" ");
const formatMoney = (value) => Math.round(Number(value) || 0).toLocaleString("en-US");

export default function Returns() {
  useUILanguage();
  const { success, info } = useToast();
  const [returnsList, setReturnsList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_returns") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [salesForReturn] = useState(() => { try { const value = JSON.parse(localStorage.getItem("crm_sales") || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } });
  const [productsForReturn] = useState(() => { try { const value = JSON.parse(localStorage.getItem("crm_products") || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } });
  const [returnLookup, setReturnLookup] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnCustomer, setReturnCustomer] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [reason, setReason] = useState("");

  const updateReturnStatus = (id, status) => {
    const updated = returnsList.map((item) => item.id === id ? { ...item, status } : item);
    setReturnsList(updated);
    localStorage.setItem("crm_returns", JSON.stringify(updated));
    if (status === "approved") success("Qaytarish qabul qilindi", id);
    else info("Qaytarish rad etildi", id);
  };

  const query = search.trim().toLocaleLowerCase("uz-UZ");
  const filtered = returnsList.filter((r) => {
    const matchesText = [r.id, r.saleId, r.productId, r.customer, r.product]
      .some((value) => String(value ?? "").toLocaleLowerCase("uz-UZ").includes(query));
    const returned = new Date(r.date);
    const day = Number.isNaN(returned.getTime()) ? String(r.date || "").slice(0, 10) : [returned.getFullYear(), String(returned.getMonth() + 1).padStart(2, "0"), String(returned.getDate()).padStart(2, "0")].join("-");
    return matchesText && matchesDateRange(day, dateFrom, dateTo);
  });

  const lookupQuery = normalizeText(returnLookup);
  const saleSuggestions = lookupQuery ? salesForReturn.flatMap((sale) => (sale.items || []).map((item, index) => ({ sale, item, index })))
    .filter(({ sale, item }) => [sale.id, sale.receiptNumber, sale.customer, sale.customerName, item.name, item.id].some((value) => normalizeText(value).includes(lookupQuery))).slice(0, 8) : [];
  const getItemKey = (item, index) => `${item.id ?? item.name ?? "item"}-${index}`;
  const returnLines = (selectedSale?.items || []).map((item, index) => {
    const itemId = String(item.id ?? "");
    const saleId = String(selectedSale.id ?? selectedSale.receiptNumber ?? "");
    const returnedQty = returnsList.filter((entry) => String(entry.saleId) === saleId && (itemId ? String(entry.productId ?? "") === itemId : normalizeText(entry.product) === normalizeText(item.name))).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const available = Math.max(0, Number(item.qty ?? item.quantity ?? 0) - returnedQty);
    const product = productsForReturn.find((entry) => String(entry.id) === itemId);
    const unitPrice = Number(item.price ?? product?.price ?? 0);
    return { item, index, key: getItemKey(item, index), available, unitPrice, quantity: Number(returnQuantities[getItemKey(item, index)] || 0) };
  });
  const selectedLines = returnLines.filter((line) => line.quantity > 0);
  const returnTotal = selectedLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const chooseReturnItem = ({ sale, item, index }) => {
    setSelectedSale(sale);
    setReturnCustomer(capitalizeName(sale.customer || sale.customerName || ""));
    const itemId = String(item.id ?? "");
    const alreadyReturned = returnsList.filter((entry) => String(entry.saleId) === String(sale.id ?? sale.receiptNumber) && (itemId ? String(entry.productId ?? "") === itemId : normalizeText(entry.product) === normalizeText(item.name))).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const remaining = Math.max(0, Number(item.qty ?? item.quantity ?? 0) - alreadyReturned);
    setReturnQuantities({ [`${item.id ?? item.name ?? "item"}-${index}`]: remaining ? 1 : 0 });
    setReturnLookup(`${sale.id || sale.receiptNumber} · ${item.name || ""}`);
    setConfirmingReturn(false);
  };

  const closeReturnModal = () => {
    setShowModal(false);
    setReturnLookup(""); setSelectedSale(null); setReturnCustomer("");
    setReturnQuantities({}); setReason(""); setConfirmingReturn(false);
  };

  const saveReturn = () => {
    if (!selectedSale || !selectedLines.length || !reason) return;
    const groupId = `R-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const additions = selectedLines.map(({ item, index, quantity, unitPrice }) => ({
      id: `${groupId}-${index + 1}`, groupId, saleId: String(selectedSale.id ?? selectedSale.receiptNumber),
      productId: item.id ?? "", customer: capitalizeName(returnCustomer), product: item.name || "Mahsulot",
      quantity, unitPrice, amount: quantity * unitPrice, reason, status: "pending", date: createdAt,
      purchaseDate: selectedSale.date || "", deliveryAddress: item.deliveryAddress || selectedSale.deliveryAddress || "",
    }));
    const updated = [...additions, ...returnsList];
    setReturnsList(updated); localStorage.setItem("crm_returns", JSON.stringify(updated));
    closeReturnModal(); success("Qaytarish so'rovi saqlandi", groupId);
  };

  const totalReturned = returnsList
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-color">{tx("Qaytarilgan mahsulotlar")}</h1>
          <p className="text-sm mt-0.5 text-muted-color">{tx("Qaytarilgan tovarlar va refund so'rovlari")}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={15} />{tx(" Qaytarish qo'shish")}</button>
      </div>

      {/* Stats */}
      <div className="returns-stats grid grid-cols-4 gap-4">
        {[
          {
            label: "Jami qaytarishlar",
            value: returnsList.length,
            color: "var(--brand)",
          },
          {
            label: "Qabul qilingan",
            value: returnsList.filter((r) => r.status === "approved").length,
            color: "var(--success)",
          },
          {
            label: "Kutilmoqda",
            value: returnsList.filter((r) => r.status === "pending").length,
            color: "var(--warning)",
          },
          {
            label: "Umumiy Qaytarilgan summa",
            value: formatCurrency(totalReturned),
            color: "var(--danger)",
          },
        ].map((s) => (
          <div key={s.label} className="returns-stat-card card p-4">
            <div
              className="returns-stat-value text-xl font-display font-bold mb-1"
              style={{ color: s.color }}
            >
              {tx(s.value)}
            </div>
            <div className="returns-stat-label text-xs text-faint-color">{tx(s.label)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="returns-table-card card-flat rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b-subtle flex-wrap">
          <div className="search-box-wrapper flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1" style={{ minWidth: 240, maxWidth: 360 }}>
            <Search size={14} className="text-faint-color" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tx("Qaytarish, sotuv, mahsulot ID yoki mijoz...")}
              className="bg-transparent outline-none text-sm flex-1 text-primary-color"
            />
          </div>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>

        <div className="returns-table-scroll" role="region" aria-label={tx("Qaytarishlar jadvali")} tabIndex="0">
        <table className="returns-table w-full">
          <thead>
            <tr className="table-header-row">
              {[
                "ID",
                "Sotuv",
                "Mijoz",
                "Mahsulot",
                "Sabab",
                "Summa",
                "Sana",
                "Manzil",
                "Holat",
                "",
              ].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-5 py-3 text-xs font-semibold text-faint-color"
                >
                  {tx(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={10} className="px-5 py-10 text-center text-sm text-muted-color">{tx("Qaytarishlar topilmadi")}</td></tr>}
            {filtered.map((r) => {
              const st = statusMap[r.status];
              const Icon = st.icon;
              return (
                <tr key={r.id} className="border-t table-row-hover" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setSelectedReturn(r)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedReturn(r); } }}>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-muted-color">
                    {r.id}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-faint-color">
                    {tx(r.saleId)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-primary-color">
                    {r.customer}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-secondary-color">
                    {r.product}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-color">
                    {tx(r.reason)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-danger-color">
                    -{formatCurrency(r.amount)}</td>
                  <td className="px-5 py-3.5 text-xs text-faint-color">
                    {tx(Number.isNaN(new Date(r.date).getTime()) ? r.date : new Date(r.date).toLocaleDateString("uz-UZ"))}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-color">
                    {tx(r.deliveryAddress || "—")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                      style={{
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      <Icon size={10} />
                      {tx(st.label)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(event) => { event.stopPropagation(); updateReturnStatus(r.id, "approved"); }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold action-btn-success"
                        >{tx("Qabul")}</button>
                        <button
                          onClick={(event) => { event.stopPropagation(); updateReturnStatus(r.id, "rejected"); }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold action-btn-danger"
                        >{tx("Rad")}</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <Modal open={!!selectedReturn} onClose={() => setSelectedReturn(null)} title="Qaytarish tafsilotlari" subtitle={selectedReturn?.id} icon={RotateCcw} contentOnly>
        {selectedReturn && <dl style={{ margin: 0 }}>
          {[
            ["Mijoz", selectedReturn.customer],
            ["Mahsulot", selectedReturn.product],
            ["Qaytarilgan miqdor", selectedReturn.quantity != null ? selectedReturn.quantity + " ta" : "Miqdor kiritilmagan"],
            ["Qaytarilgan sana", selectedReturn.date ? new Date(selectedReturn.date).toLocaleString("uz-UZ") : "—"],
            ["Xarid qilingan sana", selectedReturn.purchaseDate ? new Date(selectedReturn.purchaseDate).toLocaleDateString("uz-UZ") : "—"],
            ["Sotuv ID", selectedReturn.saleId],
            ["Sabab", selectedReturn.reason],
            ["Qaytarish summasi", Number(selectedReturn.amount || 0).toLocaleString() + " so‘m"],
            ["Holat", statusMap[selectedReturn.status]?.label || "—"],
          ].map(([label, value]) => <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}><dt style={{ color: "var(--text-muted)" }}>{tx(label)}</dt><dd style={{ margin: 0, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{tx(String(value || "—"))}</dd></div>)}
        </dl>}
      </Modal>

      {/* Portal orqali chiqariladigan modal */}
      {showModal &&
        createPortal(
          <div className="crm-content-modal">
            <div className="modal-card" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-display font-bold text-lg text-primary-color">{tx("Qaytarish qo'shish")}</h2>
                  <p className="text-xs mt-0.5 text-muted-color">{tx("Qaytarilgan mahsulot ma'lumotlari")}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:opacity-70 text-faint-color"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div style={{ position: "relative" }}>
                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Sotuv ID yoki mahsulot nomi")}</label>
                  <input value={returnLookup} onChange={(event) => { setReturnLookup(event.target.value); setSelectedSale(null); setReturnQuantities({}); setConfirmingReturn(false); }} placeholder={tx("ID yoki mahsulotni yozib qidiring...")} className="input-base" autoComplete="off" />
                  {saleSuggestions.length > 0 && <div style={{ position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, maxHeight: 220, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-md)" }}>
                    {saleSuggestions.map((match) => <button type="button" key={`${match.sale.id}-${match.item.id}-${match.index}`} onClick={() => chooseReturnItem(match)} className="w-full text-left px-3 py-2.5 hover:opacity-80" style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)" }}>
                      <span><b>{match.sale.id || match.sale.receiptNumber}</b><span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{match.item.name} · {capitalizeName(match.sale.customer || match.sale.customerName || "Mijoz ko'rsatilmagan")}</span></span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{Number(match.item.qty || 0).toLocaleString("uz-UZ")} {tx("ta")}</span>
                    </button>)}
                  </div>}
                </div>

                {selectedSale && <>
                  <label className="block text-xs font-semibold text-secondary-color">{tx("Mijoz")}
                    <input value={returnCustomer} onChange={(event) => setReturnCustomer(capitalizeName(event.target.value))} placeholder={tx("Mijoz ismi")} className="input-base mt-1.5" />
                  </label>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-secondary-color">{tx("Qaytariladigan mahsulotlar")}</div>
                    {returnLines.map(({ item, key, available, unitPrice, quantity }) => <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) 85px 115px 110px", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: "var(--surface-2)" }}>
                      <div><b style={{ fontSize: 13 }}>{item.name || tx("Mahsulot")}</b><small style={{ display: "block", color: "var(--text-muted)" }}>{tx("Sotuvda")}: {Number(item.qty || 0).toLocaleString("uz-UZ")} · {tx("Qoldi")}: {available}</small></div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{tx("Qaytarish soni")}<input type="number" min="0" max={available} step="1" disabled={!available} value={quantity || ""} onChange={(event) => { const next = Math.min(available, Math.max(0, Math.floor(Number(event.target.value) || 0))); setReturnQuantities((prev) => ({ ...prev, [key]: next })); setConfirmingReturn(false); }} className="input-base mt-1" placeholder="0" /></label>
                      <div style={{ textAlign: "right", fontSize: 12 }}><small style={{ display: "block", color: "var(--text-muted)" }}>{tx("Bir dona narxi")}</small><b>{formatCurrency(unitPrice)}</b></div>
                      <div style={{ textAlign: "right", fontSize: 12 }}><small style={{ display: "block", color: "var(--text-muted)" }}>{tx("Jami")}</small><b>{formatCurrency(quantity * unitPrice)}</b></div>
                    </div>)}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Sabab")}</label>
                    <select value={reason} onChange={(e) => { setReason(e.target.value); setConfirmingReturn(false); }} className="input-base">
                      <option value="">{tx("Sabab tanlang")}</option>
                      {reasonOptions.map((o) => <option key={o} value={o}>{tx(o)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: "var(--danger-light)", color: "var(--danger)", fontWeight: 700 }}><span>{tx("Umumiy qaytarish summasi")} · {selectedLines.length} {tx("xil")}</span><span>{formatCurrency(returnTotal)}</span></div>
                  {confirmingReturn && <div role="alert" style={{ padding: 14, border: "1px solid var(--warning)", borderRadius: 12, background: "var(--warning-light)" }}><b>{tx("Qaytarishni tasdiqlaysizmi?")}</b><p className="text-sm mt-1">{selectedLines.length} {tx("xil mahsulot")}, {formatCurrency(returnTotal)} — {tx("ma'lumotlarni tekshirib tasdiqlang")}</p></div>}
                </>}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeReturnModal} className="btn-ghost flex-1">{tx("Bekor qilish")}</button>
                {confirmingReturn ? <>
                  <button onClick={() => setConfirmingReturn(false)} className="btn-ghost flex-1">{tx("Ortga")}</button>
                  <button onClick={saveReturn} disabled={!selectedSale || !selectedLines.length || !reason} className="btn-primary flex-1 justify-center"><CheckCircle size={14} />{tx("Tasdiqlash va saqlash")}</button>
                </> : <button onClick={() => selectedSale && selectedLines.length && reason && setConfirmingReturn(true)} disabled={!selectedSale || !selectedLines.length || !reason} className="btn-primary flex-1 justify-center"><RotateCcw size={14} />{tx("Qaytarishni tasdiqlash")}</button>}
              </div>
            </div>
          </div>,
          document.getElementById("main-modal-root")
        )}
    </div>
  );
}
