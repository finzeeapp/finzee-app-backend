import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authRoutes } from './routes/auth.routes';
import { expenseRoutes } from './routes/expense.routes';
import { investmentRoutes } from './routes/investment.routes';
import { notificationRoutes } from './routes/notification.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import schedulerRoutes from './routes/scheduler.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { incomeRoutes } from './routes/income.routes';
import { errorHandler } from './middleware/error.middleware';
import { SchedulerService } from './services/scheduler-simple.service';
import { DailyNotificationScheduler } from './services/daily-notification.scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware CORS - deve vir primeiro
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // URLs permitidas via variável de ambiente (separadas por vírgula)
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
    : [];
  
  // Verificar se a origem está na lista de permitidas
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    allowedOrigins.some(allowed => 
      allowed.includes('*') ? origin.includes(allowed.replace('*', '')) : false
    )
  );
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Responder imediatamente às requisições OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Inicializar o scheduler de pendências mensais
const schedulerService = new SchedulerService();
console.log('📅 Scheduler de pendências mensais inicializado');

// Inicializar o scheduler de notificações diárias
const notificationScheduler = new DailyNotificationScheduler();
notificationScheduler.start();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log('📊 API Endpoints disponíveis:');
  console.log('   - POST /api/scheduler/execute - Executar geração manual de pendências');
  console.log('   - GET  /api/scheduler/status - Status do scheduler');
  console.log('   - POST /api/scheduler/generate-current-user - Gerar para usuário atual');
  console.log('   - DELETE /api/scheduler/clear/:month - Limpar pendências de um mês');
  console.log('   - POST /api/notifications/test-email - Testar envio de notificação');
});

export default app;
