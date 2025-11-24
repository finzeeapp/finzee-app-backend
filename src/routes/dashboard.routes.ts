import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Comentado temporariamente para testes
// router.use(authMiddleware);

router.get('/', (req, res) => dashboardController.getMonthlyDashboard(req, res));

export { router as dashboardRoutes };
