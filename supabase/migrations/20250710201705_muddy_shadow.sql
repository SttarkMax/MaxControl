/*
  # Inserir informações iniciais da empresa

  1. Dados da empresa
    - Insere informações básicas da empresa para o sistema funcionar
    - ID fixo = 1 para facilitar consultas
    - Dados podem ser alterados posteriormente via interface

  2. Estrutura
    - Nome da empresa
    - Informações de contato básicas
    - Campos de logo opcionais
*/

-- Inserir informações básicas da empresa
INSERT INTO company_info (
  id, 
  name, 
  address, 
  phone, 
  email,
  created_at,
  updated_at
) VALUES (
  1,
  'MaxControl - Sistema de Gestão',
  'Rua Exemplo, 123 - Centro',
  '(11) 99999-9999',
  'contato@maxcontrol.com',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  updated_at = now();