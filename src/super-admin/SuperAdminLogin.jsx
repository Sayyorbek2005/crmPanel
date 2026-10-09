import { useState } from "react";
import { Crown, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { readAdminData, saveAdminData } from "./tenantStorage";
import "./superAdmin.css";

export default function SuperAdminLogin({ onLogin }) {
  const existing = readAdminData().account;
  const [login, setLogin] = useState(() => existing?.login || ""); const [password, setPassword] = useState(() => existing?.password || "");
  const [visible, setVisible] = useState(false); const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault(); setError("");
    if (!login.trim() || password.length < 8) return setError("Login va kamida 8 belgili parol kiriting.");
    if (existing && (existing.login !== login.trim().toLowerCase() || existing.password !== password)) return setError("Login yoki parol noto'g'ri.");
    if (!existing) saveAdminData({ ...readAdminData(), account: { login: login.trim().toLowerCase(), password } });
    sessionStorage.setItem("super_admin_session", "1"); onLogin();
  };
  return <div className="sa-auth"><section><div className="sa-mark"><Crown /> Control Center</div><h1>CRM tarmoqlaringizni<br />bitta joydan boshqaring.</h1><p>Mijozlarni qo‘shing, ularning tizimi holatini kuzating va yordam so‘rovlarini qabul qiling.</p><div className="sa-safe"><ShieldCheck /> Har bir mijozning ma’lumotlari alohida saqlanadi.</div></section><main><div className="sa-login-card"><Crown className="sa-crown" /><h2>{existing ? "Super Admin kirishi" : "Super Admin hisobini yarating"}</h2><p>{existing ? "Control Center boshqaruviga kiring" : "Bu hisob faqat sizning boshqaruv panelingiz uchun"}</p><form onSubmit={submit}><label>Login<input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" /></label><label>Parol<div className="sa-password"><input type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={existing ? "current-password" : "new-password"}/><button type="button" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>{error && <small className="sa-error">{error}</small>}<button className="sa-primary">{existing ? "Kirish" : "Hisob yaratish"}</button></form></div></main></div>;
}
