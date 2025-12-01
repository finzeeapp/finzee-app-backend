# 🧪 Como Testar Notificações em Produção

## 🎯 Opções de Teste

### **1️⃣ Endpoint de Teste Manual (Recomendado)**

Já existe um endpoint que simula o envio imediato:

```bash
POST https://seu-dominio.com/api/notifications/test-email
Authorization: Bearer SEU_TOKEN_JWT
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "1/1 notificações enviadas",
  "details": [
    {
      "userId": "abc123",
      "userEmail": "usuario@email.com",
      "sent": true,
      "reason": "Notificação enviada com sucesso"
    }
  ]
}
```

**Como testar:**

1. **Via Postman/Insomnia:**
   - URL: `https://seu-dominio.com/api/notifications/test-email`
   - Method: `POST`
   - Headers: `Authorization: Bearer SEU_TOKEN`

2. **Via cURL:**
```bash
curl -X POST https://seu-dominio.com/api/notifications/test-email \
  -H "Authorization: Bearer SEU_TOKEN"
```

3. **Via código no frontend:**
```typescript
// No seu Angular/Ionic
async testNotifications() {
  const response = await fetch('/api/notifications/test-email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    }
  });
  const result = await response.json();
  console.log('Teste:', result);
}
```

---

### **2️⃣ Criar Despesa com Vencimento Próximo**

Para testar o fluxo real:

1. **Crie uma despesa que vence em 2 dias:**
```typescript
POST /api/expenses
{
  "title": "Teste de Notificação",
  "amount": 100,
  "category": "utilities",
  "type": "single",
  "dueDate": "2025-12-03", // 2 dias no futuro
  "status": "PENDING",
  "isPaid": false
}
```

2. **Configure seu perfil para notificar com 3 dias de antecedência:**
```typescript
PUT /api/auth/profile
{
  "notificationDays": 3,
  "emailNotifications": true
}
```

3. **Aguarde até amanhã às 8h ou execute o teste manual**

---

### **3️⃣ Verificar Logs do Sistema**

Em produção (Railway/Vercel/Render), verifique os logs:

**Railway:**
```bash
railway logs --follow
```

**Vercel:**
- Acesse Dashboard → Deployments → Logs

**Render:**
- Acesse Dashboard → Service → Logs

**Procure por:**
```
🔍 Iniciando verificação de vencimentos...
👥 X usuário(s) com notificações ativadas
✅ E-mail enviado para usuario@email.com (normal)
✅ X/Y notificações enviadas
```

---

### **4️⃣ Verificar Histórico no Banco**

Consulte a tabela `notification_logs`:

```sql
-- Ver últimas notificações enviadas
SELECT 
  nl.*,
  u.email,
  u.name
FROM notification_logs nl
JOIN users u ON nl."userId" = u.id
ORDER BY nl."sentAt" DESC
LIMIT 10;

-- Ver se seu usuário recebeu notificações
SELECT * FROM notification_logs 
WHERE "userId" = 'SEU_USER_ID'
ORDER BY "sentAt" DESC;
```

---

### **5️⃣ Verificar se o Scheduler Está Ativo**

Adicione um endpoint de status:

```typescript
// No notification.controller.ts
async getSchedulerStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const isRunning = this.dailyNotificationScheduler.isRunning();
    res.json({
      schedulerActive: isRunning,
      nextExecution: "Diariamente às 8h da manhã (horário de Brasília)",
      currentTime: new Date().toISOString(),
      timezone: "America/Sao_Paulo"
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
```

```typescript
// No notification.routes.ts
router.get('/scheduler-status', (req, res) => 
  notificationController.getSchedulerStatus(req, res)
);
```

Então teste:
```bash
GET /api/notifications/scheduler-status
```

---

## 🎬 Fluxo de Teste Completo

### **Teste Rápido (2 minutos):**

