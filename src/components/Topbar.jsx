import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Topbar.css';
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Package,
  Users,
  ShoppingCart,
  Building2,
  Zap,
  Sun,
  Moon,
  LayoutDashboard,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage, languages } from "../context/LanguageContext";
import { profileInitials, profileName } from "../data/profileStore";
import { createPortal } from "react-dom";
import { getCurrencySettings, saveCurrencySettings } from "../data/currency";

import { formatCurrency } from "../data/currency";
export default function Topbar({ onNavigate, onOpen, user, profile }) {
  useUILanguage();
  const { dark, toggle } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState(getCurrencySettings);
  const [rateDraft, setRateDraft] = useState(() => String(getCurrencySettings().usdRate || ""));
  const [rateModal, setRateModal] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const updateCurrency = () => setCurrency(getCurrencySettings());
    window.addEventListener("crm-currency-change", updateCurrency);
    return () => window.removeEventListener("crm-currency-change", updateCurrency);
  }, []);

  const changeCurrency = (code) => {
    if (code === "USD" && !currency.usdRate) {
      setRateDraft(""); setRateModal(true); return;
    }
    setCurrency(saveCurrencySettings({ ...currency, code }));
  };
  const openRateEditor = () => { setRateDraft(String(currency.usdRate || "")); setRateModal(true); };

  const q = query.toLowerCase();
  const savedProducts = (() => {
    try { return JSON.parse(localStorage.getItem("crm_products") || "[]"); } catch { return []; }
  })();
  const savedCustomers = (() => {
    try { return JSON.parse(localStorage.getItem("crm_customers") || "[]"); } catch { return []; }
  })();
  const filteredProducts =
    q.length > 1
      ? savedProducts
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q),
          )
          .slice(0, 3)
      : [];
  const filteredCustomers =
    q.length > 1
      ? savedCustomers
          .filter(
            (c) => c.name.toLowerCase().includes(q) || c.phone.includes(query),
          )
          .slice(0, 3)
      : [];
  const showEmpty =
    q.length > 1 && !filteredProducts.length && !filteredCustomers.length;
  const quickActions = [
    {
      icon: ShoppingCart,
      label: t("topbar.newSale", "Yangi sotuv"),
      page: "sales-new",
    },
    {
      icon: Package,
      label: t("topbar.addProduct", "Mahsulot qo'shish"),
      page: "products-all",
    },
    {
      icon: Users,
      label: t("topbar.addCustomer", "Mijoz qo'shish"),
      page: "customers-all",
    },
    {
      icon: Building2,
      label: t("topbar.stockIn", "Omborga kirim"),
      page: "inventory",
    },
    {
      icon: Zap,
      label: t("topbar.dashboard", "Dashboard"),
      page: "dashboard",
    },
  ];

  return (
    <>
      <header
        className="topbar-container flex items-center justify-between h-16 px-3 sm:px-6 gap-2 sm:gap-3 shrink-0 w-full"
        style={{
          background: "var(--topbar-bg)",
          borderBottom: "1px solid var(--border)",
          zIndex: 10,
          position: "relative",
        }}
      >
        {/* Chap tomon: Dashboard iconi va Qidirish inputi */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
          {/* Dashboard ikonchasi har doim ko'rinadi va kichik ekranda ham o'lchami moslashadi */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="p-2 sm:p-2.5 rounded-xl transition-all hover:opacity-80 shrink-0 flex items-center justify-center"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--brand)",
            }}
            title={tx(t("topbar.dashboard", "Dashboard"))}
          >
            <LayoutDashboard size={18} />
          </button>

          {/* Search pill (Input) */}
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="search-pill flex items-center gap-2 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm transition-all hover:opacity-90 flex-1"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-faint)",
            }}
          >
            <Search size={15} className="shrink-0" style={{ color: "var(--text-primary)" }} />
            <span className="flex-1 text-left truncate hidden sm:inline">
              {tx(t("topbar.searchPlaceholder", "Mahsulot, mijoz yoki sotuv qidirish..."))}
            </span>
            <span className="flex-1 text-left truncate sm:hidden">
              {tx(t("topbar.searchShort", "Qidirish..."))}
            </span>
            <kbd
              className="hidden md:inline-block text-xs px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "var(--border)",
                color: "var(--text-faint)",
                fontSize: 10,
              }}
            >{tx("⌘K")}</kbd>
          </button>
        </div>

        {/* O'ng tomon: Til almashtirish, Dark mode, Yangi sotuv va Profil */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currency.enabled.length > 1 && <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }} title={currency.usdRate ? `1 USD = ${currency.usdRate.toLocaleString("en-US")} UZS` : tx("Dollar kursini kiriting")}>
            {currency.enabled.map((code) => <button key={code} type="button" onClick={() => changeCurrency(code)} className="lang-switch-btn" style={{ padding: "5px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: 0, background: currency.code === code ? "var(--brand)" : "transparent", color: currency.code === code ? "#fff" : "var(--text-muted)" }}>{code}</button>)}
            {currency.enabled.includes("USD") && <button type="button" onClick={openRateEditor} aria-label={tx("Dollar kursini sozlash")} title={tx("Dollar kursini sozlash")} style={{ border: 0, borderLeft: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 10, padding: "4px 6px" }}>1$</button>}
          </div>}
          {/* Til almashtirish tugmasi (UZ / RU) */}
          <div
            className="lang-switch flex items-center shrink-0"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 2,
            }}
            title={tx(t("topbar.language", "Til"))}
          >
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="lang-switch-btn"
                style={{
                  padding: "5px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  border: "none",
                  cursor: "pointer",
                  transition: "all .15s ease",
                  background: lang === l.code ? "var(--brand)" : "transparent",
                  color: lang === l.code ? "#fff" : "var(--text-muted)",
                }}
                title={l.name}
              >
                {tx(l.label)}
              </button>
            ))}
          </div>

          <button
            onClick={toggle}
            className="p-2 sm:p-2.5 rounded-xl transition-all hover:opacity-80 shrink-0"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            title={tx(dark ? t("topbar.lightMode", "Yorug' rejim") : t("topbar.darkMode", "Qorong'u rejim"))}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={() => onNavigate("sales-new")}
            className="quick-sale-btn flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
            style={{
              background:
                "linear-gradient(135deg,var(--brand) 0%,var(--brand-hover) 100%)",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <Plus size={15} />
            <span className="quick-sale-text">{tx(t("topbar.newSale", "Yangi sotuv"))}</span>
          </button>

          <div
            onClick={() => onNavigate("settings")}
            className="flex items-center gap-2 cursor-pointer group transition-all hover:opacity-80 active:scale-95 shrink-0 ml-1"
            title={tx(t("topbar.settings", "Sozlamalarga o'tish"))}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg,var(--brand),var(--violet))",
              }}
            >
              {profileInitials(profile, user)}
            </div>
            <div className="hidden lg:block">
              <div
                className="text-sm font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {profileName(profile, user)}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-faint)" }}
              >
                {tx(profile?.position || (user?.type === "director" ? "Direktor" : user?.role || "Xodim"))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {rateModal && createPortal(<div className="crm-content-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setRateModal(false); }}>
        <form onSubmit={(event) => { event.preventDefault(); const usdRate = Number(String(rateDraft).replace(/,/g, "")); if (!Number.isFinite(usdRate) || usdRate <= 0) return; setCurrency(saveCurrencySettings({ code: "USD", usdRate })); setRateModal(false); }} style={{ width: "min(100%, 420px)", padding: 24, borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <div className="flex items-start justify-between gap-3 mb-5"><div><h2 className="font-display font-bold text-lg">{tx("Dollar kursi")}</h2><p className="text-xs mt-1 text-muted-color">{tx("1 USD necha so'm ekanini kiriting. Barcha narxlar shu kursda ko'rsatiladi.")}</p></div><button type="button" onClick={() => setRateModal(false)} aria-label={tx("Yopish")}><X size={18}/></button></div>
          <label className="block text-sm font-semibold">{tx("1 USD = UZS")}<input className="input-base mt-1.5" type="number" min="1" step="any" required autoFocus value={rateDraft} onChange={(event) => setRateDraft(event.target.value)} placeholder="Masalan: 12 500" /></label>
          <div className="flex justify-end gap-2 mt-5"><button type="button" className="btn-ghost" onClick={() => setRateModal(false)}>{tx("Bekor qilish")}</button><button type="submit" className="btn-primary">{tx("Saqlash va USD tanlash")}</button></div>
        </form>
      </div>, document.getElementById("main-modal-root"))}

      {/* Command Palette */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => {
            setSearchOpen(false);
            setQuery("");
          }}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden scale-in"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <Search size={18} style={{ color: "var(--text-faint)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx(t("topbar.searchPlaceholder", "Mahsulot, mijoz yoki sotuv qidirish..."))}
                className="flex-1 text-base outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X size={15} style={{ color: "var(--text-faint)" }} />
                </button>
              )}
              <kbd
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-faint)",
                  border: "1px solid var(--border)",
                }}
              >{tx("Esc")}</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {!query && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-faint)" }}>
                    {tx(t("topbar.quickActions", "TEZKOR AMALLAR"))}
                  </p>
                  {quickActions.map((a) => (
                    <button
                      key={a.page}
                      onClick={() => {
                        onNavigate(a.page);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <a.icon size={15} style={{ color: "var(--text-muted)" }} />
                      {tx(a.label)}
                    </button>
                  ))}
                </div>
              )}

              {filteredProducts.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-faint)" }}>
                    {tx(t("topbar.products", "MAHSULOTLAR"))}
                  </p>
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onNavigate("product-" + p.id);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="text-xl">{tx(p.image)}</span>
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>{p.sku} · {tx(p.category)}</div>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                        {formatCurrency(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredCustomers.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-faint)" }}>
                    {tx(t("topbar.customers", "MIJOZLAR"))}
                  </p>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onNavigate("customer-" + c.id);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "var(--brand)" }}
                      >
                        {tx(c.name.split(" ").map((n) => n[0]).join("").slice(0, 2))}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>{c.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showEmpty && (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                    "{tx(query)}" {tx(t("topbar.notFound", "uchun hech narsa topilmadi"))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
