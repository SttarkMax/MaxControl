/*
  # Criar tabela de orçamentos

  1. Nova Tabela
    - `quotes`
      - `id` (uuid, primary key)
      - `quote_number` (text, unique, required)
      - `customer_id` (uuid, foreign key, optional)
      - `client_name` (text, required)
      - `client_contact` (text, optional)
      - `items` (jsonb, required)
      - `subtotal` (numeric, required)
      - `discount_type` (text, enum)
      - `discount_value` (numeric)
      - `discount_amount_calculated` (numeric)
      - `subtotal_after_discount` (numeric)
      - `total_cash` (numeric)
      - `total_card` (numeric)
      - `down_payment_applied` (numeric)
      - `selected_payment_method` (text)
      - `payment_date` (date)
      - `delivery_deadline` (date)
      - `notes` (text)
      - `status` (text, enum)
      - `company_info_snapshot` (jsonb)
      - `salesperson_username` (text)
      - `salesperson_full_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela
    - Políticas baseadas em roles
*/

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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_salesperson ON quotes(salesperson_username);

-- Habilitar RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos os usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler orçamentos"
    ON quotes
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para escrita (admins e vendas)
CREATE POLICY "Admins e vendas podem gerenciar orçamentos"
    ON quotes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );