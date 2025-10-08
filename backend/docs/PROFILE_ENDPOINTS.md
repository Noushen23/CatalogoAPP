# API de Perfil de Usuario

Esta documentación describe los endpoints disponibles para la gestión de perfiles de usuario en la API de la tienda móvil.

## Base URL
```
http://localhost:3000/api/v1/profile
```

## Autenticación
Todos los endpoints requieren autenticación mediante token Bearer en el header `Authorization`.

## Endpoints Disponibles

### 1. Obtener Perfil del Usuario Autenticado

**GET** `/profile`

Obtiene el perfil completo del usuario autenticado.

#### Headers
```
Authorization: Bearer <token>
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Perfil obtenido exitosamente",
  "data": {
    "hasProfile": true,
    "profile": {
      "id": "uuid",
      "usuarioId": "uuid",
      "avatarUrl": "https://example.com/avatar.jpg",
      "fechaNacimiento": "1990-01-15",
      "genero": "masculino",
      "preferenciasNotificaciones": {
        "email": true,
        "push": true,
        "sms": false,
        "marketing": true
      },
      "configuracionPrivacidad": {
        "profileVisibility": "public",
        "orderHistory": true,
        "dataSharing": false
      },
      "fechaCreacion": "2024-01-01T00:00:00.000Z",
      "fechaActualizacion": "2024-01-01T00:00:00.000Z",
      "usuario": {
        "email": "user@example.com",
        "nombreCompleto": "Juan Pérez",
        "telefono": "1234567890",
        "direccion": "Calle Principal 123",
        "rol": "customer",
        "emailVerificado": true,
        "fechaCreacion": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

#### Respuesta Sin Perfil (200)
```json
{
  "success": true,
  "message": "Perfil no encontrado",
  "data": {
    "hasProfile": false,
    "profile": null
  }
}
```

---

### 2. Crear o Actualizar Perfil Completo

**POST** `/profile`

Crea un nuevo perfil o actualiza uno existente con todos los datos.

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "avatarUrl": "https://example.com/avatar.jpg",
  "fechaNacimiento": "1990-01-15",
  "genero": "masculino",
  "preferenciasNotificaciones": {
    "email": true,
    "push": true,
    "sms": false,
    "marketing": true
  },
  "configuracionPrivacidad": {
    "profileVisibility": "public",
    "orderHistory": true,
    "dataSharing": false
  }
}
```

#### Validaciones
- `avatarUrl`: URL válida (opcional)
- `fechaNacimiento`: Fecha ISO 8601 válida (opcional)
- `genero`: Debe ser uno de: `masculino`, `femenino`, `otro`, `no_especificar` (opcional)
- `preferenciasNotificaciones`: Objeto con claves válidas (opcional)
- `configuracionPrivacidad`: Objeto con claves válidas (opcional)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Perfil guardado exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "preferenciasNotificaciones": {
      "email": true,
      "push": true,
      "sms": false,
      "marketing": true
    },
    "configuracionPrivacidad": {
      "profileVisibility": "public",
      "orderHistory": true,
      "dataSharing": false
    },
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "usuario": { ... }
  }
}
```

---

### 3. Actualizar Información Básica del Usuario

**PUT** `/profile/user-info`

Actualiza la información básica del usuario (nombre, teléfono, dirección).

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "nombreCompleto": "Juan Pérez Actualizado",
  "telefono": "9876543210",
  "direccion": "Calle Principal 123, Ciudad"
}
```

#### Validaciones
- `nombreCompleto`: Entre 2 y 255 caracteres (opcional)
- `telefono`: Entre 7 y 15 caracteres (opcional)
- `direccion`: Máximo 500 caracteres (opcional)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Información del usuario actualizada exitosamente",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nombreCompleto": "Juan Pérez Actualizado",
    "telefono": "9876543210",
    "direccion": "Calle Principal 123, Ciudad",
    "rol": "customer",
    "emailVerificado": true,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Actualizar Avatar

**PUT** `/profile/avatar`

Actualiza únicamente el avatar del usuario.

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

#### Validaciones
- `avatarUrl`: URL válida (requerida)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Avatar actualizado exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "preferenciasNotificaciones": { ... },
    "configuracionPrivacidad": { ... },
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "usuario": { ... }
  }
}
```

---

### 5. Actualizar Información Personal

**PUT** `/profile/personal-info`

Actualiza la información personal del perfil (fecha de nacimiento, género).

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "fechaNacimiento": "1985-06-20",
  "genero": "femenino"
}
```

