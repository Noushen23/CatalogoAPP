# 📖 API de Materiales TNS - ULTRA SIMPLE

API minimalista de **SOLO LECTURA** para consultar materiales. Solo lo esencial.

## 🚀 **INICIO RÁPIDO**

### 1. Instalar dependencias:
```bash
npm install
```

### 2. Iniciar servidor:
```bash
npm start
```

### 3. Configurar token (opcional):
```bash
# Variable de entorno
export API_BEARER_TOKEN=tu_token_secreto
```

## 📋 **ENDPOINTS**

### **GET /api/materiales**
Obtiene todos los materiales con paginación opcional.

**Parámetros de consulta:**
- `page` - Número de página (default: 1)
- `limit` - Elementos por página (default: 50, máx: 500)
- `search` - Buscar en descripción o código
- `activo` - Filtrar por estado (S/N)
- `conPrecios` - Incluir precios (true/false)

**Ejemplo:**
```bash
curl -H "Authorization: Bearer tu_token" \
  "http://localhost:51250/api/materiales?page=1&limit=10"
```

### **GET /api/materiales/:id**
Obtiene un material específico por ID.

**Ejemplo:**
```bash
curl -H "Authorization: Bearer tu_token" \
  "http://localhost:51250/api/materiales/1"
```

### **GET /api/materiales/codigo/:codigo**
Obtiene un material específico por código.

**Ejemplo:**
```bash
curl -H "Authorization: Bearer tu_token" \
  "http://localhost:51250/api/materiales/codigo/MAT001"
```

## 📊 **RESPUESTA**

```json
{
  "success": true,
  "data": [
    {
      "MATID": 1,
      "CODIGO": "MAT001",
      "DESCRIP": "Material de ejemplo",
      "UNIDAD": "UN",
      "CATEGORIA": "CATEGORIA1",
      "ACTIVO": "S",
      "TIPOIVAID": 1,
      "OBSERV": "Observaciones",
      "FECCREA": "2024-01-15",
      "USUARIO": "ADMIN"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 **CONFIGURACIÓN**

### Variables de entorno:
- `API_BEARER_TOKEN` - Token de autenticación (default: "tu_token_aqui")
- `PORT` - Puerto del servidor (default: 51250)
- `HOST` - Host del servidor (default: "localhost")

### Base de datos:
Configurar en `config/database.js` y `config/app.config.js`

## 🎯 **CARACTERÍSTICAS**

- ✅ **Solo lectura** - No modifica datos
- ✅ **Ultra simple** - Un solo archivo principal
- ✅ **Autenticación básica** - Bearer token
- ✅ **Paginación** - Control de resultados
- ✅ **Búsqueda** - Por descripción o código
- ✅ **Precios opcionales** - Información de sucursales

## 📂 **ESTRUCTURA**

```
Apimaterial/
├── app.js              # ✅ TODO en un archivo
├── package.json        # ✅ Dependencias mínimas
├── config/
│   ├── app.config.js   # ✅ Configuración
│   └── database.js     # ✅ Conexión BD
└── README.md           # ✅ Esta documentación
```

**¡Eso es todo! Súper simple.** 🎉
