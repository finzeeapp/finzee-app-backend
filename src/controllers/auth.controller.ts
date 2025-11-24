import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  private authService = new AuthService();

  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async validateToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Token não fornecido' });
        return;
      }
      const result = await this.authService.validateToken(token);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'E-mail é obrigatório' });
        return;
      }
      
      const result = await this.authService.forgotPassword(email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        return;
      }
      
      const result = await this.authService.resetPassword(token, newPassword);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      const user = await this.authService.getUserById(userId);
      res.json(user);
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      res.status(404).json({ error: error.message });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || 'cc05eca2-49ff-4ea7-9bb8-b71812d09130';
      console.log('Atualizando perfil do usuário:', userId);
      console.log('Dados recebidos:', req.body);
      const user = await this.authService.updateUser(userId, req.body);
      res.json(user);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(400).json({ error: error.message });
    }
  }
}
