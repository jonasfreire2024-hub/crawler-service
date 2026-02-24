const puppeteer = require('puppeteer')

/**
 * TESTE PARA ENCONTRAR ESTOQUE - TOTAL DISTRIBUIÇÃO
 */

async function testarEstoque() {
  console.log('🔍 BUSCANDO ESTOQUE NO SITE DA TOTAL\n')
  
  const urlProduto = 'https://totaldistribuicaorj.com.br/produto/sofa-retratil-e-reclinavel-corvette-250-m-veludo-avela-dvitrine-estofados/'
  const urlLogin = 'https://totaldistribuicaorj.com.br/Login'
  const email = '45281091000119'
  const senha = '45281'
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // LOGIN
    console.log('🔐 Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    await page.type('#forminator-field-text-1_6998e35da96bd', email)
    await page.type('#forminator-field-password-1_6998e35da96bd', senha)
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const loginButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('entrar'))
      if (loginButton) loginButton.click()
    })
    
    await new Promise(r => setTimeout(r, 5000))
    console.log('✅ Login OK\n')
    
    // IR PARA PRODUTO
    console.log(`📦 Acessando produto...\n${urlProduto}\n`)
    await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 5000))
    
    // Screenshot
    await page.screenshot({ path: 'estoque-total-full.png', fullPage: true })
    console.log('📸 Screenshot: estoque-total-full.png\n')
    
    // BUSCAR ESTOQUE DE TODAS AS FORMAS POSSÍVEIS
    console.log('🔍 Analisando página em busca de estoque...\n')
    
    const analise = await page.evaluate(() => {
      const resultado = {
        textoCompleto: document.body.textContent,
        htmlCompleto: document.body.innerHTML,
        elementosComEstoque: [],
        elementosComQuantidade: [],
        elementosComDisponivel: [],
        elementosComNumeros: [],
        classesInteressantes: [],
        idsInteressantes: []
      }
      
      // 1. Procurar por texto "estoque"
      const todosElementos = document.querySelectorAll('*')
      todosElementos.forEach(el => {
        const texto = el.textContent?.toLowerCase() || ''
        const html = el.innerHTML?.toLowerCase() || ''
        
        if (texto.includes('estoque') || html.includes('estoque')) {
          resultado.elementosComEstoque.push({
            tag: el.tagName,
            classe: el.className,
            id: el.id,
            texto: el.textContent?.trim().substring(0, 100),
            html: el.innerHTML?.substring(0, 200)
          })
        }
        
        if (texto.includes('quantidade') || html.includes('quantidade') || 
            texto.includes('qtd') || html.includes('qtd')) {
          resultado.elementosComQuantidade.push({
            tag: el.tagName,
            classe: el.className,
            id: el.id,
            texto: el.textContent?.trim().substring(0, 100)
          })
        }
        
        if (texto.includes('disponível') || texto.includes('disponivel') ||
            html.includes('disponível') || html.includes('disponivel')) {
          resultado.elementosComDisponivel.push({
            tag: el.tagName,
            classe: el.className,
            id: el.id,
            texto: el.textContent?.trim().substring(0, 100)
          })
        }
        
        // Procurar elementos com números que podem ser estoque
        const match = texto.match(/(\d+)\s*(unidade|un|peça|peças|disponível|disponivel|em estoque)/i)
        if (match) {
          resultado.elementosComNumeros.push({
            tag: el.tagName,
            classe: el.className,
            id: el.id,
            numero: match[1],
            texto: el.textContent?.trim().substring(0, 100)
          })
        }
        
        // Classes interessantes
        if (el.className && typeof el.className === 'string') {
          if (el.className.includes('stock') || 
              el.className.includes('estoque') ||
              el.className.includes('quantity') ||
              el.className.includes('qtd') ||
              el.className.includes('disponib')) {
            resultado.classesInteressantes.push({
              classe: el.className,
              texto: el.textContent?.trim().substring(0, 100),
              html: el.innerHTML?.substring(0, 200)
            })
          }
        }
        
        // IDs interessantes
        if (el.id) {
          if (el.id.includes('stock') || 
              el.id.includes('estoque') ||
              el.id.includes('quantity') ||
              el.id.includes('qtd') ||
              el.id.includes('disponib')) {
            resultado.idsInteressantes.push({
              id: el.id,
              texto: el.textContent?.trim().substring(0, 100),
              html: el.innerHTML?.substring(0, 200)
            })
          }
        }
      })
      
      return resultado
    })
    
    console.log('📊 RESULTADOS DA ANÁLISE:\n')
    
    console.log(`1️⃣ Elementos com "estoque": ${analise.elementosComEstoque.length}`)
    if (analise.elementosComEstoque.length > 0) {
      console.log('   Primeiros 5:')
      analise.elementosComEstoque.slice(0, 5).forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> classe="${el.classe}" id="${el.id}"`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    console.log(`2️⃣ Elementos com "quantidade": ${analise.elementosComQuantidade.length}`)
    if (analise.elementosComQuantidade.length > 0) {
      console.log('   Primeiros 5:')
      analise.elementosComQuantidade.slice(0, 5).forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> classe="${el.classe}"`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    console.log(`3️⃣ Elementos com "disponível": ${analise.elementosComDisponivel.length}`)
    if (analise.elementosComDisponivel.length > 0) {
      console.log('   Primeiros 5:')
      analise.elementosComDisponivel.slice(0, 5).forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> classe="${el.classe}"`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    console.log(`4️⃣ Elementos com números + palavras-chave: ${analise.elementosComNumeros.length}`)
    if (analise.elementosComNumeros.length > 0) {
      console.log('   Todos:')
      analise.elementosComNumeros.forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> classe="${el.classe}"`)
        console.log(`      Número: ${el.numero}`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    console.log(`5️⃣ Classes interessantes: ${analise.classesInteressantes.length}`)
    if (analise.classesInteressantes.length > 0) {
      console.log('   Todas:')
      analise.classesInteressantes.forEach((el, i) => {
        console.log(`   ${i + 1}. classe="${el.classe}"`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    console.log(`6️⃣ IDs interessantes: ${analise.idsInteressantes.length}`)
    if (analise.idsInteressantes.length > 0) {
      console.log('   Todos:')
      analise.idsInteressantes.forEach((el, i) => {
        console.log(`   ${i + 1}. id="${el.id}"`)
        console.log(`      Texto: "${el.texto}"`)
      })
      console.log('')
    }
    
    // Buscar padrões no texto completo
    console.log('7️⃣ Buscando padrões no texto completo...\n')
    
    const patterns = [
      /(\d+)\s*em\s*estoque/gi,
      /estoque:\s*(\d+)/gi,
      /(\d+)\s*unidade/gi,
      /(\d+)\s*disponível/gi,
      /disponível:\s*(\d+)/gi,
      /quantidade:\s*(\d+)/gi,
      /qtd:\s*(\d+)/gi,
      /(\d+)\s*peça/gi
    ]
    
    patterns.forEach(pattern => {
      const matches = [...analise.textoCompleto.matchAll(pattern)]
      if (matches.length > 0) {
        console.log(`   Pattern: ${pattern}`)
        matches.forEach(match => {
          console.log(`      ✅ Encontrado: "${match[0]}" - Número: ${match[1]}`)
        })
      }
    })
    
    // Procurar por data attributes
    console.log('\n8️⃣ Procurando data attributes...\n')
    const dataAttrs = await page.evaluate(() => {
      const attrs = []
      document.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-') && 
              (attr.name.includes('stock') || 
               attr.name.includes('quantity') ||
               attr.name.includes('qtd') ||
               attr.name.includes('estoque'))) {
            attrs.push({
              elemento: el.tagName,
              classe: el.className,
              atributo: attr.name,
              valor: attr.value
            })
          }
        })
      })
      return attrs
    })
    
    if (dataAttrs.length > 0) {
      console.log('   Data attributes encontrados:')
      dataAttrs.forEach((attr, i) => {
        console.log(`   ${i + 1}. <${attr.elemento}> ${attr.atributo}="${attr.valor}"`)
        console.log(`      Classe: ${attr.classe}`)
      })
    } else {
      console.log('   ❌ Nenhum data attribute relacionado a estoque encontrado')
    }
    
    console.log('\n⏸️ Navegador ficará aberto. Pressione Ctrl+C para fechar.')
    console.log('💡 Inspecione manualmente o elemento de estoque no navegador!')
    await new Promise(() => {})
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

testarEstoque()
