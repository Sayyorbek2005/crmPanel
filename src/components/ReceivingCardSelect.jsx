import { useEffect, useId, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { translateText as tx } from "../locales/translateText";
import { DIRECTOR_CARDS_EVENT, formatCardNumber, readDirectorCards } from "../data/directorCards";
import "./ReceivingCards.css";

export default function ReceivingCardSelect({ value, onChange, disabled = false }) {
  useLanguage();
  const id = useId();
  const [cards, setCards] = useState(readDirectorCards);
  useEffect(() => {
    const refresh = () => setCards(readDirectorCards());
    window.addEventListener("storage", refresh);
    window.addEventListener(DIRECTOR_CARDS_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DIRECTOR_CARDS_EVENT, refresh);
    };
  }, []);
  const selected = cards.find((card) => card.id === value);
  return (
    <div className="receiving-card-select">
      <label htmlFor={id}>{tx("Pul qabul qiluvchi karta")}</label>
      <select id={id} value={selected ? value : ""} onChange={(event) => onChange(event.target.value)} disabled={disabled || cards.length === 0} aria-describedby={`${id}-hint`}>
        <option value="">{tx("Kartani tanlang")}</option>
        {cards.map((card) => <option key={card.id} value={card.id}>{formatCardNumber(card.number)} — {card.label || card.holder}</option>)}
      </select>
      {selected && <div className="receiving-card-preview">
        <strong>{formatCardNumber(selected.number)}</strong>
        <span>{selected.holder}</span>
        {selected.label && <small>{selected.label}</small>}
      </div>}
      <p id={`${id}-hint`}>{tx(cards.length ? "Mijozga shu karta raqamini ayting. Pul tushganini tekshirib, to'lovni tasdiqlang." : "Direktor hali karta qo'shmagan. Sozlamalar → Profil bo'limida karta qo'shiladi.")}</p>
    </div>
  );
}
