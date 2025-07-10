import { supabase } from './supabaseService';
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

// Função auxiliar para tratar erros do Supabase
const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Erro na operação ${operation}:`, error);
  throw new Error(error.message || `Erro na operação ${operation}`);
};

// Função para mapear dados do banco para o frontend
const mapProductFromDB = (dbProduct: any): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  description: dbProduct.description || '',
  pricingModel: dbProduct.pricing_model as PricingModel,
  basePrice: dbProduct.base_price,
  unit: dbProduct.unit || 'un',
  customCashPrice: dbProduct.custom_cash_price,
  customCardPrice: dbProduct.custom_card_price,
  supplierCost: dbProduct.supplier_cost,
  categoryId: dbProduct.category_id
});

const mapProductToDB = (product: Partial<Product>) => ({
  name: product.name,
  description: product.description,
  pricing_model: product.pricingModel,
  base_price: product.basePrice,
  unit: product.unit,
  custom_cash_price: product.customCashPrice,
  custom_card_price: product.customCardPrice,
  supplier_cost: product.supplierCost,
  category_id: product.categoryId || null
});

const mapCustomerFromDB = (dbCustomer: any, downPayments: any[] = []): Customer => ({
  id: dbCustomer.id,
  name: dbCustomer.name,
  documentType: dbCustomer.document_type,
  documentNumber: dbCustomer.document_number,
  phone: dbCustomer.phone,
  email: dbCustomer.email,
  address: dbCustomer.address,
  city: dbCustomer.city,
  postalCode: dbCustomer.postal_code,
  downPayments: downPayments.map(dp => ({
    id: dp.id,
    amount: dp.amount,
    date: dp.date,
    description: dp.description
  }))
});

const mapCustomerToDB = (customer: Partial<Customer>) => ({
  name: customer.name,
  document_type: customer.documentType,
  document_number: customer.documentNumber,
  phone: customer.phone,
  email: customer.email,
  address: customer.address,
  city: customer.city,
  postal_code: customer.postalCode
});

const mapQuoteFromDB = (dbQuote: any): Quote => ({
  id: dbQuote.id,
  quoteNumber: dbQuote.quote_number,
  customerId: dbQuote.customer_id,
  clientName: dbQuote.client_name,
  clientContact: dbQuote.client_contact,
  items: dbQuote.items,
  subtotal: dbQuote.subtotal,
  discountType: dbQuote.discount_type,
  discountValue: dbQuote.discount_value,
  discountAmountCalculated: dbQuote.discount_amount_calculated,
  subtotalAfterDiscount: dbQuote.subtotal_after_discount,
  totalCash: dbQuote.total_cash,
  totalCard: dbQuote.total_card,
  downPaymentApplied: dbQuote.down_payment_applied,
  selectedPaymentMethod: dbQuote.selected_payment_method,
  paymentDate: dbQuote.payment_date,
  deliveryDeadline: dbQuote.delivery_deadline,
  notes: dbQuote.notes,
  status: dbQuote.status,
  companyInfoSnapshot: dbQuote.company_info_snapshot,
  salespersonUsername: dbQuote.salesperson_username,
  salespersonFullName: dbQuote.salesperson_full_name,
  createdAt: dbQuote.created_at
});

const mapQuoteToDB = (quote: Partial<Quote>) => ({
  quote_number: quote.quoteNumber,
  customer_id: quote.customerId,
  client_name: quote.clientName,
  client_contact: quote.clientContact,
  items: quote.items,
  subtotal: quote.subtotal,
  discount_type: quote.discountType,
  discount_value: quote.discountValue,
  discount_amount_calculated: quote.discountAmountCalculated,
  subtotal_after_discount: quote.subtotalAfterDiscount,
  total_cash: quote.totalCash,
  total_card: quote.totalCard,
  down_payment_applied: quote.downPaymentApplied,
  selected_payment_method: quote.selectedPaymentMethod,
  payment_date: quote.paymentDate,
  delivery_deadline: quote.deliveryDeadline,
  notes: quote.notes,
  status: quote.status,
  company_info_snapshot: quote.companyInfoSnapshot,
  salesperson_username: quote.salespersonUsername,
  salesperson_full_name: quote.salespersonFullName
});

// Função para gerar número único de orçamento
const generateQuoteNumber = async (): Promise<string> => {
  const prefix = 'ORC-';
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  
  const { data: existingQuotes, error } = await supabase
    .from('quotes')
    .select('quote_number')
    .like('quote_number', `${prefix}${datePart}%`)
    .order('quote_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar números de orçamento:', error);
  }

  let nextSeq = 1;
  if (existingQuotes && existingQuotes.length > 0) {
    const lastSeq = parseInt(existingQuotes[0].quote_number.split('-')[2], 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}${datePart}-${String(nextSeq).padStart(3, '0')}`;
};

