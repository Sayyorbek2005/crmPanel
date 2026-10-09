import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Ha", onConfirm, onCancel }) {
  useUILanguage();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.5)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message"
        style={{ width: "100%", maxWidth: 400, padding: 24, borderRadius: 20, background: "var(--surface)",
          color: "var(--text-primary)", boxShadow: "0 20px 60px rgba(15,23,42,.2)" }}>
        <h2 id="confirm-dialog-title" className="text-lg font-bold">{tx(title)}</h2>
        <p id="confirm-dialog-message" className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{tx(message)}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-ghost">{tx("Yo‘q, bekor qilish")}</button>
          <button type="button" onClick={onConfirm} className="btn-primary">{tx(confirmLabel)}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
