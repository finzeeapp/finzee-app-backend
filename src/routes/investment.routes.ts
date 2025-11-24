import { Router } from 'express';
import { InvestmentController } from '../controllers/investment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const investmentController = new InvestmentController();

// Comentado temporariamente para testes - descomentar em produção
// router.use(authMiddleware);

router.post('/', (req, res) => investmentController.create(req, res));
router.get('/', (req, res) => investmentController.findAll(req, res));
router.get('/suggestions', (req, res) => investmentController.getSuggestions(req, res));
router.delete('/:id', (req, res) => investmentController.delete(req, res));

export { router as investmentRoutes };
