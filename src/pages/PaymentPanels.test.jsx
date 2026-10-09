import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { PosPaymentPanel } from "./PosPaymentPanel";
import { DebtPaymentModal } from "./CustomerDebtPaymentModal";
import { setTextLanguage } from "../locales/translateText";

let host;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  setTextLanguage("uz");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

const paymentProps = () => ({
  cart: [{ cartKey: "1:a", name: "Test product", price: 100, qty: 1 }],
  total: 100,
  paymentAmount: "",
  setPaymentAmount: jest.fn(),
  method: "cash",
  setMethod: jest.fn(),
  cardForm: { number: "", firstName: "", lastName: "" },
  setCardForm: jest.fn(),
  debtDueDate: "2026-11-01",
  setDebtDueDate: jest.fn(),
  error: "",
  setError: jest.fn(),
  completed: false,
  paidAmount: 0,
  onConfirm: jest.fn(),
  onClose: jest.fn(),
});

test("partial POS payments show the remaining debt and require a due date", async () => {
  const props = { ...paymentProps(), paymentAmount: "40" };
  await act(async () => root.render(<PosPaymentPanel {...props} />));
  expect(host.querySelector(".pos-payment-calculation strong").textContent).toContain("60");
  expect(host.querySelector('input[type="date"]').required).toBe(true);
  expect(host.querySelector('input[type="date"]').disabled).toBe(false);
  await act(async () => host.querySelector(".pos-payment-submit").click());
  expect(props.onConfirm).toHaveBeenCalledTimes(1);

  await act(async () => root.render(<PosPaymentPanel {...props} paymentAmount="" />));
  expect(host.querySelector('input[type="date"]').disabled).toBe(true);
});

test("POS payment details can collapse and completed payments cannot submit again", async () => {
  const props = paymentProps();
  await act(async () => root.render(<PosPaymentPanel {...props} />));
  expect(host.querySelector("ol").textContent).toContain("Test product");
  await act(async () => host.querySelector("button[aria-expanded]").click());
  expect(host.querySelector("ol")).toBeNull();
  await act(async () => root.render(<PosPaymentPanel {...props} completed paidAmount={100} />));
  expect(host.querySelector(".pos-payment-submit")).toBeNull();
  expect(host.querySelector('[role="status"]')).not.toBeNull();
  expect(host.querySelector("input").disabled).toBe(true);
  expect(props.onConfirm).not.toHaveBeenCalled();
});

test("customer debt payments cap the amount at the outstanding balance", async () => {
  const props = {
    ...paymentProps(),
    sale: { id: "S-test", amount: 100, debtBalance: 60, paidAmount: 40, products: 1, items: [{ name: "Test product" }] },
    paymentAmount: "999",
    onSubmit: jest.fn(),
  };
  await act(async () => root.render(<DebtPaymentModal {...props} />));
  expect(host.querySelector("input").value).toBe("60");
  expect(host.querySelector(".customer-payment-selected small").textContent).toContain("0");
  await act(async () => host.querySelector(".customer-payment-submit").click());
  expect(props.onSubmit).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<DebtPaymentModal {...props} completed />));
  expect(host.querySelector(".customer-payment-submit").disabled).toBe(true);
});

test("card payments require a configured receiving card", async () => {
  const props = {
    ...paymentProps(),
    method: "card",
    selectedCardId: "",
    setSelectedCardId: jest.fn(),
    sale: { id: "S-test", amount: 100, debtBalance: 60, products: 0 },
    onSubmit: jest.fn(),
  };
  await act(async () => root.render(<DebtPaymentModal {...props} />));
  expect(host.querySelector("select").disabled).toBe(true);
  expect(host.textContent).toContain("Direktor hali karta qo'shmagan");
});
