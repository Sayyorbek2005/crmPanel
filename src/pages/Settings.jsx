import DirectorCardsSettings from "../components/DirectorCardsSettings";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Settings.css';
import { useEffect, useState } from "react";
import { User, Palette, Lock, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { getDirector, updateDirectorCredentials } from "../data/accessStore";
import { profileInitials, readProfile, saveProfile } from "../data/profileStore";
import ConfirmDialog from "../components/ConfirmDialog";
import { getCurrencySettings, saveCurrencySettings } from "../data/currency";

const sections = [
  {
    key: "profile",
    label: "Profil",
    icon: User,
  },
  {
    key: "appearance",
    label: "Ko'rinish",
    icon: Palette,
  },
  {
    key: "security",
    label: "Xavfsizlik",
    icon: Lock,
  },
];

const formatUzPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = (digits.startsWith("998") ? digits.slice(3) : digits).slice(0, 9);
  return value || localDigits ? `+998${localDigits}` : "";
};

const InputRow = ({ label, value, onChange, onFocus, type = "text", placeholder, inputMode, maxLength }) => (
  <div>
    <label
      className="block text-xs font-semibold mb-1.5"
      style={{
        color: "var(--text-secondary)",
      }}
    >
      {tx(label)}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      placeholder={tx(placeholder)}
      inputMode={inputMode}
      maxLength={maxLength}
      className="input-base"
    />
  </div>
);

const Toggle = ({ label, desc, defaultOn }) => {
  useUILanguage();
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div>
        <div
          className="text-sm font-medium"
          style={{
            color: "var(--text-primary)",
          }}
        >
          {tx(label)}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{
            color: "var(--text-muted)",
          }}
        >
          {tx(desc)}
        </div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className="relative transition-all"
        style={{
          width: 44,
          height: 24,
          borderRadius: 99,
          background: on ? "var(--brand)" : "var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all"
          style={{
            left: on ? "calc(100% - 22px)" : "2px",
          }}
        />
      </button>
    </div>
  );
};

function ProfileContent({ user, onProfileSaved }) {
  useUILanguage();
  const { success, error } = useToast();
  const [profile, setProfile] = useState(() => {
    const saved = readProfile(user);
    return { ...saved, phone: formatUzPhone(saved.phone) };
  });

  const updateField = (field) => (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));
  const updatePhone = (event) => setProfile((current) => ({ ...current, phone: formatUzPhone(event.target.value) }));

  const handleSave = () => {
    if (!profile.firstName.trim()) {
      error("Ismni kiriting");
      return;
    }
    if (profile.phone && !/^\+998\d{9}$/.test(profile.phone)) {
      error("Telefon raqamni tekshiring", "+998 dan keyin 9 ta raqam kiriting.");
      return;
    }
    const saved = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    try {
      saveProfile(user, saved);
      setProfile(saved);
      onProfileSaved(saved);
      success("Profil saqlandi");
    } catch {
      error("Profil saqlanmadi", "Qayta urinib ko'ring.");
    }
  };

  return (
    <div className="space-y-5">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
        style={{ background: "linear-gradient(135deg,var(--brand),var(--violet))" }}
        aria-label={tx("Ism va familiya bosh harflari")}
      >
        {profileInitials(profile, user)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputRow label={tx("Ism")} value={profile.firstName || ""} onChange={updateField("firstName")} />
        <InputRow label={tx("Familiya")} value={profile.lastName || ""} onChange={updateField("lastName")} />
        <InputRow label={tx("Telefon")} value={profile.phone || ""} onChange={updatePhone}
          onFocus={() => setProfile((current) => ({ ...current, phone: current.phone || "+998" }))}
          type="tel" inputMode="numeric" maxLength={13} placeholder={tx("+998")} />
        <InputRow label={tx("Email")} value={profile.email || ""} onChange={updateField("email")} type="email" />
      </div>
      <InputRow label={tx("Lavozim")} value={profile.position || ""} onChange={updateField("position")} />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="btn-primary"
        >{tx("Saqlash")}</button>
      </div>
      {user?.type === "director" && <DirectorCardsSettings user={user} />}
    </div>
  );
}

