import { products as initialProducts } from "./mockData";

export const readStockProducts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("crm_products") || "null");
    return Array.isArray(saved) ? saved : initialProducts;
  } catch {
    return initialProducts;
  }
};

export const stockMinimum = (product) => {
  const minimum = Number(product.minStock ?? product.minimumStock);
  return Number.isFinite(minimum) && minimum > 0 ? minimum : 10;
};

export const stockAlerts = (products) => products
  .map((product) => {
    const current = Math.max(0, Number(product.stock) || 0);
    const minimum = stockMinimum(product);
    return {
      id: product.id,
      name: product.name,
      current,
      minimum,
      status: current === 0 ? "critical" : current < minimum ? "low" : "ok",
    };
  })
  .filter((item) => item.status !== "ok")
  .sort((a, b) => a.current - b.current);
