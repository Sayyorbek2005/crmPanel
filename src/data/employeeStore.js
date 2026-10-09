import { employees } from "./mockData";

export function readEmployees() {
  const stored = localStorage.getItem("crm_employees");
  if (!stored) return employees;
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("Invalid employee data");
  return parsed;
}

export function saveEmployees(list) {
  localStorage.setItem("crm_employees", JSON.stringify(list));
}
