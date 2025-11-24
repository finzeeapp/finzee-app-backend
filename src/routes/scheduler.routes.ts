import { Router } from 'express';
import { SchedulerController } from '../controllers/scheduler.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const schedulerController = new SchedulerController();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/scheduler/execute
 * @desc Executa manualmente a geração de pendências mensais
 * @access Private
 */
router.post('/execute', (req, res) => {
  schedulerController.executeScheduler(req, res);
});

/**
 * @route GET /api/scheduler/status
 * @desc Retorna o status do scheduler
 * @access Private
 */
router.get('/status', (req, res) => {
  schedulerController.getSchedulerStatus(req, res);
});

/**
 * @route POST /api/scheduler/generate-current-user
 * @desc Gera pendências para o usuário atual no mês corrente
 * @access Private
 */
router.post('/generate-current-user', (req, res) => {
  schedulerController.generateForCurrentUser(req, res);
});

/**
 * @route DELETE /api/scheduler/clear/:month
 * @desc Remove despesas geradas de um mês específico (YYYY-MM)
 * @access Private
 */
router.delete('/clear/:month', (req, res) => {
  schedulerController.clearGeneratedExpenses(req, res);
});

/**
 * @route GET /api/scheduler/debug
 * @desc Retorna informações de debug sobre despesas recorrentes
 * @access Private
 */
router.get('/debug', (req, res) => {
  schedulerController.getDebugInfo(req, res);
});

export default router;
