import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const expenseController = new ExpenseController();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.post('/', (req, res) => expenseController.create(req, res));
router.get('/', (req, res) => expenseController.findAll(req, res));
router.get('/by-tab/:tab', (req, res) => expenseController.findByTab(req, res));
router.get('/current-month', (req, res) => expenseController.findCurrentMonth(req, res));
router.get('/recurring', (req, res) => expenseController.findRecurring(req, res));
router.post('/recurring', (req, res) => expenseController.createRecurring(req, res));
router.post('/auto-generate', (req, res) => expenseController.autoGeneratePendencies(req, res));
router.get('/:id', (req, res) => expenseController.findById(req, res));
router.put('/:id', (req, res) => expenseController.update(req, res));
router.delete('/:id', (req, res) => expenseController.delete(req, res));
router.post('/:id/receipt', upload.single('receipt'), (req, res) => 
  expenseController.uploadReceipt(req, res)
);
router.patch('/:id/pay', (req, res) => expenseController.markAsPaid(req, res));

export { router as expenseRoutes };
