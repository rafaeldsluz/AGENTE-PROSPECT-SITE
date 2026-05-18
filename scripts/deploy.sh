#!/usr/bin/env bash
# Roda na VPS a cada atualização do código.
# Presupõe que setup-vps.sh já foi executado.
#
# Uso:
#   bash scripts/deploy.sh
#
# Na primeira execução (sem dist/), faz o setup completo.
# Nas demais, apenas atualiza, reconstrói e reinicia.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# Carrega nvm se necessário (sessão não-interativa)
export NVM_DIR="/root/.nvm"
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"

echo "==> [1/6] Atualizando código..."
git pull origin main

echo "==> [2/6] Instalando dependências npm..."
npm ci --omit=dev

echo "==> [3/6] Instalando Chromium (Playwright)..."
npx playwright install chromium

echo "==> [4/6] Compilando TypeScript..."
npm run build

echo "==> [5/6] Subindo serviços Docker (Postgres + Redis)..."
docker compose up -d --wait

echo "==> [6/6] Rodando migrações do banco..."
npm run migrate

echo "==> Reiniciando aplicação via PM2..."
if pm2 describe prospector > /dev/null 2>&1; then
  pm2 restart prospector
else
  pm2 start dist/index.js \
    --name prospector \
    --max-memory-restart 512M \
    --log-date-format "YYYY-MM-DD HH:mm:ss"
  pm2 save
fi

echo ""
pm2 status prospector
echo ""
echo "✓ Deploy concluído. Logs: pm2 logs prospector"
