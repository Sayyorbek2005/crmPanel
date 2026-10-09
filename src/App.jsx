import { translateText as tx } from "./locales/translateText";

import "./App.css";
import "./BackButton.css";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import {
  LanguageProvider,
  useLanguage as useUILanguage,
} from "./context/LanguageContext";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// Pages
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import POS from "./pages/POS";
import Returns from "./pages/Returns";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";

// import Inventory from "./pages/Inventory";

import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Suppliers from "./pages/Suppliers";
import Employees from "./pages/Employees";
import Ustolar from "./pages/ustolar";
import Finance from "./pages/Finance";
import DebtManagement from "./pages/DebtManagement";
import SupplierDetail from "./pages/SupplierDetail";
import EmployeeDetail from "./pages/EmployeeDetail";
import DebtDetail from "./pages/DebtDetail";
import Help from "./pages/Help";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import AIChat from "./pages/AIChat";
import Login from "./pages/Login";

import { notifications } from "./data/mockData";
import {
  ACCESS_SECTIONS,
  canAccess,
  SESSION_KEY,
  getDirector,
} from "./data/accessStore";
import { readEmployees } from "./data/employeeStore";
import { readProfile } from "./data/profileStore";
import { prepareSaleReadyData } from "./data/saleReadyReset";

import { activateTenantStorage } from "./super-admin/tenantStorage";
import SuperAdminLogin from "./super-admin/SuperAdminLogin";
import SuperAdminPanel from "./super-admin/SuperAdminPanel";
import TenantWelcome from "./super-admin/TenantWelcome";

const portalParams = new URLSearchParams(window.location.search);
const tenantId = portalParams.get("tenant") || "";
const tenantInvite = portalParams.get("invite") || "";
const isTenantPortal = Boolean(tenantId && tenantInvite);

if (isTenantPortal) {
  activateTenantStorage(tenantId);
}

prepareSaleReadyData();

// ── Placeholder ─────────────────────────────────────

const Placeholder = ({ title, sub }) => (
  <div className="flex flex-col items-center justify-center min-h-64 fade-in">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl"
      style={{ background: "var(--brand-light)" }}
    >
      📄
    </div>

    <h2
      className="font-display font-bold text-xl mb-2"
      style={{
        fontFamily: "'Manrope',sans-serif",
        color: "var(--text-primary)",
      }}
    >
      {tx(title)}
    </h2>

    <p
      className="text-sm text-center max-w-xs"
      style={{ color: "var(--text-muted)" }}
    >
      {tx(sub)}
    </p>
  </div>
);

// ── Router ──────────────────────────────────────────

function renderPage(
  page,
  onNavigate,
  onBack,
  user,
  onProfileSaved,
  posCartProps,
  ustaProps
) {
  if (page.startsWith("customer-sale-")) {
    let saleCustomer = null;

    try {
      saleCustomer = JSON.parse(
        decodeURIComponent(page.slice("customer-sale-".length))
      );
    } catch {
      // Ignore malformed internal routes.
    }

    return (
      <CustomerDetail
        saleCustomer={saleCustomer}
        onBack={onBack}
        onNavigate={onNavigate}
      />
    );
  }

  if (page.startsWith("customer-")) {
    const id = parseInt(page.replace("customer-", ""), 10);

    return (
      <CustomerDetail
        customerId={id}
        onBack={onBack}
        onNavigate={onNavigate}
      />
    );
  }

  if (page.startsWith("product-")) {
    const id = page.replace("product-", "");

    return <ProductDetail productId={id} onBack={onBack} />;
  }

  if (page.startsWith("supplier-")) {
    const id = parseInt(page.replace("supplier-", ""), 10);

    return <SupplierDetail supplierId={id} onBack={onBack} />;
  }

  if (page.startsWith("employee-")) {
    const id = parseInt(page.replace("employee-", ""), 10);

    return <EmployeeDetail employeeId={id} onBack={onBack} />;
  }

  if (page.startsWith("debt-")) {
    const id = parseInt(page.replace("debt-", ""), 10);

    return <DebtDetail debtorId={id} onBack={onBack} />;
  }

  switch (page) {
    case "dashboard":
      return <Dashboard onNavigate={onNavigate} />;

    case "sales-all":
      return <Sales onNavigate={onNavigate} />;

    case "sales-new":
      return <POS {...posCartProps} />;

    case "sales-returns":
      return <Returns />;

    case "products-all":
      return <Products onNavigate={onNavigate} />;

    case "categories":
      return (
        <Placeholder
          title={tx("Kategoriyalar")}
          sub="Mahsulot kategoriyalarini boshqarish"
        />
      );

    case "brands":
      return (
        <Placeholder
          title={tx("Brendlar")}
          sub="Tovar brendlari va ishlab chiqaruvchilar"
        />
      );

    // case "inventory":
    //   return <Inventory />;

    case "customers-all":
      return <Customers filter="all" onNavigate={onNavigate} />;

    case "customers-debt":
      return <Customers filter="debt" onNavigate={onNavigate} />;

    case "customers-vip":
      return <Customers filter="vip" onNavigate={onNavigate} />;

    case "suppliers":
      return <Suppliers onNavigate={onNavigate} />;

    case "employees":
      return <Employees onNavigate={onNavigate} />;

    case "ustolar":
      return <Ustolar {...ustaProps} />;

    case "finance-revenue":
    case "finance-expenses":
      return <Finance subpage={page} />;

    case "finance-debt":
      return <DebtManagement onNavigate={onNavigate} />;

    case "reports":
      return <Reports />;

    case "notifications":
      return <Notifications />;

    case "settings":
      return <Settings user={user} onProfileSaved={onProfileSaved} />;

    case "ai-chat":
      return <AIChat user={user} />;

    case "help":
      return <Help />;

    default:
      return <Dashboard onNavigate={onNavigate} />;
  }
}

