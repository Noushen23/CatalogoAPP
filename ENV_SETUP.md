# 🔧 Configuración de Variables de Entorno

Este proyecto usa variables de entorno centralizadas para configurar las URLs de la API y otras configuraciones.

## 📋 Archivos .env Requeridos

### 1. Archivo `.env` en la raíz del proyecto (Backend)

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# ============================================
# CONFIGURACIÓN GLOBAL DEL PROYECTO
# ============================================


# Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=TiendaMovil
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=angeldavidcapa@gmail.com
SMTP_PASS=idot czou irjt pouq
SMTP_FROM=angeldavidcapa@gmail.com
SUPPORT_EMAIL=angeldavidcapa@gmail.com

# Uploads
UPLOADS_PATH=./uploads

# API de Terceros
TERCERO_API_URL=http://localhost:51255
TERCERO_API_TOKEN=angeldavidcapa2025

# Maps API (Opcional)
MAPS_PROVIDER=google
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=

# Wompi - Pasarela de Pagos
WOMPI_URL_BASE=https://production.wompi.co/v1
WOMPI_URL_BASE_PRUEBAS=https://sandbox.wompi.co/v1
WOMPI_CLAVE_PUBLICA=pub_test_xxxxxxxxxxxxx
WOMPI_CLAVE_PRIVADA=prv_test_xxxxxxxxxxxxx
# IMPORTANTE: El "Secreto de Eventos" es diferente a la Llave Privada y Llave Pública
# Se encuentra en: Dashboard de Wompi > Mi cuenta > Secretos para integración técnica
# Este secreto se usa SOLO para validar la firma de los webhooks/eventos
WOMPI_CLAVE_INTEGRIDAD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOMPI_AMBIENTE=pruebas
WOMPI_MONEDA=COP
# URLs de redirección (DEBEN ser HTTPS válidas, NO deep links, NO localhost)
# 🚨 IMPORTANTE: Wompi NO permite localhost en Web Checkout, especialmente en mobile
# Para desarrollo, DEBES usar ngrok o una URL pública HTTPS
# Opción 1: Configurar URLs completas
WOMPI_URL_REDIRECCION=https://calvous-unbolstered-dodie.ngrok-free.dev/pago-exitoso
WOMPI_URL_REDIRECCION_ERROR=https://calvous-unbolstered-dodie.ngrok-free.dev/pago-error
# Opción 2: Configurar solo la URL base de ngrok (el sistema agregará /pago-exitoso y /pago-error)
WOMPI_NGROK_URL=https://calvous-unbolstered-dodie.ngrok-free.dev
# O usar NGROK_URL (alias)
# NGROK_URL=https://calvous-unbolstered-dodie.ngrok-free.dev
```

### 2. Archivo `.env` en `admin-web/` (Next.js)

Crea un archivo `.env` en la carpeta `admin-web/` con el siguiente contenido:

```env
# ============================================
# CONFIGURACIÓN DEL PANEL DE ADMINISTRACIÓN
# Next.js - Variables de entorno públicas
# ============================================


# API de Materiales
NEXT_PUBLIC_APIMATERIAL_URL=http://localhost:51250
NEXT_PUBLIC_APIMATERIAL_TOKEN=angeldavidcapa2025

# Configuración del entorno
NODE_ENV=development
```

### 3. Configuración en `app.json` (Expo/React Native)

Las variables de entorno para la app móvil están configuradas en `app.json` en la sección `extra`:


## 🚀 Cómo Cambiar la IP Pública

Para cambiar la IP pública en todo el proyecto, actualiza:

1. **Backend** (`.env` en la raíz):
   - `API_PUBLIC_IP`
   - `API_BASE_URL`
   - `API_URL`
   - `APP_URL`

2. **Admin Web** (`admin-web/.env`):
   - `NEXT_PUBLIC_API_URL`

3. **App Móvil** (`app.json`):
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_API_BASE_URL`

## 📝 Notas Importantes

- Los archivos `.env` están en `.gitignore` y no se suben al repositorio
- Para producción, usa variables de entorno del servidor o servicios como Vercel, Heroku, etc.
- La app móvil lee las variables desde `app.json` usando `expo-constants`
- El backend usa `dotenv` para cargar variables desde `.env`
- Next.js requiere el prefijo `NEXT_PUBLIC_` para variables accesibles en el cliente

## 🔄 Después de Crear los Archivos .env

1. Reinicia el servidor backend
2. Reinicia el servidor de Next.js (admin-web)
3. Reinicia Expo para la app móvil

```bash
# Backend
cd backend
npm run dev

# Admin Web
cd admin-web
npm run dev

# App Móvil
npm start
```

