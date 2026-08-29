// Script de inicialização que garante o carregamento das variáveis de ambiente
// antes de iniciar o servidor Next.js (dev ou produção)
// Resolve o problema do DATABASE_URL inválido em produção

import { config } from 'dotenv'

// Carrega variáveis em ordem de prioridade
// .env.local (desenvolvimento) > .env > .env.deploy (produção versionado)
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })
config({ path: '.env.deploy', quiet: true })
config({ path: '.env.production', quiet: true })

// Validação: garante que DATABASE_URL está com protocolo PostgreSQL
const dbUrl = process.env.DATABASE_URL
if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.error('❌ ERRO: DATABASE_URL não está configurada corretamente!')
  console.error('   Valor atual:', dbUrl ? `"${dbUrl.substring(0, 30)}..."` : 'undefined')
  console.error('   Esperado: postgresql://...')
  console.error('   Verifique o arquivo .env.deploy')
  process.exit(1)
}

console.log('✅ Variáveis de ambiente carregadas')
console.log('   DATABASE_URL: postgresql://...(Supabase)')
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development')
