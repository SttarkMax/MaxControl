/*
  # Criar tabela de categorias

  1. Nova Tabela
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `categories`
    - Política para usuários autenticados lerem
    - Política para admins e vendas editarem
*/

CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Inserir categorias padrão
INSERT INTO categories (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Impressão Digital'),
('22222222-2222-2222-2222-222222222222', 'Sinalização'),
('33333333-3333-3333-3333-333333333333', 'Material Promocional'),
('44444444-4444-4444-4444-444444444444', 'Acabamentos')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler categorias"
    ON categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para escrita (admins e vendas)
CREATE POLICY "Admins e vendas podem gerenciar categorias"
    ON categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' IN ('admin', 'sales')
        )
    );