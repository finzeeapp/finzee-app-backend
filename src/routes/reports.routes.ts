import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const reportsController = new ReportsController();

// Comentado temporariamente para testes - descomentar em produção
// router.use(authMiddleware);

router.get('/monthly-evolution', reportsController.getMonthlyEvolution);
router.get('/expenses-by-category', reportsController.getExpensesByCategory);
router.get('/expenses-by-type', reportsController.getExpensesByType);
router.get('/income-vs-expenses', reportsController.getIncomeVsExpenses);
router.get('/investments-summary', reportsController.getInvestmentsSummary);
router.get('/full', reportsController.getFullReport);

export default router;
