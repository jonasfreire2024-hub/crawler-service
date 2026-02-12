const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

async function crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey, testeRapido = false }) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    if (testeRapido) {
      console.log('🧪 TESTE RÁPIDO - Processando apenas 1 categoria')
    }
    console.log('🚀 Iniciando crawler COMPLETO para:', urlBase)

    // Configuração do browser baseada no sistema operacional
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list'
      ]
    }
    
    // No Linux (Railway), usar chromium-browser
    if (process.platform === 'linux') {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
      launchOptions.args.push(
        '--no-zygote',
        '--single-process',
        '--disable-crash-reporter',
        '--disable-breakpad',
        '--crash-dumps-dir=/tmp',
        '--enable-crashpad=false'
      )
    }
    // No Windows/Mac, deixar Puppeteer usar o Chrome baixado automaticamente
    
    browser = await puppeteer.launch(launchOptions)

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
    // LOGIN (se for Lord Distribuidor)
    // ========================================================================
    if (urlBase.includes('lordistribuidor.com.br')) {
      console.log('🔐 Detectado Lord - Fazendo login...')
      try {
        await page.goto('https://lordistribuidor.com.br/minha-conta', { waitUntil: 'domcontentloaded', timeout: 60000 })
        await new Promise(r => setTimeout(r, 5000))
        
        await page.type('#username', 'projetofabiano1512@gmail.com')
        await page.type('#password', '151295')
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
          const loginButton = buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('entrar') ||
            btn.value?.toLowerCase().includes('entrar')
          )
          if (loginButton) loginButton.click()
        })
        
        await new Promise(r => setTimeout(r, 5000))
        console.log('✅ Login realizado')
      } catch (e) {
        console.log('⚠️ Erro no login, continuando sem autenticação:', e.message)
      }
    }

    // ========================================================================
    // FASE 1: MAPEAR TODAS AS CATEGORIAS
    // ========================================================================
    console.log('📂 FASE 1: Mapeando TODAS as categorias...')
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 5000))

    const categoriasIniciais = await page.evaluate((baseUrl) => {
      const cats = new Set()
      
      // Buscar TODOS os links da página que parecem ser categorias
      const todosLinks = document.querySelectorAll('a')
      
      todosLinks.forEach(link => {
        let href = link.href
        if (!href || !href.startsWith(baseUrl)) return
        
        // Filtrar apenas o que claramente NÃO é categoria
        if (href.includes('#')) return
        if (href.includes('login') || href.includes('conta') || href.includes('minha-conta')) return
        if (href.includes('carrinho') || href.includes('checkout') || href.includes('cart')) return
        if (href.includes('contato') || href.includes('sobre') || href.includes('blog')) return
        if (href.includes('wishlist') || href.includes('compare')) return
        if (href.includes('politica') || href.includes('termos') || href.includes('privacidade')) return
        if (href.includes('.php') || href.includes('logoff')) return
        
        href = href.split('?')[0].replace(/\/$/, '')
        
        // Aceitar URLs que são diferentes da base e têm tamanho razoável
        if (href !== baseUrl && href.length > baseUrl.length + 2) {
          // Verificar se parece ser uma categoria (tem /c/ ou está no menu)
          const isMenu = link.closest('nav, header, [class*="menu"]')
          const hasC = href.includes('/c/')
          const hasCategoria = href.includes('/categoria')
          
          // Se está no menu OU tem /c/ OU tem /categoria, é provavelmente uma categoria
          if (isMenu || hasC || hasCategoria) {
            cats.add(href)
          }
        }
      })
      
      // Se não encontrou nada, pegar TODOS os links do menu
      if (cats.size === 0) {
        const seletores = ['nav a', '.menu a', 'header a']
        seletores.forEach(seletor => {
          const links = document.querySelectorAll(seletor)
          links.forEach(link => {
            let href = link.href
            if (!href || !href.startsWith(baseUrl)) return
            if (href.includes('#') || href.includes('login') || href.includes('conta')) return
            href = href.split('?')[0].replace(/\/$/, '')
            if (href !== baseUrl && href.length > baseUrl.length + 2) {
              cats.add(href)
            }
          })
        })
      }
      
      return Array.from(cats)
    }, urlBase)

    console.log(`📋 ${categoriasIniciais.length} categorias iniciais encontradas`)
    
    // DEBUG: Mostrar algumas categorias
    if (categoriasIniciais.length > 0) {
      console.log('Exemplos:', categoriasIniciais.slice(0, 3).join(', '))
    }

    // Mapear recursivamente subcategorias
    const todasCategorias = []
    const categoriasVisitadas = new Set()
    const categoriasParaMapear = [...categoriasIniciais]
    
    // FALLBACK: Se não encontrou categorias, usar a URL base
    if (categoriasParaMapear.length === 0) {
      console.log('⚠️ Nenhuma categoria encontrada, usando URL base como categoria')
      categoriasParaMapear.push(urlBase)
    }
    
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
              if (href.includes('#')) return
              if (href.includes('login') || href.includes('conta') || href.includes('minha-conta')) return
              if (href.includes('carrinho') || href.includes('checkout')) return
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
    
    // DEBUG: Mostrar todas as categorias encontradas
    if (todasCategorias.length > 0) {
      console.log('Categorias mapeadas:')
      todasCategorias.slice(0, 10).forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat}`)
      })
      if (todasCategorias.length > 10) {
        console.log(`  ... e mais ${todasCategorias.length - 10} categorias`)
      }
    }

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

    // Limitar a 1 categoria se for teste rápido
    const categoriasParaProcessar = testeRapido ? todasCategorias.slice(0, 1) : todasCategorias
    if (testeRapido) {
      console.log(`🧪 TESTE RÁPIDO: Processando apenas a primeira categoria`)
    }

    for (let i = 0; i < categoriasParaProcessar.length; i++) {
      const urlCategoria = categoriasParaProcessar[i]
      const nomeCategoria = urlCategoria.replace(urlBase, '') || '/'
      
      console.log(`[${i + 1}/${categoriasParaProcessar.length}] 📂 ${nomeCategoria}`)

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

          // Extrair URLs de produtos - MÉTODO MAIS ROBUSTO
          const urlsProdutos = await page.evaluate((urlBase) => {
            const urls = new Set()
            
            // Detectar tipo de site
            const isRufer = urlBase.includes('rufer') || urlBase.includes('rufermoveis')
            const isLord = urlBase.includes('lord') || urlBase.includes('lorddistribuidor')
            
            if (isRufer) {
              // RUFER: Usa padrão -p seguido de números
              const regex = /href="([^"]*-p\d+[^"]*)"/gi
              let match
              while ((match = regex.exec(document.documentElement.outerHTML)) !== null) {
                let url = match[1]
                if (!url.startsWith('http')) {
                  url = window.location.origin + (url.startsWith('/') ? '' : '/') + url
                }
                urls.add(url)
              }
            } else if (isLord) {
              // LORD: Usar seletores WooCommerce
              const urls = new Set()
              
              // Seletores específicos do WooCommerce (que o Lord usa)
              const seletoresProduto = [
                '.products .product a.woocommerce-LoopProduct-link',
                'ul.products li.product > a',
                '.products li.product a:first-child',
                'li.product > a[href*="/produto/"]'
              ]
              
              seletoresProduto.forEach(seletor => {
                try {
                  const links = document.querySelectorAll(seletor)
                  links.forEach(link => {
                    let href = link.href
                    if (!href || !href.startsWith('http')) return
                    
                    // Limpar URL
                    href = href.split('?')[0].split('#')[0].replace(/\/$/, '')
                    
                    // Filtrar URLs externas
                    if (href.includes('whatsapp.com') ||
                        href.includes('facebook.com') ||
                        href.includes('instagram.com') ||
                        href.includes('api.whatsapp')) {
                      return
                    }
                    
                    // Adicionar se tiver /produto/ ou se for um link de produto válido
                    if (href.includes('/produto/') || 
                        (href !== window.location.href && 
                         !href.includes('/c/') && 
                         !href.includes('/categoria'))) {
                      urls.add(href)
                    }
                  })
                } catch (e) {}
              })
              
              return Array.from(urls)
              
              // Se não encontrou nada, tentar seletores específicos
              if (urls.size === 0) {
                const seletoresProduto = [
                  '.product-item a',
                  '.product a',
                  '.products li a',
                  'ul.products li a',
                  '[data-product] a',
                  '.item-product a',
                  '.produto a',
                  'li[itemtype*="Product"] a',
                  '.showcase-item a',
                  '[class*="product"] a',
                  '.woocommerce-LoopProduct-link'
                ]
                
                seletoresProduto.forEach(seletor => {
                  try {
                    const links = document.querySelectorAll(seletor)
                    links.forEach(link => {
                      const url = link.href
                      if (url && url.startsWith('http') && 
                          !url.includes('/c/') && 
                          !url.includes('/categoria') &&
                          url !== window.location.href) {
                        urls.add(url)
                      }
                    })
                  } catch (e) {}
                })
              }
            } else {
              // GENÉRICO: Tenta ambos os métodos
              // Método 1: Regex
              const regex = /href="([^"]*-p\d+[^"]*)"/gi
              let match
              while ((match = regex.exec(document.documentElement.outerHTML)) !== null) {
                let url = match[1]
                if (!url.startsWith('http')) {
                  url = window.location.origin + (url.startsWith('/') ? '' : '/') + url
                }
                urls.add(url)
              }
              
              // Método 2: Seletores
              const seletoresProduto = [
                '.product-item a',
                '.product a',
                '[data-product] a',
                'li[itemtype*="Product"] a'
              ]
              
              seletoresProduto.forEach(seletor => {
                try {
                  const links = document.querySelectorAll(seletor)
                  links.forEach(link => {
                    let url = link.href
                    if (url && url.startsWith('http') && 
                        !url.includes('/categoria') && 
                        url !== window.location.href) {
                      urls.add(url)
                    }
                  })
                } catch (e) {}
              })
            }
            
            return Array.from(urls)
          }, urlBase)

          // DEBUG: Mostrar quantos produtos foram encontrados
          if (pagina === 1) {
            console.log(`   Encontrados ${urlsProdutos.length} produtos na página ${pagina}`)
            if (urlsProdutos.length > 0) {
              console.log(`   Exemplos:`)
              urlsProdutos.slice(0, 3).forEach(url => console.log(`     - ${url}`))
            } else {
              console.log(`   ⚠️ Nenhum produto encontrado - possível problema na detecção`)
            }
          }

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
