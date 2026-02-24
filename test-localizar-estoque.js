const puppeteer = require('puppeteer')

async function localizarEstoque() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  
  const page = await browser.newPage()
  
  // LOGIN
  await page.goto('https://lordistribuidor.com.br/minha-conta', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 2000))
  
  await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 50 })
  await page.type('#password', '151295', { delay: 50 })
  await page.click('button[name="login"]')
  await new Promise(r => setTimeout(r, 5000))
  
  await page.goto('https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/', { 
    waitUntil: 'domcontentloaded', 
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 3000))
  
  const info = await page.evaluate(() => {
    // Buscar o elemento que contém "Em estoque"
    const todosElementos = Array.from(document.querySelectorAll('*'))
    const elementoEstoque = todosElementos.find(el => {
      return el.textContent.includes('Em estoque:') && el.children.length === 0
    })
    
    if (elementoEstoque) {
      return {
        encontrado: true,
        tag: elementoEstoque.tagName,
        classe: elementoEstoque.className,
        id: elementoEstoque.id,
        texto: elementoEstoque.textContent,
        html: elementoEstoque.outerHTML,
        pai: elementoEstoque.parentElement ? {
          tag: elementoEstoque.parentElement.tagName,
          classe: elementoEstoque.parentElement.className,
          id: elementoEstoque.parentElement.id
        } : null
      }
    }
    
    return { encontrado: false }
  })
  
  console.log('📊 Informação do estoque:')
  console.log(JSON.stringify(info, null, 2))
  
  await new Promise(r => setTimeout(r, 10000))
  await browser.close()
}

localizarEstoque().catch(console.error)