1. **Verifique se o Gmail está configurado:**
```bash
# No .env de produção
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

2. **Faça login no app e pegue o token JWT**

3. **Execute o teste:**
```bash
POST /api/notifications/test-email
Authorization: Bearer SEU_TOKEN
```

4. **Verifique seu e-mail (pode ir para spam na primeira vez)**

### **Teste Realista (24h):**

1. **Crie uma despesa que vence amanhã**
2. **Configure notificationDays = 1**
3. **Ative emailNotifications = true**
4. **Aguarde até amanhã às 8h**
5. **Verifique seu e-mail**

---

## 📊 Checklist de Validação

- [ ] Backend rodando sem erros
- [ ] Variáveis `GMAIL_USER` e `GMAIL_APP_PASSWORD` configuradas
- [ ] Migration aplicada (tabela `notification_logs` existe)
- [ ] Endpoint `/api/notifications/test-email` retorna sucesso
- [ ] E-mail chegou na caixa de entrada (ou spam)
- [ ] Logs mostram "E-mail enviado com sucesso"
- [ ] Registro criado em `notification_logs`
- [ ] Campo `lastNotificationSent` atualizado no `users`

---

## 🐛 Troubleshooting em Produção

### **E-mail não chegou:**
```sql
-- Verificar se foi tentado enviar
SELECT * FROM notification_logs 
WHERE "userId" = 'SEU_USER_ID'
ORDER BY "sentAt" DESC LIMIT 5;
```

Se não houver registros, o scheduler não executou ou não tinha despesas para notificar.

### **Erro de autenticação SMTP:**
- Verifique se a senha de app do Gmail está correta
- Confirme que a verificação em 2 etapas está ativa
- Tente gerar uma nova senha de app

### **Scheduler não executa:**
```javascript
// Verificar no código se o scheduler foi inicializado
// Em main.ts deve ter:
const notificationScheduler = new DailyNotificationScheduler();
notificationScheduler.start();
```

---

## 🎯 Teste Mais Simples

**Crie este endpoint de teste direto:**

```typescript
// notification.controller.ts
async testDirectEmail(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const { EmailService } = require('../services/email.service');
    const emailService = new EmailService();
    
    // Teste de conexão SMTP
    const connected = await emailService.testConnection();
    
    if (!connected) {
      res.json({
        success: false,
        message: 'Falha na conexão SMTP. Verifique GMAIL_USER e GMAIL_APP_PASSWORD'
      });
      return;
    }

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { expenses: { where: { isPaid: false } } }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Enviar e-mail de teste
    const sent = await emailService.sendExpenseNotification(
      user.email,
      user.name,
      {
        overdue: user.expenses.filter(e => new Date(e.dueDate) < new Date()),
        dueSoon: user.expenses.filter(e => new Date(e.dueDate) >= new Date()),
        urgencyLevel: 'normal'
      }
    );

    res.json({
      success: sent,
      message: sent ? 'E-mail enviado! Verifique sua caixa de entrada.' : 'Falha no envio',
      sentTo: user.email
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

```typescript
// notification.routes.ts
router.post('/test-direct', (req, res) => 
  notificationController.testDirectEmail(req, res)
);
```

**Use:**
```bash
POST /api/notifications/test-direct
Authorization: Bearer SEU_TOKEN
```

Isso testa:
✅ Conexão SMTP
✅ Envio de e-mail real
✅ Com suas despesas reais

---

## 📱 Interface de Teste no Frontend

Adicione um botão no perfil:

```typescript
// profile.page.ts
async testNotifications() {
  const loading = await this.loadingCtrl.create({
    message: 'Enviando e-mail de teste...'
  });
  await loading.present();

  try {
    const response = await fetch('/api/notifications/test-email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    
    const result = await response.json();
    await loading.dismiss();
    
    if (result.success) {
      this.showAlert('Sucesso!', 'E-mail enviado! Verifique sua caixa de entrada.');
    } else {
      this.showAlert('Atenção', result.message);
    }
  } catch (error) {
    await loading.dismiss();
    this.showAlert('Erro', 'Falha ao enviar e-mail de teste');
  }
}
```

```html
<!-- profile.page.html -->
<ion-button (click)="testNotifications()">
  <ion-icon name="mail-outline" slot="start"></ion-icon>
  Testar Notificação por E-mail
</ion-button>
```

---

**Pronto! Com essas opções você pode testar em produção sem esperar até às 8h! 🚀**
