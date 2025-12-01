-- Adiciona campos para controle de emails válidos e verificados
-- Executar manualmente: node migrate-add-email-validation.js

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Atualizar usuários existentes (considerar todos como não verificados inicialmente)
UPDATE users SET email_bounced = false, email_verified = false WHERE email_bounced IS NULL;

COMMENT ON COLUMN users.email_bounced IS 'Marca emails que retornaram bounce (não existem ou são inválidos)';
COMMENT ON COLUMN users.email_verified IS 'Marca se o usuário verificou o email (futuro: link de confirmação)';
