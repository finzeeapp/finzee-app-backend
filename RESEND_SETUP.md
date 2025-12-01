# 🚀 Como Obter a API Key do Resend

## 📝 Passo a Passo (3 minutos)

### 1. Criar Conta no Resend

1. Acesse: https://resend.com/signup
2. Cadastre-se com seu e-mail (ou use GitHub/Google)
3. Confirme seu e-mail

### 2. Gerar API Key

1. Após login, vá em: https://resend.com/api-keys
2. Clique em **"Create API Key"**
3. Configurações:
   - **Name:** `Finzee Production`
   - **Permission:** `Sending access` (Full access)
   - **Domain:** `All domains`
4. Clique em **"Add"**
5. **COPIE A API KEY** (formato: `re_xxxxxxxxxxxxxxxxx`)
   - ⚠️ Ela aparece apenas UMA VEZ!

### 3. Configurar no Projeto

#### Localmente (.env):
```env
RESEND_API_KEY="re_sua_api_key_copiada"
RESEND_FROM_EMAIL="Finzee <onboarding@resend.dev>"
```

#### No Railway:
1. Acesse seu projeto no Railway
2. Vá em **Variables**
3. Adicione:
   ```
   RESEND_API_KEY=re_sua_api_key_copiada
   RESEND_FROM_EMAIL=Finzee <onboarding@resend.dev>
   ```
4. O deploy reinicia automaticamente

### 4. Testar

```bash
# Compilar
npm run build

# Testar localmente (opcional)
npm run dev

# Fazer commit e push
git add .
git commit -m "feat: Migra de Gmail SMTP para Resend API"
git push origin main
```

---

## 📧 Sobre o E-mail Remetente

### Plano Gratuito (100 emails/dia):
- Use: `onboarding@resend.dev`
- Funciona imediatamente, sem configuração
- Ideal para testes e projetos pequenos

### Plano Pago ou Domínio Próprio:
1. Vá em: https://resend.com/domains
2. Adicione seu domínio
3. Configure os registros DNS (TXT, MX, CNAME)
4. Use: `notifications@seudominio.com`

---

## ✅ Vantagens do Resend vs Gmail

| Recurso | Gmail SMTP | Resend |
|---------|-----------|---------|
| **Funciona no Railway** | ❌ Bloqueado | ✅ Funciona |
| **Velocidade** | ~1-2s por email | ~200-500ms |
| **Limite diário (grátis)** | ~500 emails | 100 emails |
| **Cai em spam?** | Às vezes | Raramente |
| **Dashboard** | ❌ | ✅ Com estatísticas |
| **Setup** | Senha de app, 2FA | Só API key |

---

## 🧪 Testar Após Deploy

### 1. Endpoint de Diagnóstico:
```http
GET https://seu-dominio.railway.app/api/notifications/test-smtp
Authorization: Bearer SEU_TOKEN
```

### 2. Envio Real:
```http
POST https://seu-dominio.railway.app/api/notifications/test-direct
Authorization: Bearer SEU_TOKEN
```

Deve retornar em **menos de 1 segundo**! 🚀

---

## 🆘 Troubleshooting

### Erro: "API key is invalid"
- Certifique-se que copiou a chave completa (começa com `re_`)
- Verifique se não tem espaços antes/depois
- Gere uma nova API key se necessário

### Erro: "From email not verified"
- Use `onboarding@resend.dev` no plano gratuito
- Ou adicione e verifique seu domínio próprio

### Não recebe e-mails:
- Verifique pasta de SPAM
- Confirme que RESEND_FROM_EMAIL está configurado
- Veja logs no dashboard: https://resend.com/emails

---

## 📊 Limites do Plano Gratuito

- ✅ **100 emails/dia** (3.000/mês)
- ✅ **1 domínio verificado**
- ✅ **Dashboard com estatísticas**
- ✅ **Sem cartão de crédito necessário**

Para 5 usuários com 1 notificação/dia = **35 emails/semana** (bem dentro do limite!)

---

**🎯 Próximo Passo:** Crie sua conta e copie a API key agora!
