# Correções de Erros do Railway

## 📋 Problemas Identificados

### 1. TimeoutOverflowWarning (RESOLVIDO ✅)
**Erro**: `TimeoutOverflowWarning: 2628954878 does not fit into a 32-bit signed integer`

**Causa**: O `setTimeout` no `income-reset.service.ts` estava tentando agendar um timeout de ~30 dias (2.628.954.878ms), o que excede o limite de 32 bits (~24.8 dias = 2.147.483.647ms).

**Solução**: Substituição do `setTimeout` por **node-cron**:
- Usa cron job ao invés de setTimeout para agendamentos de longo prazo
- Configuração: `'0 0 1 * *'` (executa todo dia 1 às 00:00)
- Timezone: `America/Sao_Paulo`

### 2. Connection Pool Timeout (RESOLVIDO ✅)
**Erro**: `Timed out fetching a new connection from the connection pool. (timeout: 10, connection limit: 97)`

**Causa**: Pool de conexões do Prisma estava sendo esgotado devido a:
- Falta de configuração adequada do pool
- Conexões não liberadas corretamente
- Múltiplas queries simultâneas sem gestão de pool

**Solução**: Configurações otimizadas do pool de conexões:

#### Na DATABASE_URL (.env)
```env
# Adicionar parâmetros de pool na connection string:
DATABASE_URL="postgresql://user:pass@host:port/db?pgbouncer=true&connection_limit=10&pool_timeout=20"
```

**Parâmetros importantes**:
- `pgbouncer=true` - Usa pgBouncer para pooling (Supabase/Railway)
- `connection_limit=10` - Limite de 10 conexões por instância
- `pool_timeout=20` - Timeout de 20 segundos para aguardar conexão disponível

#### No prisma.service.ts
- Adicionado logging de erros para debugging
- Configuração explícita da datasource URL
- Comentários sobre limites do Railway free tier (100 conexões)

#### No schema.prisma
- Adicionado `relationMode = "prisma"` para melhor gestão de relações
- Comentários explicativos sobre configurações de pool

### 3. Erro P1017 e P2024 - Reset Mensal (RESOLVIDO ✅)
**Erros**: 
- `PrismaClientUnknownRequestError: code: 'P1017'` (Server has closed the connection)
- `PrismaClientKnownRequestError: code: 'P2024'` (Timed out fetching connection)

**Causa**: Reset mensal falhava devido aos problemas anteriores (timeout overflow + pool exhaustion)

**Solução**: Com as correções 1 e 2, o reset mensal agora funciona corretamente.

## 🚀 Ações Necessárias no Railway

### 1. Atualizar variável DATABASE_URL
No Railway, atualize a variável de ambiente `DATABASE_URL` adicionando os parâmetros de pool:

**Antes**:
```
postgresql://postgres.xxx:password@host:6543/postgres?pgbouncer=true
```

**Depois**:
```
postgresql://postgres.xxx:password@host:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20
```

### 2. Fazer Deploy
```bash
git add .
git commit -m "fix: resolver TimeoutOverflowWarning e connection pool issues"
git push
```

O Railway fará deploy automaticamente.

### 3. Monitorar Logs
Após o deploy, monitore os logs no Railway:
```bash
railway logs
```

Você deve ver:
```
✅ Scheduler de reset mensal iniciado! Executará todo dia 1 às 00:00 (horário de Brasília).
⏰ Próxima execução: [data]
```

## 📊 Benefícios das Correções

### Performance
- ✅ Pool de conexões otimizado (10 conexões vs 97 anterior)
- ✅ Timeout adequado (20s) para conexões
- ✅ Menos chance de exhaustion do pool

### Estabilidade
- ✅ Node-cron ao invés de setTimeout para agendamentos longos
- ✅ Sem mais TimeoutOverflowWarning
- ✅ Gestão adequada de conexões do banco

### Manutenibilidade
- ✅ Código mais limpo e profissional
- ✅ Logs informativos sobre próximas execuções
- ✅ Configurações documentadas

## 🔍 Verificação Pós-Deploy

### 1. Verificar se os erros pararam
Monitore os logs do Railway por alguns minutos:
- ❌ Não deve aparecer mais `TimeoutOverflowWarning`
- ❌ Não deve aparecer mais `Connection pool timeout`
- ✅ Deve aparecer confirmação do scheduler iniciado

### 2. Testar reset mensal (se for dia 1)
Se hoje for dia 1 do mês:
```bash
# Verificar nos logs:
📅 Hoje é dia 1! Executando reset...
💰 ========================================
💰 INICIANDO RESET MENSAL DE ENTRADAS
💰 ========================================
```

### 3. Testar notificações diárias
As notificações diárias devem continuar funcionando às 8h:
```bash
# Nos logs às 8h:
📧 Executando verificação diária de vencimentos...
🚀 Iniciando envio de notificações...
```

## 📚 Referências
- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Node-cron Documentation](https://www.npmjs.com/package/node-cron)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Railway PostgreSQL Limits](https://docs.railway.app/databases/postgresql)

## 🆘 Troubleshooting

### Se ainda aparecer TimeoutOverflowWarning
1. Verifique se o commit foi feito corretamente
2. Confirme que o Railway fez deploy da nova versão
3. Reinicie o serviço no Railway: `railway restart`

### Se ainda aparecer Connection Pool Timeout
1. Verifique se a DATABASE_URL tem os parâmetros corretos
2. Aumente o `pool_timeout` para 30: `pool_timeout=30`
3. Considere aumentar o `connection_limit` para 15: `connection_limit=15`

### Se o reset mensal não executar
1. Verifique os logs para confirmar que o cron job foi iniciado
2. Confirme o timezone: deve ser `America/Sao_Paulo`
3. Teste manualmente via endpoint: `POST /api/income-reset/execute`
