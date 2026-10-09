import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  UserCog,
  Wrench, // <--- Ustolar uchun ikonka qo'shildi
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  // Building2,
  Store,
  X,
  DollarSign,
  CreditCard,
  ChevronLeft,
  Menu,
  Phone,
  MessageCircle,
} from "lucide-react";

import { useLanguage } from "../context/LanguageContext";
import { canAccess } from "../data/accessStore";
import { profileInitials, profileName } from "../data/profileStore";
import ConfirmDialog from "./ConfirmDialog";

const buildNavItems = (t) => [
  {
    id: "dashboard",
    label: t("sidebar.dashboard", "Dashboard"),
    icon: LayoutDashboard,
  },

  {
    key: "sales-group",
    label: t("sidebar.sales", "Sotuvlar"),
    icon: ShoppingCart,
    children: [
      {
        id: "sales-all",
        label: t("sidebar.sales.all", "Barcha sotuvlar"),
        icon: ShoppingCart,
      },
      {
        id: "sales-new",
        label: t("sidebar.sales.new", "Yangi sotuv (POS)"),
        icon: PlusCircle,
      },
      {
        id: "sales-returns",
        label: t("sidebar.sales.returns", "Qaytarilgan"),
        icon: RotateCcw,
      },
    ],
  },

  {
    key: "products-group",
    label: t("sidebar.products", "Mahsulotlar"),
    icon: Package,
    children: [
      {
        id: "products-all",
        label: t("sidebar.products.all", "Barcha mahsulotlar"),
        icon: Package,
      },
      // {
      //   id: "inventory",
      //   label: t("sidebar.products.inventory", "Ombor"),
      //   icon: Building2,
      // },
    ],
  },

  {
    id: "customers-all",
    label: t("sidebar.customers", "Mijozlar"),
    icon: Users,
  },

  {
    id: "suppliers",
    label: t("sidebar.suppliers", "Ta'minotchilar"),
    icon: Truck,
  },

  {
    id: "employees",
    label: t("sidebar.employees", "Xodimlar"),
    icon: UserCog,
  },

  // === MANA BU YERGA XODIMLAR TAGIGA QO'SHILDI ===
  {
    id: "ustolar",
    label: "Ustolar",
    icon: Wrench,
  },

  {
    key: "finance-group",
    label: t("sidebar.finance", "Moliya"),
    icon: Wallet,
    children: [
      {
        id: "finance-revenue",
        label: t("sidebar.finance.revenue", "Daromad"),
        icon: DollarSign,
      },
      {
        id: "finance-debt",
        label: t("sidebar.finance.debt", "Qarzdorlik"),
        icon: CreditCard,
      },
    ],
  },

  {
    id: "reports",
    label: t("sidebar.reports", "Hisobotlar"),
    icon: BarChart3,
  },

  {
    id: "settings",
    label: t("sidebar.settings", "Sozlamalar"),
    icon: Settings,
  },
  {
    id: "ai-chat",
    label: "AI Chat",
    icon: MessageCircle,
  },
];