export const api = {
  // Autenticação
  async login(credentials: { username: string; password: string }): Promise<{ user: LoggedInUser; token: string }> {
    // Para Supabase, vamos usar email/password, mas mapear username para email
    const email = credentials.username.includes('@') ? credentials.username : `${credentials.username}@maxcontrol.com`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: credentials.password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      throw new Error('Perfil do usuário não encontrado');
    }

    return {
      user: {
        id: profile.id,
        username: profile.username,
        fullName: profile.full_name,
        role: profile.role
      },
      token: data.session?.access_token || ''
    };
  },

  async getCurrentUser(): Promise<LoggedInUser> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Perfil do usuário não encontrado');
    }

    return {
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      role: profile.role
    };
  },

  // Produtos
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      handleSupabaseError(error, 'buscar produtos');
    }

    return data?.map(mapProductFromDB) || [];
  },

  async getProduct(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      handleSupabaseError(error, 'buscar produto');
    }

    return mapProductFromDB(data);
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(mapProductToDB(product))
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'criar produto');
    }

    return mapProductFromDB(data);
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(mapProductToDB(product))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar produto');
    }

    return mapProductFromDB(data);
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'excluir produto');
    }
  },

  // Categorias
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      handleSupabaseError(error, 'buscar categorias');
    }

    return data || [];
  },

  async createCategory(category: { name: string }): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'criar categoria');
    }

    return data;
  },

  async updateCategory(id: string, category: { name: string }): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar categoria');
    }

    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'excluir categoria');
    }
  },

  // Clientes
  async getCustomers(): Promise<Customer[]> {
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (customersError) {
      handleSupabaseError(customersError, 'buscar clientes');
    }

    const { data: downPayments, error: paymentsError } = await supabase
      .from('down_payments')
      .select('*');

    if (paymentsError) {
      handleSupabaseError(paymentsError, 'buscar sinais');
    }

    return customers?.map(customer => {
      const customerPayments = downPayments?.filter(dp => dp.customer_id === customer.id) || [];
      return mapCustomerFromDB(customer, customerPayments);
    }) || [];
  },

  async getCustomer(id: string): Promise<Customer> {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError) {
      handleSupabaseError(customerError, 'buscar cliente');
    }

    const { data: downPayments, error: paymentsError } = await supabase
      .from('down_payments')
      .select('*')
      .eq('customer_id', id);

    if (paymentsError) {
      handleSupabaseError(paymentsError, 'buscar sinais do cliente');
    }

    return mapCustomerFromDB(customer, downPayments || []);
  },

  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(mapCustomerToDB(customer))
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'criar cliente');
    }

    // Criar sinais se existirem
    if (customer.downPayments && customer.downPayments.length > 0) {
      const paymentsToInsert = customer.downPayments.map(dp => ({
        id: dp.id,
        customer_id: data.id,
        amount: dp.amount,
        date: dp.date,
        description: dp.description
      }));

      const { error: paymentsError } = await supabase
        .from('down_payments')
        .insert(paymentsToInsert);

      if (paymentsError) {
        handleSupabaseError(paymentsError, 'criar sinais do cliente');
      }
    }

    return mapCustomerFromDB(data, customer.downPayments || []);
  },

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(mapCustomerToDB(customer))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar cliente');
    }

    // Atualizar sinais
    if (customer.downPayments !== undefined) {
      // Remover sinais existentes
      await supabase
        .from('down_payments')
        .delete()
        .eq('customer_id', id);

      // Inserir novos sinais
      if (customer.downPayments.length > 0) {
        const paymentsToInsert = customer.downPayments.map(dp => ({
          id: dp.id,
          customer_id: id,
          amount: dp.amount,
          date: dp.date,
          description: dp.description
        }));

        const { error: paymentsError } = await supabase
          .from('down_payments')
          .insert(paymentsToInsert);

        if (paymentsError) {
          handleSupabaseError(paymentsError, 'atualizar sinais do cliente');
        }
      }
    }

    return mapCustomerFromDB(data, customer.downPayments || []);
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'excluir cliente');
    }
  },

  // Orçamentos
  async getQuotes(customerId?: string): Promise<Quote[]> {
    let query = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'buscar orçamentos');
    }

    return data?.map(mapQuoteFromDB) || [];
  },

  async getQuote(id: string): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      handleSupabaseError(error, 'buscar orçamento');
    }

    return mapQuoteFromDB(data);
  },

  async createQuote(quote: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt'>): Promise<Quote> {
    const quoteNumber = await generateQuoteNumber();
    
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        ...mapQuoteToDB(quote),
        quote_number: quoteNumber
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'criar orçamento');
    }

    return mapQuoteFromDB(data);
  },

  async updateQuote(id: string, quote: Partial<Quote>): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .update(mapQuoteToDB(quote))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar orçamento');
    }

    return mapQuoteFromDB(data);
  },

  async deleteQuote(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'excluir orçamento');
    }
  },

  // Informações da empresa
  async getCompanyInfo(): Promise<CompanyInfo> {
    const { data, error } = await supabase
      .from('company_info')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      handleSupabaseError(error, 'buscar informações da empresa');
    }

    return {
      name: data.name,
      logoUrlDarkBg: data.logo_url_dark_bg,
      logoUrlLightBg: data.logo_url_light_bg,
      address: data.address,
      phone: data.phone,
      email: data.email,
      cnpj: data.cnpj,
      instagram: data.instagram,
      website: data.website
    };
  },

  async updateCompanyInfo(companyInfo: CompanyInfo): Promise<CompanyInfo> {
    const { data, error } = await supabase
      .from('company_info')
      .update({
        name: companyInfo.name,
        logo_url_dark_bg: companyInfo.logoUrlDarkBg,
        logo_url_light_bg: companyInfo.logoUrlLightBg,
        address: companyInfo.address,
        phone: companyInfo.phone,
        email: companyInfo.email,
        cnpj: companyInfo.cnpj,
        instagram: companyInfo.instagram,
        website: companyInfo.website,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar informações da empresa');
    }

    return {
      name: data.name,
      logoUrlDarkBg: data.logo_url_dark_bg,
      logoUrlLightBg: data.logo_url_light_bg,
      address: data.address,
      phone: data.phone,
      email: data.email,
      cnpj: data.cnpj,
      instagram: data.instagram,
      website: data.website
    };
  },

  // Dashboard
  async getDashboardStats(): Promise<{ productCount: number; quoteCount: number; companyName: string }> {
    const [productsResult, quotesResult, companyResult] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('quotes').select('id', { count: 'exact', head: true }),
      supabase.from('company_info').select('name').eq('id', 1).single()
    ]);

    return {
      productCount: productsResult.count || 0,
      quoteCount: quotesResult.count || 0,
      companyName: companyResult.data?.name || 'Sua Empresa'
    };
  },

  async getSalesChartData(year: number): Promise<{ monthlySales: number[]; availableYears: number[] }> {
    // Buscar vendas do ano
    const { data: sales, error } = await supabase
      .from('quotes')
      .select('created_at, total_cash')
      .in('status', ['accepted', 'converted_to_order'])
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (error) {
      handleSupabaseError(error, 'buscar dados de vendas');
    }

    // Buscar anos disponíveis
    const { data: yearsData, error: yearsError } = await supabase
      .from('quotes')
      .select('created_at')
      .in('status', ['accepted', 'converted_to_order']);

    if (yearsError) {
      handleSupabaseError(yearsError, 'buscar anos disponíveis');
    }

    const monthlySales = Array(12).fill(0);
    sales?.forEach(sale => {
      const month = new Date(sale.created_at).getMonth();
      monthlySales[month] += sale.total_cash;
    });

    const availableYears = [...new Set([
      ...yearsData?.map(item => new Date(item.created_at).getFullYear()) || [],
      new Date().getFullYear()
    ])].sort((a, b) => b - a);

    return { monthlySales, availableYears };
  },

  async getDraftQuotes(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      handleSupabaseError(error, 'buscar rascunhos');
    }

    return data?.map(mapQuoteFromDB) || [];
  },

  async getRecentAcceptedQuotes(): Promise<Quote[]> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .in('status', ['accepted', 'converted_to_order'])
      .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      handleSupabaseError(error, 'buscar orçamentos aceitos recentes');
    }

    return data?.map(mapQuoteFromDB) || [];
  },

  // Placeholder para outras funcionalidades que serão implementadas
  async getUsers(): Promise<User[]> {
    // Implementar quando necessário
    return [];
  },

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    // Implementar quando necessário
    throw new Error('Funcionalidade não implementada');
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    // Implementar quando necessário
    throw new Error('Funcionalidade não implementada');
  },

  async deleteUser(id: string): Promise<void> {
    // Implementar quando necessário
    throw new Error('Funcionalidade não implementada');
  },

  // Métodos genéricos para compatibilidade
  async get(endpoint: string): Promise<any> {
    // Mapear endpoints para métodos específicos
    if (endpoint === '/api/products') return this.getProducts();
    if (endpoint === '/api/categories') return this.getCategories();
    if (endpoint === '/api/customers') return this.getCustomers();
    if (endpoint === '/api/quotes') return this.getQuotes();
    if (endpoint === '/api/settings/company-info') return this.getCompanyInfo();
    if (endpoint === '/api/dashboard/stats') return this.getDashboardStats();
    if (endpoint === '/api/dashboard/draft-quotes') return this.getDraftQuotes();
    if (endpoint === '/api/dashboard/recent-accepted-quotes') return this.getRecentAcceptedQuotes();
    if (endpoint === '/api/auth/me') return this.getCurrentUser();
    
    // Para endpoints com parâmetros
    if (endpoint.startsWith('/api/products/')) {
      const id = endpoint.split('/').pop();
      return this.getProduct(id!);
    }
    if (endpoint.startsWith('/api/customers/')) {
      const id = endpoint.split('/').pop();
      return this.getCustomer(id!);
    }
    if (endpoint.startsWith('/api/quotes/')) {
      const id = endpoint.split('/').pop();
      return this.getQuote(id!);
    }
    if (endpoint.includes('sales-chart')) {
      const url = new URL(endpoint, 'http://localhost');
      const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
      return this.getSalesChartData(year);
    }
    if (endpoint.includes('customerId=')) {
      const url = new URL(endpoint, 'http://localhost');
      const customerId = url.searchParams.get('customerId');
      return this.getQuotes(customerId || undefined);
    }

    throw new Error(`Endpoint não implementado: ${endpoint}`);
  },

  async post(endpoint: string, data: any): Promise<any> {
    if (endpoint === '/api/auth/login') return this.login(data);
    if (endpoint === '/api/products') return this.createProduct(data);
    if (endpoint === '/api/categories') return this.createCategory(data);
    if (endpoint === '/api/customers') return this.createCustomer(data);
    if (endpoint === '/api/quotes') return this.createQuote(data);
    if (endpoint === '/api/users') return this.createUser(data);

    throw new Error(`Endpoint POST não implementado: ${endpoint}`);
  },

  async put(endpoint: string, data: any): Promise<any> {
    if (endpoint === '/api/settings/company-info') return this.updateCompanyInfo(data);
    
    // Para endpoints com ID
    if (endpoint.startsWith('/api/products/')) {
      const id = endpoint.split('/').pop();
      return this.updateProduct(id!, data);
    }
    if (endpoint.startsWith('/api/categories/')) {
      const id = endpoint.split('/').pop();
      return this.updateCategory(id!, data);
    }
    if (endpoint.startsWith('/api/customers/')) {
      const id = endpoint.split('/').pop();
      return this.updateCustomer(id!, data);
    }
    if (endpoint.startsWith('/api/quotes/')) {
      const id = endpoint.split('/').pop();
      return this.updateQuote(id!, data);
    }
    if (endpoint.startsWith('/api/users/')) {
      const id = endpoint.split('/').pop();
      return this.updateUser(id!, data);
    }

    throw new Error(`Endpoint PUT não implementado: ${endpoint}`);
  },

  async delete(endpoint: string): Promise<any> {
    // Para endpoints com ID
    if (endpoint.startsWith('/api/products/')) {
      const id = endpoint.split('/').pop();
      return this.deleteProduct(id!);
    }
    if (endpoint.startsWith('/api/categories/')) {
      const id = endpoint.split('/').pop();
      return this.deleteCategory(id!);
    }
    if (endpoint.startsWith('/api/customers/')) {
      const id = endpoint.split('/').pop();
      return this.deleteCustomer(id!);
    }
    if (endpoint.startsWith('/api/quotes/')) {
      const id = endpoint.split('/').pop();
      return this.deleteQuote(id!);
    }
    if (endpoint.startsWith('/api/users/')) {
      const id = endpoint.split('/').pop();
      return this.deleteUser(id!);
    }

    throw new Error(`Endpoint DELETE não implementado: ${endpoint}`);
  }
};