/*
  # Criar usuário administrador inicial

  1. Novo usuário
    - Cria um usuário administrador padrão para acesso inicial ao sistema
    - Username: admin
    - Nome completo: Administrador
    - Role: admin

  2. Segurança
    - Usuário criado diretamente na tabela user_profiles
    - ID gerado automaticamente
*/

-- Inserir usuário administrador inicial
INSERT INTO user_profiles (id, username, full_name, role)
VALUES (
  gen_random_uuid(),
  'admin',
  'Administrador',
  'admin'
) ON CONFLICT (username) DO NOTHING;