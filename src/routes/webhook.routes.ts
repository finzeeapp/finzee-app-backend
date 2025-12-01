import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

// Webhook do Resend para eventos de email (bounce, complaint, etc)
router.post('/resend', webhookController.handleResendWebhook.bind(webhookController));

export { router as webhookRoutes };
