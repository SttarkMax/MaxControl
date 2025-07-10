/*
  # Criar tabela de produtos

  1. Nova Tabela
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `pricing_model` (text, enum: 'unidade' ou 'm2')
      - `base_price` (numeric, required)
      - `unit` (text, default 'un')
      - `custom_cash_price` (numeric, optional)
      - `custom_card_price` (numeric, optional)
      - `supplier_cost` (numeric, optional)
      - `category_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `products`
    - Política para usuários autenticados lerem
    - Política para admins editarem
*/

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

-- Inserir produtos de exemplo
INSERT INTO products (id, name, description, pricing_model, base_price, unit, category_id) VALUES 
(
    '55555555-5555-5555-5555-555555555555',
    'Cartão de Visita - Pacote 500un',
    'Cartões de visita em papel couché 300g, impressão colorida frente e verso',
    'unidade',
    45.00,
    'pacote c/ 500',
    '11111111-1111-1111-1111-111111111111'
),
(
    '66666666-6666-6666-6666-666666666666',
    'Banner em Lona',
    'Banner personalizado em lona vinílica, impressão digital de alta qualidade',
    'm2',
    25.00,
    'm²',
    '22222222-2222-2222-2222-222222222222'
),
(
    '77777777-7777-7777-7777-777777777777',
    'Flyer A5',
    'Flyers em papel couché 150g, impressão colorida',
    'unidade',
    0.15,
    'unidade',
    '33333333-3333-3333-3333-333333333333'
),
(
    '88888888-8888-8888-8888-888888888888',
    'Adesivo Vinil',
    'Adesivo em vinil branco, corte eletrônico',
    'm2',
    18.00,
    'm²',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_pricing ON products(pricing_model);

-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler produtos"
    ON products
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para escrita (admins)
CREATE POLICY "Apenas admins podem gerenciar produtos"
    ON products
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );