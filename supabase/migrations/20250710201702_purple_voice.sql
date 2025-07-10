/*
  # Criar usuários de demonstração

  1. Usuários de exemplo
    - admin: Administrador do sistema
    - vendedor1: Usuário de vendas
    - viewer1: Usuário apenas visualização

  2. Segurança
    - Todos os usuários criados na tabela user_profiles
    - Diferentes níveis de acesso para demonstração
*/

-- Inserir usuários de demonstração
INSERT INTO user_profiles (id, username, full_name, role) VALUES
  (gen_random_uuid(), 'admin', 'Administrador', 'admin'),
  (gen_random_uuid(), 'vendedor1', 'João Vendedor', 'sales'),
  (gen_random_uuid(), 'viewer1', 'Maria Visualizadora', 'viewer')
ON CONFLICT (username) DO NOTHING;