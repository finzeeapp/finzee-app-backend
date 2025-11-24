import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DatabaseService } from './database.service';
import { v4 as uuidv4 } from 'uuid';

// Importar types localmente
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  monthlyIncome?: number;
  investmentProfile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || 'finzee-secret-key-change-in-production';

export class AuthService {
  private db = DatabaseService.getInstance();

  async register(userData: {
    email: string;
    password: string;
    name: string;
    monthlyIncome?: number;
  }): Promise<{ token: string; user: Partial<User> }> {
    // Verificar se o email já existe
    const users = this.db.getUsers();
    const existingUser = users.find(u => u.email === userData.email);
    
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Criar usuário
    const user: User = {
      id: uuidv4(),
      email: userData.email,
      name: userData.name,
      passwordHash,
      monthlyIncome: userData.monthlyIncome,
      investmentProfile: 'MODERATE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.db.addUser(user);

    // Gerar token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: Partial<User> }> {
    const users = this.db.getUsers();
    const user = users.find(u => u.email === credentials.email);

    if (!user || !user.passwordHash) {
      throw new Error('Credenciais inválidas');
    }

    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: Partial<User> }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const users = this.db.getUsers();
      const user = users.find(u => u.id === decoded.userId);

      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const users = this.db.getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      // Por segurança, não revelar se o e-mail existe ou não
      return { message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação.' };
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no usuário (simulado - em produção seria salvo no banco)
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry.toISOString();
    this.db.save();

    // Simular envio de e-mail (em produção, usar serviço de e-mail real)
    console.log(`🔗 Link de recuperação para ${email}:`);
    console.log(`http://localhost:4200/reset-password?token=${resetToken}`);
    console.log(`Token expira em: ${resetTokenExpiry}`);

    return { message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const users = this.db.getUsers();
    const user = users.find(u => u.resetToken === token);

    if (!user || !user.resetTokenExpiry) {
      throw new Error('Token de reset inválido ou expirado');
    }

    const now = new Date();
    const tokenExpiry = new Date(user.resetTokenExpiry);

    if (now > tokenExpiry) {
      throw new Error('Token de reset expirado');
    }

    // Validar nova senha
    if (newPassword.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    // Criptografar nova senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha e limpar tokens
    user.passwordHash = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.updatedAt = new Date().toISOString();

    this.db.save();

    return { message: 'Senha redefinida com sucesso!' };
  }

  async getUserById(userId: string): Promise<any> {
    const users = this.db.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Retornar usuário sem o hash da senha
    const { passwordHash, resetToken, resetTokenExpiry, ...userWithoutSensitive } = user as any;
    return userWithoutSensitive;
  }

  async updateUser(userId: string, updateData: any): Promise<any> {
    const users = this.db.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('Usuário não encontrado');
    }

    const user = users[userIndex];

    // Atualizar campos permitidos
    if (updateData.name) user.name = updateData.name;
    if (updateData.monthlyIncome !== undefined) user.monthlyIncome = updateData.monthlyIncome;
    if (updateData.investmentProfile) (user as any).investmentProfile = updateData.investmentProfile;
    if (updateData.investmentCapacity !== undefined) (user as any).investmentCapacity = updateData.investmentCapacity;
    if (updateData.notificationDays !== undefined) (user as any).notificationDays = updateData.notificationDays;
    if (updateData.savingsGoal !== undefined) (user as any).savingsGoal = updateData.savingsGoal;
    if (updateData.savingsDeadline) (user as any).savingsDeadline = updateData.savingsDeadline;
    if (updateData.investorProfile) (user as any).investmentProfile = updateData.investorProfile;

    user.updatedAt = new Date();

    this.db.save();

    // Retornar usuário sem o hash da senha
    const { passwordHash, resetToken, resetTokenExpiry, ...userWithoutSensitive } = user as any;
    return userWithoutSensitive;
  }
}
