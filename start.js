#!/usr/bin/env node

// Script de inicialização robusto
console.log('🚀 Iniciando crawler service...')
console.log('📍 Node version:', process.version)
console.log('📍 Platform:', process.platform)
console.log('📍 Arch:', process.arch)
console.log('📍 CWD:', process.cwd())

// Verificar variáveis de ambiente
console.log('\n🔍 Verificando variáveis de ambiente...')
console.log('PORT:', process.env.PORT || '3001')
console.log('NODE_ENV:', process.env.NODE_ENV || 'development')
console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || 'não definido')

// Verificar se o Chromium existe
const fs = require('fs')
const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
if (fs.existsSync(chromiumPath)) {
  console.log('✅ Chromium encontrado em:', chromiumPath)
} else {
  console.log('⚠️ Chromium não encontrado em:', chromiumPath)
}

// Tentar iniciar o servidor
try {
  console.log('\n📦 Carregando módulos...')
  require('./src/index.js')
} catch (error) {
  console.error('❌ Erro ao iniciar servidor:', error)
  process.exit(1)
}
