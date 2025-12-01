# 🚀 TESTE RÁPIDO - Notificações

## ✅ **NOVO ENDPOINT CRIADO**

Use este endpoint que **SEMPRE envia e-mail** (mesmo sem despesas):

```bash
POST /api/notifications/test-direct
Authorization: Bearer SEU_TOKEN
```

---

## 📋 **Como Testar**

### **1. Via Postman/Insomnia:**

```
Method: POST
URL: http://localhost:3000/api/notifications/test-direct
Headers:
  Authorization: Bearer SEU_TOKEN_JWT
  Content-Type: application/json
```

### **2. Via cURL:**

```bash
curl -X POST http://localhost:3000/api/notifications/test-direct \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

### **3. Via Frontend (JavaScript):**

```javascript
fetch('/api/notifications/test-direct', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📧 **O que o endpoint faz:**

1. ✅ Verifica se `GMAIL_USER` e `GMAIL_APP_PASSWORD` estão configurados
2. ✅ Testa conexão SMTP com Gmail
3. ✅ Busca seus dados e despesas
4. ✅ **Se não tiver despesas**: Cria dados fictícios para teste
5. ✅ **Envia e-mail para SEU e-mail cadastrado**
6. ✅ Retorna status detalhado

---

## 📊 **Respostas Esperadas**

### **✅ Sucesso:**
```json
{
  "success": true,
  "message": "E-mail de teste enviado para seu-email@gmail.com",
  "sentTo": "seu-email@gmail.com",
  "expensesCount": {
    "overdue": 0,
    "dueSoon": 2
  },
  "isFakeData": true
}
```

### **❌ Sem configuração:**
```json
{
  "success": false,
  "error": "Variáveis GMAIL_USER ou GMAIL_APP_PASSWORD não configuradas no .env"
}
```

### **❌ Erro SMTP:**
```json
{
  "success": false,
  "error": "Falha na conexão SMTP. Verifique GMAIL_USER e GMAIL_APP_PASSWORD"
}
```

---

## 🔍 **Verificar Logs**

No terminal do backend, você verá:

```
🧪 Teste direto de e-mail para usuário: abc-123
📧 GMAIL_USER: ✓ Configurado
📧 GMAIL_APP_PASSWORD: ✓ Configurado
🔌 Testando conexão SMTP...
✅ Conexão SMTP OK
👤 Buscando dados do usuário...
👤 Usuário: Seu Nome (seu-email@gmail.com)
💳 Despesas não pagas: 0
⚠️ Sem despesas reais, criando dados fictícios para teste...
📊 Atrasadas: 0, Vencendo: 2
📧 Enviando e-mail...
✅ E-mail enviado com sucesso!
```

---

## 📬 **Verificar E-mail**

1. **Verifique sua caixa de entrada**: `seu-email@gmail.com`
2. **Se não chegou**: Verifique SPAM/Lixo Eletrônico
3. **Primeira vez**: Gmail pode demorar 1-2 minutos

---

## ⚙️ **Configuração Necessária no .env**

```env
GMAIL_USER="seu-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

**Como gerar a senha:**
1. https://myaccount.google.com/security
2. Ativar verificação em 2 etapas
3. https://myaccount.google.com/apppasswords
4. Gerar senha para "E-mail"

---

## 🆚 **Diferença dos Endpoints**

| Endpoint | Uso | Comportamento |
|----------|-----|---------------|
| `/test-email` | Teste do scheduler completo | Segue regras (pode não enviar) |
| `/test-direct` | **TESTE FORÇADO** | **Sempre envia** (cria dados fictícios se necessário) |

---

## ✅ **Checklist Rápido**

- [ ] Backend rodando (`npm run dev`)
- [ ] `.env` com `GMAIL_USER` e `GMAIL_APP_PASSWORD`
- [ ] Token JWT válido
- [ ] Fazer `POST /api/notifications/test-direct`
- [ ] Verificar logs do backend
- [ ] Verificar e-mail (inbox ou spam)

---

**NOVO ENDPOINT CRIADO ESPECIALMENTE PARA TESTE!** 🎉

Use `/test-direct` que **sempre funciona** e envia para **seu e-mail**!
