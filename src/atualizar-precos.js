const puppeteer = require('puppeteer-core')
const chromium = require('@sparticuz/chromium')
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
    console.log('🌐 Iniciando Puppeteer com @sparticuz/chromium...')
    
    // Usar @sparticuz/chromium - funciona perfeitamente no Railway
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    })
    console.log('✅ Puppeteer iniciado')

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Bloquear recursos desnecessários
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
    let inativos = 0
    const historico = []
    const movimentacoes = []
    const produtosInativados = []

    for (let i = 0; i < produtos.length; i++) {
      const produto = produtos[i]
      
      try {
        const response = await page.goto(produto.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
        
        if (!response || response.status() === 404 || response.status() >= 400) {
          console.log(`   ❌ ${produto.nome}: Página não encontrada (${response?.status() || 'sem resposta'})`)
          produtosInativados.push(produto.id)
          inativos++
          continue
        }
        
        await new Promise(r => setTimeout(r, 500))

        const dados = await page.evaluate(() => {
          let preco = 0
          let estoque = null
          let disponivel = true

          const areaProduto = document.querySelector('.product-details-content, article[itemtype*="Product"]')
          
          // Meta tag (mais confiável)
          const metaPrice = document.querySelector('meta[itemprop="price"]')
          if (metaPrice && metaPrice.content) {
            const valor = parseFloat(metaPrice.content)
            if (valor > 0) preco = valor
          }
          
          // data-element="price"
          if (preco === 0) {
            const dataPrice = document.querySelector('[data-element="price"]')
            if (dataPrice) {
              const texto = dataPrice.textContent || dataPrice.getAttribute('content') || ''
              const match = texto.match(/R?\$?\s*([0-9]{1,3}(?:\.?[0-9]{3})*(?:,[0-9]{2})?)/)
              if (match) {
                preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
              }
            }
          }
          
          if (areaProduto) {
            const areaPrecos = areaProduto.querySelector('.product-values, .product-price, .price-detail-fixed')
            
            if (areaPrecos) {
              const precoNormalEl = areaPrecos.querySelector('.price[data-element="sale-price"] p, .price p')
              if (precoNormalEl) {
                const match = precoNormalEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                if (match) {
                  preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                }
              }
              
              const precoDescontoEl = areaPrecos.querySelector('.best-price')
              if (precoDescontoEl) {
                const match = precoDescontoEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                if (match) {
                  preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                }
              }
            }
            
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

        if (dados.preco > 0) {
          const precoAnterior = produto.preco || 0
          const estoqueAnterior = produto.estoque ? parseInt(produto.estoque) : null
          const estoqueAtual = dados.estoque ? parseInt(dados.estoque) : null
          
          const precoMudou = precoAnterior && Math.abs(precoAnterior - dados.preco) > 0.01
          const agora = new Date().toISOString()

          const dadosAtualizacao = {
            preco: dados.preco,
            preco_anterior: precoAnterior,
            estoque: dados.estoque,
            estoque_anterior: estoqueAnterior,
            disponibilidade: dados.disponivel ? 'disponível' : 'indisponível',
            ultima_coleta: agora,
            updated_at: agora
          }
          
          if (precoMudou) {
            dadosAtualizacao.ultima_alteracao_preco = agora
          }

          await supabase
            .from('ag_concorrentes_produtos')
            .update(dadosAtualizacao)
            .eq('id', produto.id)

          const variacaoPreco = precoAnterior ? dados.preco - precoAnterior : 0
          const variacaoPrecoPercent = precoAnterior ? ((dados.preco - precoAnterior) / precoAnterior * 100) : 0
          const variacaoEstoque = (estoqueAnterior !== null && estoqueAtual !== null) ? estoqueAtual - estoqueAnterior : null

          let tipoMovimento = null
          if (variacaoEstoque !== null && variacaoEstoque < 0) tipoMovimento = 'venda'
          else if (variacaoEstoque !== null && variacaoEstoque > 0) tipoMovimento = 'compra'
          else if (precoMudou && variacaoPreco > 0) tipoMovimento = 'aumento_preco'
          else if (precoMudou && variacaoPreco < 0) tipoMovimento = 'reducao_preco'
          else if (!dados.disponivel && produto.disponibilidade !== 'indisponível') tipoMovimento = 'esgotado'
          else if (dados.disponivel && produto.disponibilidade === 'indisponível') tipoMovimento = 'reabastecido'

          const estoqueMudou = variacaoEstoque !== null && variacaoEstoque !== 0
          const disponibilidadeMudou = tipoMovimento === 'esgotado' || tipoMovimento === 'reabastecido'
          
          if (precoMudou || estoqueMudou || disponibilidadeMudou) {
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
              coletado_em: agora
            })
          }

          if (precoMudou) {
            historico.push({
              produto_concorrente_id: produto.id,
              tenant_id: tenantId,
              preco_anterior: precoAnterior,
              preco: dados.preco,
              disponivel: dados.disponivel,
              data_coleta: agora
            })
          }

          atualizados++
          
          if (atualizados % 50 === 0) {
            console.log(`   📊 ${atualizados}/${produtos.length} atualizados...`)
          }
        }

      } catch (err) {
        erros++
      }
    }

    await browser.close()

    if (produtosInativados.length > 0) {
      await supabase
        .from('ag_concorrentes_produtos')
        .update({ 
          ativo: false, 
          disponibilidade: 'removido',
          updated_at: new Date().toISOString()
        })
        .in('id', produtosInativados)
      
      console.log(`🗑️ ${produtosInativados.length} produtos inativados (página não encontrada)`)
    }

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
    
    const { data: produtosAntigos } = await supabase
      .from('ag_concorrentes_produtos')
      .update({ 
        ativo: false, 
        disponibilidade: 'desatualizado',
        updated_at: new Date().toISOString()
      })
      .eq('concorrente_id', concorrenteId)
      .eq('ativo', true)
      .lt('ultima_coleta', seteDiasAtras.toISOString())
      .select('id')
    
    const produtosDesatualizados = produtosAntigos?.length || 0
    if (produtosDesatualizados > 0) {
      console.log(`⏰ ${produtosDesatualizados} produtos inativados (sem atualização há 7+ dias)`)
    }

    if (movimentacoes.length > 0) {
      await supabase.from('ag_concorrentes_movimentacoes').insert(movimentacoes)
      console.log(`📊 ${movimentacoes.length} movimentações registradas`)
    }

    if (historico.length > 0) {
      await supabase.from('ag_concorrentes_historico_precos').insert(historico)
      console.log(`📈 ${historico.length} alterações de preço registradas`)
    }

    await supabase.from('ag_concorrentes_logs').insert({
      concorrente_id: concorrenteId,
      tenant_id: tenantId,
      tipo: 'atualizar_precos',
      descricao: `${atualizados} atualizados, ${erros} erros, ${inativos} inativados (404), ${produtosDesatualizados} desatualizados, ${historico.length} mudanças de preço`
    })

    console.log(`✅ Atualização concluída: ${atualizados} produtos, ${inativos + produtosDesatualizados} inativados, ${movimentacoes.length} movimentações, ${historico.length} mudanças de preço`)
    
    return { 
      success: true, 
      total: atualizados, 
      erros,
      inativos: inativos + produtosDesatualizados,
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
