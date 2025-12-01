# 🚀 EXECUÇÃO MANUAL DA MIGRATION - PASSO A PASSO

## ⚡ Solução Rápida (2 minutos)

### 1️⃣ Acesse o Supabase
- URL: https://supabase.com/dashboard
- Faça login
- Selecione seu projeto **finzee**

### 2️⃣ Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Clique em **"New query"**

### 3️⃣ Execute o SQL

**Copie e cole este SQL completo:**

```sql
-- ===== MIGRATION: Email Notifications =====

-- 1. Adicionar campos na tabela users
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

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS "notification_logs_userId_idx" ON "notification_logs"("userId");
CREATE INDEX IF NOT EXISTS "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- 4. Foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notification_logs_userId_fkey'
    ) THEN
        ALTER TABLE "notification_logs" 
        ADD CONSTRAINT "notification_logs_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Verificar notificationDaysBefore
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='notificationDaysBefore'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "notificationDaysBefore" INTEGER DEFAULT 3;
    END IF;
END $$;

-- ===== VERIFICAÇÃO =====
SELECT 'Migration completed!' as status;
SELECT COUNT(*) as total_users FROM "users";
```

### 4️⃣ Clique em "Run" (ou Ctrl+Enter)

Você deve ver:
```
✅ Success. No rows returned
✅ status: "Migration completed!"
✅ total_users: [seu número de usuários]
```

---

## 🧪 Verificar se funcionou

Execute este SQL para confirmar:

```sql
-- Ver novos campos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('emailNotificationsEnabled', 'lastNotificationSent', 'notificationDaysBefore')
ORDER BY column_name;

-- Ver tabela criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'notification_logs';
```

Deve retornar:
```
emailNotificationsEnabled | boolean   | true
lastNotificationSent      | timestamp | NULL
notificationDaysBefore    | integer   | 3

table_name: notification_logs
```

---

## ✅ Depois da Migration

### No seu computador, execute:

```powershell
cd C:\finzee\finzee-backend
npx prisma generate
```

Isso atualiza o Prisma Client com as novas colunas.

---

## 🎉 Pronto!

Agora você pode:
1. ✅ Configurar Gmail no `.env`
2. ✅ Rodar `npm run dev`
3. ✅ Testar com `POST /api/notifications/test-email`

---

## ⚠️ Se der erro

**"relation notification_logs already exists"**
→ Normal! Significa que já foi executado. Pode ignorar.

**"column already exists"**
→ Normal! O SQL usa `IF NOT EXISTS`, é seguro executar múltiplas vezes.

**"permission denied"**
→ Confirme que está logado como owner do projeto no Supabase.

---

**Arquivo SQL completo**: `migrations/add_email_notifications.sql`
**Este guia**: `migrations/EXECUCAO_RAPIDA.md`
