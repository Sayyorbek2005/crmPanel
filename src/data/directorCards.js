export const DIRECTOR_CARDS_KEY = "crm_director_cards_v1";
export const DIRECTOR_CARDS_EVENT = "crm-director-cards-changed";

export const cardDigits = (value) => String(value || "").replace(/\D/g, "");
export const formatCardNumber = (value) => cardDigits(value).replace(/(\d{4})(?=\d)/g, "$1 ");

export function readDirectorCards() {
  try {
    const cards = JSON.parse(localStorage.getItem(DIRECTOR_CARDS_KEY) || "[]");
    return Array.isArray(cards)
      ? cards.filter((card) => card && typeof card.id === "string" && /^\d{16}$/.test(card.number) && typeof card.holder === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveDirectorCards(cards, user) {
  if (user?.type !== "director") throw new Error("Kartalarni faqat direktor boshqaradi.");
  const normalized = cards.map((card) => ({
    id: card.id,
    label: String(card.label || "").trim(),
    holder: String(card.holder || "").trim(),
    number: cardDigits(card.number),
  }));
  if (normalized.some((card) => !card.id || !card.holder || !/^\d{16}$/.test(card.number))) {
    throw new Error("Karta egasi va 16 xonali karta raqamini kiriting.");
  }
  if (new Set(normalized.map((card) => card.number)).size !== normalized.length) {
    throw new Error("Bu karta allaqachon ro'yxatga qo'shilgan.");
  }
  localStorage.setItem(DIRECTOR_CARDS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(DIRECTOR_CARDS_EVENT));
  return normalized;
}

// Save a snapshot: changing/removing a director card must not rewrite past payments.
export function resolveReceivingCard(id) {
  const card = readDirectorCards().find((item) => item.id === id);
  if (!card) throw new Error("Pul qabul qiluvchi kartani tanlang. Ro'yxat o'zgargan bo'lsa, qayta tanlang.");
  return { id: card.id, label: card.label, holder: card.holder, number: card.number };
}

export function recordedCardTotal(card, sales, payments) {
  return [...sales, ...payments].reduce((total, record) => {
    if (!record.receivingCard || record.receivingCard.number !== card.number) return total;
    const amount = Number(record.saleId ? record.amount : record.initialPaidAmount ?? record.paidAmount ?? 0);
    return total + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}
