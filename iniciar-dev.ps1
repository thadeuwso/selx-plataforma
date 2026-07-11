# SelX 2.0 — sobe o ambiente de desenvolvimento completo num comando.
# Uso: .\iniciar-dev.ps1   (na raiz do monorepo)

$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot

Write-Host "[1/4] Docker Desktop..." -ForegroundColor Cyan
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  foreach ($i in 1..60) { Start-Sleep 3; docker info 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { break } }
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "Docker não subiu em 3 minutos."; exit 1 }
}

Write-Host "[2/4] PostgreSQL (porta 5433)..." -ForegroundColor Cyan
docker compose -f "$raiz\docker-compose.yml" up -d postgres | Out-Null
foreach ($i in 1..15) { Start-Sleep 2; $r = docker exec selx-postgres pg_isready -U selx 2>$null; if ($r -match "accepting") { break } }

Write-Host "[3/4] API (porta 3001)..." -ForegroundColor Cyan
$apiOk = $false
try { $apiOk = (Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch {}
if (-not $apiOk) {
  Start-Process -WindowStyle Minimized -WorkingDirectory "$raiz\apps\api" -FilePath "node" -ArgumentList "dist/main.js"
}

Write-Host "[4/4] Web (porta 3000)..." -ForegroundColor Cyan
$webOk = $false
try { $webOk = (Invoke-WebRequest -Uri "http://localhost:3000/login" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch {}
if (-not $webOk) {
  Start-Process -WindowStyle Minimized -WorkingDirectory "$raiz\apps\web" -FilePath "cmd" -ArgumentList "/c pnpm exec next start -p 3000"
}

Start-Sleep 5
Write-Host ""
Write-Host "SelX 2.0 no ar:" -ForegroundColor Green
Write-Host "  Web:  http://localhost:3000"
Write-Host "  API:  http://localhost:3001/health"
Write-Host "  (IA:  cd apps\ai-service; uv run --env-file .env uvicorn app.main:app --port 8000)"
