# React Expo Store - Aplicación de Tienda Online

Aplicación móvil de tienda online construida con React Native, Expo y TypeScript.

## 🚀 Características

- **Frontend:** React Native con Expo y TypeScript
- **Backend:** Node.js + Express + TypeScript
- **UI:** Componentes personalizados con diseño moderno
- **Estado:** Zustand para manejo de estado
- **API:** RESTful API con JWT authentication
- **Autenticación:** Sistema completo con JWT
- **Admin Web:** Panel de administración con Next.js

## 📱 App Móvil (React Native)

### ✅ Inicio Rápido

```bash
# 1. Instalar dependencias del proyecto principal
npm install

# 2. Instalar dependencias del backend
cd backend
npm install
cd ..

# 3. Instalar dependencias del admin
cd admin-web
npm install
cd ..

# 4. Iniciar toda la aplicación (Windows)
powershell -ExecutionPolicy Bypass -File start-full-app.ps1

# O iniciar manualmente:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: App móvil
npm start

# Terminal 3: Admin web
cd admin-web && npm run dev
```

### 📋 Requisitos
- Node.js 18+
- npm o yarn
- Expo CLI
- Android Studio / Xcode (opcional, para emuladores)

### 🎯 Funcionalidades Disponibles

#### ✅ Autenticación
- Registro de usuarios
- Inicio de sesión
- Validación de tokens JWT
- Almacenamiento seguro de credenciales

#### ✅ Catálogo de Productos
- Lista de productos con imágenes
- Filtros por categorías
- Búsqueda de productos
- Vista detallada de productos

#### ✅ Backend API
- RESTful API con Node.js + Express
- Base de datos en memoria (desarrollo)
- Autenticación JWT
- CRUD completo de productos

### 📱 Credenciales de Prueba
```
Email: admin@gmail.com
Password: 1234567
```

## 🖥️ Panel Administrador (Next.js)

```bash
# Ir al directorio del admin
cd admin-web

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev
```

### 🌐 Acceso: http://localhost:3001

## ⚙️ Backend API (Node.js)

```bash
# Ir al directorio del backend
cd backend

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev
```

### 🌐 API Base URL: http://localhost:3000/api
### ❤️ Health Check: http://localhost:3000/health

### 📊 Endpoints Principales
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/check-status` - Verificar token
- `GET /api/products` - Obtener productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto (Admin)
- `PUT /api/products/:id` - Actualizar producto (Admin)
- `DELETE /api/products/:id` - Eliminar producto (Admin)

## 🔧 Configuración

### 🎭 Cambiar entre Mock Data y API Real

```bash
# Alternar modo (por defecto usa Mock Data)
npm run toggle-api
```

La aplicación ahora incluye un **Backend completo** con API REST. Use el comando `npm run toggle-api` para cambiar entre Mock Data y Backend real.

### 📁 Estructura del Proyecto

```
├── app/                    # Pantallas de la aplicación (Expo Router)
│   ├── auth/              # Pantallas de autenticación
│   ├── (customer)/        # Pantallas del cliente
│   └── mode-selection.tsx # Selección de modo
├── backend/               # Backend API (Node.js + Express)
│   ├── src/              # Código fuente del backend
│   ├── package.json      # Dependencias del backend
│   └── README.md         # Documentación del backend
├── admin-web/             # Panel de administrador (Next.js)
├── core/                  # Lógica de negocio
│   ├── api/              # Cliente API
│   ├── auth/             # Autenticación
│   ├── config/           # Configuración
│   ├── mock/             # Datos de prueba
│   └── products/         # Gestión de productos
├── presentation/         # Componentes UI y temas
│   ├── auth/            # Componentes de autenticación
│   ├── products/        # Componentes de productos
│   ├── navigation/      # Navegación
│   └── theme/           # Tema y componentes UI
└── constants/           # Constantes globales
```

## 🎨 Pantallas Incluidas

### 📱 Aplicación Móvil
- **Autenticación:** Login y registro
- **Selección de modo:** Cliente o Admin
- **Catálogo:** Lista y detalle de productos
- **Carrito:** Gestión de productos seleccionados
- **Perfil:** Información del usuario
- **Órdenes:** Historial de pedidos

### 🖥️ Panel Admin
- **Dashboard:** Estadísticas y resumen
- **Productos:** CRUD completo de productos
- **Categorías:** Gestión de categorías
- **Órdenes:** Administración de pedidos

## 🛠️ Tecnologías

### Frontend Móvil
- React Native
- Expo Router
- TypeScript
- Zustand (estado)
- React Query (cache)
- Formularios con estado manual

### Backend API
- Node.js
- Express.js
- TypeScript
- JWT Authentication
- bcryptjs (hash passwords)
- CORS + Helmet (security)

### Admin Web
- Next.js 15
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod (validación)
- Recharts (gráficos)

## 🔄 Configuración Avanzada

### Conectar con Backend Propio

1. **Activar modo API:**
   ```bash
   npm run toggle-api
   ```

2. **Configurar URLs en `core/config/api.config.ts`:**
   ```typescript
   export const API_CONFIG = {
     USE_MOCK_DATA: false,
     // Configurar tu API URL aquí
   };
   ```

3. **Implementar endpoints compatibles con las interfaces existentes**

### Variables de Entorno (app.json)

```json
{
  "extra": {
    "EXPO_PUBLIC_STAGE": "dev",
    "EXPO_PUBLIC_API_URL_IOS": "http://localhost:3000/api",
    "EXPO_PUBLIC_API_URL_ANDROID": "http://10.0.2.2:3000/api",
    "EXPO_PUBLIC_API_URL_WEB": "http://localhost:3000/api"
  }
}
```

## 🚀 Despliegue

### App Móvil
```bash
# Build para producción
expo build

# O usar EAS Build
eas build --platform all
```

### Admin Web
```bash
cd admin-web
npm run build
npm start
```

## ❓ Solución de Problemas

### ⚠️ "Network Error" o "API Error"
- Verifica que `USE_MOCK_DATA: true` en `core/config/api.config.ts`
- Ejecuta `npm run toggle-api` para alternar modo

### 📱 Problemas con Expo
- Limpia cache: `expo start -c`
- Reinstala dependencias: `rm -rf node_modules && npm install`

### 🖥️ Problemas con Admin
- Verifica que el puerto 3000 esté libre
- Reinstala dependencias del admin: `cd admin-web && npm install`

## 📄 Licencia

MIT - Proyecto educativo y de aprendizaje
