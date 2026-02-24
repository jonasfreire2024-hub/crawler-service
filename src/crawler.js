const puppeteer = require('puppeteer-core')
const chromium = require('@sparticuz/chromium')
const { createClient } = require('@supabase/supabase-js')

async function crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey, testeRapido = false }) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    if (testeRapido) {
      console.log('🧪 TESTE RÁPIDO - Processando apenas 1 categoria')
    }
    console.log('🚀 Iniciando crawler COMPLETO para:', urlBase)

    // Usar @sparticuz/chromium - funciona perfeitamente no Railway
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled', // Esconder que é bot
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    })
    console.log('✅ Puppeteer iniciado')

    let page = await browser.newPage()
    page.setDefaultNavigationTimeout(60000)
    
    // Esconder que é um bot
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // NÃO bloquear recursos - pode causar problemas com JavaScript

    // ========================================================================
    // LOGIN (se for Lord Distribuidor ou Total Distribuição)
    // ========================================================================
    if (urlBase.includes('lordistribuidor.com.br')) {
      console.log('🔐 Detectado Lord - Fazendo login...')
      try {
        await page.goto('https://lordistribuidor.com.br/minha-conta', { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        })
        await new Promise(r => setTimeout(r, 2000))
        
        // Verificar se já está logado
        const jaLogado = await page.evaluate(() => {
          return document.body.textContent.includes('Olá') || 
                 document.body.textContent.includes('Sair') ||
                 !document.querySelector('#username')
        })
        
        if (!jaLogado) {
          await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 50 })
          await page.type('#password', '151295', { delay: 50 })
          await page.click('button[name="login"]')
          await new Promise(r => setTimeout(r, 5000))
          console.log('✅ Login realizado')
        } else {
          console.log('✅ Já estava logado')
        }
      } catch (e) {
        console.log('⚠️ Erro no login, continuando sem autenticação:', e.message)
      }
    } else if (urlBase.includes('totaldistribuicaorj.com.br')) {
      console.log('🔐 Detectado Total Distribuição - Fazendo login...')
      try {
        await page.goto('https://totaldistribuicaorj.com.br/Login', { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        })
        await new Promise(r => setTimeout(r, 3000))
        
        // Preencher formulário específico da Total
        await page.type('#forminator-field-text-1_6998e35da96bd', '45281091000119', { delay: 50 })
        await page.type('#forminator-field-password-1_6998e35da96bd', '45281', { delay: 50 })
        
        // Clicar no botão de login
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
          const loginButton = buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('entrar') ||
            btn.textContent?.toLowerCase().includes('login')
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
            await page.goto(urlPagina, { waitUntil: 'networkidle2', timeout: 30000 })
            await new Promise(r => setTimeout(r, 2000)) // Aguardar mais tempo para JS carregar
          } catch (e) {
            break
          }

          // Extrair URLs de produtos - MÉTODO MAIS ROBUSTO
          const urlsProdutos = await page.evaluate((urlBase) => {
            const urls = new Set()
            
            // Detectar tipo de site
            const isRufer = urlBase.includes('rufer') || urlBase.includes('rufermoveis')
            const isLord = urlBase.includes('lord') || urlBase.includes('lorddistribuidor')
            const isTotal = urlBase.includes('totaldistribuicaorj')
            
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
            } else if (isLord || isTotal) {
              // LORD e TOTAL: WooCommerce - Buscar links com /produto/
              const seletoresProduto = [
                '.product-small a',
                '.product a',
                'li.product a',
                'ul.products li a',
                '.woocommerce-LoopProduct-link',
                'a[href*="/produto/"]'
              ]
              
              seletoresProduto.forEach(seletor => {
                try {
                  const links = document.querySelectorAll(seletor)
                  links.forEach(link => {
                    let url = link.href
                    if (url && 
                        url.startsWith(urlBase) &&
                        url.includes('/produto/') &&
                        !url.includes('/categoria') &&
                        !url.includes('?')) {
                      urls.add(url)
                    }
                  })
                } catch (e) {}
              })
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
            if (testeRapido && urlsProdutos.length > 10) {
              console.log(`   🧪 TESTE RÁPIDO: Limitando a 10 produtos`)
            }
            if (urlsProdutos.length > 0) {
              console.log(`   Exemplos:`)
              urlsProdutos.slice(0, 3).forEach(url => console.log(`     - ${url}`))
            } else {
              console.log(`   ⚠️ Nenhum produto encontrado - possível problema na detecção`)
            }
          }

          if (urlsProdutos.length === 0) break

          let novos = 0
          // 🧪 Limitar a 10 produtos se for teste rápido
          const urlsProdutosParaProcessar = testeRapido ? urlsProdutos.slice(0, 10) : urlsProdutos
          
          for (const urlProd of urlsProdutosParaProcessar) {
            if (urlsJaSalvas.has(urlProd) || produtosMap.has(urlProd)) {
              totalDuplicatas++
              continue
            }

            try {
              await page.goto(urlProd, { waitUntil: 'domcontentloaded', timeout: 20000 })
              await new Promise(r => setTimeout(r, 200))

              // EXTRAIR DADOS - LÓGICA OTIMIZADA PARA LORD E TOTAL
              const dados = await page.evaluate(() => {
                const resultado = {
                  nome: '',
                  preco: 0,
                  preco_original: 0,
                  imagem: '',
                  disponibilidade: 'disponível',
                  estoque: null
                }
                
                // Área do produto (WooCommerce)
                const areaProduto = document.querySelector('.summary, .entry-summary, .product') || document.body
                
                // Nome
                const nomeEl = areaProduto.querySelector('h1.product_title, h1, .product-title')
                if (nomeEl) resultado.nome = nomeEl.textContent?.trim()
                
                // Preços - WooCommerce
                const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount, p.price, .price')
                precoEls.forEach(el => {
                  const texto = el.textContent
                  const match = texto?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
                  if (match) {
                    const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                    if (!resultado.preco) {
                      resultado.preco = preco
                    } else if (preco < resultado.preco) {
                      resultado.preco_original = resultado.preco
                      resultado.preco = preco
                    } else if (preco > resultado.preco) {
                      resultado.preco_original = preco
                    }
                  }
                })
                
                // Se não tem preço original, usar o preço como original
                if (!resultado.preco_original && resultado.preco) {
                  resultado.preco_original = resultado.preco
                }
                
                // Imagem
                const imgSelectors = [
                  '.woocommerce-product-gallery__image img',
                  '.woocommerce-product-gallery img',
                  '.wp-post-image',
                  'img[itemprop="image"]',
                  '.product-image img',
                  '.product-gallery img'
                ]
                
                for (const seletor of imgSelectors) {
                  const img = document.querySelector(seletor)
                  if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
                    resultado.imagem = img.src
                    break
                  }
                }
                
                // Estoque - Buscar no HTML completo
                const htmlCompleto = document.documentElement.outerHTML
                const matchEstoque = htmlCompleto.match(/Em estoque[:\s]*(\d+)/i)
                if (matchEstoque) {
                  resultado.estoque = parseInt(matchEstoque[1])
                  resultado.disponibilidade = 'disponível'
                }
                
                // Verificar disponibilidade
                const textoCompleto = document.body.textContent.toLowerCase()
                if (textoCompleto.includes('fora de estoque') || 
                    textoCompleto.includes('indisponível') ||
                    textoCompleto.includes('esgotado') ||
                    htmlCompleto.includes('OutOfStock')) {
                  resultado.disponibilidade = 'indisponível'
                  resultado.estoque = 0
                } else if (htmlCompleto.includes('InStock')) {
                  resultado.disponibilidade = 'disponível'
                  if (resultado.estoque === null) {
                    resultado.estoque = 1 // Assume pelo menos 1 se está em estoque
                  }
                }
                
                return resultado
              })

              if (dados.nome && dados.preco > 0) {
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
                preco: p.preco, // Preço com desconto (PIX)
                preco_pix: p.preco, // Mesmo que preco
                preco_normal: p.preco_original || p.preco, // Preço sem desconto
                url: p.url,
                imagem_url: p.imagem,
                categoria: p.categoria,
                disponibilidade: p.disponibilidade,
                estoque: p.estoque,
                ativo: true,
                ultima_coleta: new Date().toISOString()
              })),
              { onConflict: 'url' }
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
