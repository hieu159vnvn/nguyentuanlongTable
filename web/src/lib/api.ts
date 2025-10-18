export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const token = document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1];
  return token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {};
}

async function request(path: string, init?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init && init.headers ? init.headers : {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function requestFallback(paths: string[], init?: RequestInit) {
  let lastErr: any;
  for (const p of paths) {
    try {
      return await request(p, init);
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export const api = {
  getShortTerms: () => request('/api/pricing-short-terms'),
  getLongTermPackages: () => request('/api/pricing-long-term-packages'),
  calculatePricing: (body: any) => request('/api/pricing/calculate', { method: 'POST', body: JSON.stringify(body) }),
  calculateRentalPricing: (body: any) => request('/api/pricing/calculate-rental', { method: 'POST', body: JSON.stringify(body) }),
  createShortRental: (body: any) => request('/api/orders/short-rental', { method: 'POST', body: JSON.stringify(body) }),
  purchasePackage: (body: any) => request('/api/orders/purchase-package', { method: 'POST', body: JSON.stringify(body) }),
  getBankInfo: () => request('/api/bank-info'),
  getTablesStatus: () => request('/api/tables/status'),
  startShortOnTable: (tableId: number, body: any) => request(`/api/tables/${tableId}/start-short`, { method: 'POST', body: JSON.stringify(body) }),
  settleTable: (tableId: number) => request(`/api/tables/${tableId}/settle`, { method: 'POST' }),
  createCustomer: (body: any) => request('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  getCustomers: (query?: string) => request(`/api/customers${query || ''}`)
};

export const apiFallback = {
  getInvoices: (query: string) => requestFallback([
    `/api/invoices${query}`,
  ]),
  getRentals: (query: string) => requestFallback([
    `/api/rentals${query}`,
  ])
};


