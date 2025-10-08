#!/bin/bash

# Script para iniciar Apimaterial y verificar conexión
# Integración con admin-web

echo "🚀 Iniciando Apimaterial (TNS)..."

# Navegar al directorio de Apimaterial
cd Apimaterial

# Verificar que existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json en el directorio Apimaterial"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar configuración de base de datos
echo "🔍 Verificando configuración de base de datos..."
if [ ! -f "config/app.config.js" ]; then
    echo "❌ Error: No se encontró config/app.config.js"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cat > .env << EOF
# Configuración de Apimaterial
PORT=51250
HOST=localhost
NODE_ENV=development

# Configuración de Firebird
FIREBIRD_HOST=127.0.0.1
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Datos TNS\\PRUEBA.GDB
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

# Token de autenticación
API_BEARER_TOKEN=angeldavidcapa2025
EOF
    echo "✅ Archivo .env creado"
fi

# Iniciar el servidor
echo "🌐 Iniciando servidor Apimaterial en puerto 51250..."
echo "📋 Endpoints disponibles:"
echo "   • GET /api/materiales - Todos los materiales"
echo "   • GET /api/materiales/:id - Material por ID"
echo "   • GET /api/materiales/codigo/:codigo - Material por código"
echo "   • GET /health - Estado del servidor"
echo ""
echo "🔑 Token de autenticación: angeldavidcapa2025"
echo "🌍 URL: http://localhost:51250"
echo ""

# Iniciar con nodemon para desarrollo
npm run dev















