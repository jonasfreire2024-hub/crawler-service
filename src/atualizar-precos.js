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

    // Buscar produtos já cadastrados deste concorrente (com estoque anterior)
    const { data: produtos, error } = await supabase
      .from('ag_concorrentes_produtos')
      .select('id, url, nome, preco, estoque, preco_anterior, estoque_anterior')
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
    const movimentacoes = []

    for (let i = 0; i < produtos.length; i++) {
      const produto = produtos[i]
      
      try {
        await page.goto(produto.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await new Promise(r => setTimeout(r, 500))

        // Extrair preço e estoque - USANDO MESMA LÓGICA DO BOTÃO ATUALIZAR
        const dados = await page.evaluate(() => {
          let preco = 0
          let estoque = null
          let disponivel = true

          // Buscar apenas na área do produto principal (como faz o botão)
          const areaProduto = document.querySelector('.product-details-content, article[itemtype*="Product"]')
          
          if (areaProduto) {
            // ===== PREÇOS - APENAS DO PRODUTO PRINCIPAL =====
            const areaPrecos = areaProduto.querySelector('.product-values, .product-price, .price-detail-fixed')
            
            if (areaPrecos) {
              // Preço normal
              const precoNormalEl = areaPrecos.querySelector('.price[data-element="sale-price"] p, .price p')
              if (precoNormalEl) {
                const match = precoNormalEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                if (match) {
                  preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                }
              }
              
              // Preço com desconto (PIX/dinheiro)
              const precoDescontoEl = areaPrecos.querySelector('.best-price')
              if (precoDescontoEl) {
                const match = precoDescontoEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                if (match) {
                  preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                }
              }
            }
            
            // ===== ESTOQUE =====
            const textoCompleto = areaProduto.textContent.toLowerCase()
            
            if (textoCompleto.includes('em estoque')) {
              disponivel = true
            } else if (textoCompleto.includes('indisponível') || textoCompleto.includes('esgotado')) {
              disponivel = false
            }
            
            const estoqueMatch = textoCompleto.match(/quantidade em estoque[:\s]+(\d+)/i)
            if (estoqueMatch) {
              estoque = estoqueMatch[1]
            }
          }
          
          // Fallback: se não achou na área do produto, tentar seletores genéricos
          if (preco === 0) {
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
                  if (preco > 0) break
                }
              }
            }
          }

          // Fallback estoque
          if (estoque === null) {
            const estoqueSelectors = [
              '.stock', '.estoque', '[class*="stock"]', '[class*="estoque"]',
              '.availability', '.disponibilidade', '[class*="disponib"]'
            ]
            
            for (const sel of estoqueSelectors) {
              const el = document.querySelector(sel)
              if (el) {
                const texto = (el.textContent || '').toLowerCase()
                estoque = texto.trim()
                
                if (texto.includes('indisponível') || texto.includes('esgotado') || 
                    texto.includes('sem estoque') || texto.includes('out of stock')) {
                  disponivel = false
                }
                break
              }
            }
          }

          return { preco, estoque, disponivel }
        })

        // Só atualiza se encontrou preço
        if (dados.preco > 0) {
          const precoAnterior = produto.preco || 0
          const estoqueAnterior = produto.estoque ? parseInt(produto.estoque) : null
          const estoqueAtual = dados.estoque ? parseInt(dados.estoque) : null

          // Atualizar produto
          await supabase
            .from('ag_concorrentes_produtos')
            .update({
              preco: dados.preco,
              preco_anterior: precoAnterior,
              estoque: dados.estoque,
              estoque_anterior: estoqueAnterior,
              disponibilidade: dados.disponivel ? 'disponível' : 'indisponível',
              ultima_coleta: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', produto.id)

          // Calcular variações
          const variacaoPreco = precoAnterior ? dados.preco - precoAnterior : 0
          const variacaoPrecoPercent = precoAnterior ? ((dados.preco - precoAnterior) / precoAnterior * 100) : 0
          const variacaoEstoque = (estoqueAnterior !== null && estoqueAtual !== null) ? estoqueAtual - estoqueAnterior : null

          // Determinar tipo de movimento
          let tipoMovimento = null
          if (variacaoEstoque !== null && variacaoEstoque < 0) tipoMovimento = 'venda'
          else if (variacaoEstoque !== null && variacaoEstoque > 0) tipoMovimento = 'compra'
          else if (variacaoPreco > 0) tipoMovimento = 'aumento_preco'
          else if (variacaoPreco < 0) tipoMovimento = 'reducao_preco'
          else if (!dados.disponivel && produto.disponibilidade !== 'indisponível') tipoMovimento = 'esgotado'
          else if (dados.disponivel && produto.disponibilidade === 'indisponível') tipoMovimento = 'reabastecido'

          // Registrar movimentação (sempre, para ter histórico completo)
          if (precoAnterior || estoqueAnterior !== null) {
            movimentacoes.push({
              tenant_id: tenantId,
              produto_concorrente_id: produto.id,
              concorrente_id: concorrenteId,
              preco_atual: dados.preco,
              preco_anterior: precoAnterior,
              estoque_atual: estoqueAtual,
              estoque_anterior: estoqueAnterior,
              disponivel: dados.disponivel,
              variacao_preco: variacaoPreco,
              variacao_preco_percent: variacaoPrecoPercent.toFixed(2),
              variacao_estoque: variacaoEstoque,
              tipo_movimento: tipoMovimento,
              coletado_em: new Date().toISOString()
            })
          }

          // Registrar histórico de preços se preço mudou
          if (precoAnterior && precoAnterior !== dados.preco) {
            historico.push({
              produto_concorrente_id: produto.id,
              tenant_id: tenantId,
              preco_anterior: precoAnterior,
              preco: dados.preco,
              disponivel: dados.disponivel,
              data_coleta: new Date().toISOString()
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

    // Salvar movimentações (para análise de vendas/compras)
    if (movimentacoes.length > 0) {
      const { error: movError } = await supabase.from('ag_concorrentes_movimentacoes').insert(movimentacoes)
      if (movError) {
        console.error('❌ Erro ao salvar movimentações:', movError.message)
      } else {
        console.log(`📊 ${movimentacoes.length} movimentações registradas`)
      }
    }

    // Salvar histórico de preços
    if (historico.length > 0) {
      const { error: histError } = await supabase.from('ag_concorrentes_historico_precos').insert(historico)
      if (histError) {
        console.error('❌ Erro ao salvar histórico:', histError.message)
      } else {
        console.log(`📈 ${historico.length} alterações de preço registradas`)
      }
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

    console.log(`✅ Atualização concluída: ${atualizados} produtos, ${movimentacoes.length} movimentações, ${historico.length} mudanças de preço`)
    
    return { 
      success: true, 
      total: atualizados, 
      erros,
      movimentacoes: movimentacoes.length,
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
