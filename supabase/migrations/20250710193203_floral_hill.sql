/*
  # Criar tabela de contas a pagar

  1. Nova Tabela
    - `accounts_payable`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `amount` (numeric, required)
      - `due_date` (date, required)
      - `is_paid` (boolean, default false)
      - `notes` (text, optional)
      - `series_id` (uuid, optional)
      - `total_installments_in_series` (int, optional)
      - `installment_number_of_series` (int, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela
    - Política apenas para admins
*/

CREATE TABLE IF NOT EXISTS accounts_payable (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    is_paid boolean DEFAULT false,
    notes text,
    series_id uuid,
    total_installments_in_series int,
    installment_number_of_series int,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_series ON accounts_payable(series_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_paid ON accounts_payable(is_paid);

-- Habilitar RLS
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

-- Política apenas para admins
CREATE POLICY "Apenas admins podem gerenciar contas a pagar"
    ON accounts_payable
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );