const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

async function atualizarPrecos({ concorrenteId, tenantId, supabaseUrl, supabaseKey }) {
  console.log('========================================')
  console.log('🚀 INICIANDO ATUALIZAR PREÇOS')
  console.log('Concorrente:', concorrenteId)
  console.log('Tenant:', tenantId)
  console.log('Supabase URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.log('========================================')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    console.log('🔄 Buscando produtos no banco...')

    // Buscar produtos já cadastrados deste concorrente
    const { data: produtos, error } = await supabase
      .from('ag_concorrentes_produtos')
      .select('id, url, nome, preco')
      .eq('concorrente_id', concorrenteId)
      .eq('ativo', true)

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      throw error
    }
    
    if (!produtos || produtos.length === 0) {
      console.log('⚠️ Nenhum produto cadastrado para atualizar')
      return { success: true, total: 0, message: 'Nenhum produto para atualizar' }
    }

    console.log(`📦 ${produtos.length} produtos encontrados`)
    console.log('🌐 Iniciando Puppeteer...')
    
    // Tentar primeiro sem executablePath (usa o Chromium bundled do Puppeteer)
    try {
      console.log('Tentando Puppeteer com Chromium bundled...')
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      })
      console.log('✅ Puppeteer iniciado com Chromium bundled')
    } catch (bundledError) {
      console.log('❌ Chromium bundled falhou:', bundledError.message)
      
      // Tentar caminhos do sistema
      const chromiumPaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/nix/var/nix/profiles/default/bin/chromium',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
      ].filter(Boolean)
      
      for (const execPath of chromiumPaths) {
        try {
          console.log(`Tentando: ${execPath}`)
          browser = await puppeteer.launch({
            headless: 'new',
            executablePath: execPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
          })
          console.log(`✅ Puppeteer iniciado com: ${execPath}`)
          break
        } catch (err) {
          console.log(`❌ Falhou: ${execPath}`)
        }
      }
    }
    
    if (!browser) {
      throw new Error('Não foi possível iniciar o Chromium em nenhum caminho')
    }

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Bloquear recursos desnecessários pra ser mais rápido
    await page.setRequestInterception(true)
    page.on('request', req => {
      if (['stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    let atualizados = 0
    let erros = 0
    const historico = []

    for (let i = 0; i < produtos.length; i++) {
      const produto = produtos[i]
      
      try {
        await page.goto(produto.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await new Promise(r => setTimeout(r, 500))

        // Extrair preço e estoque
        const dados = await page.evaluate(() => {
          let preco = 0
          let estoque = null
          let disponivel = true

          // Buscar preço
          const precoSelectors = [
            '.price', '.preco', '[class*="price"]', '[class*="preco"]',
            '.product-price', '.valor', '[itemprop="price"]'
          ]
          
          for (const sel of precoSelectors) {
            const el = document.querySelector(sel)
            if (el) {
              const texto = el.textContent || ''
              const match = texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
              if (match) {
                preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                break
              }
            }
          }

          // Buscar estoque/disponibilidade
          const estoqueSelectors = [
            '.stock', '.estoque', '[class*="stock"]', '[class*="estoque"]',
            '.availability', '.disponibilidade', '[class*="disponib"]'
          ]
          
          for (const sel of estoqueSelectors) {
            const el = document.querySelector(sel)
            if (el) {
              const texto = (el.textContent || '').toLowerCase()
              estoque = texto.trim()
              
              // Verificar se está indisponível
              if (texto.includes('indisponível') || texto.includes('esgotado') || 
                  texto.includes('sem estoque') || texto.includes('out of stock')) {
                disponivel = false
              }
              break
            }
          }

          // Verificar botão de comprar desabilitado
          const btnComprar = document.querySelector('button[disabled], .btn-comprar[disabled], .add-to-cart[disabled]')
          if (btnComprar) {
            disponivel = false
          }

          return { preco, estoque, disponivel }
        })

        // Só atualiza se encontrou preço
        if (dados.preco > 0) {
          const precoAnterior = produto.preco

          // Atualizar produto
          await supabase
            .from('ag_concorrentes_produtos')
            .update({
              preco: dados.preco,
              estoque: dados.estoque,
              disponibilidade: dados.disponivel ? 'disponível' : 'indisponível',
              updated_at: new Date().toISOString()
            })
            .eq('id', produto.id)

          // Registrar histórico se preço mudou
          if (precoAnterior && precoAnterior !== dados.preco) {
            historico.push({
              produto_id: produto.id,
              concorrente_id: concorrenteId,
              tenant_id: tenantId,
              preco_anterior: precoAnterior,
              preco_novo: dados.preco,
              variacao: ((dados.preco - precoAnterior) / precoAnterior * 100).toFixed(2)
            })
          }

          atualizados++
          
          if (atualizados % 50 === 0) {
            console.log(`   📊 ${atualizados}/${produtos.length} atualizados...`)
          }
        }

      } catch (err) {
        erros++
        // Continua pro próximo produto
      }
    }

    await browser.close()

    // Salvar histórico de preços
    if (historico.length > 0) {
      await supabase.from('ag_concorrentes_historico_precos').insert(historico)
      console.log(`📈 ${historico.length} alterações de preço registradas`)
    }

    // Registrar log
    const logResult = await supabase.from('ag_concorrentes_logs').insert({
      concorrente_id: concorrenteId,
      tenant_id: tenantId,
      tipo: 'atualizar_precos',
      descricao: `${atualizados} atualizados, ${erros} erros, ${historico.length} mudanças de preço`
    })
    
    if (logResult.error) {
      console.error('❌ Erro ao salvar log:', logResult.error)
    } else {
      console.log('📝 Log salvo com sucesso')
    }

    console.log(`✅ Atualização concluída: ${atualizados} produtos, ${historico.length} mudanças de preço`)
    
    return { 
      success: true, 
      total: atualizados, 
      erros,
      mudancasPreco: historico.length
    }

  } catch (error) {
    console.error('========================================')
    console.error('❌ ERRO NO CRAWLER:')
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('========================================')
    if (browser) await browser.close()
    throw error
  }
}

module.exports = { atualizarPrecos }
