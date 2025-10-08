# Script PowerShell para probar la conexión con Apimaterial
# Verifica que el servicio esté funcionando correctamente

Write-Host "🧪 Probando conexión con Apimaterial..." -ForegroundColor Green

# URL base de Apimaterial
$APIMATERIAL_URL = "http://localhost:51250"
$TOKEN = "angeldavidcapa2025"

# Función para hacer peticiones HTTP
function Test-Endpoint {
    param(
        [string]$endpoint,
        [string]$description
    )
    
    Write-Host "🔍 Probando: $description" -ForegroundColor Cyan
    Write-Host "   URL: $APIMATERIAL_URL$endpoint" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$APIMATERIAL_URL$endpoint" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "   ✅ Éxito" -ForegroundColor Green
        Write-Host "   📋 Respuesta: $($response.message)" -ForegroundColor White
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Verificar que el servidor esté corriendo
Write-Host "🌐 Verificando que el servidor esté corriendo..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$APIMATERIAL_URL/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Servidor Apimaterial está corriendo" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: No se puede conectar al servidor Apimaterial" -ForegroundColor Red
    Write-Host "   Asegúrate de que el servidor esté corriendo en $APIMATERIAL_URL" -ForegroundColor Yellow
    Write-Host "   Ejecuta: npm run dev en el directorio Apimaterial" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Probar endpoints
Test-Endpoint "/health" "Health Check"
Test-Endpoint "/" "Información del sistema"
Test-Endpoint "/api/materiales?limit=5" "Obtener materiales (5 primeros)"
Test-Endpoint "/api/materiales?search=test&limit=3" "Buscar materiales"

Write-Host "🎉 Pruebas completadas!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Para usar en admin-web:" -ForegroundColor Cyan
Write-Host "   1. Asegúrate de que Apimaterial esté corriendo" -ForegroundColor White
Write-Host "   2. Configura las variables de entorno en admin-web:" -ForegroundColor White
Write-Host "      NEXT_PUBLIC_APIMATERIAL_URL=$APIMATERIAL_URL" -ForegroundColor Yellow
Write-Host "      NEXT_PUBLIC_APIMATERIAL_TOKEN=$TOKEN" -ForegroundColor Yellow
Write-Host "   3. Accede a /dashboard/materiales-tns en el admin-web" -ForegroundColor White















