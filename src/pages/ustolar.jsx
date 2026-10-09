import "./ustolarProfile.css";
import { styles } from './ustolarStyles';
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Wrench,
  Plus,
  Search,
  Phone,
  Wallet,
  Edit3,
  Trash2,
  Award,
  ShieldCheck,
  X,
  CheckCircle,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";

const USTALAR_STORAGE_KEY = "crm_ustalar";

const readUstalar = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(USTALAR_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export default function Ustolar({ profileUsta, setProfileUsta }) {
  useUILanguage();
  const { dark } = useTheme();
  const modalRoot = document.getElementById("main-modal-root");

  const [ustolar, setUstolar] = useState(readUstalar);

  useEffect(() => {
    try {
      localStorage.setItem(USTALAR_STORAGE_KEY, JSON.stringify(ustolar));
    } catch {
      // Local saqlash ishlamasa, sahifa ochiq turgan paytdagi ro'yxat saqlanadi.
    }
  }, [ustolar]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUsta, setSelectedUsta] = useState(null);
  const [bonusAmount, setBonusAmount] = useState("");
  const [editingUsta, setEditingUsta] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "+998 ",
    specialty: "",
    percentage: 30,
    balance: 0,
    status: "active",
    rating: 5.0,
  });

  // ======================================================
  // THEME COLORS
  // ======================================================

  const colors = dark
    ? {
        page: "#0b0f19",
        card: "#111827",
        cardSecondary: "#0b0f19",
        border: "#1f2937",
        borderStrong: "#374151",
        text: "#f8fafc",
        textSecondary: "#cbd5e1",
        muted: "#94a3b8",
        mutedDark: "#64748b",
        input: "#0b0f19",
        header: "#1f2937",
        buttonSecondary: "#1f2937",
        modal: "#111827",
        option: "#1e293b",
      }
    : {
        page: "#f5f7fb",
        card: "#ffffff",
        cardSecondary: "#f8fafc",
        border: "#e2e8f0",
        borderStrong: "#cbd5e1",
        text: "#0f172a",
        textSecondary: "#334155",
        muted: "#64748b",
        mutedDark: "#94a3b8",
        input: "#ffffff",
        header: "#f1f5f9",
        buttonSecondary: "#f1f5f9",
        modal: "#ffffff",
        option: "#ffffff",
      };

  // ======================================================
  // TOAST
  // ======================================================

  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: "",
        type: "success",
      });
    }, 3000);
  };

  // ======================================================
  // PHONE FORMAT
  // ======================================================

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");

    if (val.startsWith("998")) {
      val = val.slice(3);
    }

    val = val.slice(0, 9);

    let formatted = "+998 ";

    if (val.length > 0) {
      formatted += val.substring(0, 2) + " ";
    }

    if (val.length > 2) {
      formatted += val.substring(2, 5) + " ";
    }

    if (val.length > 5) {
      formatted += val.substring(5, 7) + " ";
    }

    if (val.length > 7) {
      formatted += val.substring(7, 9);
    }

    setFormData({
      ...formData,
      phone: formatted.trim(),
    });
  };

  // ======================================================
  // SEARCH + FILTER
  // ======================================================

  const filteredUstolar = ustolar.filter((u) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      u.name.toLowerCase().includes(searchText) ||
      u.specialty.toLowerCase().includes(searchText) ||
      u.phone.includes(search);

    const matchesStatus =
      filterStatus === "all" ||
      u.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // ======================================================
  // OPEN ADD / EDIT MODAL
  // ======================================================

  const handleOpenModal = (usta = null) => {
    if (usta) {
      setEditingUsta(usta);

      setFormData({
        name: usta.name,
        phone: usta.phone,
        specialty: usta.specialty,
        percentage: usta.percentage,
        balance: usta.balance,
        status: usta.status,
        rating: usta.rating,
      });
    } else {
      setEditingUsta(null);

      setFormData({
        name: "",
        phone: "+998 ",
        specialty: "",
        percentage: 30,
        balance: 0,
        status: "active",
        rating: 5.0,
      });
    }

    setIsModalOpen(true);
  };

  // ======================================================
  // SAVE USTA
  // ======================================================

  const handleSave = (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      formData.phone.length < 17
    ) {
      showToast(
        "Iltimos, ism va telefon raqamini to‘liq kiriting!",
        "error"
      );
      return;
    }

    if (editingUsta) {
      const updatedUsta = { ...formData, id: editingUsta.id, completedWorks: editingUsta.completedWorks, rating: editingUsta.rating };
      setUstolar(ustolar.map((u) => u.id === editingUsta.id ? updatedUsta : u));
      if (profileUsta?.id === updatedUsta.id) setProfileUsta(updatedUsta);

      showToast(
        "Usta ma’lumotlari muvaffaqiyatli yangilandi!"
      );
    } else {
      const newUsta = {
        ...formData,
        id: Date.now(),
        completedWorks: 0,
      };

      setUstolar([newUsta, ...ustolar]);

      showToast(
        "Yangi usta muvaffaqiyatli qo‘shildi!"
      );
    }

    setIsModalOpen(false);
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleOpenDeleteModal = (usta) => {
    setSelectedUsta(usta);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedUsta) {
      setUstolar(
        ustolar.filter(
          (u) => u.id !== selectedUsta.id
        )
      );
      if (profileUsta?.id === selectedUsta.id) setProfileUsta(null);

      showToast(
        "Usta ro‘yxatdan o‘chirildi!",
        "error"
      );

      setIsDeleteModalOpen(false);
      setSelectedUsta(null);
    }
  };

  // ======================================================
  // BONUS
  // ======================================================

  const handleOpenBonusModal = (usta) => {
    setSelectedUsta(usta);
    setBonusAmount("");
    setIsBonusModalOpen(true);
  };

  const handleGiveBonus = (e) => {
    e.preventDefault();

    const amount = Number(bonusAmount);

    if (!amount || amount <= 0) {
      showToast(
        "Iltimos, to‘g‘ri bonus miqdorini kiriting!",
        "error"
      );
      return;
    }

    const updatedUsta = { ...selectedUsta, balance: Number(selectedUsta.balance) + amount };
    setUstolar(ustolar.map((u) => u.id === selectedUsta.id ? updatedUsta : u));
    if (profileUsta?.id === updatedUsta.id) setProfileUsta(updatedUsta);

    setIsBonusModalOpen(false);

    showToast(
      `${selectedUsta.name}ga ${formatCurrency(amount)} bonus qo‘shildi!`
    );
  };

  return (
    <div
      style={{
        ...styles.pageWrapper,
        backgroundColor: colors.page,
        color: colors.text,
      }}
    >
      {/* ======================================================
          TOAST
      ====================================================== */}

      <div
        style={{
          ...styles.toast,
          ...(toast.show
            ? styles.toastShow
            : {}),
          background:
            toast.type === "error"
              ? "#ef4444"
              : "#10b981",
        }}
      >
        <CheckCircle size={16} />
        <span>{tx(toast.message)}</span>
      </div>

      <div style={profileUsta ? { ...styles.container, maxWidth: "none", padding: 0 } : styles.container}>
        {profileUsta && <div className="space-y-5">
          <header><h1 className="font-display font-bold text-2xl">{tx("Usta profili")}</h1><p className="text-sm" style={{ color: colors.muted }}>{tx("Usta ma'lumotlari va hisob-kitobi")}</p></header>
          <div className="usta-profile-layout">
            <aside className="space-y-4">
              <section className="card p-5 text-center">
                <div className="usta-profile-avatar">{profileUsta.name.charAt(0).toUpperCase()}</div>
                <h2 className="font-display font-bold text-lg">{profileUsta.name}</h2>
                <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: profileUsta.status === "active" ? "var(--brand)" : "var(--danger)", background: profileUsta.status === "active" ? "var(--brand-light)" : "var(--danger-light)" }}>{tx(profileUsta.status === "active" ? "Faol" : "Nofaol")}</span>
                <div className="usta-profile-contact"><Phone size={16}/><span>{profileUsta.phone}</span></div>
                <div className="usta-profile-contact"><Award size={16}/><span>{tx(profileUsta.specialty || "Mutaxassislik yo‘q")}</span></div>
                <div className="usta-profile-actions">
                  <button className="btn-primary" style={{ background: "var(--success)" }} onClick={() => handleOpenBonusModal(profileUsta)}><Gift size={15}/>{tx("Bonus qo‘shish")}</button>
                  <button className="btn-ghost" onClick={() => handleOpenModal(profileUsta)}><Edit3 size={15}/>{tx("Tahrirlash")}</button>
                </div>
              </section>
              <section className="card p-4 usta-profile-summary">
                {[[Wrench, "Bajarilgan ishlar", (profileUsta.completedWorks || 0) + " ta"], [Wallet, "Joriy balans", formatCurrency(profileUsta.balance)], [Award, "Xizmat foizi", profileUsta.percentage + "%"]].map(([Icon, label, value]) => <div key={label}><span className="usta-profile-icon"><Icon size={16}/></span><div><small>{tx(label)}</small><strong>{value}</strong></div></div>)}
              </section>
            </aside>
            <section className="card usta-profile-panel">
              <div className="usta-profile-panel-header"><span>{tx("Usta ma'lumotlari")}</span></div>
              <dl className="usta-profile-info">
                {[["To'liq ism", profileUsta.name], ["Telefon", profileUsta.phone], ["Mutaxassislik", profileUsta.specialty || "—"], ["Xizmat foizi", profileUsta.percentage + "%"], ["Reyting", profileUsta.rating || "5.0"], ["Holat", profileUsta.status === "active" ? "Faol" : "Nofaol"]].map(([label, value]) => <div key={label}><dt>{tx(label)}</dt><dd>{tx(value)}</dd></div>)}
              </dl>
            </section>
          </div>
        </div>}
        <div style={{ display: profileUsta ? "none" : undefined }}>

        {/* ======================================================
            BANNER
        ====================================================== */}

        <div className="flex items-center justify-between gap-4"><div><h1 className="font-display font-bold text-2xl">{tx("Ustalar")}</h1><p className="text-sm mt-0.5" style={{ color: colors.muted }}>{tx("Xizmat ko'rsatuvchi ustalar va ularning hisoblari")}</p></div><button className="btn-primary" onClick={() => handleOpenModal()}><Plus size={16}/>{tx("Usta qo‘shish")}</button></div>
        {/* ======================================================
            STATS
        ====================================================== */}

        <div
          style={styles.statsGrid}
          data-ustolar-stats="true"
        >
          <div
            style={{
              ...styles.statCard,
              background: colors.card,
              borderColor: colors.border,
            }}
          >
            <div style={styles.statInfo}>
              <span
                style={{
                  ...styles.statLabel,
                  color: colors.muted,
                }}
              >{tx("Jami ustalar")}</span>

              <h2
                style={{
                  ...styles.statValue,
                  color: colors.text,
                }}
              >
                {tx(ustolar.length)}
              </h2>
            </div>

            <div
              style={{
                ...styles.statIcon,
                background:
                  "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
              }}
            >
              <Wrench size={18} />
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              background: colors.card,
              borderColor: colors.border,
            }}
          >
            <div style={styles.statInfo}>
              <span
                style={{
                  ...styles.statLabel,
                  color: colors.muted,
                }}
              >{tx("Faol statusda")}</span>

              <h2
                style={{
                  ...styles.statValue,
                  color: colors.text,
                }}
              >
                {
                  tx(ustolar.filter(
                    (u) =>
                      u.status === "active"
                  ).length)
                }
              </h2>
            </div>

            <div
              style={{
                ...styles.statIcon,
                background:
                  "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
              }}
            >
              <ShieldCheck size={18} />
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              background: colors.card,
              borderColor: colors.border,
            }}
          >
            <div style={styles.statInfo}>
              <span
                style={{
                  ...styles.statLabel,
                  color: colors.muted,
                }}
              >{tx("Umumiy balans")}</span>

              <h2
                style={{
                  ...styles.statValue,
                  color: colors.text,
                  fontSize: "15px",
                }}
              >
                {formatCurrency(ustolar.reduce((acc, u) => acc + Number(u.balance || 0), 0))}{" "}
                <span
                  style={{
                    fontSize: "10px",
                    color: colors.muted,
                  }}
                >{tx("so‘m")}</span>
              </h2>
            </div>

            <div
              style={{
                ...styles.statIcon,
                background:
                  "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
              }}
            >
              <Wallet size={18} />
            </div>
          </div>
        </div>

        {/* ======================================================
            SEARCH
        ====================================================== */}

        <div
          style={{
            ...styles.filterCard,
            background: colors.card,
            borderColor: colors.border,
          }}
        >
          <div style={styles.searchBox}>
            <Search
              size={16}
              style={styles.searchIcon}
            />

            <input
              type="text"
              placeholder={tx("Ism yoki telefon qidirish...")}
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{
                ...styles.searchInput,
                backgroundColor:
                  colors.input,
                borderColor:
                  colors.borderStrong,
                color: colors.text,
              }}
            />
          </div>

          <div
            style={styles.filterBtnsWrapper}
          >
            <button
              style={{
                ...styles.filterBtn,
                background:
                  filterStatus === "all"
                    ? "#6366f1"
                    : colors.cardSecondary,
                color:
                  filterStatus === "all"
                    ? "#fff"
                    : colors.muted,
                borderColor:
                  filterStatus === "all"
                    ? "#6366f1"
                    : colors.borderStrong,
              }}
              onClick={() =>
                setFilterStatus("all")
              }
            >{tx("Barchasi")}</button>

            <button
              style={{
                ...styles.filterBtn,
                background:
                  filterStatus === "active"
                    ? "#059669"
                    : colors.cardSecondary,
                color:
                  filterStatus === "active"
                    ? "#fff"
                    : colors.muted,
                borderColor:
                  filterStatus === "active"
                    ? "#059669"
                    : colors.borderStrong,
              }}
              onClick={() =>
                setFilterStatus("active")
              }
            >{tx("Faol")}</button>

            <button
              style={{
                ...styles.filterBtn,
                background:
                  filterStatus === "inactive"
                    ? "#dc2626"
                    : colors.cardSecondary,
                color:
                  filterStatus === "inactive"
                    ? "#fff"
                    : colors.muted,
                borderColor:
                  filterStatus === "inactive"
                    ? "#dc2626"
                    : colors.borderStrong,
              }}
              onClick={() =>
                setFilterStatus("inactive")
              }
            >{tx("Nofaol")}</button>
          </div>
        </div>

        {/* ======================================================
            CARDS
        ====================================================== */}

