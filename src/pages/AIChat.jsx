import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Plus, RefreshCw, ArrowUpRight, Wallet, Package, ShieldCheck } from "lucide-react";
import { buildBusinessSnapshot, formatMoney, localFinancialAnswer } from "../data/aiBusinessContext";
import "./AIChat.css";
import ConfirmDialog from "../components/ConfirmDialog";

const prompts = ["Biznesimning umumiy holatini tahlil qil", "Xarajatlarni qanday kamaytiraman?", "Qarzlarni undirish rejasini tuz", "Ombordagi zaxiralarni tahlil qil"];
const welcome = { role: "assistant", content: "Assalomu alaykum! Men biznes yordamchingizman. Kirim, chiqim, sotuvlar va ombor bo‘yicha savolingizni yozing yoki quyidagi mavzulardan birini tanlang.", source: "welcome" };

export default function AIChat({ user }) {
  const { lang } = useUILanguage();
  const storageKey = `crm_ai_chat_v1_${user?.type}_${user?.id || "director"}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey));
      return Array.isArray(saved) && saved.length ? saved.filter(item => ["user", "assistant"].includes(item.role) && typeof item.content === "string").slice(-60) : [welcome];
    } catch { return [welcome]; }
  });
  const [snapshot, setSnapshot] = useState(buildBusinessSnapshot);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(null);
  const [mode, setMode] = useState("local");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const request = useRef(null);
  const bottom = useRef(null);
  const textarea = useRef(null);

  async function checkConnection() {
    try {
      const response = await fetch("/api/ai/health", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error();
      setHealth(await response.json());
    } catch { setHealth({ configured: false, offline: true }); }
  }
  useEffect(() => { checkConnection(); return () => request.current?.abort(); }, []);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-60))); setStorageError(false); }
    catch { setStorageError(true); }
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, storageKey]);
  useEffect(() => {
    const refresh = () => setSnapshot(buildBusinessSnapshot());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || message.length > 4000 || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const currentSnapshot = buildBusinessSnapshot();
    setSnapshot(currentSnapshot);
    setMessages(previous => [...previous.filter(item => !item.failed), { role: "user", content: message, source: mode === "local" ? "local" : "openai" }]);
    setInput(""); setBusy(true); setError("");
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      let answer;
      if (mode === "local") {
        answer = localFinancialAnswer(message, currentSnapshot);
      } else {
        const response = await fetch("/api/ai/chat", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, signal: controller.signal,
          body: JSON.stringify({ message, language: lang, snapshot: currentSnapshot, history: messages.filter(item => item.source === "openai" && !item.failed).slice(-10) }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.answer) throw new Error(data.error || "AI bilan bog‘lanib bo‘lmadi. Ulanishni tekshiring.");
        answer = data.answer;
      }
      setMessages(previous => [...previous, { role: "assistant", content: answer, source: mode === "local" ? "local" : "openai" }]);
    } catch (failure) {
      setMessages(previous => previous.map((item, index) => index === previous.length - 1 ? { ...item, failed: true } : item));
      setError(failure.name === "AbortError" ? "Javob kutish vaqti tugadi. Qayta urinib ko‘ring." : failure.message);
      setInput(message);
    } finally {
      clearTimeout(timeout); request.current = null; setBusy(false); textarea.current?.focus();
    }
  }

  return <div className="ai-page">
    <header className="ai-heading"><div><div className="ai-eyebrow"><Sparkles size={15} />{tx(" BIZNES YORDAMCHISI")}</div><h1>{tx("AI Chat")}</h1><p>{tx("Raqamlarni tushuning. Keyingi qadamingizni rejalashtiring.")}</p></div><button className="ai-secondary" disabled={busy} onClick={() => setConfirmClear(true)}><Plus size={17} />{tx(" Yangi suhbat")}</button></header>
    <div className="ai-stats">{[
      ["Kirim", formatMoney(snapshot.finance.income), Wallet],
      ["Chiqim", formatMoney(snapshot.finance.expense), ArrowUpRight],
      ["Kirim − chiqim", formatMoney(snapshot.finance.balance), Sparkles],
      ["Kam qolgan mahsulot", `${snapshot.inventory.lowStockCount} ta`, Package],
    ].map(([label, value, Icon]) => <div className="ai-stat" key={label}><span><Icon size={17} />{tx(label)}</span><strong>{tx(value)}</strong></div>)}</div>
    <div className="ai-layout"><section className="ai-conversation" aria-label={tx("AI suhbat")}>
      <div className="ai-chat-header"><div className="ai-avatar"><Sparkles size={22} /></div><div><strong>{tx("CRM yordamchi")}</strong><span>{tx(mode === "local" ? "Mahalliy hisob-kitob • AI ulanmagan" : "OpenAI • AI rejimi")}</span></div><span className={`ai-badge ${mode === "openai" ? "is-live" : ""}`}>{tx(mode === "local" ? "Demo" : "AI")}</span></div>
      <div className="ai-messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((message, index) => <div key={index} className={`ai-message ai-message-${message.role}`}><small>{tx(message.role === "user" ? "Siz" : message.source === "local" ? "Mahalliy tahlil (AI emas)" : message.source === "openai" ? "OpenAI" : "CRM yordamchi")}</small><div>{message.source === "local" || message.source === "welcome" ? tx(message.content) : message.content}</div></div>)}
        {busy && <div className="ai-thinking" role="status">{tx("Ma’lumotlar tahlil qilinmoqda…")}</div>}<div ref={bottom} />
      </div>
      {error && <div className="ai-error" role="alert">{tx(error)}{tx(" Savolingiz qayta yuborish uchun saqlandi.")}</div>}
      {storageError && <div className="ai-error" role="status">{tx("Brauzer suhbatni saqlay olmadi. Sahifa yangilansa, tarix yo‘qolishi mumkin.")}</div>}
      <div className="ai-prompts">{prompts.map(prompt => <button key={prompt} disabled={busy} onClick={() => sendMessage(tx(prompt))}>{tx(prompt)}<ArrowUpRight size={14} /></button>)}</div>
      <form className="ai-composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}><label className="ai-sr-only" htmlFor="ai-question">{tx("Savolingiz")}</label><textarea id="ai-question" ref={textarea} rows={2} maxLength={4000} value={input} disabled={busy} placeholder={tx("Masalan, eng katta xarajatlarim qaysilar?")} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} /><button className="ai-send" type="submit" disabled={busy || !input.trim()} aria-label={tx("Xabar yuborish")}><Send size={19} /></button></form>
      <p className="ai-footnote">{tx("Enter — yuborish · Shift + Enter — yangi qator. Har savolda ma’lumotlar yangilanadi.")}</p>
    </section><aside className="ai-aside">
      <section className="ai-panel"><h2><ShieldCheck size={18} />{tx(" Ulanish")}</h2><p>{tx(health === null ? "Ulanish tekshirilmoqda…" : health.configured ? "OpenAI kaliti sozlangan. AI rejimini tanlab sinab ko‘ring." : health.offline ? "AI server ishga tushmagan. Mahalliy tahlildan foydalanishingiz mumkin." : "OpenAI kaliti hali sozlanmagan. Mahalliy tahlil tayyor.")}</p><div className="ai-mode"><button aria-pressed={mode === "local"} onClick={() => setMode("local")} disabled={busy}>{tx("Mahalliy")}</button><button aria-pressed={mode === "openai"} onClick={() => setMode("openai")} disabled={busy || !health?.configured}>OpenAI</button></div><button className="ai-text-button" onClick={checkConnection}><RefreshCw size={14} />{tx(" Ulanishni tekshirish")}</button>{mode === "openai" && <p className="ai-note">{tx("Savol va jamlangan CRM ko‘rsatkichlari OpenAI xizmatiga yuboriladi.")}</p>}</section>
      <section className="ai-panel"><h2>{tx("Tahlil manbalari")}</h2><ul><li>{tx("Moliya: kirim va chiqim")}</li><li>{tx("Saqlangan POS sotuvlari va qarzlar")}</li><li>{tx("Ombordagi joriy qoldiq")}</li><li>{tx("Tasdiqlangan qaytarishlar")}</li></ul><p>{tx("Davr: brauzerda mavjud barcha yozuvlar. Ayrim bo‘limlarda namunaviy ma’lumotlar bo‘lishi mumkin. Ombor harakatlari tarixi va tannarx to‘liq emas; kirim − chiqim sof foyda hisoblanmaydi.")}</p><button className="ai-text-button" onClick={() => setSnapshot(buildBusinessSnapshot())}><RefreshCw size={14} />{tx(" Raqamlarni yangilash")}</button></section>
      <section className="ai-panel ai-plan"><span className="ai-eyebrow">{tx("AI XIZMATI")}</span><h2>{tx("Sinov bosqichi")}</h2><p>{tx("Hozir obuna sotib olish ochilmagan. Pullik foydalanish to‘lov tizimi va mijoz hisoblari ulangandan keyin yoqiladi.")}</p></section>
    </aside></div>
    <ConfirmDialog open={confirmClear} title={tx("Yangi suhbat boshlansinmi?")} message={tx("Ushbu suhbat tarixi tozalanadi.")} confirmLabel={tx("Yangi suhbat")} onCancel={() => setConfirmClear(false)} onConfirm={() => { setMessages([welcome]); setError(""); setInput(""); setConfirmClear(false); }} />
  </div>;
}
