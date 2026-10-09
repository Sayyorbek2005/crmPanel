import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Login.css';
import { useState } from "react";
import { Eye, EyeOff, Store, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { authenticate, getDirector, readLocalLogin, registerDirector } from "../data/accessStore";
export default function Login({ onLogin, onRecover }) {
  useUILanguage();
  const { lang, setLang, t } = useLanguage();
  const [showPass, setShowPass] = useState(false);
  const [savedLogin] = useState(() => readLocalLogin());
  const [email, setEmail] = useState(() => savedLogin?.login || "");
  const [password, setPassword] = useState(() => savedLogin?.password || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupComplete, setSetupComplete] = useState(() => Boolean(getDirector()));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || password.length < 8) {
      setError("Login va kamida 8 belgili parol kiriting.");
      return;
    }
    setLoading(true);
    try {
      const user = setupComplete
        ? await authenticate(email, password)
        : await registerDirector(email, password);
      setSetupComplete(true);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Kirish amalga oshmadi.");
    } finally {
      setLoading(false);
    }
  };
  const features = [
    t("login.feature.sales", "Sotuv va inventar boshqaruvi"),
    t("login.feature.customers", "Mijozlar CRM va qarzdorlik"),
    t("login.feature.finance", "Moliyaviy analitika va hisobotlar"),
    t("login.feature.pos", "POS terminal va chek tizimi"),
  ];
  return (  
    
    <div
      className="min-h-screen flex"
      style={{
        background: "var(--bg)",
      }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg,#1E3A8A 0%,var(--brand) 50%,var(--violet) 100%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px,white 1px,transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow */}
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle,var(--violet),transparent)",
            transform: "translate(-30%,30%)",
          }}
        />

        <div className="relative">
          <div className="flex justify-end gap-1 mb-6">
            {["uz", "ru"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-white/80 hover:bg-white/15"
                style={{ background: lang === code ? "rgba(255,255,255,0.2)" : "transparent" }}
              >
                {tx(code.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Store size={20} color="white" />
            </div>
            <div>
              <div
                className="text-white font-display font-extrabold text-lg"
                style={{
                  fontFamily: "'Manrope',sans-serif",
                }}
              >
                UyMarket CRM
              </div>
              <div className="text-white/60 text-xs">{tx("Business Management Platform")}</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <h1
            className="font-display font-bold text-4xl text-white leading-tight mb-4"
            style={{
              fontFamily: "'Manrope',sans-serif",
            }}
          >
            {tx(t("login.hero.title", "Biznesingizni"))}
            <br />
            {tx(t("login.hero.title2", "to'liq nazorat qiling"))}
          </h1>
          <p className="text-white/70 text-base mb-8 leading-relaxed">
            {tx(t("login.hero.subtitle", "Savdo, ombor, moliya va mijozlarni"))}
            <br />
            {tx(t("login.hero.subtitle2", "bir joydan boshqarish imkoniyati."))}
          </p>
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                  }}
                >
                  <CheckCircle2 size={12} color="white" />
                </div>
                <span className="text-white/80 text-sm">{tx(f)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/35 text-xs">
          © 2026 UyMarket CRM. {tx(t("login.footer", "Barcha huquqlar himoyalangan."))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md fade-in">
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,var(--brand),var(--violet))",
              }}
            >
              <Store size={18} color="white" />
            </div>
            <span
              className="font-display font-bold text-lg"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              UyMarket CRM
            </span>
          </div>

          <div className="mb-8">
            <h2
              className="font-display font-bold text-2xl mb-2"
              style={{
                fontFamily: "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(t("login.welcome", "Xush kelibsiz!"))}
            </h2>
            <p
              className="text-sm"
              style={{
                color: "var(--text-muted)",
              }}
            >
              {tx(t("login.subtitle", "Tizimga kirish uchun ma'lumotlaringizni kiriting"))}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{
                  color: "var(--text-secondary)",
                }}
              >{tx("Login (email yoki foydalanuvchi nomi)")}</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  {tx(t("login.password", "Parol"))}
                </label>
                <button
                  type="button"
                  onClick={onRecover}
                  className="text-xs font-medium hover:opacity-70 transition-opacity"
                  style={{
                    color: "var(--brand)",
                  }}
                >
                  {tx(t("login.forgot", "Parolni unutdingizmi?"))}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tx("••••••••")}
                  className="input-base pr-12"
                  autoComplete={setupComplete ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{
                    color: "var(--text-faint)",
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div role="alert" className="text-sm" style={{ color: "var(--danger, #ef4444)" }}>
              <p>{tx(error)}</p>
              {onRecover && <button type="button" onClick={onRecover} className="text-xs font-semibold mt-2 underline" style={{ color: "var(--brand)" }}>
                {tx("Taklif havolasi orqali kirish ma'lumotlarini qayta o'rnatish")}
              </button>}
            </div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-semibold text-white transition-all hover:opacity-90 active:scale-98 mt-2"
              style={{
                fontFamily: "'Manrope',sans-serif",
                background:
                  "linear-gradient(135deg,var(--brand) 0%,var(--brand-hover) 100%)",
                boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                opacity: loading ? 0.8 : 1,
                cursor:"pointer",
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" /> {tx(t("login.loading", "Yuklanmoqda..."))}
                </>
              ) : (
                <>
                  {tx(setupComplete ? "Kirish" : "Direktor hisobini yaratish")} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p
            className="text-center text-xs mt-6"
            style={{
              color: "var(--text-faint)",
            }}
          >
            {tx(setupComplete ? "Sizga berilgan login va paroldan foydalaning" : "Birinchi kirishda direktor login va parolini yarating")}
          </p>
        </div>
      </div>
    </div>
  );
}
