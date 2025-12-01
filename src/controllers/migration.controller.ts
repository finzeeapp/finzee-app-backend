import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export class MigrationController {
  /**
   * Endpoint para executar migration de validação de email
   * POST /api/migration/run-email-validation
   */
  async runEmailValidationMigration(req: Request, res: Response) {
    try {
      console.log('🚀 Executando migration: add_email_validation');
      
      // Ler arquivo SQL
      const sqlFile = path.join(__dirname, '../../migrations/add_email_validation.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      // Remover comentários e separar comandos SQL
      const lines = sql
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('--');
        });
      
      const cleanSql = lines.join('\n');
      const commands = cleanSql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);
      
      console.log(`📝 Executando ${commands.length} comando(s)...`);
      
      const results = [];
      
      // Executar cada comando
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚙️  Comando ${i + 1}: ${command.substring(0, 60)}...`);
        
        try {
          await prisma.$executeRawUnsafe(command);
          console.log(`   ✓ Executado com sucesso`);
          results.push({ command: i + 1, status: 'success' });
        } catch (error: any) {
          console.error(`   ✗ Erro:`, error.message);
          results.push({ command: i + 1, status: 'error', message: error.message });
        }
      }
      
      // Verificar se as colunas foram adicionadas
      const verification = await prisma.$queryRaw`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('email_bounced', 'email_verified')
        ORDER BY column_name;
      `;
      
      console.log('✅ Migration concluída!');
      console.log('📋 Colunas verificadas:', verification);
      
      res.json({
        success: true,
        message: 'Migration executada com sucesso',
        results,
        verification
      });
      
    } catch (error: any) {
      console.error('❌ Erro ao executar migration:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }
}
