# Sistema de Notificaciones Push

Este documento describe la implementación del sistema de notificaciones push para la aplicación móvil.

## Configuración

### 1. Variables de Entorno

Añade las siguientes variables a tu archivo `.env`:

```env
# Expo Push Notifications (opcional para mayor límite de requests)
EXPO_ACCESS_TOKEN=tu_expo_access_token_opcional
```

### 2. Instalación de Dependencias

```bash
cd backend
npm install expo-server-sdk
```

### 3. Migración de Base de Datos

Ejecuta la migración para añadir la columna `push_token` a la tabla `usuarios`:

```bash
npm run db:migrate
```

## Funcionalidades Implementadas

### 1. Registro de Tokens Push

**Endpoint:** `POST /api/v1/profile/push-token`

**Body:**
```json
{
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Token de push registrado exitosamente",
  "data": {
    "userId": "uuid-del-usuario",
    "hasPushToken": true
  }
}
```

### 2. Eliminación de Tokens Push

**Endpoint:** `DELETE /api/v1/profile/push-token`

**Respuesta:**
```json
{
  "success": true,
  "message": "Token de push eliminado exitosamente",
  "data": {
    "userId": "uuid-del-usuario",
    "hasPushToken": false
  }
}
```

### 3. Notificaciones Automáticas

El sistema envía notificaciones automáticamente cuando:

- Un administrador actualiza el estado de un pedido
- Se crea un nuevo pedido (notificación a administradores)

## Servicio de Notificaciones

### Métodos Principales

#### `sendPushNotification(pushToken, title, body, data, options)`
Envía una notificación a un token específico.

#### `sendBulkPushNotification(pushTokens, title, body, data, options)`
Envía notificaciones a múltiples tokens.

#### `sendOrderStatusUpdateNotification(userId, order, newStatus)`
Envía notificación de actualización de estado de pedido.

#### `sendNewOrderNotificationToAdmins(order, customerName)`
Envía notificación de nuevo pedido a administradores.

### Tipos de Notificaciones

#### 1. Actualización de Estado de Pedido

**Título:** `📦 Estado del pedido actualizado`
**Cuerpo:** `Pedido #12345 ha sido enviado`

**Datos adicionales:**
```json
{
  "type": "order_status_update",
  "orderId": "uuid-del-pedido",
  "orderNumber": "12345",
  "newStatus": "shipped",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Nuevo Pedido (Administradores)

**Título:** `🛒 Nuevo pedido recibido`
**Cuerpo:** `Pedido #12345 de Juan Pérez`

**Datos adicionales:**
```json
{
  "type": "new_order",
  "orderId": "uuid-del-pedido",
  "orderNumber": "12345",
  "customerName": "Juan Pérez",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Estados de Pedido Soportados

- `pending` - Pendiente
- `processing` - En preparación
- `shipped` - Enviado
- `delivered` - Entregado
- `cancelled` - Cancelado

## Configuración de Canales

- `order_updates` - Para actualizaciones de pedidos
- `admin_notifications` - Para notificaciones de administradores
- `default` - Canal por defecto

## Manejo de Errores

El sistema maneja errores de forma no crítica:

1. Si falla el envío de notificación, la operación principal (actualización de pedido) continúa
2. Los errores se registran en los logs del servidor
3. Se valida que los tokens sean válidos antes de enviar

## Logs

El sistema genera logs detallados:

- `📱` - Operaciones de notificaciones
- `✅` - Operaciones exitosas
- `⚠️` - Advertencias
- `❌` - Errores

## Seguridad

- Los tokens se validan antes del envío
- Solo usuarios autenticados pueden registrar tokens
- Los tokens se almacenan de forma segura en la base de datos

## Próximos Pasos

1. Implementar la parte móvil para registrar tokens
2. Añadir más tipos de notificaciones
3. Implementar configuración de preferencias de notificaciones
4. Añadir estadísticas de entrega de notificaciones
