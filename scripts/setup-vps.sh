#!/usr/bin/env bash
# Executa UMA VEZ na VPS para instalar todas as dependências do sistema.
# Testado em Ubuntu 22.04 (Hostinger KVM).
#
# Uso:
#   chmod +x scripts/setup-vps.sh
#   sudo bash scripts/setup-vps.sh

set -euo pipefail

echo "==> [1/6] Atualizando pacotes do sistema..."
apt-get update -y && apt-get upgrade -y

echo "==> [2/6] Instalando dependências base..."
apt-get install -y curl git unzip ca-certificates gnupg lsb-release

# ── Docker ──────────────────────────────────────────────────────────────────
echo "==> [3/6] Instalando Docker e Docker Compose..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# ── Node.js 20 via nvm ───────────────────────────────────────────────────────
echo "==> [4/6] Instalando Node.js 20 via nvm..."
export NVM_DIR="/root/.nvm"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm alias default 20
nvm use default

# Garante que node/npm ficam disponíveis em sessões não-interativas
ln -sf "$(which node)" /usr/local/bin/node
ln -sf "$(which npm)"  /usr/local/bin/npm
ln -sf "$(which npx)"  /usr/local/bin/npx

# ── PM2 ──────────────────────────────────────────────────────────────────────
echo "==> [5/6] Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -n1 | bash || true

# ── Dependências do sistema para Playwright/Chromium ─────────────────────────
echo "==> [6/6] Instalando libs do sistema para Chromium (Playwright)..."
apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 libpango-1.0-0 libpangocairo-1.0-0 libgtk-3-0 \
  fonts-liberation libappindicator3-1 xdg-utils libvulkan1

echo ""
echo "✓ Setup concluído. Próximo passo: clone o repositório e rode scripts/deploy.sh"
