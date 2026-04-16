param()
$ErrorActionPreference = "Stop"

function Write-Step { param($m) Write-Host "" ; Write-Host "  >> $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "  OK  $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "  !!  $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "" ; Write-Host "  ERR $m" -ForegroundColor Red }
function Write-Info { param($m) Write-Host "      $m" -ForegroundColor DarkGray }

function Test-Cmd { param($c) return [bool](Get-Command $c -ErrorAction SilentlyContinue) }

function Get-RandHex {
    param([int]$n = 64)
    $b = New-Object byte[] $n
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return ($b | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Wait-Port {
    param([int]$port, [string]$name = "service", [int]$timeout = 60)
    Write-Info "Waiting for $name on port $port ..."
    $t = 0
    while ($t -lt $timeout) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", $port)
            $tcp.Close()
            Write-Ok "$name ready"
            return
        } catch {
            Start-Sleep -Seconds 2
            $t += 2
        }
    }
    Write-Warn "$name not ready after ${timeout}s, continuing anyway"
}

Clear-Host
Write-Host ""
Write-Host "  FLUX  -  Real-time Chat  -  Auto Setup" -ForegroundColor Magenta
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- 1. Prerequisites ---
Write-Step "Checking prerequisites"
$bad = @()

if (!(Test-Cmd "node")) {
    $bad += "Node.js 18+  ->  https://nodejs.org"
} else {
    $v = [int]((node --version) -replace "v","" -split "\.")[0]
    if ($v -lt 18) { $bad += "Node.js 18+ required (you have $(node --version))" }
    else { Write-Ok "Node.js $(node --version)" }
}

if (!(Test-Cmd "npm")) {
    $bad += "npm (bundled with Node.js)"
} else {
    Write-Ok "npm $(npm --version)"
}

if (!(Test-Cmd "docker")) {
    $bad += "Docker Desktop  ->  https://docker.com/products/docker-desktop"
} else {
    try {
        docker ps > $null 2>&1
        if ($LASTEXITCODE -ne 0) {
            $bad += "Docker is installed but not running - please start Docker Desktop"
        } else {
            Write-Ok "Docker is running"
        }
    } catch {
        $bad += "Docker is installed but not running - please start Docker Desktop"
    }
}

if ($bad.Count -gt 0) {
    Write-Fail "Missing requirements:"
    $bad | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "  Fix the above then re-run this script." -ForegroundColor DarkGray
    pause
    exit 1
}

# --- 2. Project structure ---
Write-Step "Checking project files"
$need = @(
    "$ROOT\backend\package.json",
    "$ROOT\backend\prisma\schema.prisma",
    "$ROOT\frontend\package.json",
    "$ROOT\docker-compose.yml"
)
$miss = $need | Where-Object { !(Test-Path $_) }
if ($miss.Count -gt 0) {
    Write-Fail "Missing files - make sure you extracted the full zip:"
    $miss | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    pause
    exit 1
}
Write-Ok "All project files present"

# --- 3. Environment files ---
Write-Step "Configuring environment"

$benv = "$ROOT\backend\.env"
if (!(Test-Path $benv)) {
    $tmpl = "$ROOT\backend\.env.example"
    if (!(Test-Path $tmpl)) {
        Write-Fail "backend\.env.example not found"
        pause ; exit 1
    }
    $c = Get-Content $tmpl -Raw
    $c = [regex]::Replace($c, "(?m)^(JWT_ACCESS_SECRET=).*$",  '${1}' + (Get-RandHex 64))
    $c = [regex]::Replace($c, "(?m)^(JWT_REFRESH_SECRET=).*$", '${1}' + (Get-RandHex 64))
    $c = [regex]::Replace($c, "(?m)^(COOKIE_SECRET=).*$",      '${1}' + (Get-RandHex 32))
    [System.IO.File]::WriteAllText($benv, $c, [System.Text.Encoding]::UTF8)
    Write-Ok "Generated backend\.env with random secrets"
} else {
    Write-Ok "backend\.env already exists"
}

$fenv = "$ROOT\frontend\.env.local"
if (!(Test-Path $fenv)) {
    $fe = "NEXT_PUBLIC_API_URL=http://localhost:4000`r`nNEXT_PUBLIC_SOCKET_URL=http://localhost:4000`r`n"
    [System.IO.File]::WriteAllText($fenv, $fe, [System.Text.Encoding]::UTF8)
    Write-Ok "Generated frontend\.env.local"
} else {
    Write-Ok "frontend\.env.local already exists"
}

# --- 4. Docker infra ---
Write-Step "Starting infrastructure (Postgres, Redis, MinIO)"
Set-Location $ROOT
Write-Info "Pulling images - first run may take a few minutes ..."

$ErrorActionPreference = "Continue"
docker compose up postgres redis minio minio-setup --detach --quiet-pull *> $null
$ErrorActionPreference = "Stop"
Write-Ok "Containers started"
Wait-Port -port 5432 -name "PostgreSQL" -timeout 90
Wait-Port -port 6379 -name "Redis"      -timeout 30
Wait-Port -port 9000 -name "MinIO"      -timeout 45

# --- 5. Backend deps ---
Write-Step "Installing backend dependencies"
Set-Location "$ROOT\backend"
Write-Info "npm install ..."
npm install --loglevel error 2>&1 | Out-Null
Write-Ok "Backend dependencies installed"

# --- 6. Database ---
Write-Step "Setting up database"
Set-Location "$ROOT\backend"

Write-Info "prisma generate ..."
npx prisma generate

$line = (Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1)
if ($line) { $env:DATABASE_URL = $line -replace "^DATABASE_URL=","" }

Write-Info "prisma db push ..."
npx prisma db push --accept-data-loss
Write-Ok "Database schema ready"

# --- 7. Frontend deps ---
Write-Step "Installing frontend dependencies"
Set-Location "$ROOT\frontend"
Write-Info "npm install ..."
npm install --loglevel error 2>&1 | Out-Null
Write-Ok "Frontend dependencies installed"

# --- 8. Launch backend ---
Write-Step "Launching backend on port 4000"
$bcmd = "Set-Location '$ROOT\backend'; `$Host.UI.RawUI.WindowTitle = 'Flux Backend'; Write-Host 'Flux Backend running on http://localhost:4000' -ForegroundColor Magenta; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $bcmd
Wait-Port -port 4000 -name "Backend" -timeout 60

# --- 9. Launch frontend ---
Write-Step "Launching frontend on port 3000"
$fcmd = "Set-Location '$ROOT\frontend'; `$Host.UI.RawUI.WindowTitle = 'Flux Frontend'; Write-Host 'Flux Frontend running on http://localhost:3000' -ForegroundColor Magenta; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $fcmd
Wait-Port -port 3000 -name "Frontend" -timeout 90

# --- 10. Open browser ---
Write-Step "Opening browser"
Start-Sleep -Seconds 1
Start-Process "http://localhost:3000"
Write-Ok "Opened http://localhost:3000"

# --- Done ---
Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host "  Flux is running!" -ForegroundColor Green
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   App       ->  http://localhost:3000"  -ForegroundColor White
Write-Host "   API       ->  http://localhost:4000"  -ForegroundColor White
Write-Host "   MinIO UI  ->  http://localhost:9001   (minioadmin / minioadmin)" -ForegroundColor White
Write-Host ""
Write-Host "  To stop: close the two terminal windows, then run:" -ForegroundColor DarkGray
Write-Host "    docker compose down" -ForegroundColor DarkGray
Write-Host ""

Set-Location $ROOT