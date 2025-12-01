/**
 * Script para testar credenciais do Gmail localmente
 * Execute: node test-gmail-credentials.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailCredentials() {
  console.log('🔍 === TESTE DE CREDENCIAIS DO GMAIL ===\n');

  // 1. Verificar se as variáveis existem
  console.log('📋 1. Verificando variáveis de ambiente:');
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser) {
    console.error('❌ GMAIL_USER não configurado no .env');
    return;
  }
  if (!gmailPassword) {
    console.error('❌ GMAIL_APP_PASSWORD não configurado no .env');
    return;
  }

  console.log(`   ✅ GMAIL_USER: ${gmailUser}`);
  console.log(`   ✅ GMAIL_APP_PASSWORD: ****${gmailPassword.slice(-4)} (${gmailPassword.length} caracteres)`);

  // 2. Criar transporter
  console.log('\n🔧 2. Criando transporter SMTP...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword
    },
    debug: true, // Log completo
    logger: true
  });

  // 3. Testar conexão
  console.log('\n🔌 3. Testando conexão SMTP com Gmail...');
  console.log('   Servidor: smtp.gmail.com:587');
  console.log('   Timeout: 10 segundos\n');

  try {
    const startTime = Date.now();
    await transporter.verify();
    const duration = Date.now() - startTime;

    console.log(`\n✅ ✅ ✅ SUCESSO! ✅ ✅ ✅`);
    console.log(`\n🎉 Credenciais do Gmail estão CORRETAS!`);
    console.log(`⏱️  Conexão estabelecida em ${duration}ms`);
    console.log(`\n📧 Você pode enviar e-mails com essa conta!`);
    console.log(`\n💡 Próximos passos:`);
    console.log(`   1. As credenciais estão corretas`);
    console.log(`   2. O problema é no Railway (bloqueio de porta 587)`);
    console.log(`   3. Verifique se o upgrade Pro foi aplicado`);
    console.log(`   4. Ou considere usar Resend/SendGrid (API REST)`);

  } catch (error) {
    console.error(`\n❌ ❌ ❌ ERRO! ❌ ❌ ❌\n`);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('⏱️  TIMEOUT - Não conseguiu conectar ao servidor Gmail');
      console.error('\n📍 Possíveis causas:');
      console.error('   1. Firewall local bloqueando porta 587');
      console.error('   2. Antivírus bloqueando conexão SMTP');
      console.error('   3. Proxy/VPN interferindo');
      console.error('   4. Internet instável');
      console.error('\n💡 Soluções:');
      console.error('   - Desative temporariamente firewall/antivírus');
      console.error('   - Teste em outra rede (celular 4G/5G)');
      console.error('   - Verifique se consegue acessar smtp.gmail.com:587');

    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('🔑 ERRO DE AUTENTICAÇÃO - Credenciais inválidas');
      console.error('\n📍 Possíveis causas:');
      console.error('   1. ❌ Senha de app incorreta');
      console.error('   2. ❌ Verificação em 2 etapas não ativada');
      console.error('   3. ❌ Senha de app expirada/revogada');
      console.error('   4. ❌ E-mail incorreto');
      console.error('\n💡 Soluções:');
      console.error('   1. Acesse: https://myaccount.google.com/apppasswords');
      console.error('   2. REVOGUE a senha antiga');
      console.error('   3. GERE uma NOVA senha de app');
      console.error('   4. Copie os 16 caracteres SEM ESPAÇOS');
      console.error('   5. Atualize no .env: GMAIL_APP_PASSWORD=abcdefghijklmnop');
      console.error('   6. Execute este script novamente');

    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 ERRO DE DNS - Não conseguiu resolver smtp.gmail.com');
      console.error('\n📍 Possíveis causas:');
      console.error('   1. Sem conexão com a internet');
      console.error('   2. Problema no DNS');
      console.error('\n💡 Solução:');
      console.error('   - Verifique sua conexão com a internet');
      console.error('   - Tente: ping smtp.gmail.com');

    } else {
      console.error('❓ ERRO DESCONHECIDO');
      console.error('\n📋 Detalhes técnicos:');
      console.error(`   Código: ${error.code || 'N/A'}`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Response: ${error.response || 'N/A'}`);
      console.error(`   ResponseCode: ${error.responseCode || 'N/A'}`);
    }

    console.error('\n📄 Stack trace completo:');
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
}

// Executar teste
testGmailCredentials();
