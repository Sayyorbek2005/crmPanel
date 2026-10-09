import { useState } from "react";
import { createPortal } from "react-dom";

import Modal from "../components/Modal";
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";

import DateRangeFilter, {
  matchesDateRange,
} from "../components/DateRangeFilter";

import {
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
} from "lucide-react";

import { formatCurrency } from "../data/currency";

import "./Returns.css";

const reasonOptions = [
  "Nosoz / ishlamaydi",
  "Sifat muammosi",
  "Hajm/o'lcham to'g'ri kelmadi",
  "Noto'g'ri mahsulot yetkazildi",
  "Mijoz fikri o'zgardi",
  "Boshqa",
];

const statusMap = {
  approved: {
    label: "Qabul qilindi",
    bg: "var(--success-light)",
    color: "var(--success)",
    icon: CheckCircle,
  },
  pending: {
    label: "Kutilmoqda",
    bg: "var(--warning-light)",
    color: "var(--warning)",
    icon: AlertCircle,
  },
  rejected: {
    label: "Rad etildi",
    bg: "var(--danger-light)",
    color: "var(--danger)",
    icon: X,
  },
};

const normalizeText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("uz-UZ");

const capitalizeName = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) =>
      part
        ? part[0].toLocaleUpperCase("uz-UZ") +
          part.slice(1).toLocaleLowerCase("uz-UZ")
        : ""
    )
    .join(" ");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const readStoredList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const getItemKey = (item, index) =>
  `${item.id ?? item.name ?? "item"}-${index}`;

const getSaleId = (sale) =>
  String(sale.id ?? sale.receiptNumber ?? "");

const getSaleItems = (sale) =>
  Array.isArray(sale?.items) ? sale.items : [];

const getReturnedQuantity = (returnsList, sale, item) => {
  const saleId = getSaleId(sale);
  const itemId = String(item.id ?? "");

  return returnsList
    .filter(
      (entry) =>
        entry.status !== "rejected" &&
        String(entry.saleId) === saleId &&
        (itemId
          ? String(entry.productId ?? "") === itemId
          : normalizeText(entry.product) === normalizeText(item.name))
    )
    .reduce((sum, entry) => sum + toNumber(entry.quantity), 0);
};

const displayDate = (value, includeTime = false) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return includeTime
    ? date.toLocaleString("uz-UZ")
    : date.toLocaleDateString("uz-UZ");
};

