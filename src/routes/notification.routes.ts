import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/', (req, res) => notificationController.findAll(req, res));
router.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));

// Endpoint de teste para notificações por e-mail
router.post('/test-email', (req, res) => notificationController.testEmailNotification(req, res));

export { router as notificationRoutes };