<div className="usta-list-table">
          <div className="usta-list-header"><span>{tx("Usta")}</span><span>{tx("Telefon")}</span><span>{tx("Ishlar")}</span><span>{tx("Foiz")}</span><span>{tx("Balans")}</span><span>{tx("Holat")}</span><span>{tx("Amallar")}</span></div>
          {filteredUstolar.length ? filteredUstolar.map((usta) => <div key={usta.id} role="button" tabIndex={0} onClick={() => setProfileUsta(usta)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setProfileUsta(usta); } }} className="usta-list-row" style={{ color: colors.text }}>
            <div className="usta-list-person"><span>{usta.name.charAt(0).toUpperCase()}</span><div><strong>{usta.name}</strong><small>{tx(usta.specialty || "Mutaxassislik yo‘q")}</small></div></div>
            <span className="usta-list-phone">{usta.phone}</span><strong>{usta.completedWorks || 0} {tx("ta")}</strong><strong>{usta.percentage}%</strong><strong>{formatCurrency(usta.balance)}</strong>
            <span className="usta-list-status" style={{ color: usta.status === "active" ? "var(--success)" : "var(--danger)", background: usta.status === "active" ? "var(--success-light)" : "var(--danger-light)" }}>{tx(usta.status === "active" ? "Faol" : "Nofaol")}</span>
            <div className="usta-list-actions" onClick={(e) => e.stopPropagation()}><button type="button" className="btn-ghost p-2" title={tx("Bonus qo‘shish")} onClick={() => handleOpenBonusModal(usta)}><Gift size={15}/></button><button type="button" className="btn-ghost p-2" title={tx("Tahrirlash")} onClick={() => handleOpenModal(usta)}><Edit3 size={15}/></button><button type="button" className="btn-ghost p-2" style={{ color: "var(--danger)" }} title={tx("O‘chirish")} onClick={() => handleOpenDeleteModal(usta)}><Trash2 size={15}/></button></div>
          </div>) : <div className="card p-10 text-center text-sm" style={{ color: colors.muted }}>{tx("Hech qanday usta topilmadi.")}</div>}
        </div>
        </div>
      </div>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {isModalOpen && modalRoot && createPortal(
        <div
          className="crm-content-modal"
          style={styles.modalOverlay}
          onClick={() =>
            setIsModalOpen(false)
          }
        >
          <div
            style={{
              ...styles.modalContent,
              background: colors.modal,
              borderColor: colors.border,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              style={{
                ...styles.modalClose,
                background:
                  colors.buttonSecondary,
                color: colors.muted,
              }}
              onClick={() =>
                setIsModalOpen(false)
              }
            >
              <X size={16} />
            </button>

            <h2
              style={{
                ...styles.modalTitle,
                color: colors.text,
              }}
            >
              {tx(editingUsta
                ? "Ustani tahrirlash"
                : "Yangi usta qo‘shish")}
            </h2>

            <p
              style={{
                ...styles.modalSub,
                color: colors.muted,
              }}
            >{tx("Ma’lumotlarni to‘ldiring va saqlang.")}</p>

            <form
              onSubmit={handleSave}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    ...styles.label,
                    color:
                      colors.textSecondary,
                  }}
                >{tx("F.I.O. (ismi)")}</label>

                <input
                  type="text"
                  required
                  placeholder={tx("Masalan: Sardor Rahimov")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  style={{
                    ...styles.input,
                    background:
                      colors.input,
                    borderColor:
                      colors.borderStrong,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    ...styles.label,
                    color:
                      colors.textSecondary,
                  }}
                >{tx("Telefon raqami")}</label>

                <input
                  type="text"
                  required
                  maxLength="17"
                  placeholder={tx("+998 90 123 45 67")}
                  value={formData.phone}
                  onChange={
                    handlePhoneChange
                  }
                  style={{
                    ...styles.input,
                    background:
                      colors.input,
                    borderColor:
                      colors.borderStrong,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    ...styles.label,
                    color:
                      colors.textSecondary,
                  }}
                >{tx("Mutaxassisligi")}</label>

                <input
                  type="text"
                  placeholder={tx("Masalan: Mebel ustasi")}
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specialty:
                        e.target.value,
                    })
                  }
                  style={{
                    ...styles.input,
                    background:
                      colors.input,
                    borderColor:
                      colors.borderStrong,
                    color: colors.text,
                  }}
                />
              </div>

              <div
                style={
                  styles.twoColumns
                }
              >
                <div>
                  <label
                    style={{
                      ...styles.label,
                      color:
                        colors.textSecondary,
                    }}
                  >{tx("Foiz (%)")}</label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={
                      formData.percentage
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        percentage:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    style={{
                      ...styles.input,
                      background:
                        colors.input,
                      borderColor:
                        colors.borderStrong,
                      color: colors.text,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      ...styles.label,
                      color:
                        colors.textSecondary,
                    }}
                  >{tx("Balans (so‘m)")}</label>

                  <input
                    type="number"
                    value={moneyInputValue(formData.balance, false)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        balance:
                          toBaseMoney(e.target.value),
                      })
                    }
                    style={{
                      ...styles.input,
                      background:
                        colors.input,
                      borderColor:
                        colors.borderStrong,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    ...styles.label,
                    color:
                      colors.textSecondary,
                  }}
                >{tx("Status")}</label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status:
                        e.target.value,
                    })
                  }
                  style={{
                    ...styles.input,
                    background:
                      colors.input,
                    borderColor:
                      colors.borderStrong,
                    color: colors.text,
                  }}
                >
                  <option
                    value="active"
                    style={{
                      background:
                        colors.option,
                      color:
                        colors.text,
                    }}
                  >{tx("Faol")}</option>

                  <option
                    value="inactive"
                    style={{
                      background:
                        colors.option,
                      color:
                        colors.text,
                    }}
                  >{tx("Nofaol")}</option>
                </select>
              </div>

              <div
                style={
                  styles.modalButtons
                }
              >
                <button
                  type="button"
                  style={{
                    ...styles.btnCancel,
                    background:
                      colors.buttonSecondary,
                    borderColor:
                      colors.borderStrong,
                    color:
                      colors.textSecondary,
                  }}
                  onClick={() =>
                    setIsModalOpen(false)
                  }
                >{tx("Bekor qilish")}</button>

                <button
                  type="submit"
                  style={
                    styles.btnSubmit
                  }
                >{tx("Saqlash")}</button>
              </div>
            </form>
          </div>
        </div>
      , modalRoot)}

      {/* ======================================================
          BONUS MODAL
      ====================================================== */}

      {isBonusModalOpen && modalRoot && createPortal(
        <div
          className="crm-content-modal"
          style={styles.modalOverlay}
          onClick={() =>
            setIsBonusModalOpen(false)
          }
        >
          <div
            style={{
              ...styles.modalContent,
              background: colors.modal,
              borderColor: colors.border,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              style={{
                ...styles.modalClose,
                background:
                  colors.buttonSecondary,
                color: colors.muted,
              }}
              onClick={() =>
                setIsBonusModalOpen(false)
              }
            >
              <X size={16} />
            </button>

            <h2
              style={{
                ...styles.modalTitle,
                color: colors.text,
              }}
            >{tx("Bonus berish")}</h2>

            <p
              style={{
                ...styles.modalSub,
                color: colors.muted,
              }}
            >
              <b>{selectedUsta?.name}</b>{" "}{tx("balansiga qo‘shimcha bonus qo‘shish.")}</p>

            <form
              onSubmit={handleGiveBonus}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    ...styles.label,
                    color:
                      colors.textSecondary,
                  }}
                >{tx("Bonus miqdori (so‘m)")}</label>

                <input
                  type="number"
                  min="1"
                  required
                  placeholder={tx("Masalan: 100000")}
                  value={moneyInputValue(bonusAmount, false)}
                  onChange={(e) =>
                    setBonusAmount(
                      String(toBaseMoney(e.target.value))
                    )
                  }
                  style={{
                    ...styles.input,
                    background:
                      colors.input,
                    borderColor:
                      colors.borderStrong,
                    color: colors.text,
                  }}
                />
              </div>

              <div
                style={
                  styles.modalButtons
                }
              >
                <button
                  type="button"
                  style={{
                    ...styles.btnCancel,
                    background:
                      colors.buttonSecondary,
                    borderColor:
                      colors.borderStrong,
                    color:
                      colors.textSecondary,
                  }}
                  onClick={() =>
                    setIsBonusModalOpen(
                      false
                    )
                  }
                >{tx("Bekor qilish")}</button>

                <button
                  type="submit"
                  style={{
                    ...styles.btnSubmit,
                    background: "#8b5cf6",
                  }}
                >{tx("Bonus qo‘shish")}</button>
              </div>
            </form>
          </div>
        </div>
      , modalRoot)}

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {isDeleteModalOpen && modalRoot && createPortal(
        <div
          className="crm-content-modal"
          style={styles.modalOverlay}
          onClick={() =>
            setIsDeleteModalOpen(false)
          }
        >
          <div
            style={{
              ...styles.modalContent,
              background: colors.modal,
              borderColor: colors.border,
              textAlign: "center",
              maxWidth: "320px",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={
                styles.deleteIconBox
              }
            >
              <AlertTriangle
                size={24}
                color="#f87171"
              />
            </div>

            <h2
              style={{
                ...styles.modalTitle,
                color: colors.text,
                marginBottom: "6px",
              }}
            >{tx("Ustani o‘chirish")}</h2>

            <p
              style={{
                ...styles.modalSub,
                color: colors.muted,
                marginBottom: "16px",
              }}
            >
              <b>{selectedUsta?.name}</b>{" "}{tx("ni ro‘yxatdan o‘chirmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.")}</p>

            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.btnCancel,
                  background:
                    colors.buttonSecondary,
                  borderColor:
                    colors.borderStrong,
                  color:
                    colors.textSecondary,
                }}
                onClick={() =>
                  setIsDeleteModalOpen(
                    false
                  )
                }
              >{tx("Yo‘q")}</button>

              <button
                type="button"
                style={{
                  ...styles.btnSubmit,
                  background: "#ef4444",
                }}
                onClick={
                  handleConfirmDelete
                }
              >{tx("Ha, o‘chirish")}</button>
            </div>
          </div>
        </div>
      , modalRoot)}
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

