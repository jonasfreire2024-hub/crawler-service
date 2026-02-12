const express = require('express')
const cors = require('cors')

console.log('🚀 Iniciando servidor...')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 3001

// Health check
app.get('/', (req, res) => {
  console.log('📍 Health check raiz')
  res.json({ status: 'ok', service: 'crawler-service', timestamp: new Date().toISOString() })
})

app.get('/health', (req, res) => {
  console.log('📍 Health check /health')
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Importar crawlers apenas quando necessário (lazy loading)
let crawlerCompleto, crawlerRapido, atualizarPrecos

async function loadCrawlers() {
  if (!crawlerCompleto) {
    console.log('📦 Carregando módulos de crawler...')
    try {
      const crawlerModule = require('./crawler')
      crawlerCompleto = crawlerModule.crawlerCompleto
      
      const rapidoModule = require('./crawler-rapido')
      crawlerRapido = rapidoModule.crawlerRapido
      
      const atualizarModule = require('./atualizar-precos')
      atualizarPrecos = atualizarModule.atualizarPrecos
      
      console.log('✅ Módulos carregados')
    } catch (error) {
      console.error('❌ Erro ao carregar módulos:', error)
      throw error
    }
  }
}

// Crawler completo
app.post('/crawler/completo', async (req, res) => {
  try {
    console.log('📥 Requisição crawler completo recebida')
    
    const { concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !urlBase || !supabaseUrl || !supabaseKey) {
      console.log('❌ Parâmetros faltando')
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, urlBase, supabaseUrl, supabaseKey' 
      })
    }

    // Carregar módulos
    await loadCrawlers()

    // Executar em background
    console.log('✅ Iniciando crawler em background para:', urlBase)
    res.json({ success: true, message: 'Crawler iniciado', concorrenteId })
    
    // Rodar crawler (não bloqueia a resposta)
    crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('✅ Crawler completo finalizado:', result))
      .catch(err => console.error('❌ Erro no crawler:', err))
      
  } catch (error) {
    console.error('❌ Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Crawler rápido
app.post('/crawler/rapido', async (req, res) => {
  try {
    console.log('📥 Requisição crawler rápido recebida')
    
    const { concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !urlBase || !supabaseUrl || !supabaseKey) {
      console.log('❌ Parâmetros faltando')
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, urlBase, supabaseUrl, supabaseKey' 
      })
    }

    // Carregar módulos
    await loadCrawlers()

    console.log('✅ Iniciando crawler rápido em background para:', urlBase)
    res.json({ success: true, message: 'Crawler rápido iniciado', concorrenteId })
    
    crawlerRapido({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('✅ Crawler rápido finalizado:', result))
      .catch(err => console.error('❌ Erro no crawler:', err))
      
  } catch (error) {
    console.error('❌ Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Atualizar preços (visita URLs já salvas)
app.post('/crawler/atualizar', async (req, res) => {
  try {
    console.log('📥 Requisição atualizar preços recebida')
    
    const { concorrenteId, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !supabaseUrl || !supabaseKey) {
      console.log('❌ Parâmetros faltando')
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, supabaseUrl, supabaseKey' 
      })
    }

    // Carregar módulos
    await loadCrawlers()

    console.log('✅ Iniciando atualização de preços em background')
    res.json({ success: true, message: 'Atualização de preços iniciada', concorrenteId })
    
    atualizarPrecos({ concorrenteId, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('✅ Atualização finalizada:', result))
      .catch(err => console.error('❌ Erro na atualização:', err))
      
  } catch (error) {
    console.error('❌ Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Crawler service rodando na porta ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
})
