export const POS_DRAFT_KEY = "crm_pos_draft";

export const readPosDraft = () => {
  try {
    const draft = JSON.parse(localStorage.getItem(POS_DRAFT_KEY) || "null");
    return draft && typeof draft === "object" ? draft : {};
  } catch {
    return {};
  }
};

export const cartKeyFor = (productId, addressId) =>
  String(productId) + "::" + (addressId || "unassigned");

export const createAddressId = () =>
  "address-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);

export const phoneDigits = (phone) => String(phone || "").replace(/\D/g, "").slice(-9);

export const addressPhoneDigits = (value) => {
  const raw = String(value || "");
  let digits = raw.replace(/\D/g, "");
  if (raw.trimStart().startsWith("+998") || (digits.startsWith("998") && digits.length > 9)) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
};

export const startsWithCapital = (value) => /^\p{Lu}/u.test(value.trim());

export const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDefaultDebtDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return formatDateInputValue(date);
};
