const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_bounced', 'email_verified')
      ORDER BY column_name;
    `;
    
    console.log('✅ Colunas encontradas:', result);
    console.log('Total:', result.length);
    
    if (result.length === 0) {
      console.log('\n❌ COLUNAS NÃO EXISTEM! Vamos executar a migration...\n');
      
      // Executar migration
      const fs = require('fs');
      const path = require('path');
      const sqlFile = path.join(__dirname, 'migrations', 'add_email_validation.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      const lines = sql.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      });
      
      const cleanSql = lines.join('\n');
      const commands = cleanSql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
      
      console.log(`Executando ${commands.length} comandos...`);
      
      for (let i = 0; i < commands.length; i++) {
        console.log(`\nComando ${i + 1}:`);
        console.log(commands[i].substring(0, 100) + '...');
        await prisma.$executeRawUnsafe(commands[i]);
        console.log('✓ OK');
      }
      
      console.log('\n✅ Migration executada com sucesso!');
      
      // Verificar novamente
      const verify = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('email_bounced', 'email_verified');
      `;
      console.log('\n📋 Verificação:', verify);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
