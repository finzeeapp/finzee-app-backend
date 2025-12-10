import { Router } from 'express';
import { executeMonthlyReset, getResetInfo } from '../controllers/income-reset.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/income-reset/execute
 * Executa manualmente o reset mensal de entradas
 */
router.post('/execute', authMiddleware, executeMonthlyReset);

/**
 * GET /api/income-reset/info
 * Retorna informações sobre o próximo reset
 */
router.get('/info', authMiddleware, getResetInfo);

export default router;
