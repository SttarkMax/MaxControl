// This file is a copy of the frontend types.ts to ensure consistency.
// In a monorepo setup, this would be a shared package.

import 'express-session';

export enum PricingModel {
  PER_UNIT = 'unidade',
  PER_SQUARE_METER = 'm2',
}

export enum UserAccessLevel {
  ADMIN = 'admin',
  SALES = 'sales',
  VIEWER = 'viewer',
}

export interface CompanyInfo {
  id?: string;
  name: string;
  logoUrlDarkBg?: string;
  logoUrlLightBg?: string;
  address: string;
  phone: string;
  email: string;
  cnpj?: string;
  instagram?: string;
  website?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  pricingModel: PricingModel;
  basePrice: number;
  unit?: string;
  customCashPrice?: number;
  customCardPrice?: number;
  supplierCost?: number;
  categoryId?: string;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pricingModel: PricingModel;
  width?: number;
  height?: number;
  itemCountForAreaCalc?: number;
}

export interface DownPaymentEntry {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  documentType: 'CPF' | 'CNPJ' | 'N/A';
  documentNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  downPayments: DownPaymentEntry[];
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'cancelled';

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string;
  clientName: string;
  clientContact?: string;
  items: QuoteItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  discountAmountCalculated: number;
  subtotalAfterDiscount: number;
  totalCash: number;
  totalCard: number;
  downPaymentApplied?: number;
  selectedPaymentMethod?: string;
  paymentDate?: string;
  deliveryDeadline?: string;
  createdAt: string;
  status: QuoteStatus;
  companyInfoSnapshot: CompanyInfo;
  notes?: string;
  salespersonUsername: string;
  salespersonFullName?: string;
}

export interface User {
  id: string;
  username: string;
  fullName?: string;
  password?: string; // Should always be the hashed password when coming from DB
  role: UserAccessLevel;
}

export interface LoggedInUser {
  id: string;
  username: string;
  fullName?: string;
  role: UserAccessLevel;
}

export interface Category {
    id: string;
    name: string;
}

export interface AccountsPayableEntry {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  createdAt: string;
  notes?: string;
  seriesId?: string;
  totalInstallmentsInSeries?: number;
  installmentNumberOfSeries?: number;
}

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
  date: string;
  description?: string;
}

export interface Debt {
  id: string;
  supplierId: string;
  description?: string;
  totalAmount: number;
  dateAdded: string;
}

// Global type augmentation for Express session
declare module 'express-session' {
  interface SessionData {
    user?: LoggedInUser;
  }
}
