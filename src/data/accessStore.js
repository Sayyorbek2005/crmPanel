import { readEmployees } from "./employeeStore";

const DIRECTOR_KEY = "crm_director_account";
const LOCAL_LOGIN_KEY = "crm_local_login_v1";
// One-time recovery for the existing local director account. Keep only the salted hash in the bundle.
const DIRECTOR_RECOVERY = {
  login: "abbosbek12345",
  salt: "28c94403-4715-47ad-963b-e5ab247b0b2e",
  passwordHash: "2c11b0dc6e384f694c1552826799300ead1d56e038af4effdf39f0334db123b9",
  resetVersion: 1,
};
export const SESSION_KEY = "crm_access_session";
export const ACCESS_SECTIONS = [
  { id: "dashboard", label: "Dashboard" }, { id: "sales", label: "Sotuvlar" },
  { id: "products", label: "Mahsulotlar" }, { id: "customers", label: "Mijozlar" },
  { id: "suppliers", label: "Ta'minotchilar" }, { id: "employees", label: "Xodimlar" },
  { id: "ustolar", label: "Ustolar" }, { id: "finance", label: "Moliya" },
  { id: "reports", label: "Hisobotlar" }, { id: "settings", label: "Sozlamalar" },
  { id: "ai-chat", label: "AI Chat" },
];

export function sectionForPage(page) {
  if (page === "help" || page === "notifications") return null;
  if (page.startsWith("customer-")) return "customers";
  if (page.startsWith("product-")) return "products";
  if (page.startsWith("supplier-")) return "suppliers";
  if (page.startsWith("employee-")) return "employees";
  if (page.startsWith("debt-")) return "finance";
  if (page.startsWith("sales-")) return "sales";
  if (page.startsWith("products-")) return "products";
  if (page.startsWith("customers-")) return "customers";
  if (page.startsWith("finance-")) return "finance";
  return page;
}

export function canAccess(user, page) {
  if (!user) return false;
  if (user.type === "director") return true;
  const section = sectionForPage(page);
  return !section || user.permissions?.includes(section);
}

export function getDirector() {
  try {
    const director = JSON.parse(localStorage.getItem(DIRECTOR_KEY));
    if (director && !director.resetVersion) {
      localStorage.setItem(DIRECTOR_KEY, JSON.stringify(DIRECTOR_RECOVERY));
      return DIRECTOR_RECOVERY;
    }
    return director;
  }
  catch { return null; }
}

export function readLocalLogin() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_LOGIN_KEY) || "null");
    return value?.login && value?.password ? value : null;
  } catch { return null; }
}

export function rememberLocalLogin(login, password, type = "director") {
  localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify({ login: login.trim().toLowerCase(), password, type }));
}

async function digest(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCredentials(login, password) {
  const salt = crypto.randomUUID();
  return { login: login.trim().toLowerCase(), salt, passwordHash: await digest(password, salt) };
}

export function loginExists(login) {
  const normalized = login.trim().toLowerCase();
  return getDirector()?.login === normalized || readEmployees().some((employee) => employee.login === normalized);
}

export async function registerDirector(login, password) {
  if (getDirector()) throw new Error("Direktor hisobi allaqachon yaratilgan.");
  if (loginExists(login)) throw new Error("Bu login band.");
  localStorage.setItem(DIRECTOR_KEY, JSON.stringify({ ...await createCredentials(login, password), resetVersion: 1 }));
  rememberLocalLogin(login, password);
  return { type: "director", name: "Direktor" };
}

// Only used by a valid Super Admin invitation when a tenant must recover access.
export async function resetDirectorFromInvite(login, password) {
  if (!login.trim() || password.length < 8) throw new Error("Login va parolni to'g'ri kiriting.");
  const normalized = login.trim().toLowerCase();
  const employeeWithSameLogin = readEmployees().some((employee) => employee.login === normalized);
  if (employeeWithSameLogin) throw new Error("Bu login xodim tomonidan ishlatilmoqda.");
  localStorage.setItem(DIRECTOR_KEY, JSON.stringify({ ...await createCredentials(normalized, password), resetVersion: 1 }));
  rememberLocalLogin(normalized, password);
  return { type: "director", name: "Direktor" };
}

export async function updateDirectorCredentials(login, currentPassword, newPassword = "") {
  const normalized = login.trim().toLowerCase();
  const director = getDirector();
  if (!director) throw new Error("Direktor hisobi topilmadi.");
  if (!currentPassword || director.passwordHash !== await digest(currentPassword, director.salt)) {
    throw new Error("Hozirgi parol noto'g'ri.");
  }
  if (!normalized) throw new Error("Yangi loginni kiriting.");
  if (readEmployees().some((employee) => employee.login === normalized)) {
    throw new Error("Bu login xodim tomonidan ishlatilmoqda.");
  }
  if (!newPassword && normalized === director.login) throw new Error("Login yoki parolni o'zgartiring.");
  if (newPassword && newPassword.length < 8) throw new Error("Yangi parol kamida 8 belgidan iborat bo'lsin.");
  const updated = newPassword
    ? { ...await createCredentials(normalized, newPassword), resetVersion: 1 }
    : { ...director, login: normalized, resetVersion: 1 };
  localStorage.setItem(DIRECTOR_KEY, JSON.stringify(updated));
  return updated;
}

export async function authenticate(login, password) {
  const normalized = login.trim().toLowerCase();
  const director = getDirector();
  if (director?.login === normalized && director.passwordHash === await digest(password, director.salt)) {
    rememberLocalLogin(normalized, password);
    return { type: "director", name: "Direktor" };
  }
  const employee = readEmployees().find((entry) => entry.login === normalized);
  if (employee?.status === "active" && employee.passwordHash === await digest(password, employee.salt)) {
    rememberLocalLogin(normalized, password, "employee");
    return { type: "employee", id: employee.id, name: employee.name, role: employee.role, permissions: employee.permissions || [], credentialId: employee.salt };
  }
  throw new Error("Login yoki parol noto'g'ri, yoxud xodim hisobi faol emas.");
}

export function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (saved?.type === "director") return getDirector() ? saved : null;
    if (saved?.type === "employee") {
      const employee = readEmployees().find((entry) => entry.id === saved.id && entry.status === "active" && entry.login);
      return employee && saved.credentialId === employee.salt
        ? { type: "employee", id: employee.id, name: employee.name, role: employee.role, permissions: employee.permissions || [], credentialId: employee.salt }
        : null;
    }
  } catch { /* Invalid session */ }
  return null;
}
