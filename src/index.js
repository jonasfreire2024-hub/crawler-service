const express = require('express')
const cors = require('cors')
const { crawlerCompleto } = require('./crawler')
const { crawlerRapido } = require('./crawler-rapido')
const { atualizarPrecos } = require('./atualizar-precos')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'crawler-service' })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Crawler completo
app.post('/crawler/completo', async (req, res) => {
  try {
    const { concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !urlBase || !supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, urlBase, supabaseUrl, supabaseKey' 
      })
    }

    // Executar em background
    res.json({ success: true, message: 'Crawler iniciado', concorrenteId })
    
    // Rodar crawler (não bloqueia a resposta)
    crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('Crawler completo finalizado:', result))
      .catch(err => console.error('Erro no crawler:', err))
      
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Crawler rápido
app.post('/crawler/rapido', async (req, res) => {
  try {
    const { concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !urlBase || !supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, urlBase, supabaseUrl, supabaseKey' 
      })
    }

    res.json({ success: true, message: 'Crawler rápido iniciado', concorrenteId })
    
    crawlerRapido({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('Crawler rápido finalizado:', result))
      .catch(err => console.error('Erro no crawler:', err))
      
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Atualizar preços (visita URLs já salvas)
app.post('/crawler/atualizar', async (req, res) => {
  try {
    const { concorrenteId, tenantId, supabaseUrl, supabaseKey } = req.body
    
    if (!concorrenteId || !supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: concorrenteId, supabaseUrl, supabaseKey' 
      })
    }

    res.json({ success: true, message: 'Atualização de preços iniciada', concorrenteId })
    
    atualizarPrecos({ concorrenteId, tenantId, supabaseUrl, supabaseKey })
      .then(result => console.log('Atualização finalizada:', result))
      .catch(err => console.error('Erro na atualização:', err))
      
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Crawler service rodando na porta ${PORT}`)
})