function AppearanceContent() {
  useUILanguage();
  const { dark, toggle } = useTheme();
  const { success } = useToast();
  const [currencySettings, setCurrencySettings] = useState(getCurrencySettings);
  useEffect(() => {
    const sync = () => setCurrencySettings(getCurrencySettings());
    window.addEventListener("crm-currency-change", sync);
    return () => window.removeEventListener("crm-currency-change", sync);
  }, []);
  const toggleCurrency = (code) => {
    const enabled = currencySettings.enabled.includes(code)
      ? currencySettings.enabled.filter((item) => item !== code)
      : [...currencySettings.enabled, code];
    if (!enabled.length) return;
    setCurrencySettings(saveCurrencySettings({ ...currencySettings, enabled }));
    success(enabled.includes(code) ? `${code} ${tx("yoqildi")}` : `${code} ${tx("o'chirildi")}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <label
          className="block text-sm font-semibold mb-3"
          style={{
            color: "var(--text-primary)",
          }}
        >{tx("Interfeys temasi")}</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              key: "light",
              label: "Yorug'",
              icon: Sun,
              bg: "#F7F8FC",
            },
            {
              key: "dark",
              label: "Qorong'u",
              icon: Moon,
              bg: "#0B1120",
            },
          ].map((t) => {
            const active =
              t.key === "system" ? false : (t.key === "dark") === dark;
            return (
              <button
                key={t.key}
                onClick={toggle}
                className="p-3 rounded-2xl border-2 transition-all text-left"
                style={{
                  borderColor: active ? "var(--brand)" : "var(--border)",
                }}
              >
                <div
                  className="w-full h-12 rounded-xl mb-2 overflow-hidden"
                  style={{
                    background: t.bg,
                    border: "1px solid var(--border)",
                  }}
                />
                <div className="flex items-center gap-1.5">
                  {t.icon && (
                    <t.icon
                      size={13}
                      style={{
                        color: "var(--text-muted)",
                      }}
                    />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: "var(--text-secondary)",
                    }}
                  >
                    {tx(t.label)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
        <div className="mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{tx("Pul birliklari")}</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tx("Yoqilgan valyutalar headerda tanlash uchun ko'rinadi.")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { code: "UZS", title: "So'm (UZS)", description: "O'zbekiston so'mi" },
            { code: "USD", title: "AQSH dollari (USD)", description: currencySettings.usdRate ? `1 USD = ${currencySettings.usdRate.toLocaleString("en-US")} UZS` : "USD kursini tanlashda kiritasiz" },
          ].map(({ code, title, description }) => {
            const enabled = currencySettings.enabled.includes(code);
            const onlyEnabled = enabled && currencySettings.enabled.length === 1;
            const needsUsdRate = code === "UZS" && enabled && currencySettings.enabled.includes("USD") && !currencySettings.usdRate;
            return <div key={code} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <div><div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</div><div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tx(description)}</div></div>
              <button type="button" role="switch" aria-checked={enabled} aria-label={`${title} ${tx("valyutasini yoqish yoki o'chirish")}`} title={needsUsdRate ? tx("USD kursini kiriting, keyin so'mni o'chirishingiz mumkin") : undefined} disabled={onlyEnabled || needsUsdRate} onClick={() => toggleCurrency(code)} className="relative shrink-0 transition-all disabled:opacity-50" style={{ width: 42, height: 24, borderRadius: 99, border: 0, background: enabled ? "var(--brand)" : "var(--border)" }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all" style={{ left: enabled ? "calc(100% - 22px)" : 2 }} />
              </button>
            </div>;
          })}
        </div>
      </section>

      <button
        onClick={() => success("Sozlamalar saqlandi")}
        className="btn-primary"
      >{tx("Saqlash")}</button>
    </div>
  );
}

function SecurityContent({ user }) {
  useUILanguage();
  const { success } = useToast();
  const [login, setLogin] = useState(() => getDirector()?.login || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const commitCredentials = async () => {
    setPasswordConfirmOpen(false);
    try {
      await updateDirectorCredentials(login, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      success("Direktor hisob ma'lumotlari saqlandi");
    } catch (error) {
      setMessage(error.message || "Hisobni yangilab bo'lmadi.");
    }
  };

  const saveCredentials = (event) => {
    event.preventDefault();
    setMessage("");
    if (user?.type !== "director") return;
    if (newPassword !== confirmation) {
      setMessage("Yangi parollar bir xil emas.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMessage("Yangi parol kamida 8 belgidan iborat bo'lsin.");
      return;
    }
    if (newPassword) setPasswordConfirmOpen(true);
    else commitCredentials();
  };

  if (user?.type === "director") return (
    <>
    <form className="space-y-4" onSubmit={saveCredentials}>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tx("Login yoki parolni alohida yangilashingiz mumkin. Tasdiqlash uchun hozirgi parolni kiriting.")}</p>
      <label className="block text-sm font-semibold">{tx("Yangi login")}<input className="input-base mt-1.5" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
      </label>
      <label className="block text-sm font-semibold">{tx("Hozirgi parol")}<input className="input-base mt-1.5" type="text" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="off" required />
      </label>
      <label className="block text-sm font-semibold">{tx("Yangi parol (ixtiyoriy)")}<input className="input-base mt-1.5" type="text" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="off" />
      </label>
      <label className="block text-sm font-semibold">{tx("Yangi parolni tasdiqlang")}<input className="input-base mt-1.5" type="text" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
      </label>
      {message && <p role="alert" className="text-sm" style={{ color: "var(--danger, #ef4444)" }}>{tx(message)}</p>}
      <div className="flex justify-end"><button type="submit" className="btn-primary">{tx("Saqlash")}</button></div>
    </form>
    <ConfirmDialog
      open={passwordConfirmOpen}
      title={tx("Yangi parolni saqlash")}
      message={tx("Yangi parol bilan kirish uchun keyingi safar shu paroldan foydalanasiz. Saqlansinmi?")}
      confirmLabel={tx("Ha, saqlash")}
      onCancel={() => setPasswordConfirmOpen(false)}
      onConfirm={commitCredentials}
    />
    </>
  );

  return (
    <div className="space-y-5">
      <div
        className="p-4 rounded-2xl"
        style={{
          background: "var(--brand-light)",
          border: "1px solid var(--brand-border)",
        }}
      >
        <div
          className="text-sm font-semibold mb-0.5"
          style={{
            color: "var(--brand)",
          }}
        >{tx("Hisobingiz xavfsiz")}</div>
        <p
          className="text-xs"
          style={{
            color: "var(--brand)",
          }}
        >{tx("So'nggi kirish: 08 Sep 2026, 09:24 — Toshkent")}</p>
      </div>

      <div className="space-y-4">
        <InputRow label={tx("Joriy parol")} type="password" placeholder={tx("••••••••")} />
        <InputRow label={tx("Yangi parol")} type="password" placeholder={tx("••••••••")} />
        <InputRow
          label={tx("Yangi parolni tasdiqlang")}
          type="password"
          placeholder={tx("••••••••")}
        />
      </div>

      <Toggle
        label={tx("Ikki bosqichli tasdiqlash")}
        desc="SMS yoki authenticator orqali"
        defaultOn
      />
      <Toggle
        label={tx("Faoliyatni kuzatish")}
        desc="Barcha kirish va amallarni saqlash"
        defaultOn
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={() => success("Parol yangilandi")}
          className="btn-primary"
        >{tx("Parolni yangilash")}</button>
      </div>
    </div>
  );
}

export default function Settings({ user, onProfileSaved }) {
  useUILanguage();
  const [active, setActive] = useState("profile");
  const section = sections.find((s) => s.key === active);
  const contentMap = {
    profile: <ProfileContent user={user} onProfileSaved={onProfileSaved} />,
    appearance: <AppearanceContent />,
    security: <SecurityContent user={user} />,
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1
          className="font-display font-bold text-2xl"
          style={{
            fontFamily: "'Manrope',sans-serif",
            color: "var(--text-primary)",
          }}
        >{tx("Sozlamalar")}</h1>
        <p
          className="text-sm mt-0.5"
          style={{
            color: "var(--text-muted)",
          }}
        >{tx("Tizim va profil sozlamalari")}</p>
      </div>

      <div className="settings-layout flex gap-5">
        {/* Sidebar */}
        <div
          className="settings-nav w-52 shrink-0 rounded-2xl p-2 self-start"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background:
                  active === s.key ? "var(--brand-light)" : "transparent",
                color:
                  active === s.key ? "var(--brand)" : "var(--text-secondary)",
                fontWeight: active === s.key ? 600 : 400,
              }}
            >
              <s.icon
                size={15}
                style={{
                  color:
                    active === s.key ? "var(--brand)" : "var(--text-faint)",
                }}
              />
              {tx(s.label)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="settings-panel flex-1 rounded-2xl p-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h2
            className="font-display font-semibold text-lg mb-5"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {tx(section?.label)}
          </h2>

          {contentMap[active] || (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                {section && (
                  <section.icon
                    size={20}
                    style={{
                      color: "var(--text-faint)",
                    }}
                  />
                )}
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {tx(section?.label)}
              </p>
              <p
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                }}
              >{tx("Bu bo'lim tez orada qo'shiladi")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
