import { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class NotificationController {
  private notificationService = new NotificationService();

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const notifications = await this.notificationService.findAll(userId);
      res.json(notifications);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      await this.notificationService.markAsRead(req.params.id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(400).json({ error: error.message });
    }
  }
}
