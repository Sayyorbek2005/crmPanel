export const returnKeyFor = (saleId, itemId, index) => `${saleId}:${itemId ?? "item"}:${index}`;
export const returnedQuantityFor = (records, key, quantity) => Math.min(quantity, records
  .filter((record) => record.returnKey === key && record.status === "approved")
  .reduce((sum, record) => sum + Number(record.quantity ?? quantity), 0));

export { startsWithCapital } from "./posHelpers";
