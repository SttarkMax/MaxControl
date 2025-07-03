import { Quote, QuoteStatus, Product, CompanyInfo, Category, Customer, User, AccountsPayableEntry, Supplier, Debt, SupplierCredit } from './types';

// --- API Service Layer ---

// Configuração para ambiente de produção
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://maxcontrol.onrender.com/api' // ⚠️ SUBSTITUIR pela sua URL do Render
  : 'http://localhost:3001/api';

/**
 * A generic fetch wrapper for making API calls.
 * Handles setting headers, stringifying body, and basic error handling.
 * @param endpoint The API endpoint to call (e.g., '/products').
 * @param options The standard fetch options object.
 * @returns The JSON response from the API.
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Importante para cookies de sessão
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Request failed with status: ${response.status}` }));
      throw new Error(errorData.message || 'An unknown API error occurred.');
    }
    
    // Handle 204 No Content response
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    // Re-throw the error to be caught by the calling component
    throw error;
  }
}

// --- Auth API ---
export const apiLogin = (username: string, password: string) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const apiLogout = () => apiFetch('/auth/logout', { method: 'POST' });
export const apiCheckAuth = () => apiFetch('/auth/me');

// --- CompanyInfo API ---
export const apiGetCompanyInfo = (): Promise<CompanyInfo> => apiFetch('/company-info');
export const apiSaveCompanyInfo = (data: CompanyInfo): Promise<CompanyInfo> => apiFetch('/company-info', { method: 'POST', body: JSON.stringify(data) });

// --- Products API ---
export const apiGetProducts = (): Promise<Product[]> => apiFetch('/products');
export const apiSaveProduct = (product: Product): Promise<Product> => {
  return product.id 
    ? apiFetch(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
    : apiFetch('/products', { method: 'POST', body: JSON.stringify(product) });
};
export const apiDeleteProduct = (id: string): Promise<null> => apiFetch(`/products/${id}`, { method: 'DELETE' });

// --- Categories API ---
export const apiGetCategories = (): Promise<Category[]> => apiFetch('/categories');
export const apiSaveCategory = (category: Category): Promise<Category> => {
    return category.id
      ? apiFetch(`/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(category) })
      : apiFetch('/categories', { method: 'POST', body: JSON.stringify(category) });
};
export const apiDeleteCategory = (id: string): Promise<null> => apiFetch(`/categories/${id}`, { method: 'DELETE' });

// --- Customers API ---
export const apiGetCustomers = (): Promise<Customer[]> => apiFetch('/customers');
export const apiSaveCustomer = (customer: Partial<Customer>): Promise<Customer> => {
    return customer.id
      ? apiFetch(`/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(customer) })
      : apiFetch('/customers', { method: 'POST', body: JSON.stringify(customer) });
};
export const apiDeleteCustomer = (id: string): Promise<null> => apiFetch(`/customers/${id}`, { method: 'DELETE' });

// --- Quotes API ---
export const apiGetQuotes = (): Promise<Quote[]> => apiFetch('/quotes');
export const apiGetQuoteById = (id: string): Promise<Quote> => apiFetch(`/quotes/${id}`);
export const apiSaveQuote = (quote: Partial<Quote>): Promise<Quote> => {
    return quote.id
        ? apiFetch(`/quotes/${quote.id}`, { method: 'PUT', body: JSON.stringify(quote) })
        : apiFetch('/quotes', { method: 'POST', body: JSON.stringify(quote) });
};

// --- Users API ---
export const apiGetUsers = (): Promise<User[]> => apiFetch('/users');
export const apiSaveUser = (user: Partial<User>): Promise<User> => {
    return user.id
      ? apiFetch(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) })
      : apiFetch('/users', { method: 'POST', body: JSON.stringify(user) });
};
export const apiDeleteUser = (id: string): Promise<null> => apiFetch(`/users/${id}`, { method: 'DELETE' });

// --- Accounts Payable API ---
export const apiGetAccountsPayable = (): Promise<AccountsPayableEntry[]> => apiFetch('/accounts-payable');
export const apiSaveAccountsPayableEntry = (entry: AccountsPayableEntry): Promise<AccountsPayableEntry> => {
    return entry.id
      ? apiFetch(`/accounts-payable/${entry.id}`, { method: 'PUT', body: JSON.stringify(entry) })
      : apiFetch(`/accounts-payable`, { method: 'POST', body: JSON.stringify(entry) });
};
export const apiAddAccountsPayableSeries = (data: { baseEntry: Omit<AccountsPayableEntry, 'id' | 'createdAt'>, installments: number, frequency: 'weekly' | 'monthly' }): Promise<AccountsPayableEntry[]> => {
    return apiFetch('/accounts-payable/series', { method: 'POST', body: JSON.stringify(data) });
}
export const apiDeleteAccountsPayableEntry = (id: string): Promise<null> => apiFetch(`/accounts-payable/${id}`, { method: 'DELETE' });
export const apiDeleteAccountsPayableSeries = (seriesId: string): Promise<null> => apiFetch(`/accounts-payable/series/${seriesId}`, { method: 'DELETE' });
export const apiTogglePaidStatus = (id: string): Promise<AccountsPayableEntry> => apiFetch(`/accounts-payable/${id}/toggle-paid`, { method: 'POST' });

// --- Suppliers API (Unified) ---
export const apiGetSuppliers = (): Promise<Supplier[]> => apiFetch('/suppliers');
export const apiSaveSupplier = (supplier: Supplier): Promise<Supplier> => {
    return supplier.id
      ? apiFetch(`/suppliers/${supplier.id}`, { method: 'PUT', body: JSON.stringify(supplier) })
      : apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(supplier) });
};
export const apiDeleteSupplier = (id: string): Promise<null> => apiFetch(`/suppliers/${id}`, { method: 'DELETE' });

// --- Debts API (under suppliers route) ---
export const apiGetDebts = (): Promise<Debt[]> => apiFetch('/suppliers/debts');
export const apiAddDebt = (debt: Omit<Debt, 'id'>): Promise<Debt> => apiFetch('/suppliers/debts', { method: 'POST', body: JSON.stringify(debt) });
export const apiDeleteDebt = (id: string): Promise<null> => apiFetch(`/suppliers/debts/${id}`, { method: 'DELETE' });

// --- Supplier Credits (Payments) API (under suppliers route) ---
export const apiGetSupplierCredits = (): Promise<SupplierCredit[]> => apiFetch('/suppliers/supplier-credits');
export const apiAddSupplierCredit = (credit: Omit<SupplierCredit, 'id'>): Promise<SupplierCredit> => apiFetch('/suppliers/supplier-credits', { method: 'POST', body: JSON.stringify(credit) });
export const apiDeleteSupplierCredit = (id: string): Promise<null> => apiFetch(`/suppliers/supplier-credits/${id}`, { method: 'DELETE' });


// --- General Helpers ---

export const translateQuoteStatus = (status: QuoteStatus): string => {
  switch (status) {
    case 'draft': return 'Rascunho';
    case 'sent': return 'Enviado';
    case 'accepted': return 'Aceito';
    case 'rejected': return 'Rejeitado';
    case 'converted_to_order': return 'Convertido em OS';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

export const formatCurrency = (amount?: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== date.getDate()) {
    d.setDate(0);
  }
  return d;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};