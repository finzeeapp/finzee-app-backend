# 🚨 Como Resolver: Falha no Envio de E-mails

## ❌ Problema Atual

```
❌ Erro ao enviar e-mail para renatocanila2019@gmail.com após 10017ms: Timeout ao enviar e-mail
❌ Erro ao enviar e-mail para lucastgrimera1@gmail.com após 10009ms: Timeout ao enviar e-mail
```

**Causa:** As variáveis `GMAIL_USER` e `GMAIL_APP_PASSWORD` não estão configuradas no ambiente de produção.

---

## ✅ Solução: Configurar Credenciais do Gmail

### Passo 1: Gerar Senha de App no Gmail

1. **Acesse:** https://myaccount.google.com/apppasswords
2. **Se pedir para ativar verificação em 2 etapas:**
   - Vá em https://myaccount.google.com/security
   - Ative "Verificação em duas etapas"
   - Volte para o link de senhas de app
3. **Gerar senha:**
   - Digite o nome: `Finzee Notifications`
   - Clique em "Criar"
   - **Copie a senha de 16 dígitos** (exemplo: `abcd efgh ijkl mnop`)

⚠️ **Atenção:** Guarde essa senha! Ela aparece apenas uma vez.

---

### Passo 2: Configurar no Ambiente de Produção

#### Se estiver usando **Railway**:

1. Acesse seu projeto no Railway
2. Vá em **Variables** (ícone de engrenagem)
3. Clique em **+ New Variable**
4. Adicione as duas variáveis:

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

⚠️ **Importante:** Na senha de app, **remova todos os espaços** (use só os 16 caracteres juntos)

#### Se estiver usando **Vercel**:

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as variáveis:
   - **Name:** `GMAIL_USER` → **Value:** `seu-email@gmail.com`
   - **Name:** `GMAIL_APP_PASSWORD` → **Value:** `abcdefghijklmnop`

#### Se estiver usando **Heroku**:

1. Acesse seu app no Heroku
2. Vá em **Settings** → **Config Vars**
3. Clique em **Reveal Config Vars**
4. Adicione:
   - `GMAIL_USER` = `seu-email@gmail.com`
   - `GMAIL_APP_PASSWORD` = `abcdefghijklmnop`

---

### Passo 3: Reiniciar o Servidor

Após adicionar as variáveis, **reinicie o deploy**:

- **Railway:** Deploy automático ao salvar
- **Vercel:** Redeploy manual em Deployments
- **Heroku:** `heroku restart -a seu-app`

---

### Passo 4: Verificar nos Logs

Após reiniciar, você deve ver nos logs:

```
✅ Scheduler de notificações iniciado! Executará às 8h diariamente.
```

E ao testar o endpoint `/test-email`, você verá:

```
📧 GMAIL_USER: ✓ Configurado
📧 GMAIL_APP_PASSWORD: ✓ Configurado
✅ Conexão SMTP OK
✅ E-mail enviado para seu-email@gmail.com em 3421ms
```

---

## 🧪 Como Testar Rapidamente

### 1. Usando Postman/Insomnia

```http
POST https://seu-dominio.com/api/notifications/test-direct
Authorization: Bearer SEU_TOKEN_JWT
```

### 2. Esperado na Resposta:

```json
{
  "success": true,
  "userId": "seu-user-id",
  "userEmail": "seu-email@gmail.com",
  "sent": true,
  "gmailConfig": {
    "user": "✓ Configurado",
    "password": "✓ Configurado"
  },
  "smtpConnection": "✓ OK",
  "expenses": {
    "overdue": 1,
    "dueSoon": 1
  }
}
```

### 3. Verificar E-mail:

- Cheque sua caixa de entrada
- **Se não aparecer, olhe na pasta SPAM** (primeira vez pode cair lá)

---

## 🔍 Troubleshooting

### Problema: Ainda dá timeout após configurar

**Solução:** Verifique se:
1. ✅ A senha de app não tem espaços (deve ser `abcdefghijklmnop`, não `abcd efgh ijkl mnop`)
2. ✅ O e-mail está correto (sem espaços antes/depois)
3. ✅ O servidor foi reiniciado após adicionar as variáveis
4. ✅ A verificação em 2 etapas está ativa no Gmail

### Problema: "Invalid login"

**Solução:**
- Gere uma nova senha de app
- Use um e-mail Gmail válido (não pode ser e-mail corporativo G Suite sem configuração)

### Problema: E-mail cai no SPAM

**Solução:**
- Normal na primeira vez
- Marque como "Não é spam"
- Nos próximos envios cairá na caixa de entrada

---

## 📋 Checklist Final

Antes de testar, confirme:

- [ ] ✅ Verificação em 2 etapas ativada no Gmail
- [ ] ✅ Senha de app gerada em https://myaccount.google.com/apppasswords
- [ ] ✅ `GMAIL_USER` configurado no ambiente de produção
- [ ] ✅ `GMAIL_APP_PASSWORD` configurado (sem espaços)
- [ ] ✅ Servidor reiniciado após configurar variáveis
- [ ] ✅ Logs mostram "Scheduler de notificações iniciado"

---

## 🎯 Exemplo Real de Configuração

```env
# ❌ ERRADO (com espaços na senha)
GMAIL_USER=joao@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# ✅ CORRETO (senha sem espaços)
GMAIL_USER=joao@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

---

## 📞 Precisa de Ajuda?

Se após seguir todos os passos ainda der erro:

1. Verifique os logs completos do servidor
2. Teste o endpoint `/test-direct` (mais simples que `/test-email`)
3. Confirme que o e-mail configurado no `GMAIL_USER` é o mesmo que você quer usar

---

**Próximo Passo:** Configure as variáveis agora e teste o endpoint `/test-direct` novamente! 🚀
