

export enum PricingModel {
  PER_UNIT = 'unidade', // Represents items sold as individual units or pre-defined packages (e.g., "pack of 500 cards")
  PER_SQUARE_METER = 'm2', // Represents items sold by area,
}

export enum UserAccessLevel {
  ADMIN = 'admin',
  SALES = 'sales',
  VIEWER = 'viewer',
}

export interface CompanyInfo {
  name: string;
  logoUrlDarkBg?: string; // Optional: For site header (dark background)
  logoUrlLightBg?: string; // Optional: For PDFs (light background)
  address: string;
  phone: string;
  email: string;
  cnpj?: string; // Optional
  instagram?: string; // Optional Instagram handle or URL
  website?: string; // Optional website URL
}

export interface ProductPrice {
  cash: number; // Price "à vista"
  card: number; // Price on card (usually cash + surcharge)
}

export interface Category {
  id: string;
  name:string;
}

export interface Product {
  id: string;
  name: string; // Should be descriptive, e.g., "Cartão de Visita - Pacote 500un" if PER_UNIT is a package
  description: string;
  pricingModel: PricingModel;
  /**
   * Base price for calculation.
   * For PER_UNIT: This is the price of ONE 'unit' (as defined in the 'unit' field). 
   *   If 'unit' is "pacote c/ 500", then basePrice is the price for 500 items.
   *   If 'unit' is "unidade", then basePrice is the price for a single item.
   * For PER_SQUARE_METER: This is the price per square meter.
   */
  basePrice: number;
  /**
   * Describes the unit of sale.
   * For PER_UNIT: e.g., 'unidade', 'cartão', 'pacote c/ 100', 'bloco'. This is what 'quantity' in QuoteItem will refer to.
   * For PER_SQUARE_METER: Typically 'm²'.
   */
  unit?: string; 
  customCashPrice?: number; // Manually overridden cash price for the 'unit'
  customCardPrice?: number; // Manually overridden card price for the 'unit'
  supplierCost?: number; // Optional cost for profit calculation
  categoryId?: string; // Optional link to a category
}

export interface QuoteItem {
  productId: string;
  productName: string; // Denormalized for easy display
  /**
   * For PER_UNIT: Number of 'Product.unit's being sold (e.g., if Product.unit is "pacote c/ 500", quantity = 2 means 1000 cards).
   * For PER_SQUARE_METER: Total calculated area in m2.
   */
  quantity: number; 
  /**
   * The price for one 'Product.unit' (cash or card) chosen for this item.
   * If Product.unit is "pacote c/ 500", this is the price of that package.
   */
  unitPrice: number; 
  totalPrice: number; // Calculated as quantity * unitPrice
  pricingModel: PricingModel;
  // Fields for area-based calculation
  width?: number; // in meters
  height?: number; // in meters
  itemCountForAreaCalc?: number; // number of pieces for area calculation
}

export interface DownPaymentEntry {
  id: string;
  amount: number;
  date: string; // ISO date string
  description?: string;
}

export interface Customer {
  id: string;
  name: string; // Nome ou Razão Social
  documentType: 'CPF' | 'CNPJ' | 'N/A';
  documentNumber?: string; // CPF ou CNPJ
  phone: string;
  email?: string;
  address?: string; // Endereço completo (Rua, Número, Bairro)
  city?: string; // Cidade
  postalCode?: string; // CEP
  downPayments: DownPaymentEntry[]; // Replaces single down payment fields
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'cancelled';

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string; // Link to the customer
  clientName: string; // Could be manually entered if no customer is linked, or auto-filled
  clientContact?: string; // Could be manually entered or auto-filled
  items: QuoteItem[];
  
  subtotal: number; // Subtotal before discount (usually based on cash prices of items as added)
  
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number; // Percentage value (e.g., 10 for 10%) or fixed amount
  discountAmountCalculated: number; // The actual monetary value of the discount applied

  subtotalAfterDiscount: number; // Subtotal after discount is applied

  totalCash: number; // Final cash total after discount, BEFORE customer's existing down payment application
  totalCard: number; // Final card total after discount, BEFORE customer's existing down payment application
  
  downPaymentApplied?: number; // Amount of customer's existing credit/down payment applied to this quote

  selectedPaymentMethod?: string; // e.g., 'PIX', 'Cartão Crédito 2x', 'Dinheiro'
  paymentDate?: string; // ISO date string for payment
  deliveryDeadline?: string; // ISO date string for delivery

  createdAt: string; // ISO date string
  status: QuoteStatus;
  companyInfoSnapshot: CompanyInfo; // Snapshot of company info at time of quote
  notes?: string; // General notes for the quote or receipt
  salespersonUsername: string;
  salespersonFullName?: string;
}

export interface Order {
  id:string;
  orderNumber: string;
  quoteId?: string; // Link to quote
  customerId?: string; // Link to the customer
  clientName: string; // Denormalized
  items: QuoteItem[]; // Can be same as quote items or modified
  totalAmount: number; // The final amount paid or to be paid (after considering any customer credit)
  paymentMethod: string; 
  paymentDate?: string;
  deliveryDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'delivered';
  createdAt: string;
  notes?: string;
}

export interface CashFlowEntry {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number; // Positive for income, negative for expense
  type: 'income' | 'expense';
  category?: string; // e.g., Sales, Supplies, Rent
  relatedOrderId?: string;
}

// For system users
export interface User {
  id: string;
  username: string;
  fullName?: string; // Added fullName
  password?: string; // Stored as plain text for demo purposes ONLY. In production, use hashed passwords.
  role: UserAccessLevel;
}

// For currently logged-in user session
export interface LoggedInUser {
  id: string;
  username: string;
  fullName?: string;
  role: UserAccessLevel;
}

// For navigation
export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: UserAccessLevel[];
}

// New type for Accounts Payable
export interface AccountsPayableEntry {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  isPaid: boolean;
  createdAt: string; // ISO date string
  notes?: string;
  // For installment tracking
  seriesId?: string; // An ID to group all installments of a single debt
  totalInstallmentsInSeries?: number;
  installmentNumberOfSeries?: number;
}

// New types for Supplier Management
export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface SupplierCredit {
  id: string;
  supplierId: string;
  amount: number;
  date: string; // ISO date string
  description?: string;
}

export interface Debt {
  id: string;
  supplierId: string;
  description?: string; // "Compra de Lona", "Serviço de Impressão"
  totalAmount: number; // The original total value of the debt
  dateAdded: string; // ISO date string
}
