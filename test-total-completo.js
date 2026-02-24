const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '../.env' }) // Ler .env do projeto principal

// Configurar Supabase a partir do .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * CRAWLER COMPLETO - TOTAL DISTRIBUIÇÃO
 * Extrai produtos e salva direto no Supabase (igual Lord)
 */

async function crawlerTotal() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  🤖 CRAWLER TOTAL DISTRIBUIÇÃO                             ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')
  
  const urlBase = 'https://totaldistribuicaorj.com.br'
  const urlLogin = 'https://totaldistribuicaorj.com.br/Login'
  const email = '45281091000119'
  const senha = '45281'
  
  // CONFIGURAÇÃO DA API
  const API_URL = 'http://localhost:3000'
  const CONCORRENTE_ID = '3' // ID da Total Distribuição no banco
  const LIMITE_CATEGORIAS = 1 // 🧪 TESTE: Limitar a 1 categoria
  const LIMITE_PRODUTOS = 10 // 🧪 TESTE: Limitar a 10 produtos
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // ============================================
    // ETAPA 1: LOGIN
    // ============================================
    console.log('🔐 ETAPA 1: Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    await page.type('#forminator-field-text-1_6998e35da96bd', email)
    await page.type('#forminator-field-password-1_6998e35da96bd', senha)
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.textContent?.toLowerCase().includes('login')
      )
      if (loginButton) loginButton.click()
    })
    
    await new Promise(r => setTimeout(r, 5000))
    console.log('✅ Login realizado\n')
    
    // ============================================
    // ETAPA 2: EXTRAIR CATEGORIAS
    // ============================================
    console.log('📂 ETAPA 2: Extraindo categorias...')
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      
      // Seletores para menus
      const seletores = [
        'nav a',
        '.menu a',
        'header a',
        '[class*="menu"] a',
        '[class*="nav"] a'
      ]
      
      seletores.forEach(seletor => {
        try {
          const links = document.querySelectorAll(seletor)
          links.forEach(link => {
            let href = link.href
            if (!href || !href.startsWith(baseUrl)) return
            
            // Aceitar apenas URLs de categoria-produto
            if (href.includes('/categoria-produto/') && 
                !href.includes('#') &&
                !href.includes('?')) {
              href = href.split('?')[0].replace(/\/$/, '')
              cats.add(href)
            }
          })
        } catch (e) {}
      })
      
      return Array.from(cats)
    }, urlBase)
    
    console.log(`✅ ${categorias.length} categorias encontradas\n`)
    
    if (categorias.length === 0) {
      console.log('❌ Nenhuma categoria encontrada!')
      await browser.close()
      return
    }
    
    // ============================================
    // ETAPA 3: EXTRAIR PRODUTOS DE CADA CATEGORIA
    // ============================================
    const categoriasLimitadas = categorias.slice(0, LIMITE_CATEGORIAS) // 🧪 Limitar categorias
    console.log(`📦 ETAPA 3: Extraindo produtos de ${categoriasLimitadas.length} categoria(s)...\n`)
    
    const todosProdutos = new Set()
    let categoriaAtual = 0
    
    for (const urlCategoria of categoriasLimitadas) {
      categoriaAtual++
      console.log(`[${categoriaAtual}/${categoriasLimitadas.length}] ${urlCategoria}`)
      
      try {
        await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 60000 })
        await new Promise(r => setTimeout(r, 2000))
        
        // Scroll para carregar lazy loading
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight)
        })
        await new Promise(r => setTimeout(r, 1000))
        
        // Extrair URLs de produtos
        const urlsProdutos = await page.evaluate((urlBase) => {
          const urls = new Set()
          
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
          
          return Array.from(urls)
        }, urlBase)
        
        urlsProdutos.forEach(url => todosProdutos.add(url))
        console.log(`   ✅ ${urlsProdutos.length} produtos encontrados`)
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
      
      // Pequena pausa entre categorias
      await new Promise(r => setTimeout(r, 1000))
    }
    
    const arrayProdutos = Array.from(todosProdutos).slice(0, LIMITE_PRODUTOS) // 🧪 Limitar produtos
    console.log(`\n✅ Total de produtos únicos: ${todosProdutos.size}`)
    console.log(`🧪 TESTE: Limitando a ${LIMITE_PRODUTOS} produtos\n`)
    
    if (arrayProdutos.length === 0) {
      console.log('❌ Nenhum produto encontrado!')
      await browser.close()
      return
    }
    
    // ============================================
    // ETAPA 4: EXTRAIR DADOS DE CADA PRODUTO
    // ============================================
    console.log('🔍 ETAPA 4: Extraindo dados dos produtos...\n')
    
    const produtosExtraidos = []
    let produtoAtual = 0
    
    for (const urlProduto of arrayProdutos) {
      produtoAtual++
      console.log(`[${produtoAtual}/${arrayProdutos.length}] Extraindo...`)
      
      try {
        await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await new Promise(r => setTimeout(r, 2000))
        
        const dados = await page.evaluate(() => {
          const resultado = {
            nome: '',
            sku: '',
            preco_normal: null,
            preco_pix: null,
            imagem: '',
            disponibilidade: 'disponível'
          }

          const areaProduto = document.querySelector('.summary, .entry-summary, .product') || document.body

          // NOME
          const nomeEl = areaProduto.querySelector('h1.product_title, h1, .product-title')
          if (nomeEl) resultado.nome = nomeEl.textContent.trim()

          // SKU
          const skuEl = areaProduto.querySelector('.sku, [itemprop="sku"]')
          if (skuEl) resultado.sku = skuEl.textContent.trim()

          // PREÇOS
          const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount, p.price, .price')
          precoEls.forEach(el => {
            const texto = el.textContent
            const match = texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
            if (match) {
              const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
              if (!resultado.preco_normal) {
                resultado.preco_normal = preco
              } else if (preco < resultado.preco_normal) {
                resultado.preco_pix = preco
              }
            }
          })

          if (resultado.preco_normal && !resultado.preco_pix) {
            resultado.preco_pix = resultado.preco_normal
          }

          // IMAGEM
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
          
          // DISPONIBILIDADE
          const textoCompleto = document.body.textContent.toLowerCase()
          if (textoCompleto.includes('fora de estoque') || 
              textoCompleto.includes('indisponível') ||
              textoCompleto.includes('esgotado')) {
            resultado.disponibilidade = 'indisponível'
          }

          return resultado
        })
        
        if (dados.nome && dados.preco_normal) {
          produtosExtraidos.push({ url: urlProduto, ...dados })
          console.log(`   ✅ ${dados.nome.substring(0, 60)}... - R$ ${dados.preco_normal.toFixed(2)}`)
        } else {
          console.log(`   ⚠️ Dados incompletos - pulando`)
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
      
      // Pequena pausa entre produtos
      await new Promise(r => setTimeout(r, 500))
    }
    
    console.log(`\n✅ Total extraído: ${produtosExtraidos.length} produtos\n`)
    
    if (produtosExtraidos.length === 0) {
      console.log('❌ Nenhum produto válido extraído!')
      await browser.close()
      return
    }
    
    // ============================================
    // ETAPA 5: SALVAR NO SUPABASE
    // ============================================
    console.log('💾 ETAPA 5: Salvando produtos no Supabase...\n')
    
    // Obter tenant_id do concorrente
    const { data: concorrente } = await supabase
      .from('ag_concorrentes')
      .select('tenant_id')
      .eq('id', CONCORRENTE_ID)
      .single()
    
    if (!concorrente) {
      console.log('❌ Concorrente não encontrado!')
      await browser.close()
      return
    }
    
    const tenantId = concorrente.tenant_id
    console.log(`✅ Tenant ID: ${tenantId}\n`)
    
    let sucessos = 0
    let erros = 0
    
    for (const produto of produtosExtraidos) {
      try {
        const { error } = await supabase
          .from('ag_concorrentes_produtos')
          .upsert({
            tenant_id: tenantId,
            concorrente_id: parseInt(CONCORRENTE_ID),
            nome: produto.nome,
            preco: produto.preco_pix || produto.preco_normal,
            preco_pix: produto.preco_pix,
            preco_normal: produto.preco_normal,
            url: produto.url,
            imagem_url: produto.imagem,
            categoria: produto.categoria,
            disponibilidade: produto.disponibilidade,
            ativo: true,
            ultima_coleta: new Date().toISOString()
          }, { onConflict: 'url' })
        
        if (!error) {
          sucessos++
          console.log(`   ✅ [${sucessos + erros}/${produtosExtraidos.length}] ${produto.nome.substring(0, 50)}...`)
        } else {
          erros++
          console.log(`   ❌ [${sucessos + erros}/${produtosExtraidos.length}] Erro: ${error.message}`)
        }
      } catch (error) {
        erros++
        console.log(`   ❌ [${sucessos + erros}/${produtosExtraidos.length}] Erro: ${error.message}`)
      }
    }
    
    await browser.close()
    
    // ============================================
    // RESUMO FINAL
    // ============================================
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ CRAWLER CONCLUÍDO                                      ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')
    
    console.log('📊 RESUMO:')
    console.log(`   Categorias analisadas: ${categorias.length}`)
    console.log(`   Produtos encontrados: ${arrayProdutos.length}`)
    console.log(`   Produtos extraídos: ${produtosExtraidos.length}`)
    console.log(`   ✅ Enviados com sucesso: ${sucessos}`)
    console.log(`   ❌ Erros: ${erros}`)
    console.log(`   📈 Taxa de sucesso: ${((sucessos / produtosExtraidos.length) * 100).toFixed(1)}%\n`)
    
    if (sucessos > 0) {
      console.log('🎉 Produtos da Total Distribuição adicionados ao sistema!')
    }
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message)
    console.error(error.stack)
    if (browser) await browser.close()
  }
}

crawlerTotal()
