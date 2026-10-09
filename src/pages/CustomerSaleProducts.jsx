import { translateText as tx } from "../locales/translateText";
import { useLanguage as useUILanguage } from "../context/LanguageContext";
import { MapPin, CheckCircle, RotateCcw } from "lucide-react";
import { products as catalogProducts } from "../data/mockData";
import { returnKeyFor, returnedQuantityFor } from './customerDetailHelpers';

export function SaleProductList({ sale, returnRecords = [], onReturn = () => {} }) {
  useUILanguage();
  const count = Number(sale.products) || 0;
  const items = sale.items?.length
    ? sale.items.map((item) => ({
        ...item,
        name: item.name || "Nomi kiritilmagan mahsulot",
        deliveryAddress: item.deliveryAddress || sale.deliveryAddress || "Manzil biriktirilmagan",
      }))
    : (sale.productIds || [])
      .slice(0, count)
      .map((id) => catalogProducts.find((product) => product.id === id))
      .filter(Boolean)
      .map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        quantityUnknown: true,
        deliveryAddress: sale.deliveryAddress || "Manzil biriktirilmagan",
      }));
  const missing = Math.max(0, count - items.length);

  return (
    <div className="customer-sale-products">
      <strong>{tx(count)}{tx(" xil mahsulot")}</strong>
      {items.length > 0 && (
        <div className="customer-sale-product-list">
          {items.map((item, index) => {
            const returnKey = returnKeyFor(sale.id, item.id, index);
            const quantity = Number(item.qty || 1);
            const returnedQuantity = item.returned ? quantity : returnedQuantityFor(returnRecords, returnKey, quantity);
            const isReturned = returnedQuantity >= quantity;
            return (
              <div className="customer-sale-product-item" key={returnKey}>
                <div className="customer-sale-product-info">
                  <strong>{item.name}</strong>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    {item.quantityUnknown ? tx("Miqdor kiritilmagan") : <>{tx("Sotib olingan")}: {quantity.toLocaleString("uz-UZ")} {tx("dona")}</>}
                  </span>
                  {returnedQuantity > 0 && <span>{tx("Qaytarilgan")}: {returnedQuantity.toLocaleString("uz-UZ")} {tx("dona")}</span>}
                  <span><MapPin size={14} /> {tx(item.deliveryAddress)}</span>
                </div>
                <button
                  type="button"
                  className={`customer-product-return ${isReturned ? "is-requested" : ""}`}
                  onClick={() => onReturn(sale, item, index)}
                  disabled={isReturned}
                >
                  {isReturned ? <CheckCircle size={14} /> : <RotateCcw size={14} />}
                  {tx(isReturned ? "Qaytarilgan" : "Tovarni qaytarish")}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {missing > 0 && <span>{tx(missing)}{tx(" ta mahsulot nomi kiritilmagan")}</span>}
    </div>
  );
}
