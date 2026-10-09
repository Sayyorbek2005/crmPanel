import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './ErrorPages.css';
import {
  Search,
  AlertTriangle,
} from "lucide-react";
const Base = ({ emoji, code, title, subtitle, actions }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 fade-in">
    <div className="text-6xl mb-6 select-none">{tx(emoji)}</div>
    {code && (
      <div
        className="text-sm font-mono font-semibold mb-2 px-3 py-1 rounded-full"
        style={{
          background: "var(--surface-2)",
          color: "var(--text-faint)",
          border: "1px solid var(--border)",
        }}
      >
        {tx(code)}
      </div>
    )}
    <h1
      className="font-display font-bold mb-3"
      style={{
        fontFamily: "'Manrope',sans-serif",
        color: "var(--text-primary)",
        fontSize: 28,
      }}
    >
      {tx(title)}
    </h1>
    <p
      className="text-base max-w-md leading-relaxed mb-8"
      style={{
        color: "var(--text-muted)",
      }}
    >
      {tx(subtitle)}
    </p>
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className={a.primary ? "btn-primary" : "btn-ghost"}
        >
          {tx(a.label)}
        </button>
      ))}
    </div>
  </div>
);
export function NotFound({ onBack }) {
  useUILanguage();
  return (
    <Base
      emoji="🔍"
      code="404"
      title={tx("Sahifa topilmadi")}
      subtitle={tx("Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan bo'lishi mumkin.")}
      actions={[
        {
          label: "← Orqaga qaytish",
          onClick: onBack,
        },
        {
          label: "Dashboard",
          primary: true,
        },
      ]}
    />
  );
}
export function ServerError({ onBack }) {
  useUILanguage();
  return (
    <Base
      emoji="⚡"
      code="500"
      title={tx("Server xatosi yuz berdi")}
      subtitle={tx("Biz allaqachon bu muammo ustida ishlayapmiz. Biroz kutib qayta urinib ko'ring.")}
      actions={[
        {
          label: "Qayta yuklash",
          onClick: () => window.location.reload(),
          primary: true,
        },
        {
          label: "← Orqaga",
          onClick: onBack,
        },
      ]}
    />
  );
}
export function NetworkError({ onBack }) {
  useUILanguage();
  return (
    <Base
      emoji="📡"
      code="NETWORK ERROR"
      title={tx("Internet aloqasi yo'q")}
      subtitle={tx("Internet aloqangizni tekshiring va qayta urinib ko'ring.")}
      actions={[
        {
          label: "Qayta urinish",
          onClick: () => window.location.reload(),
          primary: true,
        },
        {
          label: "← Orqaga",
          onClick: onBack,
        },
      ]}
    />
  );
}
export function AccessDenied({ onBack }) {
  useUILanguage();
  return (
    <Base
      emoji="🔒"
      code="403"
      title={tx("Ruxsat yo'q")}
      subtitle={tx("Bu sahifaga kirish uchun yetarli huquqingiz yo'q. Administrator bilan bog'laning.")}
      actions={[
        {
          label: "Dashboard",
          primary: true,
        },
        {
          label: "← Orqaga",
          onClick: onBack,
        },
      ]}
    />
  );
}

/* ── Empty States ──────────────────────────────────── */

const EmptyBase = ({ icon: Icon, title, subtitle, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
    <div
      className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <Icon
        size={26}
        style={{
          color: "var(--text-faint)",
        }}
      />
    </div>
    <h3
      className="font-display font-semibold text-lg mb-2"
      style={{
        fontFamily: "'Manrope',sans-serif",
        color: "var(--text-primary)",
      }}
    >
      {tx(title)}
    </h3>
    <p
      className="text-sm max-w-xs leading-relaxed mb-6"
      style={{
        color: "var(--text-muted)",
      }}
    >
      {tx(subtitle)}
    </p>
    {action && actionLabel && (
      <button onClick={action} className="btn-primary">
        + {tx(actionLabel)}
      </button>
    )}
  </div>
);
export const EmptyProducts = ({ onAdd }) => (
  <EmptyBase
    icon={Search}
    title={tx("Mahsulotlar yo'q")}
    subtitle={tx("Hozircha hech qanday mahsulot qo'shilmagan. Birinchi mahsulotni qo'shib boshlang.")}
    action={onAdd}
    actionLabel="Mahsulot qo'shish"
  />
);
export const EmptyCustomers = ({ onAdd }) => (
  <EmptyBase
    icon={Search}
    title={tx("Mijozlar yo'q")}
    subtitle={tx("Hozircha hech qanday mijoz qo'shilmagan.")}
    action={onAdd}
    actionLabel="Mijoz qo'shish"
  />
);
export const EmptySales = ({ onAdd }) => (
  <EmptyBase
    icon={Search}
    title={tx("Sotuvlar yo'q")}
    subtitle={tx("Bu muddat uchun hech qanday sotuv mavjud emas.")}
    action={onAdd}
    actionLabel="Yangi sotuv"
  />
);
export const EmptyDebt = () => (
  <EmptyBase
    icon={AlertTriangle}
    title={tx("Qarzdorlik yo'q")}
    subtitle={tx("Barcha to'lovlar qabul qilingan. Do'koningiz moliyaviy jihatdan sog'lom!")}
  />
);
export const EmptyNotifs = () => (
  <EmptyBase
    icon={Search}
    title={tx("Bildirishnomalar yo'q")}
    subtitle={tx("Hozircha yangi bildirishnomalar yo'q.")}
  />
);