export default function Returns() {
  useUILanguage();

  const { success, info } = useToast();

  const [returnsList, setReturnsList] = useState(() =>
    readStoredList("crm_returns")
  );

  const [selectedReturn, setSelectedReturn] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [salesForReturn] = useState(() => readStoredList("crm_sales"));
  const [productsForReturn] = useState(() =>
    readStoredList("crm_products")
  );

  const [returnLookup, setReturnLookup] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnCustomer, setReturnCustomer] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [reason, setReason] = useState("");

  const persistReturns = (updated) => {
    try {
      localStorage.setItem("crm_returns", JSON.stringify(updated));
      setReturnsList(updated);
      return true;
    } catch {
      info(tx("Qaytarish ma'lumotlarini saqlab bo'lmadi"));
      return false;
    }
  };

  const updateReturnStatus = (id, status) => {
    const updated = returnsList.map((item) =>
      item.id === id ? { ...item, status } : item
    );

    if (!persistReturns(updated)) {
      return;
    }

    setSelectedReturn((current) =>
      current?.id === id ? { ...current, status } : current
    );

    if (status === "approved") {
      success("Qaytarish qabul qilindi", id);
    } else {
      info("Qaytarish rad etildi", id);
    }
  };

  const query = normalizeText(search);

  const filtered = returnsList.filter((entry) => {
    const matchesText = [
      entry.id,
      entry.saleId,
      entry.productId,
      entry.customer,
      entry.product,
    ].some((value) => normalizeText(value).includes(query));

    const returned = new Date(entry.date);

    const day = Number.isNaN(returned.getTime())
      ? String(entry.date || "").slice(0, 10)
      : [
          returned.getFullYear(),
          String(returned.getMonth() + 1).padStart(2, "0"),
          String(returned.getDate()).padStart(2, "0"),
        ].join("-");

    return matchesText && matchesDateRange(day, dateFrom, dateTo);
  });

  const lookupQuery = normalizeText(returnLookup);

  const saleSuggestions =
    lookupQuery && !selectedSale
      ? salesForReturn
          .flatMap((sale) =>
            getSaleItems(sale).map((item, index) => ({
              sale,
              item,
              index,
            }))
          )
          .filter(({ sale, item }) =>
            [
              sale.id,
              sale.receiptNumber,
              sale.customer,
              sale.customerName,
              item.name,
              item.id,
            ].some((value) =>
              normalizeText(value).includes(lookupQuery)
            )
          )
          .slice(0, 8)
      : [];

  const returnLines = getSaleItems(selectedSale).map((item, index) => {
    const itemId = String(item.id ?? "");
    const key = getItemKey(item, index);

    const returnedQty = getReturnedQuantity(
      returnsList,
      selectedSale,
      item
    );

    const available = Math.max(
      0,
      toNumber(item.qty ?? item.quantity) - returnedQty
    );

    const product = productsForReturn.find(
      (entry) => String(entry.id) === itemId
    );

    const unitPrice = toNumber(item.price ?? product?.price);

    return {
      item,
      index,
      key,
      available,
      unitPrice,
      quantity: toNumber(returnQuantities[key]),
    };
  });

  const selectedLines = returnLines.filter(
    (line) => line.quantity > 0
  );

  const returnTotal = selectedLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );

  const chooseReturnItem = ({ sale, item, index }) => {
    setSelectedSale(sale);

    setReturnCustomer(
      capitalizeName(sale.customer || sale.customerName || "")
    );

    const alreadyReturned = getReturnedQuantity(
      returnsList,
      sale,
      item
    );

    const remaining = Math.max(
      0,
      toNumber(item.qty ?? item.quantity) - alreadyReturned
    );

    setReturnQuantities({
      [getItemKey(item, index)]: Math.min(1, remaining),
    });

    setReturnLookup(
      `${sale.id ?? sale.receiptNumber ?? ""} · ${item.name || ""}`
    );

    setConfirmingReturn(false);
  };

  const closeReturnModal = () => {
    setShowModal(false);
    setReturnLookup("");
    setSelectedSale(null);
    setReturnCustomer("");
    setReturnQuantities({});
    setReason("");
    setConfirmingReturn(false);
  };

  const saveReturn = () => {
    if (!selectedSale || !selectedLines.length || !reason) {
      return;
    }

    if (
      selectedLines.some(
        (line) =>
          line.quantity > line.available ||
          !Number.isFinite(line.quantity)
      )
    ) {
      info(tx("Qaytarish miqdorini tekshiring"));
      return;
    }

    const groupId = `R-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const additions = selectedLines.map(
      ({ item, index, quantity, unitPrice }) => ({
        id: `${groupId}-${index + 1}`,
        groupId,
        saleId: getSaleId(selectedSale),
        productId: item.id ?? "",
        customer: capitalizeName(returnCustomer),
        product: item.name || "Mahsulot",
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
        reason,
        status: "pending",
        date: createdAt,
        purchaseDate: selectedSale.date || "",
        deliveryAddress:
          item.deliveryAddress || selectedSale.deliveryAddress || "",
      })
    );

    const updated = [...additions, ...returnsList];

    if (!persistReturns(updated)) {
      return;
    }

    closeReturnModal();
    success("Qaytarish so'rovi saqlandi", groupId);
  };

  const totalReturned = returnsList
    .filter((entry) => entry.status === "approved")
    .reduce((sum, entry) => sum + toNumber(entry.amount), 0);

  const canConfirmReturn =
    Boolean(selectedSale) && selectedLines.length > 0 && Boolean(reason);

  const modalRoot =
    typeof document !== "undefined"
      ? document.getElementById("main-modal-root") || document.body
      : null;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-color">
            {tx("Qaytarilgan mahsulotlar")}
          </h1>

          <p className="text-sm mt-0.5 text-muted-color">
            {tx("Qaytarilgan tovarlar va refund so'rovlari")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={15} />
          {tx(" Qaytarish qo'shish")}
        </button>
      </div>

      {/* Stats */}
      <div className="returns-stats grid grid-cols-4 gap-4">
        {[
          {
            label: "Jami qaytarishlar",
            value: returnsList.length,
            color: "var(--brand)",
          },
          {
            label: "Qabul qilingan",
            value: returnsList.filter(
              (entry) => entry.status === "approved"
            ).length,
            color: "var(--success)",
          },
          {
            label: "Kutilmoqda",
            value: returnsList.filter(
              (entry) => entry.status === "pending"
            ).length,
            color: "var(--warning)",
          },
          {
            label: "Umumiy Qaytarilgan summa",
            value: formatCurrency(totalReturned),
            color: "var(--danger)",
          },
        ].map((stat) => (
          <div key={stat.label} className="returns-stat-card card p-4">
            <div
              className="returns-stat-value text-xl font-display font-bold mb-1"
              style={{ color: stat.color }}
            >
              {tx(stat.value)}
            </div>

            <div className="returns-stat-label text-xs text-faint-color">
              {tx(stat.label)}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="returns-table-card card-flat rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b-subtle flex-wrap">
          <div
            className="search-box-wrapper flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1"
            style={{ minWidth: 240, maxWidth: 360 }}
          >
            <Search size={14} className="text-faint-color" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tx(
                "Qaytarish, sotuv, mahsulot ID yoki mijoz..."
              )}
              aria-label={tx("Qaytarishlarni qidirish")}
              className="bg-transparent outline-none text-sm flex-1 text-primary-color"
            />
          </div>

          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>

        <div
          className="returns-table-scroll"
          role="region"
          aria-label={tx("Qaytarishlar jadvali")}
          tabIndex={0}
        >
          <table className="returns-table w-full">
            <thead>
              <tr className="table-header-row">
                {[
                  "ID",
                  "Sotuv",
                  "Mijoz",
                  "Mahsulot",
                  "Sabab",
                  "Summa",
                  "Sana",
                  "Manzil",
                  "Holat",
                  "",
                ].map((heading) => (
                  <th
                    key={heading || "actions"}
                    scope="col"
                    className="text-left px-5 py-3 text-xs font-semibold text-faint-color"
                  >
                    {tx(heading)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-sm text-muted-color"
                  >
                    {tx("Qaytarishlar topilmadi")}
                  </td>
                </tr>
              )}

              {filtered.map((entry) => {
                const status = statusMap[entry.status] || {
                  label: "Noma'lum",
                  bg: "var(--surface-2)",
                  color: "var(--text-muted)",
                  icon: AlertCircle,
                };

                const Icon = status.icon;

                return (
                  <tr
                    key={entry.id}
                    className="border-t table-row-hover"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedReturn(entry)}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-muted-color">
                      <button
                        type="button"
                        aria-label={tx(
                          `${entry.id} qaytarish tafsilotlarini ochish`
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedReturn(entry);
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          color: "inherit",
                          font: "inherit",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {entry.id}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-xs text-faint-color">
                      {tx(entry.saleId)}
                    </td>

                    <td className="px-5 py-3.5 text-sm font-medium text-primary-color">
                      {entry.customer}
                    </td>

                    <td className="px-5 py-3.5 text-sm text-secondary-color">
                      {entry.product}
                    </td>

                    <td className="px-5 py-3.5 text-sm text-muted-color">
                      {tx(entry.reason)}
                    </td>

                    <td className="px-5 py-3.5 text-sm font-semibold text-danger-color">
                      -{formatCurrency(toNumber(entry.amount))}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-faint-color">
                      {tx(displayDate(entry.date))}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-muted-color">
                      {tx(entry.deliveryAddress || "—")}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                        style={{
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        <Icon size={10} />
                        {tx(status.label)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {entry.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateReturnStatus(entry.id, "approved");
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold action-btn-success"
                          >
                            {tx("Qabul")}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateReturnStatus(entry.id, "rejected");
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold action-btn-danger"
                          >
                            {tx("Rad")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        title="Qaytarish tafsilotlari"
        subtitle={selectedReturn?.id}
        icon={RotateCcw}
        contentOnly
      >
        {selectedReturn && (
          <dl style={{ margin: 0 }}>
            {[
              ["Mijoz", selectedReturn.customer],
              ["Mahsulot", selectedReturn.product],
              [
                "Qaytarilgan miqdor",
                selectedReturn.quantity != null
                  ? selectedReturn.quantity + " ta"
                  : "Miqdor kiritilmagan",
              ],
              [
                "Qaytarilgan sana",
                displayDate(selectedReturn.date, true),
              ],
              [
                "Xarid qilingan sana",
                displayDate(selectedReturn.purchaseDate),
              ],
              ["Sotuv ID", selectedReturn.saleId],
              ["Sabab", selectedReturn.reason],
              [
                "Qaytarish summasi",
                toNumber(selectedReturn.amount).toLocaleString() +
                  " so‘m",
              ],
              [
                "Holat",
                statusMap[selectedReturn.status]?.label || "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 14,
                }}
              >
                <dt style={{ color: "var(--text-muted)" }}>
                  {tx(label)}
                </dt>

                <dd
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {tx(String(value ?? "—"))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      {/* Portal orqali chiqariladigan modal */}
      {showModal &&
        modalRoot &&
        createPortal(
          <div className="crm-content-modal">
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="return-modal-title"
              style={{
                maxWidth: 680,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2
                    id="return-modal-title"
                    className="font-display font-bold text-lg text-primary-color"
                  >
                    {tx("Qaytarish qo'shish")}
                  </h2>

                  <p className="text-xs mt-0.5 text-muted-color">
                    {tx("Qaytarilgan mahsulot ma'lumotlari")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeReturnModal}
                  aria-label={tx("Yopish")}
                  className="p-2 rounded-xl hover:opacity-70 text-faint-color"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div style={{ position: "relative" }}>
                  <label
                    htmlFor="return-sale-lookup"
                    className="block text-xs font-semibold mb-1.5 text-secondary-color"
                  >
                    {tx("Sotuv ID yoki mahsulot nomi")}
                  </label>

                  <input
                    id="return-sale-lookup"
                    value={returnLookup}
                    onChange={(event) => {
                      setReturnLookup(event.target.value);
                      setSelectedSale(null);
                      setReturnQuantities({});
                      setConfirmingReturn(false);
                    }}
                    placeholder={tx(
                      "ID yoki mahsulotni yozib qidiring..."
                    )}
                    className="input-base"
                    autoComplete="off"
                  />

                  {saleSuggestions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 5,
                        top: "100%",
                        left: 0,
                        right: 0,
                        maxHeight: 220,
                        overflowY: "auto",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
                      {saleSuggestions.map((match) => (
                        <button
                          type="button"
                          key={`${getSaleId(match.sale)}-${getItemKey(
                            match.item,
                            match.index
                          )}`}
                          onClick={() => chooseReturnItem(match)}
                          className="w-full text-left px-3 py-2.5 hover:opacity-80"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            borderBottom:
                              "1px solid var(--border-subtle)",
                            background: "transparent",
                            color: "var(--text-primary)",
                          }}
                        >
                          <span>
                            <b>
                              {match.sale.id ??
                                match.sale.receiptNumber}
                            </b>

                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              {match.item.name} ·{" "}
                              {capitalizeName(
                                match.sale.customer ||
                                  match.sale.customerName ||
                                  "Mijoz ko'rsatilmagan"
                              )}
                            </span>
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {toNumber(
                              match.item.qty ?? match.item.quantity
                            ).toLocaleString("uz-UZ")}{" "}
                            {tx("ta")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSale && (
                  <>
                    <label className="block text-xs font-semibold text-secondary-color">
                      {tx("Mijoz")}

                      <input
                        value={returnCustomer}
                        onChange={(event) =>
                          setReturnCustomer(event.target.value)
                        }
                        onBlur={() =>
                          setReturnCustomer((value) =>
                            capitalizeName(value)
                          )
                        }
                        placeholder={tx("Mijoz ismi")}
                        className="input-base mt-1.5"
                      />
                    </label>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-secondary-color">
                        {tx("Qaytariladigan mahsulotlar")}
                      </div>

                      {returnLines.map(
                        ({
                          item,
                          key,
                          available,
                          unitPrice,
                          quantity,
                        }) => (
                          <div
                            key={key}
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(120px,1fr) 85px 115px 110px",
                              alignItems: "center",
                              gap: 10,
                              padding: 12,
                              borderRadius: 12,
                              background: "var(--surface-2)",
                            }}
                          >
                            <div>
                              <b style={{ fontSize: 13 }}>
                                {item.name || tx("Mahsulot")}
                              </b>

                              <small
                                style={{
                                  display: "block",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {tx("Sotuvda")}:{" "}
                                {toNumber(
                                  item.qty ?? item.quantity
                                ).toLocaleString("uz-UZ")}{" "}
                                · {tx("Qoldi")}: {available}
                              </small>
                            </div>

                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              {tx("Qaytarish soni")}

                              <input
                                type="number"
                                min="0"
                                max={available}
                                step="1"
                                disabled={!available}
                                value={quantity || ""}
                                onChange={(event) => {
                                  const next = Math.min(
                                    available,
                                    Math.max(
                                      0,
                                      Math.floor(
                                        toNumber(event.target.value)
                                      )
                                    )
                                  );

                                  setReturnQuantities((previous) => ({
                                    ...previous,
                                    [key]: next,
                                  }));

                                  setConfirmingReturn(false);
                                }}
                                className="input-base mt-1"
                                placeholder="0"
                              />
                            </label>

                            <div
                              style={{
                                textAlign: "right",
                                fontSize: 12,
                              }}
                            >
                              <small
                                style={{
                                  display: "block",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {tx("Bir dona narxi")}
                              </small>

                              <b>{formatCurrency(unitPrice)}</b>
                            </div>

                            <div
                              style={{
                                textAlign: "right",
                                fontSize: 12,
                              }}
                            >
                              <small
                                style={{
                                  display: "block",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {tx("Jami")}
                              </small>

                              <b>
                                {formatCurrency(quantity * unitPrice)}
                              </b>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="return-reason"
                        className="block text-xs font-semibold mb-1.5 text-secondary-color"
                      >
                        {tx("Sabab")}
                      </label>

                      <select
                        id="return-reason"
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                          setConfirmingReturn(false);
                        }}
                        className="input-base"
                      >
                        <option value="">{tx("Sabab tanlang")}</option>

                        {reasonOptions.map((option) => (
                          <option key={option} value={option}>
                            {tx(option)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "var(--danger-light)",
                        color: "var(--danger)",
                        fontWeight: 700,
                      }}
                    >
                      <span>
                        {tx("Umumiy qaytarish summasi")} ·{" "}
                        {selectedLines.length} {tx("xil")}
                      </span>

                      <span>{formatCurrency(returnTotal)}</span>
                    </div>

                    {confirmingReturn && (
                      <div
                        role="alert"
                        style={{
                          padding: 14,
                          border: "1px solid var(--warning)",
                          borderRadius: 12,
                          background: "var(--warning-light)",
                        }}
                      >
                        <b>{tx("Qaytarishni tasdiqlaysizmi?")}</b>

                        <p className="text-sm mt-1">
                          {selectedLines.length} {tx("xil mahsulot")},{" "}
                          {formatCurrency(returnTotal)} —{" "}
                          {tx("ma'lumotlarni tekshirib tasdiqlang")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeReturnModal}
                  className="btn-ghost flex-1"
                >
                  {tx("Bekor qilish")}
                </button>

                {confirmingReturn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingReturn(false)}
                      className="btn-ghost flex-1"
                    >
                      {tx("Ortga")}
                    </button>

                    <button
                      type="button"
                      onClick={saveReturn}
                      disabled={!canConfirmReturn}
                      className="btn-primary flex-1 justify-center"
                    >
                      <CheckCircle size={14} />
                      {tx("Tasdiqlash va saqlash")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (canConfirmReturn) {
                        setConfirmingReturn(true);
                      }
                    }}
                    disabled={!canConfirmReturn}
                    className="btn-primary flex-1 justify-center"
                  >
                    <RotateCcw size={14} />
                    {tx("Qaytarishni tasdiqlash")}
                  </button>
                )}
              </div>
            </div>
          </div>,
          modalRoot
        )}
    </div>
  );
}