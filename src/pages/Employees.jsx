import { translateText as tx } from "../locales/translateText";
import { formatCurrency } from "../data/currency";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import './Employees.css';
import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  ShoppingCart,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { employees as employeesSeed } from "../data/mockData";
import { readEmployees, saveEmployees } from "../data/employeeStore";
import Modal, { Field } from "../components/Modal";
import PhoneInput from "../components/PhoneInput";
import { useToast } from "../context/ToastContext";
import { ACCESS_SECTIONS, createCredentials, loginExists } from "../data/accessStore";

const ROLES = ["Admin", "Manager", "Kassir", "Ombor", "Boshqa"];
const cleanRole = (value) => value.replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("uz-UZ"));

const roleColors = {
  Admin: {
    bg: "var(--brand-light)",
    color: "var(--brand)",
  },
  Manager: {
    bg: "var(--violet-light)",
    color: "var(--violet)",
  },
  Kassir: {
    bg: "var(--success-light)",
    color: "var(--success)",
  },
  Ombor: {
    bg: "var(--warning-light)",
    color: "var(--warning)",
  },
};

export default function Employees({ onNavigate }) {
  useUILanguage();
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState(() => {
    try { return readEmployees(); } catch { return employeesSeed; }
  });
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    role: "Kassir",
    customRole: "",
    phone: "",
    status: "active",
    login: "",
    password: "",
    permissions: [],
  });

  const [err, setErr] = useState("");
  const toast = useToast();

  const digits = form.phone.replace(/\D/g, "");
  const phoneValid = digits.length === 12;

  const submit = () => {
    if (!form.name.trim()) {
      return setErr("Xodim ismini kiriting");
    }

    if (form.role === "Boshqa" && !form.customRole.trim()) return setErr("Lavozim nomini kiriting");

    if (!phoneValid) {
      return setErr("Telefon raqamini to'liq kiriting");
    }

    if (!form.login.trim() || form.password.length < 8) {
      return setErr("Login va kamida 8 belgili parol kiriting.");
    }
    if (loginExists(form.login)) {
      return setErr("Bu login allaqachon ishlatilmoqda.");
    }
    if (!form.permissions.length) {
      return setErr("Kamida bitta bo'limga ruxsat bering.");
    }

    setErr("");
    setConfirmOpen(true);
  };

  const addEmployee = async () => {
    setConfirmOpen(false);
    const initials = form.name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const prev = employees;
    const credentials = await createCredentials(form.login, form.password);
    const updated = [
      {
        id:
          Math.max(
            0,
            ...prev.map((e) => Number(e.id) || 0)
          ) + 1,
        name: form.name.trim(),
        role: form.role === "Boshqa" ? form.customRole.trim() : form.role,
        phone: form.phone,
        avatar: initials,
        sales: 0,
        revenue: 0,
        status: form.status,
        lastActive: "Hozir",
        ...credentials,
        permissions: form.permissions,
      },
      ...prev,
    ];
    try { saveEmployees(updated); }
    catch { setErr("Xodim saqlanmadi. Qayta urinib ko'ring."); return; }
    setEmployees(updated);

    setForm({
      name: "",
      role: "Kassir",
      customRole: "",
      phone: "",
      status: "active",
      login: "",
      password: "",
      permissions: [],
    });

    setOpen(false);

    toast.success &&
      toast.success("Xodim qo'shildi");
  };

  const filtered = employees.filter(
    (e) =>
      e.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      e.role
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{
              fontFamily: "'Manrope',sans-serif",
              color: "var(--text-primary)",
            }}
          >{tx("Xodimlar")}</h1>

          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-muted)",
            }}
          >{tx("Hodimlar va ularning ko'rsatkichlari")}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErr("");
            setOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg,var(--brand),var(--brand-hover))",
            boxShadow:
              "0 2px 8px rgba(37,99,235,0.25)",
          }}
        >
          <Plus size={15} />{tx("Xodim qo'shish")}</button>
      </div>

      {/* STATISTICS CARDS */}
      <div
        className="employees-stats grid gap-4"
      >
        {[
          {
            label: "Jami xodimlar",
            value: employees.length,
            icon: UserCog,
            color: "var(--brand)",
            bg: "var(--brand-light)",
          },
          {
            label: "Faol",
            value: employees.filter(
              (e) => e.status === "active"
            ).length,
            icon: UserCog,
            color: "var(--success)",
            bg: "var(--success-light)",
          },
          {
            label: "Jami sotuvlar",
            value: employees.reduce(
              (s, e) => s + e.sales,
              0
            ),
            icon: ShoppingCart,
            color: "var(--violet)",
            bg: "var(--violet-light)",
          },
          {
            label: "Umumiy daromad",
            value:
              (
                employees.reduce(
                  (s, e) => s + e.revenue,
                  0
                ) / 1000000
              ).toFixed(0) + " mln",
            icon: TrendingUp,
            color: "var(--warning)",
            bg: "var(--warning-light)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 transition-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow:
                "0 2px 8px rgba(15,23,42,0.04)",
              minWidth: 0,
            }}
          >
            <div
              className="p-2.5 rounded-xl w-fit mb-3"
              style={{
                background: s.bg,
              }}
            >
              <s.icon
                size={18}
                style={{
                  color: s.color,
                }}
              />
            </div>

            <div
              className="text-xl font-display font-bold"
              style={{
                fontFamily:
                  "'Manrope',sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {tx(s.value)}
            </div>

            <div
              className="text-xs mt-0.5"
              style={{
                color: "var(--text-faint)",
              }}
            >
              {tx(s.label)}
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div
        className="employees-list-card rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow:
            "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        {/* SEARCH */}
        <div
          className="px-5 py-4"
          style={{
            borderBottom:
              "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              maxWidth: 280,
            }}
          >
            <Search
              size={14}
              style={{
                color: "var(--text-faint)",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={tx("Xodim qidirish...")}
              className="bg-transparent outline-none text-sm flex-1"
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <div className="employees-table-scroll" role="region" aria-label={tx("Xodimlar jadvali")} tabIndex="0">
          <table className="employees-table w-full">
            <thead>
              <tr
                style={{
                  background:
                    "var(--table-stripe)",
                }}
              >
                {[
                  "Xodim",
                  "Lavozim",
                  "Telefon",
                  "Oylik maosh",
                  "Sotuvlar",
                  "Daromad",
                  "Holat",
                  "Faollik",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold"
                    style={{
                      color:
                        "var(--text-faint)",
                    }}
                  >
                    {tx(h)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((e) => {
                const rc =
                  roleColors[e.role] || {
                    bg:
                      "var(--border-subtle)",
                    color:
                      "var(--text-muted)",
                  };

                return (
                  <tr
                    key={e.id}
                    onClick={() =>
                      onNavigate &&
                      onNavigate(
                        "employee-" + e.id
                      )
                    }
                    className="border-t table-row-hover transition-colors"
                    style={{
                      cursor: "pointer",
                      borderColor:
                        "var(--border-subtle)",
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                          style={{
                            background:
                              "linear-gradient(135deg,var(--brand),var(--violet))",
                          }}
                        >
                          {tx(e.avatar)}
                        </div>

                        <span
                          className="text-sm font-semibold"
                          style={{
                            color:
                              "var(--text-primary)",
                          }}
                        >
                          {e.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: rc.bg,
                          color: rc.color,
                        }}
                      >
                        {tx(e.role)}
                      </span>
                    </td>

                    <td
                      className="px-5 py-3.5 text-sm"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {e.phone}
                    </td>

                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {e.monthlySalary == null ? tx("Tayinlanmagan") : formatCurrency(e.monthlySalary)}
                    </td>

                    <td
                      className="px-5 py-3.5 text-sm font-medium"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {tx(e.sales > 0
                        ? e.sales + " ta"
                        : "—")}
                    </td>

                    <td
                      className="px-5 py-3.5 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {e.revenue > 0 ? formatCurrency(e.revenue) : "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            e.status ===
                            "active"
                              ? "var(--success-light)"
                              : "var(--border-subtle)",
                          color:
                            e.status ===
                            "active"
                              ? "var(--success)"
                              : "var(--text-muted)",
                        }}
                      >
                        {tx(e.status === "active"
                          ? "Faol"
                          : "Nofaol")}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {e.lastActive ===
                          "Hozir" && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background:
                                "var(--success)",
                            }}
                          />
                        )}

                        <span
                          className="text-xs"
                          style={{
                            color:
                              "var(--text-faint)",
                          }}
                        >
                          {tx(e.lastActive)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{
                          color:
                            "var(--text-faint)",
                        }}
                      >
                        <MoreHorizontal
                          size={15}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      <Modal contentOnly
        open={open && !confirmOpen}
        onClose={() => {
          setOpen(false);
          setErr("");
        }}
        title={tx("Yangi xodim qo'shish")}
        subtitle={tx("Xodim ma'lumotlarini kiriting")}
        icon={UserCog}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >

          {/* NAME */}
          <Field label={tx("To'liq ism")}>
            <input
              className="input-base"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder={tx("Alisher Qodirov")}
            />
          </Field>

          {/* PHONE */}
          <Field
            label={tx("Telefon raqami")}
            hint={tx("Faqat raqam kiritiladi")}
          >
            <PhoneInput
              value={form.phone}
              onChange={(v) =>
                setForm({
                  ...form,
                  phone: v,
                })
              }
            />
          </Field>

          <Field label={tx("Kirish logini")}>
            <input className="input-base" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder={tx("Masalan: alisher.qodirov")} autoComplete="off" />
          </Field>
          <Field label={tx("Kirish paroli")} hint={tx("Kamida 8 belgi")}>
            <input className="input-base" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label={tx("Foydalanish mumkin bo'lgan bo'limlar")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, maxHeight: 170, overflowY: "auto" }}>
              {ACCESS_SECTIONS.filter((section) => section.id !== "employees" && section.id !== "settings").map((section) => (
                <label key={section.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={form.permissions.includes(section.id)} onChange={() => setForm((current) => ({
                    ...current,
                    permissions: current.permissions.includes(section.id)
                      ? current.permissions.filter((id) => id !== section.id)
                      : [...current.permissions, section.id],
                  }))} />
                  {tx(section.label)}
                </label>
              ))}
            </div>
          </Field>

          {/* ROLE */}
          <Field label={tx("Lavozim")}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {ROLES.map((r) => {
                const active =
                  form.role === r;

                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() =>
                      setForm({
                        ...form,
                        role: r,
                      })
                    }
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: active
                        ? "var(--brand)"
                        : "var(--input-bg)",
                      color: active
                        ? "#fff"
                        : "var(--text-secondary)",
                      border:
                        "1px solid " +
                        (active
                          ? "var(--brand)"
                          : "var(--border)"),
                    }}
                  >
                    {tx(r)}
                  </button>
                );
              })}
            </div>
            {form.role === "Boshqa" && <input className="input-base mt-3" value={form.customRole} onChange={(e) => setForm({ ...form, customRole: cleanRole(e.target.value) })} placeholder={tx("Lavozim nomini yozing")} maxLength={40} />}
          </Field>

          {/* STATUS */}
          <Field label={tx("Holat")}>
            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              {[
                {
                  k: "active",
                  l: "Faol",
                },
                {
                  k: "inactive",
                  l: "Nofaol",
                },
              ].map((s) => {
                const active =
                  form.status === s.k;

                return (
                  <button
                    type="button"
                    key={s.k}
                    onClick={() =>
                      setForm({
                        ...form,
                        status: s.k,
                      })
                    }
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: active
                        ? "var(--success-light)"
                        : "var(--input-bg)",
                      color: active
                        ? "var(--success)"
                        : "var(--text-secondary)",
                      border:
                        "1px solid " +
                        (active
                          ? "var(--success)"
                          : "var(--border)"),
                    }}
                  >
                    {tx(s.l)}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* ERROR */}
          {err && (
            <div
              style={{
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background:
                  "var(--danger-light)",
                color: "var(--danger)",
                border:
                  "1px solid var(--danger-border)",
              }}
            >
              {tx(err)}
            </div>
          )}

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                setErr("");
              }}
            >{tx("Bekor qilish")}</button>

            <button
              type="button"
              className="btn-primary"
              onClick={submit}
            >
              <Plus size={15} />{tx("Qo'shish")}</button>
          </div>

        </div>
      </Modal>
      <Modal contentOnly open={confirmOpen} onClose={() => setConfirmOpen(false)} title={tx("Xodimni kiritish") } subtitle={tx("Kiritilgan ma'lumotlar to'g'riligini tasdiqlang")} icon={UserCog} width={420}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{tx("Xodim kiritilsinmi?")} <strong>{form.name.trim()}</strong></p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConfirmOpen(false)}>{tx("Yo'q, qaytish")}</button>
            <button type="button" className="btn-primary" onClick={addEmployee}><Plus size={15}/>{tx("Ha, kiritish")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
