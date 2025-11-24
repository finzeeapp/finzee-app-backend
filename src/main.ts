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
import { errorHandler } from './middleware/error.middleware';
import { SchedulerService } from './services/scheduler-simple.service';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8100',
    'http://localhost:4200',
    'https://finzee-app-frontend-gxe43yi7y-finzee-apps-projects.vercel.app',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Inicializar o scheduler de pendências mensais
const schedulerService = new SchedulerService();
console.log('📅 Scheduler de pendências mensais inicializado');

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log('📊 API Endpoints disponíveis:');
  console.log('   - POST /api/scheduler/execute - Executar geração manual de pendências');
  console.log('   - GET  /api/scheduler/status - Status do scheduler');
  console.log('   - POST /api/scheduler/generate-current-user - Gerar para usuário atual');
  console.log('   - DELETE /api/scheduler/clear/:month - Limpar pendências de um mês');
});

export default app;
