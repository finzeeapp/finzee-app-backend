/**
 * Script para renomear colunas de email validation para camelCase
 * Execute: node migrate-rename-email-columns.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Renomeando colunas de snake_case para camelCase...');
  
  try {
    const sqlFile = path.join(__dirname, 'migrations', 'rename_email_columns.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comando(s)...`);
    
    for (const command of commands) {
      console.log(`\n⚙️  ${command.substring(0, 80)}...`);
      await prisma.$executeRawUnsafe(command);
      console.log('   ✓ OK');
    }
    
    console.log('\n✅ Colunas renomeadas com sucesso!');
    
    // Verificar
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('emailBounced', 'emailVerified')
      ORDER BY column_name;
    `;
    
    console.log('\n📋 Verificação:');
    console.table(result);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
