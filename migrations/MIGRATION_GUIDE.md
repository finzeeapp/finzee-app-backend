# 🗃️ Guia de Migration Manual - Supabase

## 📋 Passo a Passo para Aplicar a Migration

### 1️⃣ Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **finzee**
3. No menu lateral, clique em **SQL Editor**

### 2️⃣ Executar o SQL

1. Clique em **"New query"**
2. Copie todo o conteúdo do arquivo: **`migrations/add_email_notifications.sql`**
3. Cole no editor SQL
4. Clique em **"Run"** (ou pressione Ctrl+Enter)

### 3️⃣ Verificar Sucesso

Você deve ver:

```
✅ Migration completed successfully!
   total_users: [número de usuários]
```

E uma tabela mostrando as novas colunas:

```
column_name                  | data_type | column_default | is_nullable
─────────────────────────────┼───────────┼────────────────┼─────────────
emailNotificationsEnabled    | boolean   | true           | YES
lastNotificationSent         | timestamp | NULL           | YES
notificationDaysBefore       | integer   | 3              | YES
```

---

## 🔍 O que a Migration Faz

1. **Adiciona 2 campos na tabela `users`**:
   - `emailNotificationsEnabled` (boolean, default: true)
   - `lastNotificationSent` (timestamp, nullable)

2. **Cria tabela `notification_logs`**:
   - Registra histórico de notificações enviadas
   - Com índices para performance
   - Com foreign key para `users`

3. **Verifica campo existente**:
   - `notificationDaysBefore` (caso não exista, cria com default 3)

---

## 🧪 Testar a Migration

### Verificar campos no users:

```sql
SELECT 
    id,
    email,
    "notificationDaysBefore",
    "emailNotificationsEnabled",
    "lastNotificationSent"
FROM users
LIMIT 5;
```

### Verificar tabela notification_logs:

```sql
SELECT * FROM notification_logs LIMIT 10;
```

### Testar INSERT em notification_logs:

```sql
INSERT INTO notification_logs (
    id,
    "userId",
    type,
    "overdueCount",
    "dueSoonCount",
    "urgencyLevel"
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users LIMIT 1),
    'EMAIL',
    2,
    3,
    'alert'
);

-- Verificar
SELECT * FROM notification_logs;
```

---

## ⚠️ Troubleshooting

### Erro: "column already exists"
✅ **Normal!** A migration usa `IF NOT EXISTS`, então é seguro executar múltiplas vezes.

### Erro: "permission denied"
❌ Verifique se você está logado como owner do projeto no Supabase.

### Erro: "table not found"
❌ Confirme que está executando no banco correto (selecione o projeto certo).

---

## 🔄 Atualizar Prisma Client

Após executar a migration no Supabase, atualize o Prisma Client:

```bash
cd finzee-backend
npx prisma generate
```

Isso sincroniza o Prisma Client com as novas colunas.

---

## ✅ Checklist

- [ ] Acessei o Supabase Dashboard
- [ ] Abri o SQL Editor
- [ ] Copiei e colei o SQL de `migrations/add_email_notifications.sql`
- [ ] Executei o SQL com sucesso
- [ ] Verifiquei os campos criados
- [ ] Executei `npx prisma generate` no backend
- [ ] Testei um INSERT em `notification_logs`

---

## 🚀 Próximo Passo

Depois da migration aplicada, você pode:

1. **Configurar Gmail** (veja `NOTIFICATION_SETUP.md`)
2. **Testar o backend**: `npm run dev`
3. **Testar envio**: `POST /api/notifications/test-email`

---

## 📞 Ajuda Adicional

Se algo der errado:
1. Copie o erro completo
2. Verifique se está no projeto correto
3. Verifique permissões de escrita no banco
4. Tente executar cada `ALTER TABLE` separadamente

**Arquivo SQL**: `migrations/add_email_notifications.sql`
