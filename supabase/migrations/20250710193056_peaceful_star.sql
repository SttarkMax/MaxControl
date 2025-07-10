/*
  # Criar tabela de informações da empresa

  1. Nova Tabela
    - `company_info`
      - `id` (int, primary key, default 1)
      - `name` (text, required)
      - `logo_url_dark_bg` (text, optional)
      - `logo_url_light_bg` (text, optional)
      - `address` (text, optional)
      - `phone` (text, optional)
      - `email` (text, optional)
      - `cnpj` (text, optional)
      - `instagram` (text, optional)
      - `website` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `company_info`
    - Política para usuários autenticados lerem
    - Política para admins editarem
*/

CREATE TABLE IF NOT EXISTS company_info (
    id int PRIMARY KEY DEFAULT 1,
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

-- Inserir informações padrão da empresa
INSERT INTO company_info (id, name, address, phone, email) 
VALUES (1, 'MaxControl ERP', 'Rua Exemplo, 123 - Centro', '(11) 99999-9999', 'contato@maxcontrol.com.br')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler informações da empresa"
    ON company_info
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para escrita (apenas admins)
CREATE POLICY "Apenas admins podem editar informações da empresa"
    ON company_info
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );