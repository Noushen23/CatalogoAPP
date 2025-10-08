#!/bin/bash

# Script para probar la conexión con Apimaterial
# Verifica que el servicio esté funcionando correctamente

echo "🧪 Probando conexión con Apimaterial..."

# URL base de Apimaterial
APIMATERIAL_URL="http://localhost:51250"
TOKEN="angeldavidcapa2025"

# Función para hacer peticiones HTTP
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo "🔍 Probando: $description"
    echo "   URL: $APIMATERIAL_URL$endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$APIMATERIAL_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "   ✅ Éxito (HTTP $http_code)"
        echo "   📋 Respuesta: $(echo "$body" | jq -r '.message // .success // "OK"' 2>/dev/null || echo "Respuesta válida")"
    else
        echo "   ❌ Error (HTTP $http_code)"
        echo "   📋 Respuesta: $body"
    fi
    echo ""
}

# Verificar que el servidor esté corriendo
echo "🌐 Verificando que el servidor esté corriendo..."
if ! curl -s "$APIMATERIAL_URL/health" > /dev/null; then
    echo "❌ Error: No se puede conectar al servidor Apimaterial"
    echo "   Asegúrate de que el servidor esté corriendo en $APIMATERIAL_URL"
    echo "   Ejecuta: npm run dev en el directorio Apimaterial"
    exit 1
fi
echo "✅ Servidor Apimaterial está corriendo"
echo ""

# Probar endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/" "Información del sistema"
test_endpoint "/api/materiales?limit=5" "Obtener materiales (5 primeros)"
test_endpoint "/api/materiales?search=test&limit=3" "Buscar materiales"

echo "🎉 Pruebas completadas!"
echo ""
echo "📋 Para usar en admin-web:"
echo "   1. Asegúrate de que Apimaterial esté corriendo"
echo "   2. Configura las variables de entorno en admin-web:"
echo "      NEXT_PUBLIC_APIMATERIAL_URL=$APIMATERIAL_URL"
echo "      NEXT_PUBLIC_APIMATERIAL_TOKEN=$TOKEN"
echo "   3. Accede a /dashboard/materiales-tns en el admin-web"















