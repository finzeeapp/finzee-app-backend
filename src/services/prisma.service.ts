import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaClient | null = null;

  /**
   * Retorna a instância singleton do PrismaClient
   */
  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log: ['error'],
      });
    }

    return PrismaService.instance;
  }

  /**
   * Desconecta o Prisma Client (útil para testes e shutdown gracioso)
   */
  static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
      PrismaService.instance = null;
      console.log('🔌 Prisma Client desconectado');
    }
  }

  /**
   * Testa a conexão com o banco de dados
   */
  static async testConnection(): Promise<boolean> {
    try {
      const prisma = PrismaService.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Conexão com o banco de dados estabelecida com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar com o banco de dados:', error);
      return false;
    }
  }
}

export default PrismaService;
export const prisma = PrismaService.getInstance();
