
l/**
 * Script para aplicar migration de validação de email
 * Execute: node migrate-add-email-validation.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Aplicando migration: add_email_validation.sql');
  
  try {
    // Ler arquivo SQL
    const sqlFile = path.join(__dirname, 'migrations', 'add_email_validation.sql');
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
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n⚙️  Comando ${i + 1}: ${command.substring(0, 60)}...`);
      await prisma.$executeRawUnsafe(command);
      console.log(`   ✓ Executado com sucesso`);
    }
    
    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando colunas adicionadas...');
    
    // Verificar se as colunas foram adicionadas
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_bounced', 'email_verified')
      ORDER BY column_name;
    `;
    
    console.log('\n📋 Colunas adicionadas:');
    console.table(result);
    
    // Contar usuários
    const userCount = await prisma.user.count();
    console.log(`\n👥 Total de usuários: ${userCount}`);
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
