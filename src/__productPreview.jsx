import React from "react";
import { createRoot } from "react-dom/client";
import POS from "./pages/POS";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles/global.css";
import "./App.css";
if (new URLSearchParams(location.search).has("seed")) {
  localStorage.setItem("crm_products", JSON.stringify([{ id: "p-1", name: "Yog'och rangi emal bo'yoq 2.5L", category: "Qurilish mollari", brand: "ColorLux", sku: "CL-250", price: 145000, cost: 90000, stock: 37, image: "🎨", supplierId: 1, supplierName: "ColorLux Ta'minot" }]));
  localStorage.setItem("crm_suppliers", JSON.stringify([{ id: 1, name: "ColorLux Ta'minot" }]));
  localStorage.setItem("crm_supplier_receipts", JSON.stringify([{ id: "r-1", supplierId: 1, supplier: "ColorLux Ta'minot", date: "2026-10-04T10:30:00.000Z", products: [{ id: "p-1", quantity: 24, cost: 90000 }] }]));
  localStorage.setItem("crm_pos_draft", JSON.stringify({ customerName: "Sinov mijoz", cart: [] }));
}
createRoot(document.getElementById("root")).render(<ThemeProvider><LanguageProvider><ToastProvider><div style={{position:"relative",height:"100vh",overflow:"hidden"}}><POS/><div id="main-modal-root" style={{position:"absolute",inset:0,zIndex:100,pointerEvents:"none"}}/></div></ToastProvider></LanguageProvider></ThemeProvider>);
