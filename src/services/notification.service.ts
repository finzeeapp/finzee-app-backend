import { prisma } from './prisma.service';

export class NotificationService {
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedEntityId?: string;
  }): Promise<any> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
        relatedEntityId: data.relatedEntityId
      }
    });
  }

  async findAll(userId: string): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      throw new Error('Notificação não encontrada');
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
  }
}
