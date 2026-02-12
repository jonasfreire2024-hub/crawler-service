const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

async function crawlerRapido({ concorrenteId, urlBase, tenantId, supabaseUrl, supabaseKey }) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  let browser = null

  try {
    console.log('🚀 Iniciando crawler rápido para:', urlBase)

    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--no-first-run',
        '--disable-crash-reporter',
        '--disable-breakpad'
      ]
    }
    
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
    
    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    // Mapear categorias
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1000))

    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      document.querySelectorAll('a[href]').forEach(link => {
        let href = link.href
        if (!href || !href.startsWith(baseUrl)) return
        if (href.match(/-p\d+/) || href.includes('#') || href.includes('?')) return
        if (href.includes('login') || href.includes('cart') || href.includes('conta')) return
        
        href = href.replace(/\/$/, '')
        const partes = href.replace(baseUrl, '').split('/').filter(Boolean)
        if (partes.length >= 1 && partes.length <= 3) {
          cats.add(href)
        }
      })
      return Array.from(cats)
    }, urlBase)

    console.log(`📂 ${categorias.length} categorias`)

    const produtosMap = new Map()

    for (let i = 0; i < categorias.length; i++) {
      const urlCategoria = categorias[i]
      const nomeCategoria = urlCategoria.replace(urlBase, '') || '/'

      try {
        // Só primeiras 5 páginas no modo rápido
        for (let pagina = 1; pagina <= 5; pagina++) {
          const url = pagina === 1 ? urlCategoria : `${urlCategoria}?pagina=${pagina}`
          
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await new Promise(r => setTimeout(r, 300))
          } catch (e) {
            break
          }

          // Extrair produtos direto da listagem
          const produtos = await page.evaluate((baseUrl) => {
            const items = []
            const urlsVistas = new Set()

            document.querySelectorAll('a[href]').forEach(link => {
              const href = link.href
              if (!href.match(/-p\d+$/) || urlsVistas.has(href)) return
              urlsVistas.add(href)

              let nome = link.title || link.textContent?.trim()
              const parent = link.closest('[class*="product"], [class*="item"], .card, li')
              
              if ((!nome || nome.length < 5) && parent) {
                const nomeEl = parent.querySelector('h2, h3, h4, [class*="name"]')
                nome = nomeEl?.textContent?.trim()
              }

              if (!nome || nome.length < 5) {
                nome = href.split('/').pop().replace(/-p\d+$/, '').replace(/-/g, ' ')
              }

              let preco = 0
              if (parent) {
                const precoEl = parent.querySelector('[class*="price"], [class*="preco"]')
                if (precoEl) {
                  const match = precoEl.textContent?.match(/R\$\s*([0-9.,]+)/)
                  if (match) {
                    preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
                  }
                }
              }

              const imagem = parent?.querySelector('img')?.src

              if (nome) {
                items.push({ nome, url: href, preco, imagem })
              }
            })

            return items
          }, urlBase)

          let novos = 0
          produtos.forEach(p => {
            if (!produtosMap.has(p.url)) {
              produtosMap.set(p.url, { ...p, categoria: nomeCategoria })
              novos++
            }
          })

          if (novos === 0 && pagina > 1) break
        }

        console.log(`[${i + 1}/${categorias.length}] ${nomeCategoria}: ${produtosMap.size} total`)

      } catch (error) {
        // Ignorar erros
      }
    }

    await browser.close()

    // Salvar tudo
    const produtos = Array.from(produtosMap.values())
    let salvos = 0

    if (produtos.length > 0) {
      const batchSize = 100
      for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize)
        const { error } = await supabase
          .from('ag_concorrentes_produtos')
          .upsert(
            batch.map(p => ({
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

        if (!error) salvos += batch.length
      }

      await supabase.from('ag_concorrentes_logs').insert({
        concorrente_id: concorrenteId,
        tenant_id: tenantId,
        tipo: 'crawler_rapido',
        descricao: `${salvos} produtos de ${categorias.length} categorias`
      })
    }

    console.log(`✅ Crawler rápido: ${salvos} produtos`)
    return { success: true, total: salvos, categorias: categorias.length }

  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
    throw error
  }
}

module.exports = { crawlerRapido }
