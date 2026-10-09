import { readDirectorCards, resolveReceivingCard, saveDirectorCards, recordedCardTotal } from "./directorCards";
import { activateTenantStorage } from "../super-admin/tenantStorage";

const director = { type: "director" };
const card = { id: "card-1", label: "Main", holder: "Test Director", number: "8600000000000001" };
beforeEach(() => localStorage.clear());

test("only directors can save cards; duplicate and incomplete numbers are rejected", () => {
  expect(() => saveDirectorCards([card], { type: "employee" })).toThrow();
  expect(() => saveDirectorCards([{ ...card, number: "123" }], director)).toThrow();
  expect(() => saveDirectorCards([card, { ...card, id: "other" }], director)).toThrow();
  expect(readDirectorCards()).toEqual([]);
});

test("unlimited cards persist and deleted cards cannot be selected for a new payment", () => {
  const cards = Array.from({ length: 7 }, (_, index) => ({ ...card, id: String(index), number: `860000000000000${index}` }));
  saveDirectorCards(cards, director);
  expect(readDirectorCards()).toHaveLength(7);
  const snapshot = resolveReceivingCard("0");
  saveDirectorCards(cards.slice(1), director);
  expect(() => resolveReceivingCard("0")).toThrow();
  expect(snapshot.number).toBe("8600000000000000");
});

test("card totals count actual initial and debt payments without counting outstanding debt twice", () => {
  const sale = { receivingCard: card, initialPaidAmount: 40, paidAmount: 70, amount: 100 };
  const debtPayment = { receivingCard: card, saleId: "sale", amount: 30 };
  expect(recordedCardTotal(card, [sale], [debtPayment, { saleId: "sale", amount: 10, method: "Naqd" }])).toBe(70);
});

test("tenant cards remain isolated", () => {
  try {
    activateTenantStorage("card-test-a");
    saveDirectorCards([card], director);
    activateTenantStorage("card-test-b");
    expect(readDirectorCards()).toEqual([]);
    activateTenantStorage("card-test-a");
    expect(readDirectorCards()[0].id).toBe(card.id);
  } finally {
    activateTenantStorage("");
  }
});
