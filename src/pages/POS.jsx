import { resolveReceivingCard } from "../data/directorCards";
import ReceiptPaymentDetails from "../components/ReceiptPaymentDetails";
import ProductQuickAddModal from "../components/ProductQuickAddModal";
import {
  POS_DRAFT_KEY,
  readPosDraft,
  cartKeyFor,
  createAddressId,
  phoneDigits,
  getDefaultDebtDueDate,
} from "./posHelpers";
import { PaymentSuccessAnimation } from './PosPaymentPanel';
import { CartPanelContent } from './PosCartPanel';
import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage, useLanguage } from "../context/LanguageContext";
import { createPortal } from "react-dom";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./POS.css";
import {
  FiSearch,
  FiTrash2,
  FiShoppingCart,
  FiUser,
  FiEdit2,
  FiAlertTriangle,
  FiPrinter,
  FiX,
} from "react-icons/fi";
import { customers as initialCustomers, products as initialProducts, suppliers as supplierSeed } from "../data/mockData";
import { useToast } from "../context/ToastContext";
import checkAnimationSound from "../assets/check animation sound.m4a";

import { formatCurrency, moneyInputValue, toBaseMoney } from "../data/currency";
export default function POS({ cartWindowOpen = false, onCartWindowChange }) {
  useUILanguage();
  const { t } = useLanguage();
  const { success, warning } = useToast();

  const text = (key, fallback) =>
    t ? t(`pos.${key}`, fallback) : fallback;

  /* =====================================================
     PRODUCTS
  ===================================================== */

  const [productList, setProductList] = useState(() => {
    const saved =
      localStorage.getItem("crm_products");

    return saved
      ? JSON.parse(saved)
      : initialProducts;
  });

  const [search, setSearch] = useState("");
  const [quickAddProduct, setQuickAddProduct] = useState(null);
  const [quickAddQuantity, setQuickAddQuantity] = useState("1");
  const [suppliers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crm_suppliers") || "null");
      return Array.isArray(saved) ? saved : supplierSeed;
    } catch {
      return supplierSeed;
    }
  });
  const [selectedProductSelect] =
    useState("");
  const productsGridRef = useRef(null);
  const [compactCart, setCompactCart] = useState(() => window.matchMedia("(max-width: 1359px)").matches);
  const cartToggleRef = useRef(null);
  const cartWindowBodyRef = useRef(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1359px)");
    const update = () => {
      setCompactCart(query.matches);
      if (!query.matches) onCartWindowChange?.(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [onCartWindowChange]);

  useLayoutEffect(() => {
    if (productsGridRef.current) productsGridRef.current.scrollTop = 0;
  }, [search, selectedProductSelect, productList.length]);

  /* =====================================================
     CART
  ===================================================== */

  const [cart, setCart] = useState(() => {
    const saved = readPosDraft().cart;
    return Array.isArray(saved) ? saved : [];
  });

  const [globalDiscount, setGlobalDiscount] =
    useState(() => Number(readPosDraft().globalDiscount) || 0);

  /* =====================================================
     CUSTOMER
  ===================================================== */

  const [customerName, setCustomerName] =
    useState(() => readPosDraft().customerName || "");

  const [customerPhone, setCustomerPhone] =
    useState(() => readPosDraft().customerPhone || "");

  const [customerError, setCustomerError] =
    useState("");

  const [deliveryAddress, setDeliveryAddress] = useState(() => readPosDraft().deliveryAddress || "");
  const [addresses, setAddresses] = useState(() => {
    const saved = readPosDraft().addresses;
    return Array.isArray(saved) ? saved : [];
  });
  const [selectedAddressId, setSelectedAddressId] = useState(() => readPosDraft().selectedAddressId || null);
  const [addressConfirmed, setAddressConfirmed] = useState(() => Boolean(readPosDraft().addressConfirmed));
  const [addressError, setAddressError] = useState("");

  const [paymentOpen, setPaymentOpen] = useState(false);
  useEffect(() => {
    if (compactCart) cartWindowBodyRef.current?.scrollTo({ top: 0 });
  }, [paymentOpen, compactCart]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [completedSale, setCompletedSale] = useState(null);
  const [debtDueDate, setDebtDueDate] = useState(getDefaultDebtDueDate);
  const [paymentError, setPaymentError] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const paymentTimerRef = useRef(null);
  const paymentSoundRef = useRef(null);
  const paymentSubmittingRef = useRef(false);

  useEffect(() => {
    try {
      if (paymentComplete) {
        localStorage.removeItem(POS_DRAFT_KEY);
      } else {
        localStorage.setItem(POS_DRAFT_KEY, JSON.stringify({
          cart, globalDiscount, customerName, customerPhone,
          deliveryAddress, addresses, selectedAddressId, addressConfirmed,
        }));
      }
    } catch { /* The sale can still be completed if browser storage is full. */ }
  }, [cart, globalDiscount, customerName, customerPhone, deliveryAddress,
    addresses, selectedAddressId, addressConfirmed, paymentComplete]);

  useEffect(() => {
    const sound = new Audio(checkAnimationSound);
    sound.preload = "auto";
    paymentSoundRef.current = sound;

    return () => {
      clearTimeout(paymentTimerRef.current);
      sound.pause();
      sound.currentTime = 0;
      paymentSoundRef.current = null;
    };
  }, []);

  /* =====================================================
     PRODUCT MODAL
  ===================================================== */

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  /* =====================================================
     DELETE
  ===================================================== */

  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false);

  const [productToDeleteId, setProductToDeleteId] =
    useState(null);

  /* =====================================================
     RECEIPT
  ===================================================== */

  const [receiptOpen, setReceiptOpen] =
    useState(false);

  const [receiptNumber, setReceiptNumber] =
    useState("");

  const [receiptDate, setReceiptDate] =
    useState("");

  /* =====================================================
     FORM
  ===================================================== */

  const [formData, setFormData] = useState({
    name: "",
    category: "Maishiy kimyo",
    price: "",
    stock: "",
    image: "??",
  });

  /* =====================================================
     FILTER
  ===================================================== */

  const filtered = productList.filter((p) => {
    const matchSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchSelect =
      !selectedProductSelect ||
      p.id.toString() ===
      selectedProductSelect;

    return matchSearch && matchSelect;
  });

  const assignUnassignedItems = (addressId) => {
    setCart((previous) => previous.map((item) =>
      item.addressId
        ? item
        : { ...item, addressId, cartKey: cartKeyFor(item.id, addressId) }
    ));
  };

  const addDeliveryAddress = (details) => {
    const newAddress = { id: createAddressId(), ...details };
    if (addresses.length === 0) {
      const typedAddress = deliveryAddress.trim();
      if (typedAddress) {
        const primary = {
          id: createAddressId(),
          name: "Asosiy manzil",
          address: typedAddress,
          phone: "",
        };
        setAddresses([primary, newAddress]);
        assignUnassignedItems(primary.id);
      } else {
        setAddresses([newAddress]);
        setDeliveryAddress(newAddress.address);
        assignUnassignedItems(newAddress.id);
      }
    } else {
      const currentAddresses = addresses.length === 1 && deliveryAddress.trim()
        ? [{ ...addresses[0], address: deliveryAddress.trim() }]
        : addresses;
      setAddresses([...currentAddresses, newAddress]);
    }
    setSelectedAddressId(newAddress.id);
    setAddressConfirmed(false);
    setAddressError("");
  };

  const confirmDeliveryAddresses = () => {
    if (addresses.length > 1) {
      if (!selectedAddressId) {
        setAddressError("Yetkazib berish manzilini tanlang.");
        return false;
      }
      setAddressError("");
      setAddressConfirmed(true);
      return true;
    }

    const addressText = deliveryAddress.trim();
    if (addresses.length === 0) {
      if (addressText) {
        const id = createAddressId();
        setAddresses([{ id, name: "Asosiy manzil", address: addressText, phone: "" }]);
        setSelectedAddressId(id);
        assignUnassignedItems(id);
      }
    } else {
      setAddresses([{ ...addresses[0], address: addressText || addresses[0].address }]);
      setSelectedAddressId(addresses[0].id);
    }
    setAddressError("");
    setAddressConfirmed(Boolean(addressText || addresses.length));
    return true;
  };

  const moveItemToAddress = (cartKey, addressId) => {
    if (!addresses.some((address) => address.id === addressId)) return;
    setCart((previous) => {
      const item = previous.find((entry) => entry.cartKey === cartKey);
      if (!item || item.addressId === addressId) return previous;
      const nextKey = cartKeyFor(item.id, addressId);
      const existing = previous.find((entry) => entry.cartKey === nextKey);
      if (existing) {
        return previous
          .filter((entry) => entry.cartKey !== cartKey)
          .map((entry) => entry.cartKey === nextKey
            ? { ...entry, qty: entry.qty + item.qty }
            : entry);
      }
      return previous.map((entry) => entry.cartKey === cartKey
        ? { ...entry, addressId, cartKey: nextKey }
        : entry);
    });
  };

  /* =====================================================
     ADD TO CART
  ===================================================== */

  const addToCart = (p, quantity = 1) => {
    const requested = Math.floor(Number(quantity));
    if (!Number.isFinite(requested) || requested < 1) return false;
    if (Number(p.stock) <= 0) {
      warning("Mahsulot tugagan", `${p.name} hozir omborda mavjud emas.`);
      return false;
    }

    const totalInCart = cart
      .filter((item) => item.id === p.id)
      .reduce((sum, item) => sum + item.qty, 0);
    if (totalInCart + requested > Number(p.stock)) {
      warning("Miqdor cheklangan", `${p.name} uchun ombordagi barcha mahsulot savatchada.`);
      return false;
    }

    setCart((prev) => {
      const addressId = selectedAddressId || addresses[0]?.id || null;
      const cartKey = cartKeyFor(p.id, addressId);
      const existing = prev.find(
        (c) => c.cartKey === cartKey
      );
      if (existing) {
        return prev.map((c) =>
          c.cartKey === cartKey
            ? {
              ...c,
              qty: c.qty + requested,
            }
            : c
        );
      }

      return [
        ...prev,
        {
          id: p.id,
          cartKey,
          addressId,
          name: p.name,
          price: Number(p.price),
          image: p.image,
          qty: requested,
          discount: 0,
        },
      ];
    });
    success("Mahsulot qo'shildi", `${p.name} savatchaga ${requested} dona qo'shildi.`);
    return true;
  };

  const openQuickAdd = (product) => {
    setQuickAddProduct(product);
    setQuickAddQuantity("1");
  };

  const confirmQuickAdd = (quantity) => {
    if (addToCart(quickAddProduct, quantity)) setQuickAddProduct(null);
  };

  /* =====================================================
     UPDATE QTY
  ===================================================== */

  const updateQty = (cartKey, delta) => {
    setCart((previous) => {
      const current = previous.find((item) => item.cartKey === cartKey);
      if (!current) return previous;
      const product = productList.find((item) => item.id === current.id);
      const otherQty = previous
        .filter((item) => item.id === current.id && item.cartKey !== cartKey)
        .reduce((sum, item) => sum + item.qty, 0);
      const available = product ? Number(product.stock) - otherQty : Infinity;
      const nextQty = Math.max(0, Math.min(current.qty + delta, available));
      return previous
        .map((item) => item.cartKey === cartKey ? { ...item, qty: nextQty } : item)
        .filter((item) => item.qty > 0);
    });
  };

  /* =====================================================
     EXACT QTY
  ===================================================== */

  const setExactQty = (cartKey, newQty) => {
    setCart((previous) => {
      const current = previous.find((item) => item.cartKey === cartKey);
      if (!current) return previous;
      const product = productList.find((item) => item.id === current.id);
      const otherQty = previous
        .filter((item) => item.id === current.id && item.cartKey !== cartKey)
        .reduce((sum, item) => sum + item.qty, 0);
      const available = product ? Number(product.stock) - otherQty : Infinity;
      const nextQty = Math.max(0, Math.min(newQty, available));
      return previous
        .map((item) => item.cartKey === cartKey ? { ...item, qty: nextQty } : item)
        .filter((item) => item.qty > 0);
    });
  };

  /* =====================================================
     REMOVE
  ===================================================== */

  const removeItem = (cartKey) => {
    setCart((prev) =>
      prev.filter((c) => c.cartKey !== cartKey)
    );
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
  };

  /* =====================================================
     EDIT PRODUCT
  ===================================================== */

  const handleOpenEditModal = (e, p) => {
    e.stopPropagation();

    setEditingProduct(p);

    setFormData({
      name: p.name,
      category:
        p.category || "Maishiy kimyo",
      price: p.price,
      stock: p.stock,
      image: p.image || "??",
    });

    setIsModalOpen(true);
  };

  /* =====================================================
     DELETE MODAL
  ===================================================== */

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();

    setProductToDeleteId(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteProduct = () => {
    if (productToDeleteId !== null) {
      const updated =
        productList.filter(
          (p) =>
            p.id !== productToDeleteId
        );

      setProductList(updated);

      localStorage.setItem(
        "crm_products",
        JSON.stringify(updated)
      );

      setCart((prev) =>
        prev.filter(
          (item) =>
            item.id !== productToDeleteId
        )
      );
    }

    setDeleteModalOpen(false);
    setProductToDeleteId(null);
  };

  const cancelDeleteProduct = () => {
    setDeleteModalOpen(false);
    setProductToDeleteId(null);
  };

  /* =====================================================
     CLOSE PRODUCT MODAL
  ===================================================== */

  const closeProductModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  /* =====================================================
     SAVE PRODUCT
  ===================================================== */

  const handleSaveProduct = (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.price
    ) {
      return;
    }

    if (editingProduct) {
      const updated = productList.map(
        (p) =>
          p.id === editingProduct.id
            ? {
              ...p,
              ...formData,
              name: formData.name.trim(),
              price: Number(
                formData.price
              ),
              stock: Number(
                formData.stock
              ),
            }
            : p
      );

      setProductList(updated);

      localStorage.setItem(
        "crm_products",
        JSON.stringify(updated)
      );
      const editedStock = Math.max(0, Number(formData.stock) || 0);
      setCart((previous) => {
        let remaining = editedStock;
        return previous.map((item) => {
          if (item.id !== editingProduct.id) return item;
          const qty = Math.min(item.qty, remaining);
          remaining -= qty;
          return {
            ...item,
            name: formData.name.trim(),
            price: Number(formData.price),
            image: formData.image,
            qty,
          };
        }).filter((item) => item.qty > 0);
      });
    } else {
      const newProduct = {
        id: Date.now(),
        ...formData,
        name: formData.name.trim(),
        price: Number(formData.price),
        stock:
          Number(formData.stock) || 0,
      };

      const updated = [
        newProduct,
        ...productList,
      ];

      setProductList(updated);

      localStorage.setItem(
        "crm_products",
        JSON.stringify(updated)
      );
    }

    closeProductModal();
  };

  /* =====================================================
     TOTALS
  ===================================================== */

  const subtotal = cart.reduce(
    (sum, c) =>
      sum +
      Number(c.price) *
      Number(c.qty) *
      (1 -
        Number(c.discount || 0) / 100),
    0
  );

  const discountAmt =
    subtotal *
    (Number(globalDiscount) / 100);

  const total = Math.max(
    0,
    subtotal - discountAmt
  );

  const cartCount = cart.reduce(
    (sum, c) => sum + c.qty,
    0
  );

  /* =====================================================
     RECEIPT OPEN
  ===================================================== */

  const handleOpenReceipt = () => {
    if (cart.length === 0) {
      return;
    }

    const trimmedName =
      customerName.trim();

    if (!trimmedName) {
      setCustomerError(
        "Avval mijoz ismini kiriting!"
      );
      return;
    }

    if (customerPhone && !/^\d{9}$/.test(customerPhone)) {
      setCustomerError("Telefon raqamini 9 ta raqam bilan kiriting.");
      return;
    }

    setCustomerError("");

    const now = new Date();

    const receiptId =
      `CHK-${now.getTime()}`;

    const formattedDate =
      now.toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

    setReceiptNumber(receiptId);
    setReceiptDate(formattedDate);

    setReceiptOpen(true);
  };

  /* =====================================================
     CLOSE RECEIPT
  ===================================================== */

  const handleCloseReceipt = () => {
    if (paymentComplete) {
      handleNewSale();
      return;
    }
    setReceiptOpen(false);
  };

  /* =====================================================
     PRINT RECEIPT
  ===================================================== */

  const handlePrintReceipt = () => {
    window.print();
  };

  /* =====================================================
     CHECKOUT
  ===================================================== */

  const handleCheckout = () => {
    if (cart.length === 0) {
      return;
    }

    const trimmedName =
      customerName.trim();

    const trimmedPhone =
      customerPhone.trim();

    if (!trimmedName) {
      setCustomerError(
        "Iltimos, mijoz ismini kiriting!"
      );
      return;
    }

    if (trimmedPhone && !/^\d{9}$/.test(trimmedPhone)) {
      setCustomerError("Telefon raqamini 9 ta raqam bilan kiriting.");
      return;
    }

    setCustomerError("");
    setAddressError("");
    setPaymentAmount("");
    setPaymentMethod("cash");
    setSelectedCardId("");
    setDebtDueDate(getDefaultDebtDueDate());
    setPaymentError("");
    setPaymentComplete(false);
    setPaidAmount(0);
    setPaymentOpen(true);
  };

  const closePayment = () => {
    if (paymentComplete) {
      handleNewSale();
      return;
    }
    setPaymentOpen(false);
    setPaymentError("");
  };

  const confirmPayment = () => {
    if (!paymentOpen || paymentComplete || paymentSubmittingRef.current || cart.length === 0) return;
    const saleTotal = Math.round(total);
    const amount = paymentAmount === ""
      ? saleTotal
      : Math.min(saleTotal, Math.max(0, Number(paymentAmount) || 0));
    if (amount < saleTotal && !debtDueDate) {
      setPaymentError("Qolgan qarzni qaytarish muddatini tanlang.");
      return;
    }
    let receivingCard = null;
    if (amount > 0 && paymentMethod === "card") {
      try {
        receivingCard = resolveReceivingCard(selectedCardId);
      } catch (cause) {
        setPaymentError(cause.message);
        return;
      }
    }
    paymentSubmittingRef.current = true;
    const remainingDebt = Math.max(0, saleTotal - amount);
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const typedAddress = deliveryAddress.trim();

    const checkoutAddresses = addresses.length === 0
      ? typedAddress
        ? [{ id: createAddressId(), name: "Asosiy manzil", address: typedAddress, phone: "" }]
        : []
      : addresses.length === 1
        ? [{ ...addresses[0], address: typedAddress || addresses[0].address }]
        : addresses;
    const primaryAddress = checkoutAddresses[0]?.address || "";

    try {

    /* =================================================
       CUSTOMER
    ================================================= */

    const savedCustomers =
      localStorage.getItem(
        "crm_customers"
      );

    let customersList =
      savedCustomers
        ? JSON.parse(savedCustomers)
        : initialCustomers.map((customer) => ({ ...customer }));

    const existingIndex =
      customersList.findIndex(
        (c) =>
          c.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (trimmedPhone
            ? phoneDigits(c.phone) === trimmedPhone
            : phoneDigits(c.phone) === "")
      );

    let customerId;

    if (existingIndex !== -1) {
      customerId =
        customersList[existingIndex].id;

      const currentDebt = Number(customersList[existingIndex].debt || 0);
      const updatedDebt = currentDebt + remainingDebt;

      customersList[existingIndex] = {
        ...customersList[existingIndex],
        phone: trimmedPhone
          ? `+998 ${trimmedPhone}`
          : customersList[
            existingIndex
          ].phone,
        purchases:
          Number(
            customersList[
              existingIndex
            ].purchases || 0
          ) + cartCount,
        spent:
          Number(
            customersList[
              existingIndex
            ].spent || 0
          ) + saleTotal,
        debt: updatedDebt,
        status: updatedDebt > 0 && customersList[existingIndex].status !== "vip"
          ? "debtor"
          : customersList[existingIndex].status,
        lastPurchase:
          new Date()
            .toISOString()
            .split("T")[0],
        address: primaryAddress,
      };
    } else {
      customerId = Date.now();

      const newCustomer = {
        id: customerId,
        name: trimmedName,
        phone: trimmedPhone
          ? `+998 ${trimmedPhone}`
          : "Ko'rsatilmagan",
        region: "Toshkent",
        status: remainingDebt > 0 ? "debtor" : "active",
        purchases: cartCount,
        spent: saleTotal,
        debt: remainingDebt,
        lastPurchase:
          new Date()
            .toISOString()
            .split("T")[0],
        address: primaryAddress,
      };

      customersList.unshift(
        newCustomer
      );
    }

    localStorage.setItem(
      "crm_customers",
      JSON.stringify(customersList)
    );

    /* =================================================
       RECEIPT NUMBER
    ================================================= */

    const now = new Date();

    const saleReceiptNumber =
      receiptNumber ||
      `CHK-${now.getTime()}`;

    /* =================================================
       SALE OBJECT
    ================================================= */

    const sale = {
      id: `S-${now.getTime()}`,

      receiptNumber:
        saleReceiptNumber,

      customerId,
      customer: trimmedName,
      products: cart.length,
      productIds: cart.map((item) => item.id),
      amount: saleTotal,
      paidAmount: amount,
      initialPaidAmount: amount,
      debtBalance: remainingDebt,
      debtDueDate: remainingDebt > 0 ? debtDueDate : "",
      status: amount === 0 ? "debt" : remainingDebt > 0 ? "partial" : "paid",
      payment: amount === 0 ? "Qarz" : paymentMethod === "card" ? "Karta" : "Naqd",
      receivingCard,
      cardLast4: receivingCard?.number.slice(-4) || "",

      customerName: trimmedName,

      customerPhone: trimmedPhone
        ? `+998 ${trimmedPhone}`
        : "Ko'rsatilmagan",

      deliveryAddress: primaryAddress,
      deliveryAddresses: checkoutAddresses.map((address) => ({
        ...address,
        productCount: cart.filter((item) => item.addressId === address.id).length,
      })),

      items: cart.map((item) => ({
        id: item.id,
        addressId: item.addressId || checkoutAddresses[0]?.id || null,
        deliveryAddress: checkoutAddresses.find(
          (address) => address.id === item.addressId
        )?.address || primaryAddress,
        name: item.name,
        price: Number(item.price),
        qty: Number(item.qty),
        total:
          Number(item.price) *
          Number(item.qty),
      })),

      subtotal: Number(subtotal),

      discountPercent:
        Number(globalDiscount),

      discountAmount:
        Number(discountAmt),

      total: saleTotal,

      paymentMethod: amount === 0 ? "Qarz" : paymentMethod === "card" ? "Karta" : "Naqd",

      date:
        now.toISOString(),

      formattedDate:
        now.toLocaleString("uz-UZ"),
    };

    /* =================================================
       SAVE SALES
    ================================================= */

    const savedSales =
      localStorage.getItem(
        "crm_sales"
      );

    let salesList =
      savedSales
        ? JSON.parse(savedSales)
        : [];

    salesList.unshift(sale);

    localStorage.setItem(
      "crm_sales",
      JSON.stringify(salesList)
    );

    /* =================================================
       UPDATE PRODUCTS STOCK
    ================================================= */

    const updatedProducts =
      productList.map((p) => {
        const purchasedQty = cart
          .filter((item) => item.id === p.id)
          .reduce((sum, item) => sum + Number(item.qty), 0);

        if (purchasedQty > 0) {
          return {
            ...p,
            stock: Math.max(
              0,
              Number(p.stock) - purchasedQty
            ),
          };
        }

        return p;
      });

    localStorage.setItem(
      "crm_products",
      JSON.stringify(updatedProducts)
    );
    setProductList(updatedProducts);
    setCompletedSale(sale);
    } catch {
      paymentSubmittingRef.current = false;
      setPaymentError("To'lovni saqlab bo'lmadi. Qayta urinib ko'ring.");
      return;
    }

    /* =================================================
       SHOW SUCCESS
    ================================================= */

    setPaidAmount(amount);
    setPaymentComplete(true);
    setShowPaymentAnimation(true);
    if (paymentSoundRef.current) {
      paymentSoundRef.current.currentTime = 0;
      paymentSoundRef.current.play().catch(() => {});
    }
    setPaymentError("");
    clearTimeout(paymentTimerRef.current);
    paymentTimerRef.current = setTimeout(() => {
      setShowPaymentAnimation(false);
      setReceiptOpen(true);
    }, 2000);
  };

  /* =====================================================
     NEW SALE
  ===================================================== */

  const handleNewSale = () => {
    setCompletedSale(null);
    clearTimeout(paymentTimerRef.current);
    if (paymentSoundRef.current) {
      paymentSoundRef.current.pause();
      paymentSoundRef.current.currentTime = 0;
    }
    paymentSubmittingRef.current = false;
    if (productsGridRef.current) productsGridRef.current.scrollTop = 0;
    setCart([]);

    setCustomerName("");
    setCustomerPhone("");
    setCustomerError("");
    setDeliveryAddress("");
    setAddresses([]);
    setSelectedAddressId(null);
    setAddressConfirmed(false);
    setAddressError("");

    setGlobalDiscount(0);

    setReceiptOpen(false);

    setReceiptNumber("");
    setReceiptDate("");

    setPaymentOpen(false);
    setPaymentComplete(false);
    setShowPaymentAnimation(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setSelectedCardId("");
    setPaymentError("");
    setPaidAmount(0);
  };

  /* =====================================================
     CART PROPS
  ===================================================== */

  const cartPanelProps = {
    cart,

    customerName,
    setCustomerName,

    customerPhone,
    setCustomerPhone,

    addresses,
    selectedAddressId,
    setSelectedAddressId,
    addDeliveryAddress,
    confirmDeliveryAddresses,
    moveItemToAddress,

    deliveryAddress,
    setDeliveryAddress,
    addressConfirmed,
    setAddressConfirmed,
    addressError,
    setAddressError,

    updateQty,
    setExactQty,
    removeItem,
    clearCart,

    globalDiscount,
    setGlobalDiscount,

    subtotal,
    discountAmt,
    total,

    handleCheckout,
    handleOpenReceipt,

    customerError,
    paymentOpen,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    selectedCardId,
    setSelectedCardId,
    debtDueDate,
    setDebtDueDate,
    paymentError,
    setPaymentError,
    paymentComplete,
    paidAmount,
    confirmPayment,
    closePayment,
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div className="pos-container pos-split-layout">
      {quickAddProduct && (
        <ProductQuickAddModal
          product={quickAddProduct}
          suppliers={suppliers}
          quantity={quickAddQuantity}
          onQuantityChange={setQuickAddQuantity}
          onAdd={confirmQuickAdd}
          onClose={() => setQuickAddProduct(null)}
        />
      )}

      {/* =================================================
          PRODUCTS SECTION
      ================================================= */}

      <div className="pos-products-section" inert={paymentOpen || (compactCart && cartWindowOpen)}>

        <div className="pos-header">
          <h1 className="pos-title">
            {tx(text(
              "title",
              "Yangi Sotuv"
            ))}
          </h1>

          <p className="pos-subtitle">
            {tx(text(
              "subtitle",
              "Mahsulot tanlang va savatchaga qo'shing"
            ))}
          </p>
          {addresses.length > 1 && selectedAddressId && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>
              {tx("Mahsulotlar tanlangan manzil uchun qo'shiladi: ")}
              {tx(addresses.find((address) => address.id === selectedAddressId)?.name || "")}
            </div>
          )}
        </div>

        {/* SEARCH */}

        <div className="pos-search-wrapper">

          <div className="pos-search-box">
            <FiSearch
              size={18}
              className="pos-search-icon"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder={tx("Mahsulot qidirish...")}
              className="pos-search-input"
              style={{
                outline: "none",
              }}
            />
          </div>

        </div>

        {/* =================================================
            PRODUCTS
        ================================================= */}

        <div className="pos-products-grid" ref={productsGridRef} tabIndex={0} aria-label={tx("Mahsulotlar ro'yxati")}>

          {filtered.length === 0 ? (
            <div className="pos-no-results">

              <FiSearch size={30} />

              <p>{tx("Mahsulot topilmadi")}</p>

            </div>
          ) : (
            filtered.map((p) => {

              const inCart =
                cart.find(
                  (c) =>
                    c.id === p.id
                );

              const isOutOfStock =
                Number(p.stock) === 0;

              return (
                <div
                  key={p.id}
                  onClick={() => openQuickAdd(p)}
                  className={`product-card ${inCart
                    ? "in-cart"
                    : ""
                    } ${isOutOfStock
                      ? "out-of-stock"
                      : ""
                    }`}
                  role="button"
                  tabIndex={0}
                  aria-label={tx(`${p.name} tafsilotlarini ochish`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openQuickAdd(p);
                    }
                  }}
                >

                  <div className="product-card-body">

                    <div className="pos-product-head">
                      <div className="product-name">
                        {p.name}
                      </div>
                      <span
                        className={`pos-product-stock ${p.stock < 5
                          ? "low-stock"
                          : ""
                          }`}
                      >
                        {tx(isOutOfStock ? "Tugagan" : `${p.stock} dona`)}
                      </span>
                    </div>

                    <div className="product-category">{tx(p.category || "Mahsulot")}</div>

                    <div className="product-footer">

                      <span className="product-price">
                        {formatCurrency(p.price)}</span>

                    </div>

                    <button
                      type="button"
                      className="pos-product-add-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openQuickAdd(p);
                      }}
                    >
                      <FiShoppingCart size={17} />{tx("Savatga qo'shish")}</button>

                    {/* CARD ACTIONS */}

                    <div className="product-card-actions">

                      <button
                        type="button"
                        className="card-action-btn edit"
                        onClick={(e) =>
                          handleOpenEditModal(
                            e,
                            p
                          )
                        }
                        title={tx("Tahrirlash")}
                      >
                        <FiEdit2
                          size={13}
                        />
                      </button>

                      <button
                        type="button"
                        className="card-action-btn delete"
                        onClick={(e) =>
                          handleDeleteClick(
                            e,
                            p.id
                          )
                        }
                        title={tx("O'chirish")}
                      >
                        <FiTrash2
                          size={13}
                        />
                      </button>

                    </div>

                  </div>

                </div>
              );
            })
          )}

        </div>

      </div>

      <button
        ref={cartToggleRef}
        type="button"
        className="pos-cart-launcher"
        onClick={() => onCartWindowChange?.(true)}
        aria-expanded={cartWindowOpen}
        aria-controls="pos-cart-window"
        inert={compactCart && cartWindowOpen}
      >
        <FiShoppingCart size={22} />
        <span>{tx("Savatcha ")}<small>({tx(cart.length)})</small></span>
        <strong>{formatCurrency(total)}</strong>
      </button>

      <div
        id="pos-cart-window"
        className={"pos-cart-window" + (cartWindowOpen ? " is-open" : "") + (paymentOpen ? " is-paying" : "")}
        role={compactCart ? "region" : undefined}
        aria-label={tx(compactCart ? "Savatcha va buyurtma" : undefined)}
      >
        <div className="pos-cart-window-body" ref={cartWindowBodyRef}>
          <CartPanelContent {...cartPanelProps} />
        </div>
      </div>

      {/* =================================================
          ADD / EDIT PRODUCT MODAL
      ================================================= */}

      {isModalOpen && (
        createPortal(
        <div className="crm-content-modal pos-container">

          <div
            className="pos-modal-content"
            style={{
              borderRadius: "16px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >

            <h2 className="pos-modal-title">

              {tx(editingProduct
                ? "Mahsulotni tahrirlash"
                : "Yangi mahsulot qo'shish")}

            </h2>

            <form
              onSubmit={
                handleSaveProduct
              }
              className="pos-modal-form"
            >

              <div className="form-group">

                <label>{tx("Nomi")}</label>

                <input
                  type="text"
                  required
                  value={
                    formData.name
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target
                        .value,
                    })
                  }
                  placeholder={tx("Mahsulot nomi")}
                  className="modal-input"
                  style={{
                    outline: "none",
                  }}
                />

              </div>

              <div className="form-group">

                <label>{tx("Narxi (so'm)")}</label>

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
                  placeholder={tx("10000")}
                  className="modal-input"
                  style={{
                    outline: "none",
                  }}
                />

              </div>

              <div className="form-group">

                <label>{tx("Soni (dona)")}</label>

                <input
                  type="number"
                  required
                  min="0"
                  value={
                    formData.stock
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: e.target
                        .value,
                    })
                  }
                  placeholder={tx("10")}
                  className="modal-input"
                  style={{
                    outline: "none",
                  }}
                />

              </div>

              <div className="modal-buttons">

                <button
                  type="button"
                  onClick={
                    closeProductModal
                  }
                  className="modal-btn cancel"
                >{tx("Bekor qilish")}</button>

                <button
                  type="submit"
                  className="modal-btn save"
                >{tx("Saqlash")}</button>

              </div>

            </form>

          </div>

        </div>,
        document.getElementById("main-modal-root")
      )
      )}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteModalOpen && (
        createPortal(
        <div className="crm-content-modal pos-container">

          <div
            className="pos-modal-content delete-confirm-box"
            style={{
              borderRadius: "16px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >

            <div className="pos-delete-icon-wrap">
              <FiAlertTriangle
                size={32}
              />
            </div>

            <h2>{tx("O'chirishni tasdiqlang")}</h2>

            <p>{tx("Haqiqatan ham ushbu mahsulotni o'chirmoqchimisiz?")}</p>

            <div className="modal-buttons delete-modal-btns">

              <button
                type="button"
                onClick={
                  cancelDeleteProduct
                }
                className="modal-btn cancel"
              >{tx("Yo'q")}</button>

              <button
                type="button"
                onClick={
                  confirmDeleteProduct
                }
                className="modal-btn delete-confirm"
              >{tx("Ha, o'chirish")}</button>

            </div>

          </div>

        </div>,
        document.getElementById("main-modal-root")
      )
      )}

      {/* =================================================
          RECEIPT MODAL
      ================================================= */}

      {receiptOpen && (
        <div
          className="receipt-modal-overlay"
          id="receipt-modal"
        >

          <div className="receipt-modal">

            {/* HEADER */}

            <div className="receipt-modal-header">

              <div>
                <h2>{tx("Chek")}</h2>

                <span>{tx("Sotuv cheki")}</span>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseReceipt
                }
                className="receipt-close-btn"
              >
                <FiX size={20} />
              </button>

            </div>

            {/* =================================================
                PRINT PAPER
            ================================================= */}

            <div
              className="receipt-paper"
              id="receipt-print"
            >

              <div className="receipt-shop-header">

                <h1>{tx("CRM DO'KON")}</h1>

                <p>{tx("Sotuv cheki")}</p>

                <div className="receipt-line" />

              </div>

              {/* DATE */}

              <div className="receipt-meta">

                <div>
                  <span>{tx("Chek raqami")}</span>

                  <strong>
                    {completedSale?.receiptNumber || receiptNumber}
                  </strong>
                </div>

                <div>
                  <span>{tx("Sana")}</span>

                  <strong>
                    {tx(completedSale?.formattedDate || receiptDate)}
                  </strong>
                </div>

              </div>

              {/* CUSTOMER */}

              <div className="receipt-customer">

                <div className="receipt-section-title">
                  <FiUser size={15} />
                  <span>{tx("Mijoz")}</span>
                </div>

                <div className="receipt-customer-row">

                  <span>{tx("Ism:")}</span>

                  <strong>
                    {completedSale?.customerName || customerName || tx("Ko'rsatilmagan")}
                  </strong>

                </div>

                <div className="receipt-customer-row">

                  <span>{tx("Telefon:")}</span>

                  <strong>
                    {tx(completedSale?.customerPhone || (customerPhone ? `+998 ${customerPhone}` : "Ko'rsatilmagan"))}
                  </strong>

                </div>

              </div>

              <div className="receipt-line" />

              {/* PRODUCTS */}

              <div className="receipt-products">

                <div className="receipt-products-title">{tx("Mahsulotlar")}</div>

                {(completedSale?.items || cart).map(
                  (item, index) => (
                    <div
                      key={item.cartKey || `${item.id}:${index}`}
                      className="receipt-product"
                    >

                      <div className="receipt-product-top">

                        <span className="receipt-product-number">
                          {tx(index + 1)}.
                        </span>

                        <strong>
                          {item.name}
                        </strong>

                      </div>

                      <div className="receipt-product-bottom">

                        <span>
                          {tx(item.qty)}{tx(" dona ?")}{" "}
                          {formatCurrency(item.price)}</span>

                        <strong>
                          {formatCurrency((
                            Number(
                              item.price
                            ) *
                            Number(
                              item.qty
                            )
                          ))}</strong>

                      </div>

                    </div>
                  )
                )}

              </div>

              <div className="receipt-line" />

              {/* TOTALS */}

              <div className="receipt-summary">

                <div className="receipt-summary-row">

                  <span>{tx("Mahsulotlar jami")}</span>

                  <strong>
                    {formatCurrency(completedSale?.subtotal ?? subtotal)}</strong>

                </div>

                {(completedSale?.discountPercent ?? globalDiscount) > 0 && (
                  <div className="receipt-summary-row discount">

                    <span>{tx("Chegirma")}{" "}
                      ({tx(completedSale?.discountPercent ?? globalDiscount)}%)
                    </span>

                    <strong>
                      -{formatCurrency(completedSale?.discountAmount ?? discountAmt)}</strong>

                  </div>
                )}

                <div className="receipt-total-row">

                  <span>{tx("JAMI TO'LOV")}</span>

                  <strong>
                    {formatCurrency(completedSale?.total ?? total)}</strong>

                </div>

              </div>

              <div className="receipt-line" />

              <ReceiptPaymentDetails sale={completedSale} />

              {/* FOOTER */}

              <div className="receipt-footer">

                <p>{tx("Xaridingiz uchun rahmat!")}</p>

                <span>{tx("CRM DO'KON")}</span>

              </div>

            </div>

            {/* =================================================
                RECEIPT BUTTONS
            ================================================= */}

            <div className="receipt-modal-actions">

              <button
                type="button"
                onClick={
                  handleCloseReceipt
                }
                className="receipt-action-close"
              >{tx("Yopish")}</button>

              <button
                type="button"
                onClick={
                  handlePrintReceipt
                }
                className="receipt-action-print"
              >
                <FiPrinter
                  size={17}
                />{tx("Chekni chiqarish")}</button>

            </div>

          </div>

        </div>
      )}

      {showPaymentAnimation && createPortal(
        <PaymentSuccessAnimation
          amount={paidAmount}
          remainingDebt={Math.max(0, Math.round(total) - paidAmount)}
        />,
        document.getElementById("main-modal-root") || document.body
      )}

    </div>
  );
}
