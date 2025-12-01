import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';

export class WebhookController {
  
  /**
   * Recebe webhooks do Resend para eventos de email
   * Documentação: https://resend.com/docs/api-reference/webhooks
   */
  async handleResendWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;
      
      console.log('📬 Webhook Resend recebido:', {
        type: event.type,
        email: event.data?.to?.[0] || event.data?.email,
        created: event.created_at
      });

      // Tipos de eventos que indicam bounce/problema
      const bounceEvents = [
        'email.bounced',
        'email.complained',
        'email.delivery_delayed'
      ];

      if (bounceEvents.includes(event.type)) {
        const email = event.data?.to?.[0] || event.data?.email;
        
        if (email) {
          // Marcar usuário como emailBounced
          const updated = await prisma.user.updateMany({
            where: { 
              email: email,
              emailBounced: false 
            },
            data: { emailBounced: true }
          });

          if (updated.count > 0) {
            console.log(`🚫 Email marcado como bounced via webhook: ${email} (tipo: ${event.type})`);
          }
        }
      }

      // Sempre retornar 200 para o Resend saber que recebemos
      res.status(200).json({ received: true });
      
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook Resend:', error.message);
      // Mesmo com erro, retornar 200 para evitar reenvios
      res.status(200).json({ received: true, error: error.message });
    }
  }
}
