# 📧 Sistema de Notificações por E-mail - Finzee

## 🎯 Funcionalidades Implementadas

### ✅ Notificações Automáticas por E-mail
- **Envio diário às 8h da manhã** (horário de Brasília)
- **E-mails personalizados** com resumo de contas vencendo e atrasadas
- **Templates HTML responsivos** com design profissional
- **Níveis de urgência**: Normal, Alerta e Urgente

### 📋 Regras de Notificação

1. **Contas Vencendo**:
   - Envia e-mail **diariamente** dentro do período configurado pelo usuário (1-5 dias antes)
   - Exemplo: Se configurado 3 dias antes, recebe notificação 3 dias antes até o dia do vencimento

2. **Contas Atrasadas**:
   - **Primeiros 2 dias**: Envia e-mail **diariamente** com nível de urgência "Alerta"
   - **Após 2 dias**: Envia **a cada 5 dias** com nível de urgência "Urgente"

3. **Sem envio desnecessário**:
   - Não envia e-mail se não houver despesas vencendo ou atrasadas
   - Máximo de **1 e-mail por dia** às 8h da manhã

### ⚙️ Configurações do Usuário

- **Dias de antecedência**: 1 a 5 dias antes do vencimento
- **Ativar/Desativar**: Toggle para habilitar ou desabilitar notificações por e-mail

---

## 🚀 Configuração (Passo a Passo)

### 1️⃣ Configurar Gmail para Envio

