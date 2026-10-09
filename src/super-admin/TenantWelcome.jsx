import { useState } from "react";
import { Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { getDirector, registerDirector, resetDirectorFromInvite } from "../data/accessStore";
import { readAdminData } from "./tenantStorage";
import "./superAdmin.css";

export default function TenantWelcome({ tenantId, invite, onReady }) {
  const tenant = readAdminData().tenants.find((item) => item.id === tenantId && item.invite === invite);
  const [login, setLogin] = useState(""); const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false); const [error, setError] = useState("");
  const exists = Boolean(getDirector());
  if (!tenant) return <div className="sa-message">Taklif havolasi topilmadi yoki muddati tugagan.</div>;
  const submit = async (event) => { event.preventDefault(); setError(""); try { if (!login.trim() || password.length < 8) throw new Error("Login va kamida 8 belgili parol kiriting."); onReady(await (exists ? resetDirectorFromInvite(login, password) : registerDirector(login, password))); } catch (err) { setError(err.message); } };
  return <div className="sa-tenant-welcome"><div className="sa-login-card"><Building2 className="sa-crown"/><h1>{tenant.name} tizimiga xush kelibsiz</h1><p>{exists ? "Taklif havolasi orqali direktor login va parolini qayta o‘rnating." : "Direktor uchun login va parol yarating. Keyin sozlamalarga yo‘naltirilasiz."}</p><form onSubmit={submit}><label>Direktor logini<input value={login} onChange={(e) => setLogin(e.target.value)} /></label><label>Parol<div className="sa-password"><input type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>{error && <small className="sa-error">{error}</small>}<button className="sa-primary"><CheckCircle2 size={17}/> {exists ? "Kirish ma’lumotlarini yangilash" : "Tizimni ishga tushirish"}</button></form></div></div>;
}
