/*
  # Criar tabelas de fornecedores

  1. Novas Tabelas
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `cnpj` (text, optional)
      - `phone` (text, optional)
      - `email` (text, optional)
      - `address` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `supplier_debts`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, foreign key)
      - `description` (text, optional)
      - `total_amount` (numeric, required)
      - `date_added` (date, required)
      - `created_at` (timestamp)
    
    - `supplier_credits`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, foreign key)
      - `amount` (numeric, required)
      - `date` (date, required)
      - `description` (text, optional)
      - `created_at` (timestamp)

  2. Segurança
    - Habilitar RLS nas tabelas
    - Políticas para admins e vendas
*/

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

CREATE TABLE IF NOT EXISTS supplier_debts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    description text,
    total_amount numeric(10,2) NOT NULL,
    date_added date NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL,
    date date NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_credits_supplier ON supplier_credits(supplier_id);

-- Habilitar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_credits ENABLE ROW LEVEL SECURITY;

-- Políticas para suppliers
CREATE POLICY "Usuários autenticados podem ler fornecedores"
    ON suppliers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins e vendas podem gerenciar fornecedores"
    ON suppliers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );

-- Políticas para supplier_debts
CREATE POLICY "Usuários autenticados podem ler dívidas de fornecedores"
    ON supplier_debts
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins e vendas podem gerenciar dívidas de fornecedores"
    ON supplier_debts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );

-- Políticas para supplier_credits
CREATE POLICY "Usuários autenticados podem ler créditos de fornecedores"
    ON supplier_credits
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins e vendas podem gerenciar créditos de fornecedores"
    ON supplier_credits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );