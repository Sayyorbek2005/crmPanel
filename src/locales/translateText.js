import catalog from "./uiText.json";
import { formatCurrency, getCurrencySettings, currencyLabel } from "../data/currency";

// Only presentation text is translated. Stored values, IDs and form values stay canonical.
const normalize = value => value.replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, " ").trim();
let currentLanguage = "uz";
export function setTextLanguage(language) { currentLanguage = language === "ru" ? "ru" : "uz"; }
export function getTextLanguage() { return currentLanguage; }
const uzLabels = { Dashboard: "Bosh sahifa", "AI Chat": "AI suhbat", "CRM System": "CRM tizimi", "Business Management Platform": "Biznesni boshqarish platformasi", Export: "Eksport", Edit: "Tahrirlash", "NETWORK ERROR": "TARMOQ XATOSI", Status: "Holat", Email: "Elektron pochta", Manager: "Menejer", Demo: "Sinov", Jan: "Yan", Feb: "Fev", Jun: "Iyun", Jul: "Iyul", Aug: "Avg", Sep: "Sen", Sept: "Sen", Oct: "Okt", Nov: "Noy", Dec: "Dek" };
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templatePart = text => escapeRegex(text).replace(/'/g, "['‘’ʻʼ`]").replace(/ /g, "\\s+");
const templates = Object.entries(catalog).filter(([source]) => /\{\d+\}/.test(source)).sort(([a], [b]) => b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length).map(([source, target]) => ({
  regex: new RegExp("^" + source.split(/\{\d+\}/).map(templatePart).join("([\\s\\S]+?)") + "$"), target, source,
}));

export function translateText(value, language = currentLanguage) {
  if (Array.isArray(value)) return value.map(item => translateText(item, language));
  if (typeof value !== "string" || !value.trim()) return value;
  const key = normalize(value);
  const prefix = value.match(/^\s*/)[0], suffix = value.match(/\s*$/)[0];
  if (key.toLowerCase() === "so'm" && getCurrencySettings().code === "USD") return prefix + currencyLabel() + suffix;
  const money = key.match(/^(-?)([\d\s,.]+?)(?:\s+(mln|ming))?\s+so'm$/i);
  if (money && getCurrencySettings().code === "USD") {
    const raw = money[2].replace(/[\s,]/g, "");
    const multiplier = money[3]?.toLowerCase() === "mln" ? 1_000_000 : money[3]?.toLowerCase() === "ming" ? 1_000 : 1;
    return prefix + formatCurrency(Number(raw) * multiplier * (money[1] ? -1 : 1)) + suffix;
  }
  if (getCurrencySettings().code === "USD" && /so'm/i.test(key)) return prefix + key.replace(/so'm/gi, "USD") + suffix;
  if (language !== "ru") {
    if (uzLabels[key]) return prefix + uzLabels[key] + suffix;
    const uzDate = key.match(/^((?:Ro'yxatdan: |So'nggi kirish: )?\d{1,2} )(Jan|Feb|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)(.*)$/);
    return uzDate ? prefix + uzDate[1] + uzLabels[uzDate[2]] + uzDate[3] + suffix : value;
  }
  if (catalog[key]) return prefix + catalog[key] + suffix;
  for (const { regex, target, source } of templates) {
    const match = value.trim().match(regex);
    if (match) return prefix + target.replace(/\{(\d+)\}/g, (_, index) => {
      const part = match[Number(index) + 1];
      if (source.startsWith("Jami xarajat") && index === "1") {
        const category = part.match(/^(.+?) — (.+)$/);
        return category ? `${translateText(category[1], language)} — ${translateText(category[2], language)}` : translateText(part, language);
      }
      if (source.includes("so'm ({") && Number(index) === match.length - 2) return translateText(part, language);
      return source === "Umumiy ({0})" || /^\d{1,2} [A-Za-z]{3} \d{4}/.test(part) || /^[\d\s.,+−%-]+(?:mln |ming )?(?:so'm|dona|ta|kg|mln|ming)$/.test(part) ? translateText(part, language) : part;
    }) + suffix;
  }
  // Numbers and units are formatted without translating surrounding names or arbitrary prose.
  if (/^[\d\s.,+−%-]+(?:mln |ming )?(?:so'm|dona|ta|kg|mln|ming)$/.test(key)) {
    return prefix + key.replace(/so'm/g,"сум").replace(/dona/g,"шт.").replace(/\bta\b/g,"шт.").replace(/\bkg\b/g,"кг").replace(/\bmln\b/g,"млн").replace(/\bming\b/g,"тыс.") + suffix;
  }
  const date = key.match(/^(\d{1,2}) (Jan|Yan|Feb|Fev|Mar|Apr|May|Jun|Iyun|Jul|Iyul|Aug|Avg|Sept|Sep|Sen|Oct|Okt|Nov|Noy|Dec|Dek)(.*)$/);
  if (date) {
    const months = {Jan:'янв',Yan:'янв',Feb:'фев',Fev:'фев',Mar:'мар',Apr:'апр',May:'май',Jun:'июн',Iyun:'июн',Jul:'июл',Iyul:'июл',Aug:'авг',Avg:'авг',Sep:'сен',Sept:'сен',Sen:'сен',Oct:'окт',Okt:'окт',Nov:'ноя',Noy:'ноя',Dec:'дек',Dek:'дек'};
    return prefix + `${date[1]} ${months[date[2]]}${date[3]}` + suffix;
  }
  const period = key.match(/^(Yanvar|Fevral|Mart|Aprel|May|Iyun|Iyul|Avgust|Sentabr|Sentyabr|Oktabr|Noyabr|Dekabr) (\d{4})$/);
  if (period) return prefix + catalog[period[1]] + " " + period[2] + suffix;
  return value;
}

