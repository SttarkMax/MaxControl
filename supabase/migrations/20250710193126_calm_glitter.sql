/*
  # Criar tabela de clientes e sinais

  1. Novas Tabelas
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `document_type` (text, enum)
      - `document_number` (text, optional)
      - `phone` (text, required)
      - `email` (text, optional)
      - `address` (text, optional)
      - `city` (text, optional)
      - `postal_code` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `down_payments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `amount` (numeric, required)
      - `date` (date, required)
      - `description` (text, optional)
      - `created_at` (timestamp)

  2. Segurança
    - Habilitar RLS nas tabelas
    - Políticas para usuários autenticados
*/

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

CREATE TABLE IF NOT EXISTS down_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL,
    date date NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_down_payments_customer ON down_payments(customer_id);

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE down_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Usuários autenticados podem ler clientes"
    ON customers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins e vendas podem gerenciar clientes"
    ON customers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );

-- Políticas para down_payments
CREATE POLICY "Usuários autenticados podem ler sinais"
    ON down_payments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins e vendas podem gerenciar sinais"
    ON down_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );