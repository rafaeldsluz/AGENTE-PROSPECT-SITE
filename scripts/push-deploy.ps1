# push-deploy.ps1 — commit, push e deploy automático na VPS Hostinger
#
# Uso:
#   .\scripts\push-deploy.ps1
#   .\scripts\push-deploy.ps1 -Message "feat: minha mudança"
#   .\scripts\push-deploy.ps1 -SkipCommit   # só push + deploy, sem commit
#
# Configuração (edite as variáveis abaixo):
#   VPS_HOST = IP ou domínio da sua VPS
#   VPS_USER = usuário SSH (normalmente root)
#   VPS_PATH = caminho do projeto na VPS
#   VPS_KEY  = caminho para sua chave SSH privada (deixe vazio para senha)

param(
    [string]$Message = "",
    [switch]$SkipCommit
)

# ── Configuração ─────────────────────────────────────────────────────────────
$VPS_HOST = "SEU_IP_AQUI"        # ex: 185.123.45.67
$VPS_USER = "root"
$VPS_PATH = "/opt/prospector"
$VPS_KEY  = ""                   # ex: C:\Users\rafael\.ssh\id_rsa (vazio = senha)
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

function Write-Step($text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host $text -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host $text -ForegroundColor Red
}

# Valida configuração mínima
if ($VPS_HOST -eq "SEU_IP_AQUI") {
    Write-Fail "Configure VPS_HOST em scripts/push-deploy.ps1 antes de usar."
    exit 1
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

# ── 1. Commit ─────────────────────────────────────────────────────────────────
if (-not $SkipCommit) {
    $status = git status --porcelain
    if ($status) {
        Write-Step "Arquivos modificados detectados"
        git status --short

        if ($Message -eq "") {
            $Message = Read-Host "`nMensagem do commit (Enter para usar timestamp)"
            if ($Message -eq "") {
                $Message = "chore: deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            }
        }

        Write-Step "Commitando alterações..."
        git add -A
        git commit -m $Message
        Write-Success "Commit criado: $Message"
    } else {
        Write-Host "Nenhuma alteração local para commitar." -ForegroundColor Yellow
    }
}

# ── 2. Push ───────────────────────────────────────────────────────────────────
Write-Step "Enviando código para o GitHub..."
git push origin main
Write-Success "Push concluído."

# ── 3. Deploy via SSH ─────────────────────────────────────────────────────────
Write-Step "Conectando na VPS e rodando deploy..."

$sshCmd = "cd $VPS_PATH && git pull origin main && bash scripts/deploy.sh"

$sshArgs = @()
if ($VPS_KEY -ne "") {
    $sshArgs += "-i", $VPS_KEY
}
$sshArgs += "-o", "StrictHostKeyChecking=accept-new"
$sshArgs += "${VPS_USER}@${VPS_HOST}"
$sshArgs += $sshCmd

ssh @sshArgs

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Deploy falhou (exit code $LASTEXITCODE). Verifique os logs acima."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Success "✓ Deploy concluído com sucesso!"
Write-Host "  Logs em tempo real: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs prospector'" -ForegroundColor Gray
