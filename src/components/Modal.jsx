import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  width = 520,
  contentOnly = false,
}) {
  useUILanguage();
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose && onClose();
      }
    };

    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const modalRoot = contentOnly ? document.getElementById("main-modal-root") : null;
  if (contentOnly && !modalRoot) return null;

  const dialog = (
    <div
      onClick={onClose}
      style={{
        position: contentOnly ? "absolute" : "fixed",
        inset: 0,
        zIndex: 200,
        background: contentOnly ? "rgba(15, 23, 42, 0.4)" : "transparent",
        backdropFilter: contentOnly ? "blur(6px)" : undefined,
        WebkitBackdropFilter: contentOnly ? "blur(6px)" : undefined,
        pointerEvents: "auto",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: contentOnly ? "100%" : "90vh",
          minHeight: 0,
          boxSizing: "border-box",
          overscrollBehavior: "contain",
          overflowY: "auto",
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {Icon && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg,var(--brand),var(--violet))",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color="#fff" />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Manrope',sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text-primary)",
              }}
            >
              {tx(title)}
            </div>

            {subtitle && (
              <div
                style={{
                  fontSize: 12,
                  marginTop: 2,
                  color: "var(--text-muted)",
                }}
              >
                {tx(subtitle)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
  return contentOnly ? createPortal(dialog, modalRoot) : dialog;
}

export function Field({ label, children, hint }) {
  useUILanguage();
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--text-secondary)",
        }}
      >
        {tx(label)}
      </label>

      {children}

      {hint && (
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: "var(--text-faint)",
          }}
        >
          {tx(hint)}
        </div>
      )}
    </div>
  );
}