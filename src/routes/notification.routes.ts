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

// Endpoint de teste direto (força envio mesmo sem despesas)
router.post('/test-direct', (req, res) => notificationController.testDirectEmail(req, res));

// Endpoint de diagnóstico SMTP (só testa conexão, não envia e-mail)
router.get('/test-smtp', (req, res) => notificationController.testSmtpConnection(req, res));

export { router as notificationRoutes };
