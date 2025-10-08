# Script PowerShell para iniciar Apimaterial
# Integración con admin-web

Write-Host "🚀 Iniciando Apimaterial (TNS)..." -ForegroundColor Green

# Navegar al directorio de Apimaterial
Set-Location "Apimaterial"

# Verificar que existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json en el directorio Apimaterial" -ForegroundColor Red
    exit 1
}

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar configuración de base de datos
Write-Host "🔍 Verificando configuración de base de datos..." -ForegroundColor Cyan
if (-not (Test-Path "config/app.config.js")) {
    Write-Host "❌ Error: No se encontró config/app.config.js" -ForegroundColor Red
    exit 1
}

# Crear archivo .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Yellow
    $envContent = @"
# Configuración de Apimaterial
PORT=51250
HOST=localhost
NODE_ENV=development

# Configuración de Firebird
FIREBIRD_HOST=127.0.0.1
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\Datos TNS\PRUEBA.GDB
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

# Token de autenticación
API_BEARER_TOKEN=angeldavidcapa2025
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
}

# Iniciar el servidor
Write-Host "🌐 Iniciando servidor Apimaterial en puerto 51250..." -ForegroundColor Green
Write-Host "📋 Endpoints disponibles:" -ForegroundColor Cyan
Write-Host "   • GET /api/materiales - Todos los materiales" -ForegroundColor White
Write-Host "   • GET /api/materiales/:id - Material por ID" -ForegroundColor White
Write-Host "   • GET /api/materiales/codigo/:codigo - Material por código" -ForegroundColor White
Write-Host "   • GET /health - Estado del servidor" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Token de autenticación: angeldavidcapa2025" -ForegroundColor Yellow
Write-Host "🌍 URL: http://localhost:51250" -ForegroundColor Yellow
Write-Host ""

# Iniciar con nodemon para desarrollo
npm run dev