// ======================================================
// RESPONSIVE
// ======================================================

if (
  typeof window !== "undefined" &&
  !document.getElementById(
    "ustolar-responsive-style"
  )
) {
  const mediaStyle =
    document.createElement("style");

  mediaStyle.id =
    "ustolar-responsive-style";

  mediaStyle.innerHTML = `
    /* =========================================
       TABLET
    ========================================= */

    @media (min-width: 640px) {
      div[data-ustolar-grid="true"] {
        grid-template-columns:
          repeat(2, minmax(0, 1fr)) !important;
      }

      div[data-ustolar-stats="true"] {
        grid-template-columns:
          repeat(3, minmax(0, 1fr)) !important;
      }

      .ustolar-banner {
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
      }

      .ustolar-banner button {
        align-self: center !important;
        flex-shrink: 0 !important;
      }
    }

    /* =========================================
       DESKTOP
    ========================================= */

    @media (min-width: 1024px) {
      div[data-ustolar-grid="true"] {
        grid-template-columns:
          repeat(3, minmax(0, 1fr)) !important;
      }
    }

    /* =========================================
       KICHIK TELEFON
    ========================================= */

    @media (max-width: 420px) {
      .ustolar-two-columns {
        grid-template-columns: 1fr !important;
      }

      .ustolar-banner {
        gap: 10px !important;
      }

      .ustolar-banner button {
        width: 100% !important;
      }

      div[data-ustolar-stats="true"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  document.head.appendChild(mediaStyle);
}
