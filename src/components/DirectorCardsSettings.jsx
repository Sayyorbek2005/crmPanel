import { useState } from "react";
import { createPortal } from "react-dom";
import { CreditCard, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translateText as tx } from "../locales/translateText";
import { useToast } from "../context/ToastContext";
import { cardDigits, formatCardNumber, readDirectorCards, recordedCardTotal, saveDirectorCards } from "../data/directorCards";
import { readDebtPayments, readPosSales } from "../data/debtPayments";
import { formatCurrency } from "../data/currency";
import "./ReceivingCards.css";

const emptyCard = () => ({ id: "", label: "", holder: "", number: "" });

export default function DirectorCardsSettings({ user }) {
  useLanguage();
  const { success, error } = useToast();
  const [cards, setCards] = useState(readDirectorCards);
  const [draft, setDraft] = useState(emptyCard);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState("");
  if (user?.type !== "director") return null;
  const sales = readPosSales();
  const payments = readDebtPayments();
  const save = (next) => {
    try {
      setCards(saveDirectorCards(next, user));
      return true;
    } catch (cause) {
      error(tx(cause.message));
      return false;
    }
  };
  const submit = (event) => {
    event.preventDefault();
    // Read again so another tab's latest additions are preserved.
    const current = readDirectorCards();
    if (draft.id && !current.some((card) => card.id === draft.id)) {
      error(tx("Karta ro'yxatdan o'chirilgan. Qayta qo'shing."));
      return;
    }
    const card = { ...draft, id: draft.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    const next = draft.id ? current.map((item) => item.id === draft.id ? card : item) : [...current, card];
    if (save(next)) {
      setEditing(false);
      setDraft(emptyCard());
      success(tx("Karta saqlandi"));
    }
  };
  return (
    <section className="director-cards" aria-labelledby="director-cards-title">
      <div className="director-cards-heading">
        <div><h3 id="director-cards-title"><CreditCard size={18} />{tx("To'lov qabul qiluvchi kartalar")}</h3><p>{tx("Bu kartalar sotuvchining karta orqali to'lov ro'yxatida ko'rinadi.")}</p></div>
        <button type="button" className="btn-primary" onClick={() => { setDraft(emptyCard()); setEditing(true); }}><Plus size={16} />{tx("Karta qo'shish")}</button>
      </div>
      {!cards.length && <p className="director-cards-empty">{tx("Hali karta qo'shilmagan.")}</p>}
      <div className="director-cards-list">
        {cards.map((card) => <article key={card.id} className="director-card">
          <div className="director-card-info"><strong>{card.label || card.holder}</strong><span className="director-card-number">{formatCardNumber(card.number)}</span><span>{card.holder}</span><small>{tx("CRMda qayd etilgan tushum")}: <b>{formatCurrency(recordedCardTotal(card, sales, payments))}</b></small></div>
          <div className="director-card-actions">
            <button type="button" aria-label={`${tx("Tahrirlash")}: ${card.label || card.holder}`} onClick={() => { setDraft(card); setEditing(true); }}><Pencil size={16} /></button>
            <button type="button" aria-label={`${tx("O'chirish")}: ${card.label || card.holder}`} onClick={() => setRemoving(card.id)}><Trash2 size={16} /></button>
          </div>
          {removing === card.id && <div className="director-card-remove"><p>{tx("Karta ro'yxatdan o'chirilsinmi? Oldingi to'lovlar saqlanadi.")}</p><button type="button" onClick={() => { if (save(readDirectorCards().filter((item) => item.id !== card.id))) setRemoving(""); }}>{tx("O'chirish")}</button><button type="button" onClick={() => setRemoving("")}>{tx("Bekor qilish")}</button></div>}
        </article>)}
      </div>
      {editing && createPortal(<div className="crm-content-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}>
        <form className="director-card-form director-card-modal" onSubmit={submit}>
          <div className="director-card-modal-heading"><div><h3>{tx(draft.id ? "Kartani tahrirlash" : "Karta qo'shish")}</h3><p>{tx("Karta ma'lumotlarini kiriting")}</p></div><button type="button" aria-label={tx("Yopish")} onClick={() => setEditing(false)}><X size={18} /></button></div>
          <label>{tx("Karta nomi (ixtiyoriy)")}<input className="input-base" value={draft.label} maxLength={60} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder={tx("Masalan: Asosiy Uzcard")} /></label>
          <label>{tx("Karta egasi")}<input className="input-base" required value={draft.holder} maxLength={100} onChange={(event) => setDraft({ ...draft, holder: event.target.value })} /></label>
          <label className="director-card-number-field">{tx("Karta raqami")}<input className="input-base" required inputMode="numeric" autoComplete="off" value={formatCardNumber(draft.number)} maxLength={19} minLength={19} placeholder="0000 0000 0000 0000" onChange={(event) => setDraft({ ...draft, number: cardDigits(event.target.value).slice(0, 16) })} /></label>
          <div className="director-card-form-actions"><button className="btn-primary" type="submit">{tx("Kartani saqlash")}</button><button type="button" onClick={() => setEditing(false)}>{tx("Bekor qilish")}</button></div>
        </form>
      </div>, document.getElementById("main-modal-root"))}
    </section>
  );
}