#### Validaciones
- `fechaNacimiento`: Fecha ISO 8601 válida (opcional)
- `genero`: Debe ser uno de: `masculino`, `femenino`, `otro`, `no_especificar` (opcional)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Información personal actualizada exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1985-06-20",
    "genero": "femenino",
    "preferenciasNotificaciones": { ... },
    "configuracionPrivacidad": { ... },
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "usuario": { ... }
  }
}
```

---

### 6. Actualizar Preferencias de Notificaciones

**PUT** `/profile/notifications`

Actualiza las preferencias de notificaciones del usuario.

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "email": false,
  "push": true,
  "sms": true,
  "marketing": false
}
```

#### Validaciones
- Todas las claves deben ser booleanas (opcional)
- Claves válidas: `email`, `push`, `sms`, `marketing`

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Preferencias de notificaciones actualizadas exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "preferenciasNotificaciones": {
      "email": false,
      "push": true,
      "sms": true,
      "marketing": false
    },
    "configuracionPrivacidad": { ... },
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "usuario": { ... }
  }
}
```

---

### 7. Actualizar Configuración de Privacidad

**PUT** `/profile/privacy`

Actualiza la configuración de privacidad del usuario.

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "profileVisibility": "private",
  "orderHistory": false,
  "dataSharing": true
}
```

#### Validaciones
- `profileVisibility`: Debe ser uno de: `public`, `private`, `friends` (opcional)
- `orderHistory`: Booleano (opcional)
- `dataSharing`: Booleano (opcional)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Configuración de privacidad actualizada exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "preferenciasNotificaciones": { ... },
    "configuracionPrivacidad": {
      "profileVisibility": "private",
      "orderHistory": false,
      "dataSharing": true
    },
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "usuario": { ... }
  }
}
```

---

### 8. Obtener Estadísticas del Perfil

**GET** `/profile/stats`

Obtiene estadísticas del usuario (pedidos, carritos, gastos totales).

#### Headers
```
Authorization: Bearer <token>
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "totalOrders": 5,
    "activeCarts": 1,
    "totalSpent": 250.75,
    "memberSince": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Respuesta Sin Perfil (404)
```json
{
  "success": false,
  "message": "Perfil no encontrado"
}
```

---

### 9. Eliminar Perfil

**DELETE** `/profile`

Elimina el perfil del usuario autenticado.

#### Headers
```
Authorization: Bearer <token>
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Perfil eliminado exitosamente"
}
```

#### Respuesta Sin Perfil (404)
```json
{
  "success": false,
  "message": "Perfil no encontrado"
}
```

---

### 10. Obtener Perfil Público

**GET** `/profile/public/:userId`

Obtiene el perfil público de otro usuario.

#### Headers
```
Authorization: Bearer <token>
```

#### Parámetros
- `userId`: UUID del usuario (requerido)

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Perfil público obtenido exitosamente",
  "data": {
    "id": "uuid",
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "usuario": {
      "nombreCompleto": "Juan Pérez",
      "rol": "customer",
      "emailVerificado": true
    }
  }
}
```

#### Respuesta Perfil Privado (403)
```json
{
  "success": false,
  "message": "Este perfil es privado"
}
```

#### Respuesta Sin Perfil (404)
```json
{
  "success": false,
  "message": "Perfil no encontrado"
}
```

---

## Códigos de Error Comunes

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Datos del perfil inválidos",
  "errors": ["Género inválido", "Fecha de nacimiento inválida"]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Token de acceso inválido o expirado"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Perfil no encontrado"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "Detalles del error"
}
```

---

## Ejemplos de Uso

### Crear un perfil completo
```bash
curl -X POST http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "avatarUrl": "https://example.com/avatar.jpg",
    "fechaNacimiento": "1990-01-15",
    "genero": "masculino",
    "preferenciasNotificaciones": {
      "email": true,
      "push": true,
      "sms": false,
      "marketing": true
    },
    "configuracionPrivacidad": {
      "profileVisibility": "public",
      "orderHistory": true,
      "dataSharing": false
    }
  }'
```

### Actualizar solo el avatar
```bash
curl -X PUT http://localhost:3000/api/v1/profile/avatar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "avatarUrl": "https://example.com/new-avatar.jpg"
  }'
```

### Obtener estadísticas del perfil
```bash
curl -X GET http://localhost:3000/api/v1/profile/stats \
  -H "Authorization: Bearer <token>"
```

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación válida.
2. **Validación**: Los datos son validados antes de ser guardados.
3. **Transacciones**: Las operaciones de creación/actualización usan transacciones de base de datos.
4. **Privacidad**: Los perfiles pueden ser públicos o privados según la configuración del usuario.
5. **Estadísticas**: Las estadísticas se calculan en tiempo real desde la base de datos.
6. **Soft Delete**: Los perfiles eliminados se borran completamente de la base de datos.

---

## Testing

Para probar los endpoints, puedes usar el script de prueba incluido:

```bash
node test-profile.js
```

Este script ejecutará todos los endpoints y mostrará los resultados con colores para facilitar la lectura.




























