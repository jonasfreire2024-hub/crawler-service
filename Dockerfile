FROM ghcr.io/puppeteer/puppeteer:21.6.1

WORKDIR /app

# Copiar arquivos
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Porta
EXPOSE 3001

# Iniciar
CMD ["node", "src/index.js"]
