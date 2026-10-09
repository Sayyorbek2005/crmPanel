import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Phone, Send, UserRound } from "lucide-react";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import "./Help.css";
import "./HelpResponsive.css";

const ADMIN_KEY = "super_admin_data_v1";
const PHONE = "+998 97 935 97 07";
const TELEGRAM = "https://t.me/burhanov123";
const getAdminData = () => { try { const value = JSON.parse(localStorage.getItem(ADMIN_KEY) || "{}"); return { ...value, tenants: Array.isArray(value.tenants) ? value.tenants : [], tickets: Array.isArray(value.tickets) ? value.tickets : [] }; } catch { return { tenants: [], tickets: [] }; } };
const getIdentity = () => { try { const profile = JSON.parse(localStorage.getItem("crm_profile") || "{}"); return profile.name || profile.fullName || profile.company || "CRM mijoz"; } catch { return "CRM mijoz"; } };
const tenantId = new URLSearchParams(window.location.search).get("tenant") || "local-crm";
const formatTime = (value) => new Date(value).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Help() {
  useUILanguage();
  const [text, setText] = useState(""); const [refresh, setRefresh] = useState(0);
  const admin = useMemo(getAdminData, [refresh]);
  const thread = useMemo(() => admin.tickets.find((ticket) => String(ticket.tenantId) === String(tenantId)), [admin]);
  const messages = thread?.messages || (thread?.message ? [{ id: thread.id, sender: "customer", text: thread.message, createdAt: thread.createdAt }] : []);
  useEffect(() => { const timer = window.setInterval(() => setRefresh((value) => value + 1), 1800); return () => window.clearInterval(timer); }, []);
  const contact = (kind) => {
    const contactMessage = kind === "telegram" ? `Telegram: ${TELEGRAM}` : `Telefon: ${PHONE}`, now = new Date().toISOString(), next = { id: `contact-${Date.now()}`, sender: "system", text: contactMessage, createdAt: now };
    const base = getAdminData(), index = base.tickets.findIndex((ticket) => String(ticket.tenantId) === String(tenantId)), ticket = index >= 0 ? base.tickets[index] : { id: crypto.randomUUID(), tenantId, customerName: getIdentity(), createdAt: now, messages: [] };
    const updated = { ...ticket, messages: [...(ticket.messages || []), next], updatedAt: now, message: next.text }, tickets = index >= 0 ? base.tickets.map((item, itemIndex) => itemIndex === index ? updated : item) : [updated, ...base.tickets];
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ ...base, tickets })); setRefresh((value) => value + 1);
  };
  const send = (event) => {
    event.preventDefault(); const value = text.trim(); if (!value) return;
    const now = new Date().toISOString(), message = { id: crypto.randomUUID(), sender: "customer", text: value, createdAt: now, read: false }, base = getAdminData(), index = base.tickets.findIndex((ticket) => String(ticket.tenantId) === String(tenantId)), ticket = index >= 0 ? base.tickets[index] : { id: crypto.randomUUID(), tenantId, customerName: getIdentity(), createdAt: now, messages: [] };
    const updated = { ...ticket, customerName: ticket.customerName || getIdentity(), messages: [...(ticket.messages || []), message], message: value, updatedAt: now, unread: true }, tickets = index >= 0 ? base.tickets.map((item, itemIndex) => itemIndex === index ? updated : item) : [updated, ...base.tickets];
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ ...base, tickets })); setText(""); setRefresh((value) => value + 1);
  };
  return <div className="support-page fade-in"><section className="support-head"><div><span><MessageCircle size={16}/>{tx("Qo'llab-quvvatlash")}</span><h1>{tx("Yordam markazi")}</h1><p>{tx("Savolingizni yozing, administrator shu chat orqali javob beradi.")}</p></div></section><section className="support-layout"><aside className="support-quick"><h2>{tx("Tezkor bog'lanish")}</h2><p>{tx("Kerakli usulni tanlang")}</p><button type="button" onClick={() => contact("telegram")}><MessageCircle size={20}/><span><small>Telegram</small><b>{tx("Telegram orqali bog'lanish")}</b></span><ExternalLink size={16}/></button><button type="button" onClick={() => contact("phone")}><Phone size={20}/><span><small>{tx("Telefon")}</small><b>{tx("Telefon raqam orqali bog'lanish")}</b></span><ExternalLink size={16}/></button></aside><section className="support-chat"><header><div className="support-agent"><span><UserRound size={19}/></span><div><b>{tx("Qo'llab-quvvatlash xizmati")}</b><small>{tx("Administrator javobini kuting")}</small></div></div></header><div className="support-messages">{messages.length ? messages.map((message) => <div key={message.id} className={`support-message ${message.sender === "admin" ? "admin" : message.sender === "system" ? "system" : "customer"}`}><p>{message.text}</p><small>{formatTime(message.createdAt)}</small></div>) : <div className="support-empty"><MessageCircle size={28}/><b>{tx("Xush kelibsiz!")}</b><span>{tx("Savolingizni yozing yoki yuqoridan bog'lanish usulini tanlang.")}</span></div>}</div><form onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder={tx("Xabaringizni yozing...")}/><button type="submit" aria-label={tx("Yuborish")}><Send size={18}/></button></form></section></section></div>;
}
