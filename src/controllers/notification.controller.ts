import { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class NotificationController {
  private notificationService = new NotificationService();

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      const notifications = await this.notificationService.findAll(req.userId);
      res.json(notifications);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }
      await this.notificationService.markAsRead(req.params.id, req.userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(400).json({ error: error.message });
    }
  }
}
