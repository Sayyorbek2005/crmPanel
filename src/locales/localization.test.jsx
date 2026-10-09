import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import { ToastProvider } from "../context/ToastContext";
import { translateText, setTextLanguage } from "./translateText";
import Customers from "../pages/Customers";
import Sales from "../pages/Sales";
import Products from "../pages/Products";
import Finance from "../pages/Finance";
import Employees from "../pages/Employees";
import Suppliers from "../pages/Suppliers";
import Inventory from "../pages/Inventory";
import Returns from "../pages/Returns";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Ustolar from "../pages/ustolar";
import Dashboard from "../pages/Dashboard";
import CustomerDetail from "../pages/CustomerDetail";
import ProductDetail from "../pages/ProductDetail";
import EmployeeDetail from "../pages/EmployeeDetail";
import SupplierDetail from "../pages/SupplierDetail";
import DebtManagement from "../pages/DebtManagement";
import DebtDetail from "../pages/DebtDetail";
import Notifications from "../pages/Notifications";
import POS from "../pages/POS";

// Charts need layout measurements unavailable in jsdom; page text and controls stay real.
jest.mock("recharts", () => {
  const React = require("react");
  const chart = ({children}) => React.createElement("svg", null, children);
  return Object.fromEntries(["ResponsiveContainer","AreaChart","Area","LineChart","Line","BarChart","Bar","PieChart","Pie","Cell","XAxis","YAxis","Tooltip","CartesianGrid","Legend"].map(name=>[name, chart]));
});
let root, host, changeLanguage;
function Switcher({children}) { changeLanguage=useLanguage().setLang; return children; }
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT=true;
  localStorage.clear(); sessionStorage.clear(); setTextLanguage("uz");
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  Element.prototype.scrollIntoView=jest.fn(); Element.prototype.scrollTo=jest.fn(); HTMLMediaElement.prototype.pause=jest.fn();
  host=document.createElement("div");document.body.appendChild(host);
  const portal=document.createElement("div");portal.id="main-modal-root";document.body.appendChild(portal);
  root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();document.getElementById("main-modal-root")?.remove();});
const render=async page=>act(async()=>root.render(<LanguageProvider><Switcher><ToastProvider>{page}</ToastProvider></Switcher></LanguageProvider>));
const change=async lang=>act(async()=>changeLanguage(lang));
const noop=()=>{};
test.each([
  ["clients",<Customers onNavigate={noop}/> ,"Клиенты"],
  ["sales",<Sales onNavigate={noop}/> ,"Продажи"],
  ["products",<Products onNavigate={noop}/> ,"Товары"],
  ["finance",<Finance/> ,"Финансы"],
  ["employees",<Employees onNavigate={noop}/> ,"Сотрудники"],
  ["suppliers",<Suppliers onNavigate={noop}/> ,"Поставщики"],
  ["inventory",<Inventory/> ,"Управление складом"],
  ["returns",<Returns/> ,"Возвращённые товары"],
  ["reports",<Reports/> ,"Отчёты"],
  ["settings",<Settings user={{type:"director"}}/> ,"Настройки"],
  ["masters",<Ustolar/> ,"Команда мастеров"],
  ["dashboard",<Dashboard onNavigate={noop}/> ,"сегодня"],
  ["customer detail",<CustomerDetail customerId={1} onBack={noop}/> ,"Профиль клиента"],
  ["product detail",<ProductDetail productId={1} onBack={noop}/> ,"Цена продажи"],
  ["employee detail",<EmployeeDetail employeeId={1} onBack={noop}/> ,"Профиль сотрудника"],
  ["supplier detail",<SupplierDetail supplierId={1} onBack={noop}/> ,"Профиль поставщика"],
  ["debt",<DebtManagement/> ,"Управление задолженностью"],
  ["debt detail",<DebtDetail debtorId={1} onBack={noop}/> ,"Профиль должника"],
  ["notifications",<Notifications/> ,"Уведомления"],
  ["POS",<POS/> ,"Товар"],
])("%s updates in place and restores Uzbek", async(name,page,expected)=>{
  await render(page);
  const original=host.textContent;
  const inputs=[...host.querySelectorAll("input,select,textarea")].map(el=>el.value);
  await change("ru");
  expect(host.textContent).toContain(expected);
  expect(document.documentElement.lang).toBe("ru");
  expect([...host.querySelectorAll("input,select,textarea")].map(el=>el.value)).toEqual(inputs);
  await change("uz");
  expect(host.textContent).toBe(original);
});
test("translated select labels retain canonical values and product names",async()=>{
  await render(<Products onNavigate={noop}/>);
  const originalStorage=localStorage.getItem("crm_products");
  await change("ru");
  expect(host.textContent).toContain("Ariel Kir Yuvish Kukuni 3kg");
  expect(localStorage.getItem("crm_products")).toBe(originalStorage);
});
test("templates preserve names while translating surrounding text and currency",()=>{
  expect(translateText("Ali Valiyev savatchaga qo'shildi.","ru")).toBe("Товар Ali Valiyev добавлен в корзину.");
  expect(translateText("125 000 so‘m","ru")).toBe("125 000 сум");
  expect(translateText("Sentyabr 2026","ru")).toBe("Сентябрь 2026");
  expect(translateText("Ariel Kir Yuvish Kukuni 3kg","ru")).toBe("Ariel Kir Yuvish Kukuni 3kg");
  expect(translateText("IKEA yostig‘i  katta savatchaga qo'shildi.","ru")).toBe("Товар IKEA yostig‘i  katta добавлен в корзину.");
  expect(translateText("Ro'yxatdan: 08 Sep 2026","ru")).toBe("Дата регистрации: 08 сен 2026");
  expect(translateText("Umumiy (Sotuv daromadi)","ru")).toBe("Итого (Выручка от продаж)");
});
test.each([
  [<Customers onNavigate={noop}/>, "Mijoz qo'shish", "данные клиента"],
  [<Employees onNavigate={noop}/>, "Xodim qo'shish", "Полное имя"],
  [<Suppliers onNavigate={noop}/>, "Ta'minotchi qo'shish", "Название поставщика"],
  [<Finance/>, "Kirim qo'shish", "Категория"],
  [<Finance/>, "Chiqim qo'shish", "Аренда"],
  [<Products onNavigate={noop}/>, "Mahsulot qo'shish", "Название товара"],
])("open modal translates without resetting its fields", async(page,buttonText,translated)=>{
  await render(page);
  const button=[...host.querySelectorAll('button')].find(el=>el.textContent.trim()===buttonText);
  expect(button).toBeDefined();
  await act(async()=>button.click());
  const fields=[...document.querySelectorAll('input,select,textarea')].map(el=>el.value);
  await change('ru');
  expect(document.body.textContent).toContain(translated);
  expect([...document.querySelectorAll('input,select,textarea')].map(el=>el.value)).toEqual(fields);
  const option=[...document.querySelectorAll('option')].find(el=>el.value==='Savdo');
  if(option) expect(option.textContent).toBe('Продажи');
  const rental=[...document.querySelectorAll('option')].find(el=>el.value==='Ijara');
  if(rental) expect(rental.textContent).toBe('Аренда');
  await change('uz');
  expect([...document.querySelectorAll('input,select,textarea')].map(el=>el.value)).toEqual(fields);
});
