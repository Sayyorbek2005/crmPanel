const STORAGE_KEY = "crm_currency_settings_v1";
const SUPPORTED_CURRENCIES = ["UZS", "USD"];
const DEFAULT_SETTINGS = { code: "UZS", usdRate: 0, enabled: SUPPORTED_CURRENCIES };

export function getCurrencySettings() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const usdRate = Number(value.usdRate);
    const enabled = Array.isArray(value.enabled) ? SUPPORTED_CURRENCIES.filter((code) => value.enabled.includes(code)) : SUPPORTED_CURRENCIES;
    const safeEnabled = enabled.length ? enabled : SUPPORTED_CURRENCIES;
    return { code: value.code === "USD" && usdRate > 0 && safeEnabled.includes("USD") ? "USD" : safeEnabled[0], usdRate: usdRate > 0 ? usdRate : 0, enabled: safeEnabled };
  } catch { return DEFAULT_SETTINGS; }
}

export function saveCurrencySettings(next) {
  const current = getCurrencySettings();
  const usdRate = Number(next.usdRate ?? current.usdRate);
  const enabled = Array.isArray(next.enabled) ? SUPPORTED_CURRENCIES.filter((code) => next.enabled.includes(code)) : current.enabled;
  const safeEnabled = enabled.length ? enabled : current.enabled;
  const selected = next.code && safeEnabled.includes(next.code) ? next.code : safeEnabled[0];
  const settings = { code: selected === "USD" && usdRate > 0 ? "USD" : safeEnabled.includes("UZS") ? "UZS" : "USD", usdRate: usdRate > 0 ? usdRate : 0, enabled: safeEnabled };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("crm-currency-change"));
  return settings;
}

export const toDisplayMoney = (value) => {
  const { code, usdRate } = getCurrencySettings();
  const amount = Number(value) || 0;
  return code === "USD" && usdRate ? amount / usdRate : amount;
};

export const toBaseMoney = (value) => {
  const { code, usdRate } = getCurrencySettings();
  const amount = Number(String(value ?? "").replace(/,/g, "")) || 0;
  return Math.round(code === "USD" && usdRate ? amount * usdRate : amount);
};

export const formatCurrencyNumber = (value, { input = false } = {}) => {
  const { code } = getCurrencySettings();
  const amount = toDisplayMoney(value);
  return amount.toLocaleString("en-US", code === "USD" ? { minimumFractionDigits: input ? 0 : 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
};

export const currencyLabel = () => getCurrencySettings().code === "USD" ? "USD" : "so'm";

export const formatCurrency = (value) => `${formatCurrencyNumber(value)} ${currencyLabel()}`;

export const moneyInputValue = (baseValue, grouped = true) => {
  const { code } = getCurrencySettings();
  const amount = toDisplayMoney(baseValue);
  return amount.toLocaleString("en-US", code === "USD"
    ? { useGrouping: grouped, maximumFractionDigits: 2 }
    : { useGrouping: grouped, maximumFractionDigits: 0 });
};
