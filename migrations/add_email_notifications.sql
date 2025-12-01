-- Migration: Add Email Notification Fields
-- Execute este SQL diretamente no Supabase SQL Editor

-- 1. Adicionar novos campos na tabela users
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastNotificationSent" TIMESTAMP(3);

-- 2. Criar tabela notification_logs
CREATE TABLE IF NOT EXISTS "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "overdueCount" INTEGER NOT NULL,
    "dueSoonCount" INTEGER NOT NULL,
    "urgencyLevel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS "notification_logs_userId_idx" ON "notification_logs"("userId");
CREATE INDEX IF NOT EXISTS "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- 4. Adicionar foreign key constraint
ALTER TABLE "notification_logs" 
ADD CONSTRAINT "notification_logs_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 5. Verificar se a coluna notificationDaysBefore existe (caso não exista, cria com default 3)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' 
        AND column_name='notificationDaysBefore'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "notificationDaysBefore" INTEGER DEFAULT 3;
    END IF;
END $$;

-- 6. Confirmar migração
SELECT 
    'Migration completed successfully!' as message,
    COUNT(*) as total_users 
FROM "users";

-- 7. Verificar estrutura
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
    AND column_name IN (
        'notificationDaysBefore', 
        'emailNotificationsEnabled', 
        'lastNotificationSent'
    )
ORDER BY column_name;
