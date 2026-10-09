import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Notifications.css';
import { useState } from "react";
import { Package, ShoppingCart, Info, CheckCheck, X, Bell } from "lucide-react";
import { notifications as initialNotifs } from "../data/mockData";
import { useToast } from "../context/ToastContext";
const typeConfig = {
  warning: {
    icon: Package,
    color: "var(--warning)",
    bg: "var(--warning-light)",
    border: "var(--warning-border, var(--warning))",
  },
  success: {
    icon: ShoppingCart,
    color: "var(--success)",
    bg: "var(--success-light)",
    border: "var(--success)",
  },
  info: {
    icon: Info,
    color: "var(--brand)",
    bg: "var(--brand-light)",
    border: "var(--brand-border)",
  },
};
export default function Notifications() {
  useUILanguage();
  const { success } = useToast();
  const [notifs, setNotifs] = useState(initialNotifs);
  const unread = notifs.filter((n) => !n.read);
  const read = notifs.filter((n) => n.read);
  const markAllRead = () => {
    setNotifs((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      })),
    );
    success("Barchasi o'qildi deb belgilandi");
  };
  const dismiss = (id) => setNotifs((prev) => prev.filter((n) => n.id !== id));
  const Card = ({ n }) => {
  useUILanguage();
    const cfg = typeConfig[n.type] || typeConfig.info;
    return (
      <div
        className="flex items-start gap-4 p-4 rounded-2xl transition-all"
        style={{
          background: n.read ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${n.read ? "var(--border-subtle)" : cfg.border}`,
          boxShadow: n.read ? "none" : "var(--shadow-sm)",
          opacity: n.read ? 0.72 : 1,
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: cfg.bg,
          }}
        >
          <cfg.icon
            size={17}
            style={{
              color: cfg.color,
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {tx(n.title)}
            </span>
            {!n.read && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: "var(--brand)",
                }}
              />
            )}
          </div>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
            }}
          >
            {tx(n.description)}
          </p>
          <span
            className="text-xs mt-1 inline-block"
            style={{
              color: "var(--text-faint)",
            }}
          >
            {tx(n.time)}
          </span>
        </div>
        <button
          onClick={() => dismiss(n.id)}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
          style={{
            color: "var(--text-faint)",
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  };
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display font-bold text-2xl"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Bildirishnomalar")}</h1>
          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >
            {tx(unread.length)}{tx(" ta o'qilmagan")}</p>
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm">
            <CheckCheck size={14} />{tx(" Barchasini o'qildi")}</button>
        )}
      </div>

      <div className="max-w-2xl space-y-5">
        {unread.length > 0 && (
          <div>
            <h2
              className="text-xs font-semibold mb-3"
              style={{
                color: "var(--text-faint)",
              }}
            >{tx("O'QILMAGAN (")}{tx(unread.length)})
            </h2>
            <div className="space-y-2">
              {unread.map((n) => (
                <Card key={n.id} n={n} />
              ))}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <h2
              className="text-xs font-semibold mb-3"
              style={{
                color: "var(--text-faint)",
              }}
            >{tx("O'QILGAN")}</h2>
            <div className="space-y-2">
              {read.map((n) => (
                <Card key={n.id} n={n} />
              ))}
            </div>
          </div>
        )}

        {notifs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <Bell
                size={22}
                style={{
                  color: "var(--text-faint)",
                }}
              />
            </div>
            <p
              className="font-semibold text-sm"
              style={{
                color: "var(--text-primary)",
              }}
            >{tx("Bildirishnomalar yo'q")}</p>
            <p
              className="text-xs mt-1"
              style={{
                color: "var(--text-muted)",
              }}
            >{tx("Yangi bildirishnomalar shu yerda ko'rinadi")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
