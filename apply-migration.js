const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Aplicando migração para adicionar campos de saldo acumulado...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS accumulated_balance FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_balance_update VARCHAR(7);
    `);
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('Campos adicionados:');
    console.log('  - accumulated_balance: Saldo acumulado dos meses anteriores');
    console.log('  - last_balance_update: Último mês processado (formato YYYY-MM)');
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
