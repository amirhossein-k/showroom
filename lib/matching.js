import { normalizeFa } from './persian';

const CLOSED = ['won', 'lost', 'closed', 'cancelled'];

// آیا خواستهٔ مشتری با این ماشین جور است؟ (نام برند/مدل + بودجه)
export function customerMatchesCar(customer, car) {
  if (!customer || !car) return false;
  if (CLOSED.includes(customer.status)) return false;
  const wanted = normalizeFa(customer.wanted || '');
  if (!wanted) return false;
  const model = normalizeFa(car.model);
  const full = normalizeFa(`${car.brand}${car.model}`);
  const nameOk = (model && wanted.includes(model)) || (full && wanted.includes(full));
  if (!nameOk) return false;
  const price = Number(car.askingPrice) || 0;
  if (!price) return true;
  // ۱۰٪ انعطاف روی سقف بودجه
  if (customer.budgetMax && price > customer.budgetMax * 1.1) return false;
  if (customer.budgetMin && price < customer.budgetMin * 0.8) return false;
  return true;
}

export function matchCustomers(car, customers) {
  return (customers || []).filter((c) => customerMatchesCar(c, car));
}
