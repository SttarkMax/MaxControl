/*
  # Criar tabela de perfis de usuário

  1. Nova Tabela
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique, required)
      - `full_name` (text, optional)
      - `role` (text, enum, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela
    - Políticas baseadas em roles
    - Trigger para criar perfil automaticamente

  3. Função para criar perfil automaticamente
*/

CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'viewer')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler perfis"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para usuários editarem seu próprio perfil
CREATE POLICY "Usuários podem editar seu próprio perfil"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Política para admins gerenciarem todos os perfis
CREATE POLICY "Admins podem gerenciar todos os perfis"
    ON user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Função para criar perfil automaticamente quando um usuário se registra
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, username, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'sales')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Inserir perfil de admin padrão (se não existir)
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Tentar encontrar um usuário admin existente
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@maxcontrol.com' 
    LIMIT 1;
    
    -- Se não encontrar, criar um usuário admin
    IF admin_user_id IS NULL THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'admin@maxcontrol.com',
            crypt('admin123', gen_salt('bf')),
            now(),
            '{"username": "admin", "full_name": "Administrador do Sistema", "role": "admin"}'::jsonb,
            now(),
            now()
        )
        RETURNING id INTO admin_user_id;
        
        -- Criar perfil para o admin
        INSERT INTO user_profiles (id, username, full_name, role)
        VALUES (admin_user_id, 'admin', 'Administrador do Sistema', 'admin')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;