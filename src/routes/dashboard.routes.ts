import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/', (req, res) => dashboardController.getMonthlyDashboard(req, res));
router.patch('/accumulated-balance', (req, res) => dashboardController.updateAccumulatedBalance(req, res));

export { router as dashboardRoutes };
