const puppeteer = require('puppeteer')

async function debugTotal() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  console.log('🔐 Login...')
  await page.goto('https://totaldistribuicaorj.com.br/Login')
  await new Promise(r => setTimeout(r, 3000))
  
  await page.type('#forminator-field-text-1_6998e35da96bd', '45281091000119')
  await page.type('#forminator-field-password-1_6998e35da96bd', '45281')
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const loginButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('entrar') ||
      btn.textContent?.toLowerCase().includes('login')
    )
    if (loginButton) loginButton.click()
  })
  
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login OK\n')
  
  // Ir para /inicio
  console.log('📂 Indo para /inicio...')
  await page.goto('https://totaldistribuicaorj.com.br/inicio', { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 2000))
  
  // Extrair URLs de produtos - MESMA LÓGICA DO ENDPOINT
  console.log('🔍 Extraindo URLs de produtos...')
  const urlsProdutos = await page.evaluate(() => {
    const urls = new Set()
    document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
      let href = link.href
      if (href) {
        href = href.split('?')[0].split('#')[0].replace(/\/$/, '')
        urls.add(href)
      }
    })
    return Array.from(urls)
  })
  
  console.log(`\n✅ ${urlsProdutos.length} URLs de produtos encontradas`)
  
  if (urlsProdutos.length === 0) {
    console.log('\n❌ PROBLEMA: Nenhuma URL de produto encontrada!')
    console.log('Vou verificar o HTML da página...\n')
    
    const html = await page.content()
    const temProduto = html.includes('/produto/')
    console.log('HTML contém "/produto/"?', temProduto)
    
    if (temProduto) {
      console.log('\nVou tentar outros seletores...')
      
      const outrosSeletores = await page.evaluate(() => {
        const resultados = []
        
        // Tentar vários seletores
        const seletores = [
          'a[href*="/produto/"]',
          '.product a',
          '.product-small a',
          'li.product a',
          'ul.products li a'
        ]
        
        seletores.forEach(sel => {
          const els = document.querySelectorAll(sel)
          resultados.push({
            seletor: sel,
            quantidade: els.length,
            exemplos: Array.from(els).slice(0, 2).map(el => el.href)
          })
        })
        
        return resultados
      })
      
      console.log('\nResultados de outros seletores:')
      outrosSeletores.forEach(r => {
        console.log(`\n${r.seletor}: ${r.quantidade} elementos`)
        r.exemplos.forEach(ex => console.log(`  - ${ex}`))
      })
    }
  } else {
    console.log('\nPrimeiras 5 URLs:')
    urlsProdutos.slice(0, 5).forEach((url, i) => {
      console.log(`  [${i + 1}] ${url}`)
    })
    
    // Testar primeiro produto
    console.log('\n🔍 Testando extração do primeiro produto...')
    await page.goto(urlsProdutos[0], { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 500))
    
    const dados = await page.evaluate(() => {
      const resultado = {
        nome: '',
        preco: 0,
        preco_original: 0,
        precos_encontrados: []
      }
      
      // Nome
      const h1 = document.querySelector('h1.product_title')
      if (h1) resultado.nome = h1.textContent?.trim()
      
      // Preços
      const precosAVista = document.querySelectorAll('.wc-simulador-parcelas-offer .woocommerce-Price-amount')
      const precos = []
      
      precosAVista.forEach(el => {
        const match = el.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
        if (match) {
          const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
          if (preco > 0) {
            precos.push(preco)
            resultado.precos_encontrados.push(`R$ ${preco.toFixed(2)}`)
          }
        }
      })
      
      if (precos.length > 0) {
        resultado.preco = Math.min(...precos)
        if (precos.length > 1) {
          resultado.preco_original = Math.max(...precos)
        } else {
          resultado.preco_original = resultado.preco
        }
      }
      
      return resultado
    })
    
    console.log('\n=== DADOS EXTRAÍDOS ===')
    console.log('Nome:', dados.nome)
    console.log('Preço:', dados.preco)
    console.log('Preço Original:', dados.preco_original)
    console.log('Preços encontrados:', dados.precos_encontrados.join(', '))
    
    if (!dados.nome || !dados.preco) {
      console.log('\n❌ PROBLEMA: Dados incompletos!')
      console.log('Nome válido?', !!dados.nome)
      console.log('Preço válido?', dados.preco > 0)
    } else {
      console.log('\n✅ Extração funcionou!')
    }
  }
  
  await new Promise(r => setTimeout(r, 10000))
  await browser.close()
}

debugTotal()
