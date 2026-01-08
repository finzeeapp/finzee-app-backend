-- Adicionar campos para gerenciar saldo acumulado entre meses
-- Isso permite que o sistema considere sobras/faltas do mês anterior

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accumulated_balance FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_balance_update VARCHAR(7);

-- Comentário dos campos:
-- accumulated_balance: Saldo acumulado dos meses anteriores (positivo ou negativo)
-- last_balance_update: Último mês processado no formato YYYY-MM