#### Passo 1: Ativar Verificação em 2 Etapas
1. Acesse [Conta Google - Segurança](https://myaccount.google.com/security)
2. Em "Como fazer login no Google", clique em "Verificação em duas etapas"
3. Ative a verificação em 2 etapas (siga as instruções)

#### Passo 2: Gerar Senha de App
1. Após ativar a verificação em 2 etapas, volte para [Segurança](https://myaccount.google.com/security)
2. Procure por "Senhas de app" (ou acesse diretamente: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
3. Em "Selecione o app", escolha **"E-mail"** ou **"Outro (nome personalizado)"**
4. Digite um nome como "Finzee Backend"
5. Clique em "Gerar"
6. **Copie a senha gerada** (16 caracteres sem espaços) - você só verá uma vez!

#### Passo 3: Adicionar no `.env`
```env
GMAIL_USER="seu-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"  # Senha de 16 dígitos gerada
FRONTEND_URL="http://localhost:4200"
```

### 2️⃣ Atualizar Banco de Dados

Execute a migration do Prisma:

```bash
cd finzee-backend
npx prisma migrate deploy
```

Ou se estiver em desenvolvimento:

```bash
npx prisma migrate dev
```

### 3️⃣ Iniciar o Backend

```bash
npm run dev
```

O scheduler será inicializado automaticamente e você verá:
```
📅 Scheduler de pendências mensais inicializado
🕐 Iniciando scheduler de notificações diárias...
✅ Scheduler de notificações iniciado! Executará às 8h diariamente.
```

---

## 🧪 Testar o Sistema

### Teste Manual (via API)

Faça uma requisição POST para testar imediatamente:

```bash
POST http://localhost:3000/api/notifications/test-email
Authorization: Bearer SEU_TOKEN_JWT
```

Resposta esperada:
```json
{
  "success": true,
  "message": "2/5 notificações enviadas",
  "details": [
    {
      "userId": "abc123",
      "userEmail": "usuario@example.com",
      "sent": true,
      "reason": "Notificação enviada com sucesso"
    }
  ]
}
```

### Verificar Logs

O sistema exibe logs detalhados no console:

```
🔍 Iniciando verificação de vencimentos...
👥 3 usuário(s) com notificações ativadas
✅ E-mail enviado para joao@example.com (alert)
📭 Sem despesas para notificar: maria@example.com
✅ 1/3 notificações enviadas
```

---

## 📊 Estrutura do Banco de Dados

### Campos Adicionados em `User`:
```prisma
notificationDaysBefore    Int?      @default(3)      // 1-5 dias
emailNotificationsEnabled Boolean?  @default(true)   // Ativo/Inativo
lastNotificationSent      DateTime?                  // Última notificação
```

### Nova Tabela `NotificationLog`:
```prisma
model NotificationLog {
  id            String   @id @default(uuid())
  userId        String
  type          String   // EMAIL, WEB_PUSH, SMS
  overdueCount  Int      // Quantidade de contas atrasadas
  dueSoonCount  Int      // Quantidade de contas vencendo
  urgencyLevel  String   // normal, alert, urgent
  sentAt        DateTime @default(now())
}
```

---

## 🎨 Exemplo de E-mail

O e-mail enviado contém:

- **Header colorido** com ícone de urgência (🔔 / ⚠️ / 🚨)
- **Resumo rápido** com totais
- **Cards de despesas** com:
  - Título e descrição
  - Valor em destaque
  - Data de vencimento
  - Badge de status (Atrasado / Vencendo em X dias)
  - Categoria com ícone
- **Total em destaque**
- **Botão de ação** para acessar o app
- **Footer** com links de configuração

### Níveis de Urgência:

| Nível | Cor | Ícone | Quando |
|-------|-----|-------|--------|
| **Normal** | Azul | 🔔 | Apenas lembretes de vencimento |
| **Alerta** | Laranja | ⚠️ | Primeiros 2 dias de atraso |
| **Urgente** | Vermelho | 🚨 | Após 2 dias de atraso (a cada 5 dias) |

---

## 📱 Próximos Passos (Web Push)

Para implementar **Web Push Notifications**, você precisará:

1. Criar projeto no [Firebase Console](https://console.firebase.google.com/)
2. Instalar `firebase-admin` no backend
3. Configurar Service Worker no frontend
4. Implementar `web-push.service.ts`

Documentação completa será adicionada quando implementado.

---

## 🛠️ Arquivos Criados/Modificados

### Backend:
- ✨ `src/services/email.service.ts` - Serviço de envio de e-mail
- ✨ `src/services/due-date-checker.service.ts` - Verificação de vencimentos
- ✨ `src/services/daily-notification.scheduler.ts` - Scheduler diário
- 📝 `src/services/auth.service.ts` - Atualizado com novos campos
- 📝 `src/controllers/notification.controller.ts` - Endpoint de teste
- 📝 `src/routes/notification.routes.ts` - Rota de teste
- 📝 `src/main.ts` - Inicialização do scheduler
- 📝 `prisma/schema.prisma` - Novos campos e tabela
- 📝 `.env.example` - Variáveis de ambiente

### Dependências Instaladas:
- `nodemailer` - Envio de e-mails
- `@types/nodemailer` - Types do TypeScript
- `node-cron` - Agendamento de tarefas
- `@types/node-cron` - Types do TypeScript

---

## ❓ FAQ

### Não estou recebendo e-mails. O que fazer?

1. Verifique se as variáveis `GMAIL_USER` e `GMAIL_APP_PASSWORD` estão corretas no `.env`
2. Confirme que a verificação em 2 etapas está ativa no Gmail
3. Verifique os logs do backend para erros
4. Teste manualmente com o endpoint `/api/notifications/test-email`
5. Verifique a pasta de spam/lixo eletrônico

### Como alterar o horário de envio?

Edite `src/services/daily-notification.scheduler.ts`, linha com o cron:

```typescript
// Formato: minuto hora dia mês dia-da-semana
this.cronJob = cron.schedule('0 8 * * *', async () => {
  // 0 8 = às 8h
  // 0 9 = às 9h
  // 30 7 = às 7h30
```

### Posso usar outro serviço de e-mail?

Sim! Modifique `src/services/email.service.ts`:

**Para SendGrid**:
```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
```

**Para Resend**:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do backend
2. Teste o endpoint manual
3. Confirme as configurações do Gmail
4. Verifique se o banco de dados foi atualizado

---

**Desenvolvido com ❤️ para o Finzee**
