/*
  # Criar estrutura completa do sistema

  1. Tabelas principais
    - user_profiles: Perfis de usuários
    - company_info: Informações da empresa
    - categories: Categorias de produtos
    - products: Produtos
    - customers: Clientes
    - down_payments: Sinais/adiantamentos
    - quotes: Orçamentos
    - suppliers: Fornecedores
    - supplier_debts: Dívidas com fornecedores
    - supplier_credits: Créditos/pagamentos a fornecedores
    - accounts_payable: Contas a pagar

  2. Dados iniciais
    - Usuário administrador padrão
    - Informações básicas da empresa
    - Categorias de exemplo
*/

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de informações da empresa
CREATE TABLE IF NOT EXISTS company_info (
  id bigint PRIMARY KEY DEFAULT 1,
  name text NOT NULL,
  logo_url_dark_bg text,
  logo_url_light_bg text,
  address text,
  phone text,
  email text,
  cnpj text,
  instagram text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pricing_model text NOT NULL DEFAULT 'unidade' CHECK (pricing_model IN ('unidade', 'm2')),
  base_price numeric(10,2) NOT NULL DEFAULT 0.00,
  unit text DEFAULT 'un',
  custom_cash_price numeric(10,2),
  custom_card_price numeric(10,2),
  supplier_cost numeric(10,2),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document_type text DEFAULT 'CPF' CHECK (document_type IN ('CPF', 'CNPJ', 'N/A')),
  document_number text,
  phone text NOT NULL,
  email text,
  address text,
  city text,
  postal_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de sinais/adiantamentos
CREATE TABLE IF NOT EXISTS down_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de orçamentos
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_contact text,
  items jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0.00,
  discount_type text DEFAULT 'none' CHECK (discount_type IN ('percentage', 'fixed', 'none')),
  discount_value numeric(10,2) DEFAULT 0.00,
  discount_amount_calculated numeric(10,2) DEFAULT 0.00,
  subtotal_after_discount numeric(10,2) NOT NULL DEFAULT 0.00,
  total_cash numeric(10,2) NOT NULL DEFAULT 0.00,
  total_card numeric(10,2) NOT NULL DEFAULT 0.00,
  down_payment_applied numeric(10,2) DEFAULT 0.00,
  selected_payment_method text,
  payment_date date,
  delivery_deadline date,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted_to_order', 'cancelled')),
  company_info_snapshot jsonb NOT NULL,
  salesperson_username text NOT NULL,
  salesperson_full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de dívidas com fornecedores
CREATE TABLE IF NOT EXISTS supplier_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  description text,
  total_amount numeric(10,2) NOT NULL,
  date_added date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de créditos/pagamentos a fornecedores
CREATE TABLE IF NOT EXISTS supplier_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de contas a pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  is_paid boolean DEFAULT false,
  notes text,
  series_id uuid,
  total_installments_in_series integer,
  installment_number_of_series integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE down_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança básicas (permitir tudo para usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler perfis" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem gerenciar todos os perfis" ON user_profiles FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler informações da empresa" ON company_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas admins podem editar informações da empresa" ON company_info FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler categorias" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar categorias" ON categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler produtos" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas admins podem gerenciar produtos" ON products FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler clientes" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar clientes" ON customers FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler sinais" ON down_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar sinais" ON down_payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler orçamentos" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar orçamentos" ON quotes FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler fornecedores" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar fornecedores" ON suppliers FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler dívidas de fornecedores" ON supplier_debts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar dívidas de fornecedores" ON supplier_debts FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler créditos de fornecedores" ON supplier_credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins e vendas podem gerenciar créditos de fornecedores" ON supplier_credits FOR ALL TO authenticated USING (true);

CREATE POLICY "Apenas admins podem gerenciar contas a pagar" ON accounts_payable FOR ALL TO authenticated USING (true);

-- Inserir dados iniciais

-- Usuário administrador padrão
INSERT INTO user_profiles (id, username, full_name, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Usuário vendedor de exemplo
INSERT INTO user_profiles (id, username, full_name, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'vendedor1', 'João Vendedor', 'sales')
ON CONFLICT (username) DO NOTHING;

-- Usuário visualizador de exemplo
INSERT INTO user_profiles (id, username, full_name, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'viewer1', 'Maria Visualizadora', 'viewer')
ON CONFLICT (username) DO NOTHING;

-- Informações básicas da empresa
INSERT INTO company_info (id, name, address, phone, email) 
VALUES (1, 'Minha Empresa', 'Rua das Flores, 123 - Centro', '(11) 99999-9999', 'contato@minhaempresa.com')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

-- Categorias de exemplo
INSERT INTO categories (id, name) VALUES 
('cat-1', 'Cartões de Visita'),
('cat-2', 'Banners e Lonas'),
('cat-3', 'Materiais Gráficos'),
('cat-4', 'Adesivos')
ON CONFLICT (id) DO NOTHING;

-- Produtos de exemplo
INSERT INTO products (id, name, description, pricing_model, base_price, unit, category_id) VALUES 
('prod-1', 'Cartão de Visita - Pacote 500un', 'Cartões de visita em papel couché 300g, impressão colorida frente e verso', 'unidade', 45.00, 'pacote', 'cat-1'),
('prod-2', 'Banner 1x1m', 'Banner em lona vinílica, impressão digital colorida', 'm2', 25.00, 'm²', 'cat-2'),
('prod-3', 'Flyer A5', 'Flyer em papel couché 150g, impressão colorida', 'unidade', 0.50, 'un', 'cat-3'),
('prod-4', 'Adesivo Vinil', 'Adesivo em vinil branco, corte especial', 'm2', 35.00, 'm²', 'cat-4')
ON CONFLICT (id) DO NOTHING;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_down_payments_customer ON down_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_credits_supplier ON supplier_credits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_paid ON accounts_payable(is_paid);