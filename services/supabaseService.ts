import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL e Anon Key são obrigatórios. Verifique as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      company_info: {
        Row: {
          id: number;
          name: string;
          logo_url_dark_bg: string | null;
          logo_url_light_bg: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          cnpj: string | null;
          instagram: string | null;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          logo_url_dark_bg?: string | null;
          logo_url_light_bg?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          cnpj?: string | null;
          instagram?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          logo_url_dark_bg?: string | null;
          logo_url_light_bg?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          cnpj?: string | null;
          instagram?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          pricing_model: 'unidade' | 'm2';
          base_price: number;
          unit: string | null;
          custom_cash_price: number | null;
          custom_card_price: number | null;
          supplier_cost: number | null;
          category_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          pricing_model?: 'unidade' | 'm2';
          base_price?: number;
          unit?: string | null;
          custom_cash_price?: number | null;
          custom_card_price?: number | null;
          supplier_cost?: number | null;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          pricing_model?: 'unidade' | 'm2';
          base_price?: number;
          unit?: string | null;
          custom_cash_price?: number | null;
          custom_card_price?: number | null;
          supplier_cost?: number | null;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          document_type: 'CPF' | 'CNPJ' | 'N/A';
          document_number: string | null;
          phone: string;
          email: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          document_type?: 'CPF' | 'CNPJ' | 'N/A';
          document_number?: string | null;
          phone: string;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          document_type?: 'CPF' | 'CNPJ' | 'N/A';
          document_number?: string | null;
          phone?: string;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      down_payments: {
        Row: {
          id: string;
          customer_id: string;
          amount: number;
          date: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          amount: number;
          date: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          amount?: number;
          date?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          quote_number: string;
          customer_id: string | null;
          client_name: string;
          client_contact: string | null;
          items: any; // jsonb
          subtotal: number;
          discount_type: 'percentage' | 'fixed' | 'none';
          discount_value: number;
          discount_amount_calculated: number;
          subtotal_after_discount: number;
          total_cash: number;
          total_card: number;
          down_payment_applied: number;
          selected_payment_method: string | null;
          payment_date: string | null;
          delivery_deadline: string | null;
          notes: string | null;
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'cancelled';
          company_info_snapshot: any; // jsonb
          salesperson_username: string;
          salesperson_full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_number: string;
          customer_id?: string | null;
          client_name: string;
          client_contact?: string | null;
          items: any;
          subtotal?: number;
          discount_type?: 'percentage' | 'fixed' | 'none';
          discount_value?: number;
          discount_amount_calculated?: number;
          subtotal_after_discount?: number;
          total_cash?: number;
          total_card?: number;
          down_payment_applied?: number;
          selected_payment_method?: string | null;
          payment_date?: string | null;
          delivery_deadline?: string | null;
          notes?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'cancelled';
          company_info_snapshot: any;
          salesperson_username: string;
          salesperson_full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_number?: string;
          customer_id?: string | null;
          client_name?: string;
          client_contact?: string | null;
          items?: any;
          subtotal?: number;
          discount_type?: 'percentage' | 'fixed' | 'none';
          discount_value?: number;
          discount_amount_calculated?: number;
          subtotal_after_discount?: number;
          total_cash?: number;
          total_card?: number;
          down_payment_applied?: number;
          selected_payment_method?: string | null;
          payment_date?: string | null;
          delivery_deadline?: string | null;
          notes?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'cancelled';
          company_info_snapshot?: any;
          salesperson_username?: string;
          salesperson_full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          role: 'admin' | 'sales' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          role?: 'admin' | 'sales' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          role?: 'admin' | 'sales' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          cnpj: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cnpj?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cnpj?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      supplier_debts: {
        Row: {
          id: string;
          supplier_id: string;
          description: string | null;
          total_amount: number;
          date_added: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          description?: string | null;
          total_amount: number;
          date_added: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          description?: string | null;
          total_amount?: number;
          date_added?: string;
          created_at?: string;
        };
      };
      supplier_credits: {
        Row: {
          id: string;
          supplier_id: string;
          amount: number;
          date: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          amount: number;
          date: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          amount?: number;
          date?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      accounts_payable: {
        Row: {
          id: string;
          name: string;
          amount: number;
          due_date: string;
          is_paid: boolean;
          notes: string | null;
          series_id: string | null;
          total_installments_in_series: number | null;
          installment_number_of_series: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          amount: number;
          due_date: string;
          is_paid?: boolean;
          notes?: string | null;
          series_id?: string | null;
          total_installments_in_series?: number | null;
          installment_number_of_series?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          amount?: number;
          due_date?: string;
          is_paid?: boolean;
          notes?: string | null;
          series_id?: string | null;
          total_installments_in_series?: number | null;
          installment_number_of_series?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}