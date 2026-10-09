import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import translations from "../locales/translations";
import { setTextLanguage, translateText } from "../locales/translateText";

export const languages = [
  { code: "uz", label: "UZ", name: "O'zbekcha" },
  { code: "ru", label: "RU", name: "Русский" },
];

const LanguageContext = createContext({
  lang: "uz",
  setLang: () => {},
  t: (key) => key,
});




export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem("crm-lang");
      return saved === "ru" || saved === "uz" ? saved : "uz";
    } catch {
      return "uz";
    }
  });
  setTextLanguage(lang);

  useEffect(() => {
    try {
      localStorage.setItem("crm-lang", lang);
    } catch {}
    try {
      document.documentElement.setAttribute("lang", lang);
    } catch {}
  }, [lang]);

  const setLang = useCallback((next) => {
    setTextLanguage(next);
    setLangState(next === "ru" ? "ru" : "uz");
  }, []);

  // t(key, fallback) — tarjima topilmasa, fallback yoki uz matnini,
  // undan keyin esa key'ning o'zini qaytaradi (hech qachon xato bermaydi).
  const t = useCallback(
    (key, fallback) => {
      const dict = translations[lang] || translations.uz;
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
        return translateText(dict[key], lang);
      }
      const uzDict = translations.uz;
      if (uzDict && Object.prototype.hasOwnProperty.call(uzDict, key)) {
        return translateText(uzDict[key], lang);
      }
      return translateText(fallback !== undefined ? fallback : key, lang);
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