export default function Sidebar({
  user,
  profile,
  active = "dashboard",
  onNavigate = () => { },
  collapsed = false,
  onCollapse = () => { },
  notifCount = 0,
  isOpen = false,
  onClose = () => { },
  onOpen = () => { },
}) {
  useUILanguage();
  const { t } = useLanguage();

  const sidebarActive = active.startsWith("customer-") ? "customers-all" : active.startsWith("product-") ? "products-all" : active.startsWith("supplier-") ? "suppliers" : active.startsWith("employee-") ? "employees" : active.startsWith("debt-") ? "finance-debt" : active;

  const navItems = buildNavItems(t)
    .map((item) => item.children
      ? { ...item, children: item.children.filter((child) => canAccess(user, child.id)) }
      : item)
    .filter((item) => item.children ? item.children.length > 0 : canAccess(user, item.id));

  const [openGroups, setOpenGroups] = useState([
    "sales-group",
    "products-group",
    "finance-group",
  ]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);

  // HELP MODAL
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const activeGroup = sidebarActive.startsWith("sales-") ? "sales-group" : sidebarActive === "products-all" ? "products-group" : sidebarActive.startsWith("finance-") ? "finance-group" : null;

  useEffect(() => {
    if (activeGroup) setOpenGroups((groups) => groups.includes(activeGroup) ? groups : [...groups, activeGroup]);
  }, [activeGroup]);

  const toggleGroup = (key) => {
    setOpenGroups((groups) =>
      groups.includes(key)
        ? groups.filter((item) => item !== key)
        : [...groups, key]
    );
  };

  const isChildActive = (children) => {
    return children.some((child) => child.id === sidebarActive);
  };

  // MOBILE MENU
  if (isMobile && !isOpen) {
    return (
      <button
        onClick={onOpen}
        className="fixed top-3 left-3 z-50 p-2.5 rounded-xl shadow-md flex items-center justify-center transition-transform active:scale-95"
        style={{
          background: "var(--sidebar-bg, #ffffff)",
          border: "1px solid var(--border, #e5e7eb)",
          color: "var(--text-primary, #111827)",
          cursor: "pointer",
          marginLeft: "6px",
          marginTop: "12px",
        }}
        title={tx(t("sidebar.openMenu", "Menyuni ochish"))}
      >
        <Menu size={23} />
      </button>
    );
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            cursor: "pointer",
          }}
        />
      )}

      <aside
        className={`flex flex-col h-full transition-all duration-300 ease-in-out ${isMobile ? "mobile-sidebar-active" : ""
          }`}
        style={{
          width: !isMobile && collapsed ? 64 : 248,
          background: "var(--sidebar-bg, #ffffff)",
          borderRight: "1px solid var(--border, #e5e7eb)",
          boxShadow: isMobile
            ? "4px 0 24px rgba(0,0,0,0.15)"
            : "2px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0,
        }}
      >
        {/* LOGO */}
        <div
          className="flex items-center h-16 px-3.5 justify-between"
          style={{
            borderBottom: "1px solid var(--border-subtle, #f3f4f6)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: 36,
                height: 36,
                background:
                  "linear-gradient(135deg, var(--brand, #6366f1) 0%, var(--violet, #8b5cf6) 100%)",
                flexShrink: 0,
              }}
            >
              <Store size={18} color="white" />
            </div>

            {(!collapsed || isMobile) && (
              <div
                className="min-w-0 fade-in"
                style={{
                  overflow: "hidden",
                }}
              >
                <div
                  className="font-display font-extrabold text-sm leading-tight truncate"
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    color: "var(--text-primary, #111827)",
                    fontWeight: 800,
                  }}
                >{tx("CRM System")}</div>
              </div>
            )}
          </div>

          {isMobile ? (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors shrink-0 hover:bg-gray-100"
              style={{
                color: "var(--text-faint, #9ca3af)",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={() => onCollapse(!collapsed)}
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{
                color: "var(--text-faint, #9ca3af)",
                cursor: "pointer",
              }}
            >
              {collapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronLeft size={14} />
              )}
            </button>
          )}
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            if ("children" in item) {
              const isOpenGroup = openGroups.includes(item.key);
              const hasActive = isChildActive(item.children);

              return (
                <div key={item.key}>
                  <button
                    onClick={() => {
                      if (!collapsed || isMobile) {
                        toggleGroup(item.key);
                      }
                    }}
                    className="flex items-center w-full rounded-xl px-2.5 py-2 text-sm transition-all group"
                    style={{
                      color: hasActive
                        ? "var(--brand, #6366f1)"
                        : "var(--text-secondary, #4b5563)",
                      background: "transparent",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <item.icon
                      size={17}
                      style={{
                        color: hasActive
                          ? "var(--brand, #6366f1)"
                          : "var(--text-muted, #6b7280)",
                        flexShrink: 0,
                      }}
                    />

                    {(!collapsed || isMobile) && (
                      <>
                        <span className="ml-2.5 flex-1 text-left truncate">
                          {tx(item.label)}
                        </span>

                        <span
                          style={{
                            color: "var(--text-faint, #9ca3af)",
                          }}
                        >
                          {isOpenGroup ? (
                            <ChevronDown size={13} />
                          ) : (
                            <ChevronRight size={13} />
                          )}
                        </span>
                      </>
                    )}
                  </button>

                  {(!collapsed || isMobile) && isOpenGroup && (
                    <div
                      className="ml-4 pl-3 mt-0.5 space-y-0.5 fade-in"
                      style={{
                        borderLeft: "2px solid var(--border, #e5e7eb)",
                      }}
                    >
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            onNavigate(child.id);

                            if (isMobile) {
                              onClose();
                            }
                          }}
                          className="flex items-center w-full rounded-lg px-2.5 py-1.5 text-sm transition-all"
                          style={{
                            color:
                              sidebarActive === child.id
                                ? "var(--brand, #6366f1)"
                                : "var(--text-muted, #6b7280)",

                            background:
                              sidebarActive === child.id
                                ? "var(--brand-light, #eeefff)"
                                : "transparent",

                            fontWeight:
                              sidebarActive === child.id ? 600 : 400,

                            cursor: "pointer",
                          }}
                        >
                          <child.icon
                            size={13}
                            className="shrink-0 mr-2"
                          />

                          <span className="truncate">
                            {tx(child.label)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const navItem = item;

            const isActive =
              sidebarActive === navItem.id ||
              sidebarActive.startsWith(navItem.id + "-");

            return (
              <button
                key={navItem.id}
                onClick={() => {
                  onNavigate(navItem.id);

                  if (isMobile) {
                    onClose();
                  }
                }}
                className="flex items-center w-full rounded-xl px-2.5 py-2 text-sm transition-all relative"
                style={{
                  color: isActive
                    ? "var(--brand, #6366f1)"
                    : "var(--text-secondary, #4b5563)",

                  background: isActive
                    ? "var(--brand-light, #eeefff)"
                    : "transparent",

                  fontWeight: isActive ? 600 : 500,

                  cursor: "pointer",
                }}
              >
                <navItem.icon
                  size={17}
                  style={{
                    color: isActive
                      ? "var(--brand, #6366f1)"
                      : "var(--text-muted, #6b7280)",
                    flexShrink: 0,
                  }}
                />

                {(!collapsed || isMobile) && (
                  <span className="ml-2.5 flex-1 text-left truncate">
                    {tx(navItem.label)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* BOTTOM */}
        <div
          className="px-2 pb-4 pt-3"
          style={{
            borderTop: "1px solid var(--border-subtle, #f3f4f6)",
            flexShrink: 0,
          }}
        >
          {/* HELP BUTTON */}
          <button
            onClick={() => {
              onNavigate("help");
              if (isMobile) onClose();
            }}
            className="flex items-center w-full rounded-xl px-2.5 py-2 text-sm transition-all"
            style={{
              color: "var(--text-muted, #6b7280)",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <HelpCircle
              size={17}
              style={{
                color: "var(--text-faint, #9ca3af)",
                flexShrink: 0,
              }}
            />

            {(!collapsed || isMobile) && (
              <span className="ml-2.5">
                {tx(t("sidebar.help", "Yordam"))}
              </span>
            )}
          </button>

          {/* SYSTEM ONLINE */}
          <button
            className="flex items-center w-full rounded-xl px-2.5 py-2 text-sm transition-all"
            style={{
              color: "var(--text-muted, #6b7280)",
              cursor: "pointer",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: "var(--success, #10b981)",
              }}
            />

            {(!collapsed || isMobile) && (
              <span className="ml-2.5">
                {tx(t("sidebar.systemOnline", "Tizim ishlayapti"))}
              </span>
            )}
          </button>

          {/* ADMIN */}
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all mt-1">
              <button
                type="button"
                onClick={() => { onNavigate("settings"); onClose?.(); }}
                aria-label={tx("Profilni ochish")}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl hover:opacity-75"
                style={{ cursor: "pointer" }}
              >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand, #6366f1), var(--violet, #8b5cf6))",
                  fontSize: 11,
                }}
              >
                {profileInitials(profile, user)}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold truncate"
                  style={{
                    color: "var(--text-primary, #111827)",
                  }}
                >
                  {profileName(profile, user)}
                </div>

                <div
                  className="text-xs truncate"
                  style={{
                    color: "var(--text-faint, #9ca3af)",
                  }}
                >
                  {tx(profile?.position || (user?.type === "director" ? "Direktor" : user?.role || "Xodim"))}
                </div>
              </div>

              </button>

              <button
                onClick={() => setLogoutConfirmOpen(true)}
                type="button"
                aria-label={tx("Hisobdan chiqish")}
                className="p-1 rounded hover:opacity-75 transition-opacity"
                style={{
                  cursor: "pointer",
                }}
              >
                <LogOut
                  size={15}
                  style={{
                    color: "var(--text-faint, #9ca3af)",
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ================= HELP MODAL ================= */}
      {isHelpOpen && (
        <div
          onClick={() => setIsHelpOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
            cursor: "pointer",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "var(--sidebar-bg, #ffffff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              position: "relative",
              cursor: "default",
            }}
          >
            {/* CLOSE */}
            <button
              onClick={() => setIsHelpOpen(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                border: "none",
                background: "var(--bg, #f3f4f6)",
                color: "var(--text-muted, #6b7280)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            {/* ICON */}
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "16px",
                background:
                  "linear-gradient(135deg, var(--brand, #6366f1), var(--violet, #8b5cf6))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <HelpCircle size={27} color="white" />
            </div>

            {/* TITLE */}
            <h2
              style={{
                margin: 0,
                marginBottom: "8px",
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text-primary, #111827)",
              }}
            >
              {tx(t(
                "sidebar.helpModal.title",
                "Yordam va qo'llab-quvvatlash"
              ))}
            </h2>

            {/* DESCRIPTION */}
            <p
              style={{
                margin: 0,
                marginBottom: "20px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "var(--text-muted, #6b7280)",
              }}
            >
              {tx(t(
                "sidebar.helpModal.description",
                "Tizimdan foydalanish bo‘yicha savollaringiz bo‘lsa, biz bilan bog‘lanishingiz mumkin."
              ))}
            </p>

            {/* PHONE */}
            <a
              href="tel:+998979359707"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "13px",
                borderRadius: "14px",
                background: "var(--bg, #f8fafc)",
                color: "var(--text-primary, #111827)",
                textDecoration: "none",
                marginBottom: "10px",
                cursor: "pointer",
              }}
            >
              <Phone
                size={19}
                style={{
                  color: "var(--brand, #6366f1)",
                  flexShrink: 0,
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-faint, #9ca3af)",
                    marginBottom: "2px",
                  }}
                >
                  {tx(t("sidebar.helpModal.phone", "Telefon"))}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  +998 97 935 97 07
                </div>
              </div>
            </a>

            {/* TELEGRAM */}
            <a
              href="https://t.me/burhanov123"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "13px",
                borderRadius: "14px",
                background: "var(--bg, #f8fafc)",
                color: "var(--text-primary, #111827)",
                textDecoration: "none",
                marginBottom: "18px",
                cursor: "pointer",
              }}
            >
              <MessageCircle
                size={19}
                style={{
                  color: "var(--brand, #6366f1)",
                  flexShrink: 0,
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-faint, #9ca3af)",
                    marginBottom: "2px",
                  }}
                >
                  {tx(t("sidebar.helpModal.telegram", "Telegram"))}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {tx(t(
                    "sidebar.helpModal.telegramText",
                    "Telegram orqali yozish"
                  ))}
                </div>
              </div>
            </a>

            {/* INFO */}
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: "var(--brand-light, #eeefff)",
                color: "var(--text-secondary, #4b5563)",
                fontSize: "13px",
                lineHeight: 1.6,
                marginBottom: "18px",
              }}
            >
              {tx(t(
                "sidebar.helpModal.info",
                "CRM tizimi, mahsulotlar, sotuvlar va boshqa bo‘limlar bo‘yicha yordam olish uchun biz bilan bog‘lanishingiz mumkin."
              ))}
            </div>

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setIsHelpOpen(false)}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                background:
                  "linear-gradient(135deg, var(--brand, #6366f1), var(--violet, #8b5cf6))",
                color: "white",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tx(t("sidebar.helpModal.close", "Yopish"))}
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title={tx("Hisobdan chiqish")}
        message={tx("Haqiqatan ham hisobdan chiqmoqchimisiz?")}
        confirmLabel={tx("Ha, chiqish")}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => { setLogoutConfirmOpen(false); onNavigate("login"); }}
      />
    </>
  );
}
