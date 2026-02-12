# Conexión de ApiTercero a MySQL

## Resumen General

**ApiTercero** utiliza **MySQL** para sincronizar datos desde el backend hacia el sistema TNS (Firebird). La conexión a MySQL se implementa específicamente en el módulo de sincronización (`syncController.js`) para leer usuarios desde la base de datos MySQL y crear los correspondientes terceros en TNS.

---

## Arquitectura de Conexión

ApiTercero maneja **dos bases de datos diferentes**:

1. **Firebird/TNS** (Base de datos principal): Para consultas y operaciones CRUD de terceros, ciudades y zonas
2. **MySQL** (Base de datos del backend): Para sincronización de usuarios desde el sistema web hacia TNS

---

## Configuración de MySQL

### Ubicación del Código
La conexión a MySQL se configura en: `ApiTercero/controllers/syncController.js`

### Configuración del Pool de Conexiones

```javascript
const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tiendamovil',
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10,
    queueLimit: 0
};
```

### Variables de Entorno

Las credenciales de MySQL se configuran mediante variables de entorno (ver `env.example`):

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=TiendaMovil
```

---

## Librería Utilizada

**Librería**: `mysql2/promise` (versión con soporte para Promises/async-await)

```javascript
const mysql = require('mysql2/promise');
```

### ¿Por qué mysql2/promise?
- Soporte nativo para Promises y async/await
- Mejor rendimiento que `mysql`
- Pool de conexiones eficiente
- Compatible con sintaxis moderna de JavaScript

---

## Implementación del Pool de Conexiones

### Inicialización Lazy (Bajo Demanda)

El pool de MySQL se inicializa solo cuando es necesario, no al iniciar la aplicación:

```javascript
// Pool de conexiones MySQL
let mysqlPool = null;

/**
 * Inicializa el pool de conexiones MySQL
 */
const initMySQLPool = async () => {
    if (!mysqlPool) {
        mysqlPool = mysql.createPool(mysqlConfig);
        console.log('✅ Pool MySQL inicializado para sincronización');
    }
    return mysqlPool;
};
```

### Características del Pool

- **connectionLimit: 10**: Máximo 10 conexiones simultáneas
- **queueLimit: 0**: Sin límite en la cola de solicitudes
- **reconnect: true**: Reconexión automática en caso de fallo
- **timeout: 60000**: Timeout de 60 segundos para operaciones

---

## Flujo de Sincronización MySQL → TNS

### 1. Obtener Usuarios desde MySQL

```javascript
const getUsuariosFromMySQL = async (limit = 100) => {
    const pool = await initMySQLPool();
    
    const query = `
        SELECT 
            id,
            email,
            nombre_completo,
            telefono,
            tipo_identificacion,
            numero_identificacion,
            fecha_creacion,
            fecha_actualizacion
        FROM usuarios 
        WHERE activo = 1
        ORDER BY fecha_creacion DESC
        LIMIT ?
    `;
    
    const [rows] = await pool.execute(query, [limit]);
    return rows;
};
```

### 2. Verificar Existencia en TNS

Antes de crear un tercero, se verifica si ya existe en TNS por NIT/identificación:

```javascript
const usuarioExistsInTNS = async (numeroIdentificacion) => {
    if (!numeroIdentificacion) return false;
    
    const query = `
        SELECT TERID, NIT, NOMBRE 
        FROM TERCEROS 
        WHERE TRIM(NIT) = ?
    `;
    
    const result = await executeQuery(query, [numeroIdentificacion.trim()]);
    return result && result.length > 0 ? result[0] : null;
};
```

### 3. Crear Tercero en TNS

Si el usuario no existe, se crea un nuevo registro en TNS usando transacciones de Firebird:

```javascript
const createTerceroInTNS = async (usuarioData, ciudadTNS = null) => {
    const connection = await createConnection(); // Conexión a Firebird
    
    try {
        const nuevoId = await executeTransactionWithCallback(connection, async (transaction) => {
            // Obtener siguiente TERID
            // Insertar en TERCEROS
            // Insertar en TERCEROSSELF
            return nextId;
        });
        
        return nuevoId;
    } finally {
        connection?.detach?.();
    }
};
```

---

## Endpoints de Sincronización

### POST `/api/sync/usuarios`
Sincroniza múltiples usuarios desde MySQL hacia TNS.

**Parámetros del body**:
- `limit` (opcional): Número máximo de usuarios a sincronizar (default: 50)
- `force` (opcional): Forzar sincronización incluso si ya existe (default: false)

**Respuesta**:
```json
{
    "success": true,
    "message": "Sincronización completada: X creados, Y existentes, Z errores",
    "data": {
        "procesados": 10,
        "creados": 8,
        "existentes": 2,
        "errores": 0
    }
}
```

### GET `/api/sync/usuarios/status`
Obtiene el estado de sincronización entre MySQL y TNS.

**Respuesta**:
```json
{
    "success": true,
    "data": {
        "mysql": {
            "usuariosActivos": 150
        },
        "tns": {
            "totalClientes": 200,
            "sincronizados": 120,
            "pendientes": 80
        },
        "ultimaSincronizacion": "2024-01-15T10:30:00.000Z"
    }
}
```

### POST `/api/sync/usuarios/single`
Sincroniza un usuario específico por ID o email.

**Parámetros del body**:
- `usuarioId` (opcional): ID del usuario en MySQL
- `email` (opcional): Email del usuario

---

## Seguridad y Autenticación

Todos los endpoints de sincronización requieren autenticación mediante Bearer Token:

```javascript
router.post('/usuarios', authenticate, asyncHandler(async (req, res) => {
    // ...
}));
```

El middleware `authenticate` valida el token en el header:
```
Authorization: Bearer <API_TOKEN>
```

---

## Manejo de Errores

### Errores de Conexión
- Si el pool no puede conectarse, se lanza un error con código `INTERNAL_ERROR`
- El sistema intenta reconectar automáticamente (`reconnect: true`)

### Errores de Sincronización
- Cada usuario se procesa individualmente
- Los errores se capturan y se reportan en `erroresDetalle`
- La sincronización continúa con los siguientes usuarios aunque uno falle

---

## Diferencias con la Conexión a Firebird

| Aspecto | MySQL | Firebird (TNS) |
|---------|-------|----------------|
| **Librería** | `mysql2/promise` | `node-firebird` |
| **Pool** | Inicializado bajo demanda | Inicializado al arrancar |
| **Uso** | Solo sincronización | CRUD completo |
| **Configuración** | En `syncController.js` | En `config/database.js` |
| **Transacciones** | No se usan | Sí se usan (para crear terceros) |

---

## Mejores Prácticas Implementadas

1. **Pool de Conexiones**: Reutiliza conexiones para mejor rendimiento
2. **Lazy Initialization**: El pool se crea solo cuando se necesita
3. **Async/Await**: Uso de sintaxis moderna para mejor legibilidad
4. **Manejo de Errores**: Captura y reporta errores sin detener el proceso
5. **Validación**: Verifica existencia antes de crear duplicados
6. **Transacciones**: Usa transacciones en Firebird para garantizar integridad

---

## Ejemplo de Uso Completo

```javascript
// 1. Inicializar pool (automático)
const pool = await initMySQLPool();

// 2. Ejecutar consulta
const [rows] = await pool.execute(
    'SELECT * FROM usuarios WHERE activo = ?',
    [1]
);

// 3. Procesar resultados
for (const usuario of rows) {
    // Verificar en TNS
    const existe = await usuarioExistsInTNS(usuario.numero_identificacion);
    
    if (!existe) {
        // Crear en TNS
        const terid = await createTerceroInTNS(usuario);
        console.log(`Usuario ${usuario.email} creado con TERID: ${terid}`);
    }
}
```

---

## Notas Importantes

⚠️ **Importante**: 
- La conexión a MySQL es **solo para lectura** de usuarios
- La escritura se realiza en Firebird/TNS
- El pool se mantiene activo durante toda la vida de la aplicación
- Las credenciales deben coincidir con las del backend principal

---

## Referencias

- **Archivo principal**: `ApiTercero/controllers/syncController.js`
- **Configuración**: `ApiTercero/config/app.config.js`
- **Variables de entorno**: `ApiTercero/env.example`
- **Documentación mysql2**: https://github.com/sidorares/node-mysql2
