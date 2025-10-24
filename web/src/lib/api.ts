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
  
  // Handle empty responses (like DELETE with 204 No Content)
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }
  
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }
  
  return JSON.parse(text);
}

async function requestFallback(paths: string[], init?: RequestInit) {
  let lastErr: unknown;
  for (const p of paths) {
    try {
      return await request(p, init);
    } catch (e: unknown) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export const api = {
  getShortTerms: () => request('/api/pricing-short-terms'),
  getLongTermPackages: () => request('/api/pricing-long-term-packages'),
  calculatePricing: (body: Record<string, unknown>) => request('/api/pricing/calculate', { method: 'POST', body: JSON.stringify(body) }),
  calculateRentalPricing: (body: Record<string, unknown>) => request('/api/pricing/calculate-rental', { method: 'POST', body: JSON.stringify(body) }),
  createShortRental: (body: Record<string, unknown>) => request('/api/orders/short-rental', { method: 'POST', body: JSON.stringify(body) }),
  purchasePackage: (body: Record<string, unknown>) => request('/api/orders/purchase-package', { method: 'POST', body: JSON.stringify(body) }),
  purchasePackageOnly: (body: Record<string, unknown>) => request('/api/orders/purchase-package-only', { method: 'POST', body: JSON.stringify(body) }),
  getBankInfo: () => request('/api/bank-info'),
  getTablesStatus: () => request('/api/tables/status'),
  startShortOnTable: (tableId: number, body: Record<string, unknown>) => request(`/api/tables/${tableId}/start-short`, { method: 'POST', body: JSON.stringify(body) }),
  settleTable: (tableId: number, discount: number = 0) => request(`/api/tables/${tableId}/settle`, { 
    method: 'POST',
    body: JSON.stringify({ discount })
  }),
  createCustomer: (body: Record<string, unknown>) => request('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: number, body: Record<string, unknown>) => request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id: number) => request(`/api/customers/${id}`, { method: 'DELETE' }),
  getCustomers: (query?: string) => request(`/api/customers${query || ''}`),
  getInvoices: (query?: string) => request(`/api/invoices${query || ''}`),
  getInvoice: (id: number | string) => request(`/api/invoices/${id}`),
  getInvoiceByDocumentId: (documentId: string) => request(`/api/invoices/${documentId}`)
};

export const apiFallback = {
  getInvoices: (query: string) => requestFallback([
    `/api/invoices${query}`,
  ]),
  getRentals: (query: string) => requestFallback([
    `/api/rentals${query}`,
  ])
};


