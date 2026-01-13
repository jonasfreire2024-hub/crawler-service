const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

async function crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey }) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    console.log('🚀 Iniciando crawler COMPLETO para:', urlBase)

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    })

    let page = await browser.newPage()
    page.setDefaultNavigationTimeout(60000)
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

    // ========================================================================
    // FASE 1: MAPEAR TODAS AS CATEGORIAS
    // ========================================================================
    console.log('📂 FASE 1: Mapeando TODAS as categorias...')
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 2000))

    const categoriasIniciais = await page.evaluate((baseUrl) => {
      const cats = new Set()
      
      // Buscar em TODOS os links do menu, incluindo submenus
      const seletores = [
        'nav a', '.menu a', 'header a', '[class*="menu"] a', '[class*="nav"] a',
        '[class*="dropdown"] a', '[class*="submenu"] a', '.sub-menu a',
        '.dropdown-menu a', 'ul.menu li a', 'ul.menu li ul li a',
        '.mega-menu a', '[class*="categoria"] a', '[class*="category"] a'
      ]
      
      seletores.forEach(seletor => {
        try {
          const links = document.querySelectorAll(seletor)
          links.forEach(link => {
            let href = link.href
            if (!href || !href.startsWith(baseUrl)) return
            if (href.includes('#') || href.includes('-p')) return
            if (href.includes('goto') || href.includes('login') || href.includes('conta')) return
            if (href.includes('.php') || href.includes('logoff') || href.includes('cart')) return
            if (href.includes('contato') || href.includes('sobre') || href.includes('blog')) return
            if (href.includes('wishlist') || href.includes('compare') || href.includes('checkout')) return
            if (href.includes('politica') || href.includes('termos') || href.includes('privacidade')) return
            
            href = href.split('?')[0].replace(/\/$/, '')
            
            if (href !== baseUrl && href.length > baseUrl.length + 2) {
              cats.add(href)
            }
          })
        } catch (e) {}
      })
      
      return Array.from(cats)
    }, urlBase)

    console.log(`📋 ${categoriasIniciais.length} categorias iniciais encontradas`)

    // Mapear recursivamente subcategorias
    const todasCategorias = []
    const categoriasVisitadas = new Set()
    const categoriasParaMapear = [...categoriasIniciais]
    let nivel = 0
    const MAX_NIVEIS = 10

    while (categoriasParaMapear.length > 0 && nivel < MAX_NIVEIS) {
      const batch = categoriasParaMapear.splice(0, categoriasParaMapear.length)
      
      for (const urlAtual of batch) {
        if (categoriasVisitadas.has(urlAtual)) continue
        
        categoriasVisitadas.add(urlAtual)
        todasCategorias.push(urlAtual)
        
        try {
          await page.goto(urlAtual, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await new Promise(r => setTimeout(r, 100))
          
          const subcategorias = await page.evaluate((baseUrl, urlAtual) => {
            const subs = new Set()
            const links = document.querySelectorAll('a')
            
            links.forEach(link => {
              let href = link.href
              if (!href || !href.startsWith(baseUrl)) return
              if (href.includes('#') || href.includes('-p')) return
              if (href.includes('goto') || href.includes('login') || href.includes('conta')) return
              if (href.includes('.php') || href.includes('logoff')) return
              
              href = href.split('?')[0].replace(/\/$/, '')
              
              if (href !== baseUrl && href !== urlAtual && href.length > baseUrl.length + 2) {
                const partes = href.replace(baseUrl, '').split('/').filter(Boolean)
                if (partes.length <= 5) {
                  subs.add(href)
                }
              }
            })
            
            return Array.from(subs)
          }, urlBase, urlAtual)
          
          subcategorias.forEach(sub => {
            if (!categoriasVisitadas.has(sub) && !categoriasParaMapear.includes(sub)) {
              categoriasParaMapear.push(sub)
            }
          })
          
        } catch (error) {
          // Ignorar erros
        }
      }
      
      nivel++
    }

    console.log(`✅ ${todasCategorias.length} categorias mapeadas`)

    // ========================================================================
    // FASE 2: EXTRAIR PRODUTOS DE CADA CATEGORIA
    // ========================================================================
    console.log(`\n📦 FASE 2: Extraindo produtos de ${todasCategorias.length} categorias...`)
    
    const produtosMap = new Map()
    let totalSalvos = 0
    let totalDuplicatas = 0
    const urlsJaSalvas = new Set()

    // Buscar URLs já existentes no banco
    const { data: produtosExistentes } = await supabase
      .from('ag_concorrentes_produtos')
      .select('url')
      .eq('concorrente_id', concorrenteId)
    
    if (produtosExistentes) {
      produtosExistentes.forEach(p => {
        if (p.url) urlsJaSalvas.add(p.url)
      })
    }
    console.log(`📋 ${urlsJaSalvas.size} produtos já existentes no banco`)

    for (let i = 0; i < todasCategorias.length; i++) {
      const urlCategoria = todasCategorias[i]
      const nomeCategoria = urlCategoria.replace(urlBase, '') || '/'
      
      console.log(`[${i + 1}/${todasCategorias.length}] 📂 ${nomeCategoria}`)

      try {
        let pagina = 1
        const produtosDaCategoria = []

        while (pagina <= 50) { // Limite de 50 páginas por categoria
          try {
            const urlPagina = pagina === 1 ? urlCategoria : `${urlCategoria}?pagina=${pagina}`
            await page.goto(urlPagina, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await new Promise(r => setTimeout(r, 300))
          } catch (e) {
            break
          }

          // Extrair URLs de produtos
          const urlsProdutos = await page.evaluate(() => {
            const urls = new Set()
            const regex = /href="([^"]*-p\d+)"/gi
            let match
            while ((match = regex.exec(document.documentElement.outerHTML)) !== null) {
              let url = match[1]
              if (!url.startsWith('http')) {
                url = window.location.origin + (url.startsWith('/') ? '' : '/') + url
              }
              urls.add(url)
            }
            return Array.from(urls)
          })

          if (urlsProdutos.length === 0) break

          let novos = 0
          for (const urlProd of urlsProdutos) {
            if (urlsJaSalvas.has(urlProd) || produtosMap.has(urlProd)) {
              totalDuplicatas++
              continue
            }

            try {
              await page.goto(urlProd, { waitUntil: 'domcontentloaded', timeout: 20000 })
              await new Promise(r => setTimeout(r, 200))

              // EXTRAIR DADOS - MESMA LÓGICA DO BOTÃO DETALHADO
              const dados = await page.evaluate(() => {
                const resultado = {
                  nome: '',
                  marca: '',
                  categoria: '',
                  sku: '',
                  preco_normal: null,
                  preco_pix: null,
                  imagem: '',
                  descricao: '',
                  disponibilidade: 'disponível',
                  estoque: null
                }

                // Buscar na área do produto principal
                const areaProduto = document.querySelector('.product-details-content, article[itemtype*="Product"]')
                
                if (!areaProduto) {
                  return { erro: 'Área do produto não encontrada' }
                }

                // NOME
                const nomeEl = areaProduto.querySelector('h1, [itemprop="name"]')
                if (nomeEl) resultado.nome = nomeEl.textContent.trim()

                // MARCA
                const marcasConhecidas = ['Art Assentos', 'Carioca', 'D Doro', 'JB Bechara', 'Tebarrot', 'Rud Rack', 'ACP', 'Anjos', 'Ortobom', 'Poquema', 'Minas Plac', 'KM Decor']
                for (const marca of marcasConhecidas) {
                  if (resultado.nome.includes(marca)) {
                    resultado.marca = marca
                    break
                  }
                }
                
                if (!resultado.marca) {
                  const fabricanteLink = areaProduto.querySelector('.produto_fabricante a')
                  if (fabricanteLink) {
                    resultado.marca = fabricanteLink.title || fabricanteLink.textContent.trim()
                  }
                }

                // SKU
                const skuEl = areaProduto.querySelector('[itemprop="sku"], #produto_cod_ref')
                if (skuEl) resultado.sku = skuEl.textContent.trim()

                // PREÇOS
                const areaPrecos = areaProduto.querySelector('.product-values, .product-price, .price-detail-fixed')
                
                if (areaPrecos) {
                  const precoNormalEl = areaPrecos.querySelector('.price[data-element="sale-price"] p, .price p')
                  if (precoNormalEl) {
                    const match = precoNormalEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                    if (match) {
                      resultado.preco_normal = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                    }
                  }
                  
                  const precoDescontoEl = areaPrecos.querySelector('.best-price')
                  if (precoDescontoEl) {
                    const match = precoDescontoEl.textContent.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
                    if (match) {
                      resultado.preco_pix = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                    }
                  }
                }

                if (resultado.preco_normal && !resultado.preco_pix) {
                  resultado.preco_pix = resultado.preco_normal
                }

                // IMAGEM
                const galeriaImagens = areaProduto.querySelectorAll('.product-gallery img, .gallery-thumbs img, [class*="product-image"] img')
                if (galeriaImagens.length > 0) {
                  for (const img of galeriaImagens) {
                    if (img.src && img.src.startsWith('http') && !img.src.includes('thumb_') && !img.src.includes('logo')) {
                      resultado.imagem = img.src
                      break
                    }
                  }
                }

                // DESCRIÇÃO
                const descTabs = areaProduto.querySelector('.description_tabs')
                if (descTabs) {
                  const clone = descTabs.cloneNode(true)
                  clone.querySelectorAll('script, style, label, input, button').forEach(e => e.remove())
                  resultado.descricao = clone.textContent.trim().replace(/\s+/g, ' ').substring(0, 1000)
                }

                // DISPONIBILIDADE E ESTOQUE
                const textoCompleto = areaProduto.textContent.toLowerCase()
                
                if (textoCompleto.includes('em estoque')) {
                  resultado.disponibilidade = 'disponível'
                } else if (textoCompleto.includes('indisponível') || textoCompleto.includes('esgotado')) {
                  resultado.disponibilidade = 'indisponível'
                }
                
                const estoqueMatch = textoCompleto.match(/quantidade em estoque[:\s]+(\d+)/i)
                if (estoqueMatch) {
                  resultado.estoque = parseInt(estoqueMatch[1])
                }

                return resultado
              })

              if (dados.erro) continue

              if (dados.nome && (dados.preco_normal > 0 || dados.preco_pix > 0)) {
                produtosMap.set(urlProd, {
                  ...dados,
                  url: urlProd,
                  categoria: nomeCategoria
                })
                produtosDaCategoria.push({
                  ...dados,
                  url: urlProd,
                  categoria: nomeCategoria
                })
                urlsJaSalvas.add(urlProd)
                novos++
              }
            } catch (e) {
              // Ignorar erros de produtos individuais
            }
          }

          console.log(`   Página ${pagina}: ${novos} novos`)
          if (novos === 0 && pagina > 1) break
          pagina++
        }

        // Salvar a cada categoria - usando UPSERT para evitar duplicatas
        if (produtosDaCategoria.length > 0) {
          const { error } = await supabase
            .from('ag_concorrentes_produtos')
            .upsert(
              produtosDaCategoria.map(p => ({
                tenant_id: tenantId,
                concorrente_id: concorrenteId,
                nome: p.nome,
                preco: p.preco_normal || p.preco_pix,
                preco_pix: p.preco_pix,
                preco_normal: p.preco_normal,
                url: p.url,
                imagem_url: p.imagem,
                categoria: p.categoria,
                descricao: p.descricao,
                sku: p.sku,
                marca: p.marca,
                disponibilidade: p.disponibilidade,
                estoque: p.estoque,
                ativo: true,
                ultima_coleta: new Date().toISOString()
              })),
              { onConflict: 'url', ignoreDuplicates: false }
            )

          if (!error) {
            totalSalvos += produtosDaCategoria.length
            console.log(`   💾 ${totalSalvos} produtos salvos/atualizados`)
          } else {
            console.error(`   ❌ Erro ao salvar: ${error.message}`)
          }
        }

      } catch (error) {
        console.error(`Erro na categoria ${nomeCategoria}:`, error.message)
      }
    }

    await browser.close()

    // Log final
    await supabase.from('ag_concorrentes_logs').insert({
      concorrente_id: concorrenteId,
      tenant_id: tenantId,
      tipo: 'crawler_completo',
      descricao: `${totalSalvos} produtos de ${todasCategorias.length} categorias (${totalDuplicatas} duplicatas)`
    })

    console.log(`\n✅ Crawler completo: ${totalSalvos} produtos de ${todasCategorias.length} categorias`)
    return { 
      success: true, 
      total: totalSalvos, 
      categorias: todasCategorias.length,
      duplicatas: totalDuplicatas
    }

  } catch (error) {
    console.error('❌ Erro no crawler:', error)
    if (browser) await browser.close()
    throw error
  }
}

module.exports = { crawlerCompleto }
