import { 
  Product, 
  Category, 
  Customer, 
  Quote, 
  CompanyInfo, 
  User, 
  LoggedInUser,
  Supplier,
  Debt,
  SupplierCredit,
  AccountsPayableEntry,
  DownPaymentEntry,
  PricingModel
} from '../types';
import { API_BASE_URL } from '../config';

// Generic request function
const makeRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('authToken');
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Authentication
  async login(credentials: { username: string; password: string }): Promise<{ user: LoggedInUser; token: string }> {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    return response;
  },

  async getCurrentUser(): Promise<LoggedInUser> {
    return makeRequest('/api/auth/me');
  },

  // Products
  async getProducts(): Promise<Product[]> {
    return makeRequest('/api/products');
  },

  async getProduct(id: string): Promise<Product> {
    return makeRequest(`/api/products/${id}`);
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return makeRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return makeRequest(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await makeRequest(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return makeRequest('/api/categories');
  },

  async createCategory(category: { name: string }): Promise<Category> {
    return makeRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  async updateCategory(id: string, category: { name: string }): Promise<Category> {
    return makeRequest(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  async deleteCategory(id: string): Promise<void> {
    await makeRequest(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return makeRequest('/api/customers');
  },

  async getCustomer(id: string): Promise<Customer> {
    return makeRequest(`/api/customers/${id}`);
  },

  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    return makeRequest('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    return makeRequest(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  },

  async deleteCustomer(id: string): Promise<void> {
    await makeRequest(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  },

  // Quotes
  async getQuotes(customerId?: string): Promise<Quote[]> {
    const endpoint = customerId ? `/api/quotes?customerId=${customerId}` : '/api/quotes';
    return makeRequest(endpoint);
  },

  async getQuote(id: string): Promise<Quote> {
    return makeRequest(`/api/quotes/${id}`);
  },

  async createQuote(quote: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'>): Promise<Quote> {
    return makeRequest('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    });
  },

  async updateQuote(id: string, quote: Partial<Quote>): Promise<Quote> {
    return makeRequest(`/api/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quote),
    });
  },

  async deleteQuote(id: string): Promise<void> {
    await makeRequest(`/api/quotes/${id}`, {
      method: 'DELETE',
    });
  },

  // Company Info
  async getCompanyInfo(): Promise<CompanyInfo> {
    return makeRequest('/api/settings/company-info');
  },

  async updateCompanyInfo(companyInfo: CompanyInfo): Promise<CompanyInfo> {
    return makeRequest('/api/settings/company-info', {
      method: 'PUT',
      body: JSON.stringify(companyInfo),
    });
  },

  // Dashboard
  async getDashboardStats(): Promise<{ productCount: number; quoteCount: number; companyName: string }> {
    return makeRequest('/api/dashboard/stats');
  },

  async getSalesChartData(year: number): Promise<{ monthlySales: number[]; availableYears: number[] }> {
    return makeRequest(`/api/dashboard/sales-chart?year=${year}`);
  },

  async getDraftQuotes(): Promise<Quote[]> {
    return makeRequest('/api/dashboard/draft-quotes');
  },

  async getRecentAcceptedQuotes(): Promise<Quote[]> {
    return makeRequest('/api/dashboard/recent-accepted-quotes');
  },

  // Users
  async getUsers(): Promise<User[]> {
    return makeRequest('/api/users');
  },

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    return makeRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return makeRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async deleteUser(id: string): Promise<void> {
    await makeRequest(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Generic methods for backward compatibility
  async get(endpoint: string): Promise<any> {
    return makeRequest(endpoint);
  },

  async post(endpoint: string, data: any): Promise<any> {
    return makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: any): Promise<any> {
    return makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string): Promise<any> {
    return makeRequest(endpoint, {
      method: 'DELETE',
    });
  }
};