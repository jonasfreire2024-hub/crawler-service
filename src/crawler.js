const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

async function crawlerCompleto({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey }) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    console.log('🚀 Iniciando crawler completo para:', urlBase)

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
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

    // FASE 1: Mapear categorias
    console.log('📂 Mapeando categorias...')
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 2000))

    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      const links = document.querySelectorAll('nav a, .menu a, header a, [class*="menu"] a')
      
      links.forEach(link => {
        let href = link.href
        if (!href || !href.startsWith(baseUrl)) return
        if (href.includes('#') || href.includes('-p')) return
        if (href.includes('login') || href.includes('conta') || href.includes('cart')) return
        if (href.includes('contato') || href.includes('sobre') || href.includes('blog')) return
        
        href = href.split('?')[0].replace(/\/$/, '')
        if (href !== baseUrl && href.length > baseUrl.length + 2) {
          cats.add(href)
        }
      })
      
      return Array.from(cats)
    }, urlBase)

    console.log(`📂 ${categorias.length} categorias encontradas`)

    // FASE 2: Extrair produtos
    const produtosMap = new Map()
    let totalSalvos = 0

    for (let i = 0; i < categorias.length; i++) {
      const urlCategoria = categorias[i]
      const nomeCategoria = urlCategoria.replace(urlBase, '') || '/'
      
      console.log(`[${i + 1}/${categorias.length}] ${nomeCategoria}`)

      try {
        for (let pagina = 1; pagina <= 20; pagina++) {
          const urlPagina = pagina === 1 ? urlCategoria : `${urlCategoria}?pagina=${pagina}`
          
          try {
            await page.goto(urlPagina, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await new Promise(r => setTimeout(r, 500))
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
            if (produtosMap.has(urlProd)) continue

            try {
              await page.goto(urlProd, { waitUntil: 'domcontentloaded', timeout: 20000 })
              await new Promise(r => setTimeout(r, 200))

              const dados = await page.evaluate(() => {
                const nome = document.querySelector('h1')?.textContent?.trim()
                const precoEl = document.querySelector('.price, .preco, [class*="price"]')
                let preco = 0
                if (precoEl) {
                  const texto = precoEl.textContent || ''
                  const match = texto.match(/R\$\s*([0-9.,]+)/)
                  if (match) {
                    preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                  }
                }
                const imagem = document.querySelector('.product-image img, .gallery img')?.src
                
                return { nome, preco, imagem }
              })

              if (dados.nome && dados.preco > 0) {
                produtosMap.set(urlProd, {
                  ...dados,
                  url: urlProd,
                  categoria: nomeCategoria
                })
                novos++
              }
            } catch (e) {
              // Ignorar erros de produtos individuais
            }
          }

          console.log(`   Página ${pagina}: ${novos} novos`)
          if (novos === 0 && pagina > 1) break
        }

        // Salvar a cada categoria
        const produtosCategoria = Array.from(produtosMap.values())
          .filter(p => p.categoria === nomeCategoria)

        if (produtosCategoria.length > 0) {
          const { error } = await supabase
            .from('ag_concorrentes_produtos')
            .upsert(
              produtosCategoria.map(p => ({
                tenant_id: tenantId,
                concorrente_id: concorrenteId,
                nome: p.nome,
                preco: p.preco,
                url: p.url,
                imagem_url: p.imagem,
                categoria: p.categoria,
                ativo: true
              })),
              { onConflict: 'url' }
            )

          if (!error) {
            totalSalvos += produtosCategoria.length
            console.log(`   💾 ${totalSalvos} produtos salvos`)
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
      descricao: `${totalSalvos} produtos de ${categorias.length} categorias`
    })

    console.log(`✅ Crawler completo: ${totalSalvos} produtos`)
    return { success: true, total: totalSalvos, categorias: categorias.length }

  } catch (error) {
    console.error('❌ Erro no crawler:', error)
    if (browser) await browser.close()
    throw error
  }
}

module.exports = { crawlerCompleto }
