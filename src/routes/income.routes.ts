import { Router } from 'express';
import { IncomeController } from '../controllers/income.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const incomeController = new IncomeController();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /api/incomes - Criar novo lançamento de renda
router.post('/', (req, res) => incomeController.create(req, res));

// GET /api/incomes - Listar rendas
router.get('/', (req, res) => incomeController.list(req, res));

// GET /api/incomes/stats - Estatísticas de renda
router.get('/stats', (req, res) => incomeController.getStats(req, res));

// GET /api/incomes/current-month/total - Total do mês atual
router.get('/current-month/total', (req, res) => incomeController.getCurrentMonthTotal(req, res));

// GET /api/incomes/:id - Buscar renda por ID
router.get('/:id', (req, res) => incomeController.getById(req, res));

// PUT /api/incomes/:id - Atualizar renda
router.put('/:id', (req, res) => incomeController.update(req, res));

// DELETE /api/incomes/:id - Deletar renda
router.delete('/:id', (req, res) => incomeController.delete(req, res));

export { router as incomeRoutes };
