import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'finzee-secret-key-change-in-production';

interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export class AuthService {

  async register(userData: {
    email: string;
    password: string;
    name: string;
    monthlyIncome?: number;
  }): Promise<{ token: string; user: UserResponse }> {
    // Normalizar email para lowercase
    const normalizedEmail = userData.email.toLowerCase().trim();
    
    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });
    
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: userData.name,
        passwordHash,
        monthlyIncome: userData.monthlyIncome,
        investorProfile: 'moderado'
      }
    });

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
  }): Promise<{ token: string; user: UserResponse }> {
    // Normalizar email para lowercase
    const normalizedEmail = credentials.email.toLowerCase().trim();
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true
      }
    });

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

  async validateToken(token: string): Promise<{ valid: boolean; user?: UserResponse }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

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
    // Normalizar email para lowercase
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true }
    });

    if (!user) {
      // Por segurança, não revelar se o e-mail existe ou não
      return { message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação.' };
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Simular envio de e-mail (em produção, usar serviço de e-mail real)
    console.log(`🔗 Link de recuperação para ${email}:`);
    console.log(`http://localhost:4200/reset-password?token=${resetToken}`);
    console.log(`Token expira em: ${resetTokenExpiry}`);

    return { message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await prisma.user.findFirst({
      where: { resetToken: token }
    });

    if (!user || !user.resetTokenExpiry) {
      throw new Error('Token de reset inválido ou expirado');
    }

    const now = new Date();
    if (now > user.resetTokenExpiry) {
      throw new Error('Token de reset expirado');
    }

    // Validar nova senha
    if (newPassword.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha e limpar tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Senha redefinida com sucesso!' };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        incomeType: true,
        monthlyIncome: true,
        estimatedMonthlyIncome: true,
        monthlyInvestmentCapacity: true,
        investorProfile: true,
        notificationDaysBefore: true,
        emailNotificationsEnabled: true,
        savingsGoal: true,
        savingsGoalDeadline: true,
        createdAt: true,
        updatedAt: true,
        currency: true
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Return with frontend-compatible field names
    return {
      ...user,
      incomeType: user.incomeType,
      estimatedMonthlyIncome: user.estimatedMonthlyIncome,
      investmentProfile: user.investorProfile,
      investmentCapacity: user.monthlyInvestmentCapacity,
      notificationDays: user.notificationDaysBefore,
      emailNotifications: user.emailNotificationsEnabled,
      savingsDeadline: user.savingsGoalDeadline
    };
  }

  async updateUser(userId: string, updateData: any): Promise<any> {
    const dataToUpdate: any = {};

    // Mapear campos permitidos
    if (updateData.name) dataToUpdate.name = updateData.name;
    
    // Se o email for atualizado, resetar flags de validação
    if (updateData.email) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      // Só resetar se o email realmente mudou
      if (currentUser && currentUser.email !== updateData.email) {
        console.log(`🔄 Email alterado para ${userId}: ${currentUser.email} → ${updateData.email}`);
        dataToUpdate.email = updateData.email;
        dataToUpdate.emailBounced = false;
        dataToUpdate.emailVerified = false;
        console.log(`   ✓ Flags resetadas: emailBounced=false, emailVerified=false`);
      }
    }
    
    if (updateData.monthlyIncome !== undefined) dataToUpdate.monthlyIncome = Number(updateData.monthlyIncome);
    if (updateData.estimatedMonthlyIncome !== undefined) dataToUpdate.estimatedMonthlyIncome = Number(updateData.estimatedMonthlyIncome);
    if (updateData.incomeType) dataToUpdate.incomeType = updateData.incomeType;
    if (updateData.investmentProfile || updateData.investorProfile) {
      dataToUpdate.investorProfile = updateData.investmentProfile || updateData.investorProfile;
    }
    if (updateData.investmentCapacity !== undefined || updateData.monthlyInvestmentCapacity !== undefined) {
      dataToUpdate.monthlyInvestmentCapacity = Number(updateData.investmentCapacity || updateData.monthlyInvestmentCapacity);
    }
    if (updateData.notificationDays !== undefined || updateData.notificationDaysBefore !== undefined) {
      const days = Number(updateData.notificationDays || updateData.notificationDaysBefore);
      // Limitar entre 1 e 5 dias
      dataToUpdate.notificationDaysBefore = Math.min(Math.max(days, 1), 5);
    }
    if (updateData.emailNotificationsEnabled !== undefined) {
      dataToUpdate.emailNotificationsEnabled = Boolean(updateData.emailNotificationsEnabled);
    }
    if (updateData.savingsGoal !== undefined) dataToUpdate.savingsGoal = Number(updateData.savingsGoal);
    if (updateData.currency) dataToUpdate.currency = updateData.currency;
    if (updateData.savingsDeadline || updateData.savingsGoalDeadline) {
      const deadline = updateData.savingsDeadline || updateData.savingsGoalDeadline;
      dataToUpdate.savingsGoalDeadline = deadline ? new Date(deadline) : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        incomeType: true,
        monthlyIncome: true,
        estimatedMonthlyIncome: true,
        monthlyInvestmentCapacity: true,
        investorProfile: true,
        notificationDaysBefore: true,
        emailNotificationsEnabled: true,
        savingsGoal: true,
        savingsGoalDeadline: true,
        currency: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Return with frontend-compatible field names
    return {
      ...updatedUser,
      incomeType: updatedUser.incomeType,
      estimatedMonthlyIncome: updatedUser.estimatedMonthlyIncome,
      investmentProfile: updatedUser.investorProfile,
      investmentCapacity: updatedUser.monthlyInvestmentCapacity,
      notificationDays: updatedUser.notificationDaysBefore,
      emailNotifications: updatedUser.emailNotificationsEnabled,
      savingsDeadline: updatedUser.savingsGoalDeadline
    };
  }
}
