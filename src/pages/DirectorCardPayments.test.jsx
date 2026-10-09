import React, { act } from "react";
import { createRoot } from "react-dom/client";
import POS from "./POS";
import Settings from "./Settings";
import { LanguageProvider } from "../context/LanguageContext";
import { ToastProvider } from "../context/ToastContext";
import { ThemeProvider } from "../context/ThemeContext";
import { saveDirectorCards } from "../data/directorCards";
import { setTextLanguage } from "../locales/translateText";
import ReceiptPaymentDetails from "../components/ReceiptPaymentDetails";

let host, root;
const card = { id: "card-test", label: "Main", holder: "Test Director", number: "8600000000000001" };
const mount = async (page) => act(async () => root.render(<ThemeProvider><LanguageProvider><ToastProvider>{page}</ToastProvider></LanguageProvider></ThemeProvider>));
const click = async (element) => {
  expect(element).not.toBeNull();
  await act(async () => element.click());
};
const setValue = async (element, value) => {
  expect(element).not.toBeNull();
  const proto = element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  setTextLanguage("uz");
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  Element.prototype.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = jest.fn();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  jest.useRealTimers();
});

test("director settings save a receiving card and employees cannot manage cards", async () => {
  await mount(<Settings user={{ type: "director" }} />);
  await click([...host.querySelectorAll("button")].find((button) => button.textContent.includes("Karta qo'shish")));
  const form = host.querySelector(".director-card-form");
  const inputs = form.querySelectorAll("input");
  await setValue(inputs[0], "Main");
  await setValue(inputs[1], "Test Director");
  await setValue(inputs[2], card.number);
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(JSON.parse(localStorage.getItem("crm_director_cards_v1"))[0].number).toBe(card.number);
  expect(host.querySelector(".director-card-number").textContent).toBe("8600 0000 0000 0001");
  await mount(<Settings user={{ type: "employee", id: 9 }} />);
  expect(host.querySelector(".director-cards")).toBeNull();
});

test("partial card checkout stores the receiving card, correct debt, and printable receipt", async () => {
  saveDirectorCards([card], { type: "director" });
  localStorage.setItem("crm_products", JSON.stringify([{ id: 1, name: "Test product", price: 100, cost: 50, stock: 10, category: "Test" }]));
  localStorage.setItem("crm_pos_draft", JSON.stringify({ cart: [{ id: 1, name: "Test product", price: 100, qty: 1, cartKey: "1:a" }], customerName: "Test customer", customerPhone: "901234567" }));
  await mount(<POS />);
  await click(host.querySelector(".checkout-btn"));
  await setValue(host.querySelector('[aria-label="To\'lanadigan summa"]'), "40");
  await click([...host.querySelectorAll(".pos-payment-choices button")].find((button) => button.textContent.includes("Karta")));
  await click(host.querySelector(".pos-payment-submit"));
  expect(localStorage.getItem("crm_sales")).toBeNull();
  await setValue(host.querySelector(".receiving-card-select select"), card.id);
  await click(host.querySelector(".pos-payment-submit"));
  const saved = JSON.parse(localStorage.getItem("crm_sales"));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ initialPaidAmount: 40, debtBalance: 60, payment: "Karta", status: "partial", receivingCard: card });
  expect(JSON.parse(localStorage.getItem("crm_products"))[0].stock).toBe(9);
  await act(async () => jest.advanceTimersByTime(2100));
  const receipt = host.querySelector("#receipt-print");
  expect(receipt.textContent).toContain("8600 0000 0000 0001");
  expect(receipt.textContent).toContain("Kartaga to'landi: 40");
  expect(receipt.textContent).toContain("Qarzga rasmiylashtirildi: 60");
  expect(receipt.textContent).not.toContain("Naqd to'landi");
  await act(async () => saveDirectorCards([], { type: "director" }));
  expect(receipt.textContent).toContain("8600 0000 0000 0001");
  await click(host.querySelector(".receipt-action-close"));
  expect(host.querySelector("#receipt-print")).toBeNull();
  expect(JSON.parse(localStorage.getItem("crm_sales"))).toHaveLength(1);
});

test.each([
  [{ amount: 100, initialPaidAmount: 100, receivingCard: card }, "Kartaga to'landi: 100", "To'liq to'landi"],
  [{ amount: 100, initialPaidAmount: 40 }, "Naqd to'landi: 40", "Qarzga rasmiylashtirildi: 60"],
  [{ amount: 100, initialPaidAmount: 0 }, "To'lov qabul qilinmagan", "Qarzga rasmiylashtirildi: 100"],
])("receipts distinguish card, cash, and debt", async (sale, paid, balance) => {
  await mount(<ReceiptPaymentDetails sale={sale} />);
  expect(host.textContent).toContain(paid);
  expect(host.textContent).toContain(balance);
});
