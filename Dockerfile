FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copiar package.json primeiro para cache de dependências
COPY package*.json ./

# Instalar dependências (Puppeteer já vem com Chromium nesta imagem)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# Copiar código fonte
COPY src ./src

# Expor porta
EXPOSE 8080

# Variáveis de ambiente
ENV PORT=8080
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Iniciar aplicação
CMD ["node", "src/index.js"]
