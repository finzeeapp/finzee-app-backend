# Configuração do Webhook Resend

## 🔧 Como configurar o webhook no dashboard do Resend:

### 1. Acesse o Dashboard do Resend
- Vá para: https://resend.com/webhooks
- Faça login na sua conta

### 2. Adicione um novo Webhook
- Clique em **"Add Webhook"**
- **Endpoint URL**: `https://finzee-app-backend-production.up.railway.app/api/webhooks/resend`
- **Events** (selecione estes):
  - ✅ `email.bounced` - Email rejeitado permanentemente
  - ✅ `email.complained` - Usuário marcou como spam
  - ✅ `email.delivery_delayed` - Entrega atrasada (pode indicar problema)

### 3. Salve e teste
- Clique em **"Create Webhook"**
- Use a opção **"Send test event"** para testar

## 🚀 O que o webhook faz:

Quando um email tem problema (bounce, spam complaint, etc), o Resend envia automaticamente uma notificação para o nosso backend, que:

1. Recebe o evento no endpoint `/api/webhooks/resend`
2. Identifica o email do usuário
3. Marca `emailBounced = true` no banco de dados
4. Nas próximas execuções do scheduler, esse usuário será **automaticamente ignorado**

## 📊 Eventos capturados:

```json
{
  "type": "email.bounced",
  "created_at": "2025-12-01T20:30:00Z",
  "data": {
    "to": ["usuario@example.com"],
    "subject": "Notificação Finzee",
    "bounce": {
      "type": "permanent",
      "subtype": "on_account_suppression_list"
    }
  }
}
```

## 🔍 Verificar se está funcionando:

### Logs do Railway:
```
📬 Webhook Resend recebido: {
  type: 'email.bounced',
  email: 'usuario@example.com',
  created: '2025-12-01T20:30:00Z'
}
🚫 Email marcado como bounced via webhook: usuario@example.com (tipo: email.bounced)
```

### Verificar no banco:
```sql
SELECT email, emailBounced, emailNotificationsEnabled 
FROM users 
WHERE emailBounced = true;
```

## ⚠️ Importante:

- O webhook funciona **em tempo real** - assim que o Resend detecta um bounce
- Mais confiável que detectar apenas no envio
- Funciona mesmo se o email estiver na "suppression list" antes de tentarmos enviar
- Não precisa de autenticação (o Resend assina os requests automaticamente)

## 🔄 Para remover um email da suppression list:

1. No dashboard do Resend, vá em **Emails → Suppression List**
2. Encontre o email e clique em **"Remove"**
3. No nosso banco, atualize manualmente:
   ```sql
   UPDATE users 
   SET emailBounced = false, emailVerified = false 
   WHERE email = 'usuario@example.com';
   ```

---

**URL do Webhook**: `https://finzee-app-backend-production.up.railway.app/api/webhooks/resend`