// ── Shell ───────────────────────────────────────────

const detailPagePrefixes = [
  "customer-",
  "product-",
  "supplier-",
  "employee-",
  "debt-",
];

const browserRouteKey = "__uyMarketCrmRoute";

const sectionStartPages = {
  sales: "sales-all",
  products: "products-all",
  customers: "customers-all",
  finance: "finance-revenue",
};

function firstAllowedPage(user) {
  const section = ACCESS_SECTIONS.find((entry) =>
    canAccess(user, entry.id)
  );

  return section
    ? sectionStartPages[section.id] || section.id
    : "help";
}

function routeFromBrowserState(state) {
  const savedRoute = state?.[browserRouteKey];

  if (
    typeof savedRoute?.page !== "string" ||
    !Array.isArray(savedRoute.history)
  ) {
    return null;
  }

  return {
    page: savedRoute.page,
    history: savedRoute.history.filter(
      (entry) => typeof entry === "string"
    ),
  };
}

function Shell({ onLogout, user, initialPage }) {
  useUILanguage();

  const [, setCurrencyRevision] = useState(0);
  const [profile, setProfile] = useState(() => readProfile(user));

  const [route, setRoute] = useState(() => {
    const saved = routeFromBrowserState(window.history.state);

    return saved && canAccess(user, saved.page)
      ? saved
      : {
          page: initialPage || firstAllowedPage(user),
          history: [],
        };
  });

  const routeRef = useRef(route);
  const { page, history } = route;

  const [collapsed, setCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [posCartOpen, setPosCartOpen] = useState(false);
  const [profileUsta, setProfileUsta] = useState(null);

  const contentRef = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const refreshMoney = () => {
      setCurrencyRevision((value) => value + 1);
    };

    window.addEventListener("crm-currency-change", refreshMoney);

    return () => {
      window.removeEventListener("crm-currency-change", refreshMoney);
    };
  }, []);

  useEffect(() => {
    if (!routeFromBrowserState(window.history.state)) {
      window.history.replaceState(
        {
          ...window.history.state,
          [browserRouteKey]: routeRef.current,
        },
        ""
      );
    }

    const handleBrowserNavigation = (event) => {
      const browserRoute = routeFromBrowserState(event.state);

      const nextRoute =
        browserRoute && canAccess(user, browserRoute.page)
          ? browserRoute
          : {
              page: firstAllowedPage(user),
              history: [],
            };

      routeRef.current = nextRoute;
      setRoute(nextRoute);
      setIsSidebarOpen(false);
    };

    window.addEventListener("popstate", handleBrowserNavigation);

    return () => {
      window.removeEventListener("popstate", handleBrowserNavigation);
    };
  }, [user]);

  useEffect(() => {
    if (!canAccess(user, routeRef.current.page)) {
      const allowed = {
        page: firstAllowedPage(user),
        history: [],
      };

      routeRef.current = allowed;
      setRoute(allowed);

      window.history.replaceState(
        {
          ...window.history.state,
          [browserRouteKey]: allowed,
        },
        ""
      );
    }
  }, [user]);

  useEffect(() => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setPosCartOpen(false);
    setProfileUsta(null);
  }, [page]);

  const navigate = (nextPage) => {
    if (!nextPage) {
      return;
    }

    if (nextPage === "login") {
      onLogout();
      return;
    }

    if (!canAccess(user, nextPage)) {
      return;
    }

    const current = routeRef.current;

    if (current.page === nextPage) {
      return;
    }

    const nextRoute = {
      page: nextPage,
      history: [...current.history, current.page],
    };

    window.history.pushState(
      {
        ...window.history.state,
        [browserRouteKey]: nextRoute,
      },
      ""
    );

    routeRef.current = nextRoute;
    setRoute(nextRoute);
    setIsSidebarOpen(false);
  };

  const goBack = () => {
    if (routeRef.current.history.length > 0) {
      window.history.back();
    }
  };

  const hasOwnBackButton = detailPagePrefixes.some((prefix) =>
    page.startsWith(prefix)
  );

  const handleShellBack = () => {
    if (page === "ustolar" && profileUsta) {
      setProfileUsta(null);
      return;
    }

    if (page === "sales-new" && posCartOpen) {
      setPosCartOpen(false);
      return;
    }

    goBack();
  };

  return (
    <div
      className="flex h-full relative"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar
        user={user}
        profile={profile}
        active={page}
        onNavigate={navigate}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        notifCount={unread}
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onNavigate={navigate}
          notifCount={unread}
          user={user}
          profile={profile}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flex: "1 1 0%",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            isolation: "isolate",
          }}
        >
          <main
            ref={contentRef}
            className={`flex-1 overflow-y-auto p-6 ${
              page === "sales-new" ? "app-pos-main" : ""
            }${page === "ai-chat" ? " ai-chat-shell-scroll" : ""}`}
          >
            <div
              className={
                page === "sales-new" ? "app-pos-content" : undefined
              }
              style={{
                maxWidth: 1400,
                margin: "0 auto",
                width: "100%",
              }}
            >
              {(history.length > 0 ||
                (page === "ustolar" && profileUsta) ||
                (page === "sales-new" && posCartOpen)) &&
                !hasOwnBackButton && (
                  <button
                    type="button"
                    onClick={handleShellBack}
                    aria-label={tx(
                      page === "sales-new" && posCartOpen
                        ? "Mahsulot tanlashga qaytish"
                        : "Oldingi sahifaga qaytish"
                    )}
                    className={`app-back-button${
                      page === "sales-new" && posCartOpen
                        ? " is-cart-back"
                        : ""
                    }`}
                  >
                    <ArrowLeft
                      size={16}
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    />
                    {tx("Orqaga")}
                  </button>
                )}

              {tx(
                canAccess(user, page)
                  ? renderPage(
                      page,
                      navigate,
                      goBack,
                      user,
                      setProfile,
                      {
                        cartWindowOpen: posCartOpen,
                        onCartWindowChange: setPosCartOpen,
                      },
                      {
                        profileUsta,
                        setProfileUsta,
                      }
                    )
                  : null
              )}
            </div>
          </main>

          <div
            id="main-modal-root"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── App root ────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Login still starts fresh.
    }

    return null;
  });

  const [firstTenantSetup, setFirstTenantSetup] = useState(false);

  const [superAdmin, setSuperAdmin] = useState(
    () => sessionStorage.getItem("super_admin_session") === "1"
  );

  const [tenantRecovery, setTenantRecovery] = useState(false);

  useEffect(() => {
    const refreshEmployee = (event) => {
      if (
        event.type === "storage" &&
        event.key !== "crm_employees"
      ) {
        return;
      }

      setUser((current) => {
        if (current?.type !== "employee") {
          return current;
        }

        try {
          const employee = readEmployees().find(
            (entry) => String(entry.id) === String(current.id)
          );

          if (
            !employee ||
            employee.status !== "active" ||
            !employee.login ||
            current.credentialId !== employee.salt
          ) {
            return null;
          }

          const permissions = employee.permissions || [];

          if (
            current.name === employee.name &&
            current.role === employee.role &&
            JSON.stringify(current.permissions) ===
              JSON.stringify(permissions)
          ) {
            return current;
          }

          const updated = {
            type: "employee",
            id: employee.id,
            name: employee.name,
            role: employee.role,
            permissions,
            credentialId: employee.salt,
          };

          return updated;
        } catch {
          return current;
        }
      });
    };

    window.addEventListener("storage", refreshEmployee);
    window.addEventListener("focus", refreshEmployee);

    return () => {
      window.removeEventListener("storage", refreshEmployee);
      window.removeEventListener("focus", refreshEmployee);
    };
  }, []);

  const handleLogin = (account) => setUser(account);
  const handleLogout = () => setUser(null);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          {!isTenantPortal ? (
            superAdmin ? (
              <SuperAdminPanel
                onLogout={() => {
                  sessionStorage.removeItem("super_admin_session");
                  setSuperAdmin(false);
                }}
              />
            ) : (
              <SuperAdminLogin
                onLogin={() => setSuperAdmin(true)}
              />
            )
          ) : user ? (
            <Shell
              key={`${user.type}-${user.id || "director"}`}
              user={user}
              onLogout={handleLogout}
              initialPage={firstTenantSetup ? "settings" : undefined}
            />
          ) : getDirector() && !tenantRecovery ? (
            <Login
              onLogin={handleLogin}
              onRecover={() => setTenantRecovery(true)}
            />
          ) : (
            <TenantWelcome
              tenantId={tenantId}
              invite={tenantInvite}
              onReady={(account) => {
                setFirstTenantSetup(true);
                setUser(account);
              }}
            />
          )}
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}