import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import "./Products.css";
import { useState } from "react";
import { createPortal } from "react-dom";

import {
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  X,
  Package,
  PackagePlus,
  Save,
  AlertTriangle,
} from "lucide-react";

import { products as initialProducts, suppliers as supplierSeed } from "../data/mockData";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { downloadCsv } from "../utils/csv";
import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";

export default function Products({ onNavigate }) {
  useUILanguage();
  const modalRoot = document.getElementById("main-modal-root");
  const { success, error } = useToast();
  const { t } = useLanguage();
  const [suppliers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_suppliers") || "null");
      return Array.isArray(saved) ? saved : supplierSeed;
    } catch { return supplierSeed; }
  });

  /* =====================================================
     STATUS
  ===================================================== */

  const statusMap = {
    active: {
      label: t(
        "products.status.active",
        "Faol"
      ),
      bg: "var(--success-light)",
      color: "var(--success)",
    },

    low: {
      label: t(
        "products.status.low",
        "Kam"
      ),
      bg: "var(--warning-light)",
      color: "var(--warning)",
    },

    out: {
      label: t(
        "products.status.out",
        "Tugagan"
      ),
      bg: "var(--danger-light)",
      color: "var(--danger)",
    },
  };

  /* =====================================================
     STATE
  ===================================================== */

  const [productList, setProductList] =
    useState(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("crm_products") || "null");
        return Array.isArray(saved) ? saved : initialProducts;
      } catch { return initialProducts; }
    });

  const [searchInput, setSearchInput] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);
  const [showCategories, setShowCategories] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  /* =====================================================
     FORM
  ===================================================== */

  const emptyForm = {
    measurementType: "",
    supplierId: "",
    supplierName: "",
    name: "",
    brand: "",
    sku: "",
    category: "Elektronika",
    price: "",
    cost: "",
    stock: "",
  };

  const [formData, setFormData] =
    useState(emptyForm);

  const categories = [...new Set([
    ...productList.map((product) => String(product.category || "").trim()).filter(Boolean),
    "Elektronika", "Maishiy texnika", "Kiyim", "Oziq-ovqat",
  ])].sort((a, b) => a.localeCompare(b, "uz"));
  const categoryMatches = categories.filter((category) => !formData.category || category.toLocaleLowerCase("uz-UZ").includes(formData.category.toLocaleLowerCase("uz-UZ")));
  const setCategory = (value) => setFormData({ ...formData, category: value.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("uz-UZ")) });

  const countryByBrand = {
    Ariel: "AQSH",
    Tefal: "Fransiya",
    Philips: "Niderlandiya",
    Domestos: "Buyuk Britaniya",
    Samsung: "Janubiy Koreya",
    Pampers: "AQSH",
    Dove: "Buyuk Britaniya",
    IKEA: "Shvetsiya",
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filtered = productList
    .filter((p) => {
      const q = searchInput.trim().toLocaleLowerCase("uz");
      if (!q) return true;

      const searchableValues = [
        p.id,
        p.sku,
        p.name,
        p.category,
        p.country,
        countryByBrand[p.brand],
      ];

      return searchableValues.some((value) =>
        String(value ?? "").trim().toLocaleLowerCase("uz").startsWith(q)
      );
    })
    .sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "uz", {
        sensitivity: "base",
      })
    );

  /* =====================================================
     EXPORT
  ===================================================== */

  const handleExportExcel = () => {
    try {
      const headers = [
        "№", t("products.form.name", "Mahsulot nomi"), t("products.form.brand", "Brend"),
        t("products.table.category", "Kategoriya"), t("products.table.sellPrice", "Sotuv narxi"),
        t("products.table.costPrice", "Tan narxi"), t("products.table.stock", "Qoldiq"),
        t("products.table.status", "Holati"),
      ];
      const rows = filtered.map((product, index) => [
        index + 1, product.name, product.brand || "-", tx(product.category || ""),
        product.price || 0, product.cost || 0, product.stock || 0,
        statusMap[product.status]?.label || "Faol",
      ]);
      downloadCsv([headers, ...rows], "Mahsulotlar_Royxati.csv");
      success(t("products.toast.exported", "Excel fayli muvaffaqiyatli yuklab olindi!"));
    } catch (exportError) {
      console.error("Export xatoligi:", exportError);
    }
  };

  /* =====================================================
     OPEN ADD / EDIT
  ===================================================== */

  const handleOpenModal = (
    product = null
  ) => {
    if (product) {
      setEditingProduct(product);

      setFormData({
        measurementType: product.measurementType || "",
        supplierId: product.supplierId || "",
        supplierName: product.supplierName || "",
        name:
          product.name || "",
        brand:
          product.brand || "",
        sku:
          product.sku || "",
        category:
          product.category ||
          "Elektronika",
        price:
          product.price || "",
        cost:
          product.cost || "",
        stock:
          product.stock || "",
      });
    } else {
      setEditingProduct(null);

      setFormData({
        ...emptyForm,
        sku:
          "SKU-" +
          Math.floor(
            1000 +
            Math.random() *
            9000
          ),
      });
    }

    setIsModalOpen(true);
  };

  /* =====================================================
     CLOSE ADD / EDIT
  ===================================================== */

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData(emptyForm);
  };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSaveProduct = (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.price
    ) {
      return;
    }

    const stockNum =
      Number(formData.stock) || 0;
    if (!Number.isFinite(stockNum) || stockNum < 0 || (formData.measurementType === "count" && !Number.isInteger(stockNum))) {
      error("Qoldiqni tekshiring", "Soni uchun butun son, og'irligi uchun musbat miqdor kiriting.");
      return;
    }

    let status = "active";

    if (stockNum === 0) {
      status = "out";
    } else if (stockNum < 10) {
      status = "low";
    }

    const savedProduct = {
      ...(editingProduct || {}),
      ...formData,
      id: editingProduct?.id ?? Date.now().toString(),
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: stockNum,
      status,
    };
    const updatedProducts = editingProduct
      ? productList.map((product) => product.id === editingProduct.id ? savedProduct : product)
      : [savedProduct, ...productList];
    try {
      localStorage.setItem("crm_products", JSON.stringify(updatedProducts));
    } catch {
      error("Mahsulot saqlanmadi", "Qayta urinib ko'ring.");
      return;
    }

    setProductList(updatedProducts);
    if (editingProduct) {

      success(
        t(
          "products.toast.updated",
          "Mahsulot muvaffaqiyatli tahrirlandi!"
        )
      );
    } else {
      success(
        t(
          "products.toast.added",
          "Yangi mahsulot qo'shildi!"
        )
      );
    }

    handleCloseModal();
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const promptDelete = (
    product
  ) => {
    setDeleteTarget(product);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setProductList((prev) =>
      prev.filter(
        (p) =>
          p.id !==
          deleteTarget.id
      )
    );

    success(
      `"${deleteTarget.name}" ${t(
        "products.toast.deleted",
        "mahsuloti muvaffaqiyatli o'chirildi!"
      )}`
    );

    setDeleteTarget(null);
  };

  /* =====================================================
     CLOSE DELETE
  ===================================================== */

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="space-y-6 fade-in">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="font-display font-bold text-2xl text-primary-color">
            {tx(t(
              "products.title",
              "Mahsulotlar"
            ))}
          </h1>

          <p className="text-sm mt-0.5 text-muted-color">
            {tx(t(
              "products.subtitle",
              "Barcha tovarlar va inventarizatsiya"
            ))}
          </p>
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={
              handleExportExcel
            }
            className="btn-ghost text-sm cursor-pointer"
          >
            <Download size={14} />

            {tx(t(
              "products.export",
              "Export"
            ))}
          </button>

        </div>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="products-stats grid grid-cols-4 gap-4">

        {[
          {
            label: t(
              "products.stat.total",
              "Jami mahsulotlar"
            ),
            value:
              productList.length,
            color:
              "var(--brand)",
          },

          {
            label: t(
              "products.stat.totalValue",
              "Jami qiymat"
            ),
            value:
              formatCurrency(productList.reduce((total, product) => total + (Number(product.stock) || 0) * (Number(product.cost) || 0), 0)),
            color:
              "var(--violet)",
          },

          {
            label: t(
              "products.stat.low",
              "Kam qolgan"
            ),
            value:
              productList.filter(
                (p) =>
                  p.status ===
                  "low"
              ).length,
            color:
              "var(--warning)",
          },

          {
            label: t(
              "products.stat.out",
              "Tugagan"
            ),
            value:
              productList.filter(
                (p) =>
                  p.status ===
                  "out"
              ).length,
            color:
              "var(--danger)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card p-4"
          >
            <div
              className="text-2xl font-display font-bold mb-0.5"
              style={{
                color:
                  stat.color,
              }}
            >
              {tx(stat.value)}
            </div>

            <div className="text-xs text-faint-color">
              {tx(stat.label)}
            </div>
          </div>
        ))}

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="products-list-card card-flat rounded-2xl overflow-hidden">

        {/* TOOLBAR */}

        <form
          className="products-search-toolbar px-5 py-4 border-b-subtle"
          onSubmit={(e) => e.preventDefault()}
        >

          <div className="search-box-wrapper products-search-field flex items-center gap-2 rounded-xl px-3 py-2.5">

            <Search
              size={14}
              className="text-faint-color"
            />

            <input
              value={searchInput}
              onChange={(e) =>
                setSearchInput(
                  e.target.value
                )
              }
              placeholder={tx(t(
                "products.searchPlaceholder",
                "ID, mahsulot, kategoriya yoki davlat..."
              ))}
              aria-label={tx("Mahsulotlarni qidirish")}
              className="bg-transparent text-sm flex-1 text-primary-color"
              style={{ border: 0, outline: "none", boxShadow: "none" }}
            />

          </div>

          <button
            type="submit"
            className="products-search-submit"
            aria-label={tx("Qidirish")}
            title={tx("Qidirish")}
          >
            <Search size={18} />
          </button>

        </form>

        {/* TABLE */}

        <div className="products-table-scroll" role="region" aria-label={tx("Mahsulotlar jadvali")} tabIndex="0">
        <table className="products-table w-full">

          <thead>
            <tr className="table-header-row">

              {[
                "",
                t(
                  "products.table.product",
                  "Mahsulot"
                ),
                t(
                  "products.table.category",
                  "Kategoriya"
                ),
                t(
                  "products.table.sellPrice",
                  "Sotuv narxi"
                ),
                t(
                  "products.table.costPrice",
                  "Tan narxi"
                ),
                t(
                  "products.table.stock",
                  "Qoldiq"
                ),
                t(
                  "products.table.status",
                  "Holat"
                ),
                "",
              ].map(
                (
                  header,
                  index
                ) => (
                  <th
                    key={index}
                    className="text-left px-5 py-3 text-xs font-semibold text-faint-color"
                  >
                    {tx(header)}
                  </th>
                )
              )}

            </tr>
          </thead>

          <tbody>

            {filtered.map(
              (product) => {

                const status =
                  statusMap[
                  product.status
                  ] ||
                  statusMap.active;

                return (
                  <tr
                    key={
                      product.id
                    }
                    className="border-t table-row-hover row-anim cursor-pointer"
                    onClick={() => onNavigate?.("product-" + product.id)}
                  >

                    {/* ICON */}

                    <td className="px-5 py-3.5">

                      <div className="product-icon-button" aria-hidden="true">
                        <Package
                          size={18}
                          strokeWidth={
                            1.8
                          }
                        />
                      </div>

                    </td>

                    {/* NAME */}

                    <td className="px-5 py-3.5">

                      <div className="text-sm font-semibold text-left text-primary-color">
                        {product.name}
                      </div>

                      <div className="text-xs mt-0.5 text-faint-color">
                        {tx(product.brand ||
                          "-")}
                      </div>

                    </td>

                    {/* CATEGORY */}

                    <td className="px-5 py-3.5 text-xs text-muted-color">
                      {
                        tx(product.category)
                      }
                    </td>

                    {/* PRICE */}

                    <td className="px-5 py-3.5 text-sm font-semibold text-primary-color">

                      {formatCurrency(product.price)}

                    </td>

                    {/* COST */}

                    <td className="px-5 py-3.5 text-sm text-secondary-color">

                      {formatCurrency(product.cost)}

                    </td>

                    {/* STOCK */}

                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-2">

                        <div className="products-stock-track">

                          <div
                            className="products-stock-fill"
                            style={{
                              width: `${Math.min(
                                (Math.max(0, Number(product.stock) || 0) /
                                  200) *
                                100,
                                100
                              )}%`,

                              background:
                                product.stock ===
                                  0
                                  ? "var(--danger)"
                                  : product.stock <
                                    10
                                    ? "var(--warning)"
                                    : "var(--success)",
                            }}
                          />

                        </div>

                        <span className="text-sm font-medium text-primary-color">
                          {
                            tx(product.stock)
                          }{tx(product.measurementType === "weight" ? " kg" : product.measurementType === "count" ? " dona" : "")}
                        </span>

                      </div>

                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-3.5">

                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            status.bg,
                          color:
                            status.color,
                        }}
                      >
                        {
                          tx(status.label)
                        }
                      </span>

                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-1">

                        {/* VIEW */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate?.("product-" + product.id);
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-70 text-faint-color cursor-pointer"
                          title={tx("Ko'rish")}
                        >
                          <Eye
                            size={14}
                          />
                        </button>

                        {/* EDIT */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(product);
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-70 text-brand-color cursor-pointer"
                          title={tx("Tahrirlash")}
                        >
                          <Edit2
                            size={14}
                          />
                        </button>

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptDelete(product);
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-70 text-danger-color cursor-pointer"
                          title={tx("O'chirish")}
                        >
                          <Trash2
                            size={14}
                          />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              }
            )}

          </tbody>

        </table>
        </div>

        {/* FOOTER */}

        <div className="flex items-center justify-between px-5 py-3.5 border-t-subtle">

          <span className="text-xs text-faint-color">
            {tx(t(
              "products.footer.count",
              "Jami {count} ta mahsulot"
            ).replace(
              "{count}",
              filtered.length
            ))}
          </span>

          <div className="flex items-center gap-1">

            {[1, 2, 3].map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    background:
                      page === 1
                        ? "var(--brand)"
                        : "transparent",

                    color:
                      page === 1
                        ? "white"
                        : "var(--text-muted)",
                  }}
                >
                  {tx(page)}
                </button>
              )
            )}

          </div>

        </div>

      </div>

      {/* =================================================
          ADD / EDIT MODAL
          ENDI PORTAL EMAS
      ================================================= */}

      {isModalOpen && modalRoot && createPortal(
        <div
          className="products-content-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              handleCloseModal();
            }
          }}
        >

          <div
            className="products-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-5">

              <div>

                <div
                  className="flex items-center gap-3"
                >

                  <div className="products-modal-icon">
                    {editingProduct ? (
                      <Edit2
                        size={18}
                      />
                    ) : (
                      <PackagePlus
                        size={18}
                      />
                    )}
                  </div>

                  <div>

                    <h2 className="font-display font-bold text-lg text-primary-color">
                      {tx(editingProduct
                        ? t(
                          "products.modal.editTitle",
                          "Mahsulotni tahrirlash"
                        )
                        : t(
                          "products.modal.addTitle",
                          "Yangi mahsulot qo'shish"
                        ))}
                    </h2>

                    <p className="text-xs mt-0.5 text-muted-color">
                      {tx(editingProduct
                        ? "Mahsulot ma'lumotlarini o'zgartiring"
                        : "Omborga yangi tovar kiriting")}
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseModal
                }
                className="p-2 rounded-xl hover:opacity-70 text-faint-color cursor-pointer"
              >
                <X size={18} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSaveProduct
              }
              className="space-y-4"
            >

              {/* NAME */}

              <div>

                <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Mahsulot nomi")}</label>

                <input
                  required
                  value={
                    formData.name
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name:
                        e.target
                          .value,
                    })
                  }
                  placeholder={tx("Masalan: Santexnika krani")}
                  className="input-base"
                />

              </div>

              <div>
                <label htmlFor="product-supplier" className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Ta'minotchi")}</label>
                <select id="product-supplier" className="input-base" value={formData.supplierId} onChange={(event) => {
                  const supplier = suppliers.find((item) => String(item.id) === event.target.value);
                  setFormData({ ...formData, supplierId: event.target.value, supplierName: supplier?.name || "" });
                }}>
                  <option value="">{tx("Ta'minotchini tanlang")}</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="product-measurement" className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("O'lchov turi (ixtiyoriy)")}</label>
                <select id="product-measurement" className="input-base" value={formData.measurementType} onChange={(event) => setFormData({ ...formData, measurementType: event.target.value })}>
                  <option value="">{tx("Tanlanmagan")}</option>
                  <option value="count">{tx("Soni (dona)")}</option>
                  <option value="weight">{tx("Og'irligi (kg)")}</option>
                </select>
              </div>

              {/* BRAND + SKU */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Brend")}</label>

                  <input
                    value={
                      formData.brand
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand:
                          e.target
                            .value,
                      })
                    }
                    placeholder={tx("Masalan: Grohe")}
                    className="input-base"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("SKU Kod")}</label>

                  <input
                    required
                    value={
                      formData.sku
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sku:
                          e.target
                            .value,
                      })
                    }
                    placeholder={tx("SKU-1001")}
                    className="input-base font-mono"
                  />

                </div>

              </div>

              {/* CATEGORY + STOCK */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Kategoriya")}</label>

                  <div className="relative">
                    <input
                      value={formData.category}
                      onFocus={() => setShowCategories(true)}
                      onChange={(e) => setCategory(e.target.value)}
                      onBlur={() => setTimeout(() => setShowCategories(false), 120)}
                      placeholder={tx("Kategoriya nomini yozing yoki tanlang")}
                      className="input-base"
                    />
                    {showCategories && <div className="absolute z-20 top-full left-0 right-0 mt-1 p-1 rounded-xl max-h-44 overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
                      {categoryMatches.map((category) => <button type="button" key={category} onMouseDown={(e) => e.preventDefault()} onClick={() => { setCategory(category); setShowCategories(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50">{category}</button>)}
                      {!categoryMatches.some((category) => category.toLocaleLowerCase("uz-UZ") === formData.category.trim().toLocaleLowerCase("uz-UZ")) && formData.category.trim() && <div className="px-3 py-2 text-xs" style={{ color: "var(--brand)" }}>{tx("Yangi kategoriya sifatida qo'shiladi")}: {formData.category}</div>}
                    </div>}
                  </div>

                </div>

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">
                    {tx(formData.measurementType === "weight" ? "Og'irligi (kg)" : formData.measurementType === "count" ? "Soni (dona)" : "Qoldiq")}
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    step={formData.measurementType === "count" ? "1" : "any"}
                    value={
                      formData.stock
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock:
                          e.target
                            .value,
                      })
                    }
                    placeholder={tx("0")}
                    className="input-base"
                  />

                </div>

              </div>

              {/* PRICE + COST */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Sotuv narxi")}{tx(formData.measurementType === "weight" ? " (1 kg uchun)" : formData.measurementType === "count" ? " (1 dona uchun)" : "")}
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    value={moneyInputValue(formData.price, false)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: String(toBaseMoney(e.target.value)),
                      })
                    }
                    placeholder={tx("0")}
                    className="input-base"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold mb-1.5 text-secondary-color">{tx("Tan narxi")}{tx(formData.measurementType === "weight" ? " (1 kg uchun)" : formData.measurementType === "count" ? " (1 dona uchun)" : "")}
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    value={moneyInputValue(formData.cost, false)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost: String(toBaseMoney(e.target.value)),
                      })
                    }
                    placeholder={tx("0")}
                    className="input-base"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    handleCloseModal
                  }
                  className="btn-ghost flex-1 justify-center cursor-pointer"
                >{tx("Bekor qilish")}</button>

                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center cursor-pointer"
                >

                  {editingProduct ? (
                    <Save
                      size={14}
                    />
                  ) : (
                    <PackagePlus
                      size={14}
                    />
                  )}

                  {tx(editingProduct
                    ? "Saqlash"
                    : "Qo'shish")}

                </button>

              </div>

            </form>

          </div>

        </div>
        , modalRoot
      )}

      {/* =================================================
          DELETE MODAL
          ENDI PORTAL EMAS
      ================================================= */}

      {deleteTarget && modalRoot && createPortal(
        <div
          className="products-content-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeDeleteModal();
            }
          }}
        >

          <div
            className="products-modal products-delete-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            {/* ICON */}

            <div className="products-delete-icon">
              <AlertTriangle
                size={23}
              />
            </div>

            {/* TITLE */}

            <h3 className="font-display font-bold text-lg text-primary-color mt-4">{tx("Mahsulotni o'chirmoqchimisiz?")}</h3>

            {/* TEXT */}

            <p className="text-sm text-muted-color mt-2 leading-6">
              <strong>
                "{deleteTarget.name}"
              </strong>{" "}{tx("mahsuloti ro'yxatdan butunlay olib tashlanadi.")}<br />{tx("Ushbu amalni ortga qaytarib bo'lmaydi.")}</p>

            {/* BUTTONS */}

            <div className="flex items-center gap-3 mt-6">

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                className="btn-ghost flex-1 justify-center cursor-pointer"
              >{tx("Bekor qilish")}</button>

              <button
                type="button"
                onClick={
                  confirmDelete
                }
                className="flex-1 justify-center cursor-pointer"
                style={{
                  height: 42,
                  borderRadius: 12,
                  border: "none",
                  background:
                    "var(--danger)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >{tx("O'chirish")}</button>

            </div>

          </div>

        </div>
        , modalRoot
      )}

    </div>
  );
}
