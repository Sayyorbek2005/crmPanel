const ADMIN_KEY = "super_admin_data_v1";
let tenantId = "";
let patched = false;

const scoped = (key) => tenantId && String(key).startsWith("crm_") ? `tenant:${tenantId}:${key}` : key;

export function activateTenantStorage(id) {
  tenantId = id || "";
  if (patched || !tenantId) return;
  patched = true;
  const get = Storage.prototype.getItem;
  const set = Storage.prototype.setItem;
  const remove = Storage.prototype.removeItem;
  Storage.prototype.getItem = function (key) { return get.call(this, scoped(key)); };
  Storage.prototype.setItem = function (key, value) { return set.call(this, scoped(key), value); };
  Storage.prototype.removeItem = function (key) { return remove.call(this, scoped(key)); };
}

export function readAdminData() {
  try {
    const data = JSON.parse(localStorage.getItem(ADMIN_KEY) || "{}");
    return { account: data.account || null, tenants: Array.isArray(data.tenants) ? data.tenants : [], tickets: Array.isArray(data.tickets) ? data.tickets : [] };
  } catch { return { account: null, tenants: [], tickets: [] }; }
}

export function saveAdminData(data) { localStorage.setItem(ADMIN_KEY, JSON.stringify(data)); }
export function tenantLink(tenant) { return `${window.location.origin}${window.location.pathname}?tenant=${encodeURIComponent(tenant.id)}&invite=${encodeURIComponent(tenant.invite)}`; }
