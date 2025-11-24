import { DatabaseService } from './database.service';
import { v4 as uuidv4 } from 'uuid';

// Importar types localmente
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedEntityId?: string;
  createdAt: Date;
}

export class NotificationService {
  private db = DatabaseService.getInstance();

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedEntityId?: string;
  }): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      relatedEntityId: data.relatedEntityId,
      createdAt: new Date()
    };

    this.db.addNotification(notification);
    return notification;
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.db.getNotifications()
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notifications = this.db.getNotifications();
    const index = notifications.findIndex(n => n.id === id && n.userId === userId);

    if (index === -1) {
      throw new Error('Notificação não encontrada');
    }

    notifications[index].read = true;
    this.db.saveNotifications(notifications);
  }
}
