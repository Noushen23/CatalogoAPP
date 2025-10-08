# Sistema de Notificaciones Push Avanzadas

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Funcionalidades Implementadas](#funcionalidades-implementadas)
4. [Configuración](#configuración)
5. [API Endpoints](#api-endpoints)
6. [Uso en el Frontend](#uso-en-el-frontend)
7. [Procesamiento Automático (Cron Jobs)](#procesamiento-automático-cron-jobs)
8. [Base de Datos](#base-de-datos)
9. [Pruebas y Testing](#pruebas-y-testing)

---

## Descripción General

Sistema completo de notificaciones push que permite a los usuarios recibir alertas sobre:

- **Productos en Stock**: Notificación cuando un producto agotado vuelve a estar disponible
- **Baja de Precio**: Alerta cuando un producto en favoritos baja a un precio objetivo
- **Carrito Abandonado**: Recordatorio después de 24 horas de inactividad en el carrito

### Tecnologías Utilizadas

- **Backend**: Node.js, Express, Expo Push Notifications
- **Frontend**: React Native, Expo
- **Base de Datos**: MySQL
- **Cron Jobs**: node-cron
- **Estado**: TanStack Query (React Query)

---

## Arquitectura del Sistema

```
┌─────────────────┐
│  React Native   │
│   (Frontend)    │
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│   Express API   │
│   (Backend)     │
├─────────────────┤
│ - Controllers   │
│ - Routes        │
│ - Services      │
└────────┬────────┘
         │
         ├──────────► Expo Push Service
         │
         └──────────► MySQL Database
                      ├── notificaciones_stock
                      ├── notificaciones_precio
                      ├── carritos_abandonados_tracking
                      └── historial_notificaciones
```

---

## Funcionalidades Implementadas

### 1. Alertas de Producto en Stock ✅

**Usuario puede:**
- Suscribirse a notificaciones cuando un producto agotado vuelva a stock
- Cancelar suscripción en cualquier momento
- Ver todas sus suscripciones activas

**Sistema automático:**
- Cada 15 minutos verifica productos que volvieron a tener stock
- Envía notificación push al usuario
- Marca la suscripción como notificada
- Registra en historial

### 2. Alertas de Baja de Precio 💰

**Usuario puede:**
- Establecer un precio objetivo para un producto
- Recibir notificación cuando el precio baje al objetivo o menos
- Actualizar el precio objetivo
- Cancelar alerta

**Sistema automático:**
- Cada 30 minutos verifica precios de productos
- Compara precio actual vs precio objetivo
- Envía notificación si el precio bajó
- Registra en historial

### 3. Recordatorios de Carrito Abandonado 🛒

**Usuario recibe:**
- Notificación después de 24 horas de no modificar su carrito
- Mensaje personalizado con cantidad de productos
- Enlace directo al carrito

**Sistema automático:**
- Cada 2 horas verifica carritos abandonados (>24h)
- Filtra usuarios con push token activo
- Envía recordatorio personalizado
- Registra en historial

---

## Configuración

### Backend

#### 1. Variables de Entorno

```env
# Expo Push Notifications (opcional, aumenta límite de requests)
EXPO_ACCESS_TOKEN=tu_expo_access_token_opcional
```

#### 2. Instalar Dependencias

```bash
cd backend
npm install expo-server-sdk node-cron
```

#### 3. Migración de Base de Datos

```bash
mysql -u usuario -p base_de_datos < database/migrations/006_notification_subscriptions.sql
```

### Frontend

#### 1. Configurar Project ID de Expo

En `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "tu-project-id-de-expo"
      }
    }
  }
}
```

#### 2. Habilitar Notificaciones

Ya está habilitado en `app/_layout.tsx`

---

## API Endpoints

### Base URL: `/api/v1/notifications`

### Suscripciones de Stock

#### Suscribirse
```http
POST /subscribe/stock/:productId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Te notificaremos cuando este producto esté disponible",
  "data": {
    "subscriptionId": "uuid",
    "productId": "uuid",
    "productName": "Nombre del Producto"
  }
}
```

#### Cancelar Suscripción
```http
DELETE /unsubscribe/stock/:productId
Authorization: Bearer {token}
```

### Suscripciones de Precio

#### Suscribirse
```http
POST /subscribe/price/:productId
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetPrice": 50000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Te notificaremos cuando el precio baje a $50,000 o menos",
  "data": {
    "subscriptionId": "uuid",
    "productId": "uuid",
    "productName": "Nombre del Producto",
    "currentPrice": 75000,
    "targetPrice": 50000
  }
}
```

#### Cancelar Suscripción
```http
DELETE /unsubscribe/price/:productId
Authorization: Bearer {token}
```

### Gestión

#### Obtener Todas las Suscripciones
```http
GET /subscriptions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stockAlerts": [...],
    "priceAlerts": [...],
    "total": 5
  }
}
```

#### Verificar Suscripción a Producto
```http
GET /subscriptions/:productId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscribedToStock": true,
    "subscribedToPrice": true,
    "targetPrice": 50000
  }
}
```

#### Obtener Historial de Notificaciones
```http
GET /history?limit=20&offset=0
Authorization: Bearer {token}
```

#### Procesar Notificaciones Manualmente (Admin)
```http
POST /process
Authorization: Bearer {admin_token}
```

---

## Uso en el Frontend

### Hook de Suscripciones

```typescript
import { useProductNotifications } from '@/presentation/notifications/hooks/useNotificationSubscriptions';

const MyComponent = ({ productId, currentPrice }) => {
  const {
    subscriptionStatus,
    subscribeToStock,
    subscribeToPrice,
    unsubscribeFromStock,
    unsubscribeFromPrice,
  } = useProductNotifications(productId);

  return (
    <View>
      {!subscriptionStatus?.subscribedToStock && (
        <Button onPress={() => subscribeToStock()}>
          Notificarme cuando haya stock
        </Button>
      )}

      {!subscriptionStatus?.subscribedToPrice && (
        <Button onPress={() => subscribeToPrice(50000)}>
          Alertarme si baja a $50,000
        </Button>
      )}
    </View>
  );
};
```

### Componente de Botones

```tsx
import { ProductNotificationButtons } from '@/presentation/notifications/components/ProductNotificationButtons';

<ProductNotificationButtons
  productId={product.id}
  productName={product.nombre}
  currentPrice={product.precioFinal}
  isInStock={product.stock > 0}
/>
```

### Ver Suscripciones

```tsx
import { NotificationSubscriptionsScreen } from '@/presentation/notifications/components/NotificationSubscriptionsScreen';

// Renderizar en una pantalla
<NotificationSubscriptionsScreen />
```

---

## Procesamiento Automático (Cron Jobs)

El sistema ejecuta tareas programadas automáticamente:

### Jobs Configurados

| Job | Frecuencia | Descripción |
|-----|-----------|-------------|
| **Stock Notifications** | Cada 15 min | Procesa alertas de productos en stock |
| **Price Notifications** | Cada 30 min | Procesa alertas de baja de precio |
| **Cart Reminders** | Cada 2 horas | Envía recordatorios de carrito |
| **Cleanup** | Diario 3 AM | Limpia notificaciones antiguas (>90 días) |
| **Reset** | Diario 4 AM | Resetea suscripciones antiguas (>7 días) |

### Iniciar/Detener Workers

Los workers se inician automáticamente con el servidor:

```javascript
// backend/src/server.js
const notificationWorker = require('./workers/notificationWorker');

// Al iniciar
notificationWorker.start();

// Al detener
notificationWorker.stop();
```

### Ejecutar Manualmente

```bash
# Usando el endpoint admin
curl -X POST http://localhost:3000/api/v1/notifications/process \
  -H "Authorization: Bearer {admin_token}"
```

---

## Base de Datos

### Tablas Creadas

#### `notificaciones_stock`
Almacena suscripciones de alertas de stock

```sql
- id (PK)
- usuario_id (FK)
- producto_id (FK)
- activa (boolean)
- notificado (boolean)
- fecha_creacion
- fecha_notificacion
```

#### `notificaciones_precio`
Almacena suscripciones de alertas de precio

```sql
- id (PK)
- usuario_id (FK)
- producto_id (FK)
- precio_objetivo
- precio_original
- activa (boolean)
- notificado (boolean)
- fecha_creacion
- fecha_notificacion
```

#### `historial_notificaciones`
Registro de todas las notificaciones enviadas

```sql
- id (PK)
- usuario_id (FK)
- tipo_notificacion (enum)
- titulo
- mensaje
- datos_adicionales (JSON)
- exitosa (boolean)
- mensaje_error
- fecha_envio
```

#### `carritos_abandonados_tracking`
Tracking de carritos para recordatorios

```sql
- id (PK)
- usuario_id (FK)
- carrito_id (FK)
- fecha_ultimo_cambio
- notificado (boolean)
- fecha_notificacion
```

### Vista: `v_carritos_abandonados`

Vista optimizada que combina datos de carritos abandonados con información de usuarios y productos.

### Triggers Automáticos

- `trg_actualizar_carrito_tracking_insert`: Al agregar items
- `trg_actualizar_carrito_tracking_update`: Al modificar items
- `trg_actualizar_carrito_tracking_delete`: Al eliminar items

---

## Pruebas y Testing

### 1. Probar Notificación de Stock

```bash
# 1. Suscribirse a un producto sin stock
POST /api/v1/notifications/subscribe/stock/{productId}

# 2. Actualizar stock del producto
UPDATE productos SET stock = 10 WHERE id = '{productId}';

# 3. Ejecutar proceso manual o esperar 15 min
POST /api/v1/notifications/process

# 4. Verificar notificación recibida en dispositivo
```

### 2. Probar Alerta de Precio

```bash
# 1. Suscribirse con precio objetivo
POST /api/v1/notifications/subscribe/price/{productId}
Body: { "targetPrice": 50000 }

# 2. Actualizar precio del producto
UPDATE productos SET precio = 45000 WHERE id = '{productId}';

# 3. Ejecutar proceso manual o esperar 30 min
POST /api/v1/notifications/process

# 4. Verificar notificación recibida
```

### 3. Probar Carrito Abandonado

```bash
# 1. Agregar productos al carrito
POST /api/v1/cart

# 2. Simular 24 horas (modificar fecha en DB para testing)
UPDATE carritos_abandonados_tracking 
SET fecha_ultimo_cambio = DATE_SUB(NOW(), INTERVAL 25 HOUR)
WHERE usuario_id = '{userId}';

# 3. Ejecutar proceso manual
POST /api/v1/notifications/process

# 4. Verificar notificación recibida
```

### 4. Ver Estadísticas

```javascript
// En el servidor
const notificationWorker = require('./workers/notificationWorker');
const stats = await notificationWorker.getStats();
console.log(stats);
```

---

## Troubleshooting

### Notificaciones no llegan

1. **Verificar push token:**
```sql
SELECT id, email, push_token FROM usuarios WHERE id = '{userId}';
```

2. **Verificar suscripciones:**
```sql
SELECT * FROM notificaciones_stock WHERE usuario_id = '{userId}' AND activa = TRUE;
```

3. **Verificar logs del servidor:**
```bash
# Buscar en logs
grep "📱\|✅\|❌" backend-logs.txt
```

### Worker no ejecuta

1. **Verificar que esté iniciado:**
```javascript
console.log(notificationWorker.isRunning); // debe ser true
```

2. **Reiniciar servidor:**
```bash
npm run dev
```

### Base de Datos

1. **Verificar tablas creadas:**
```sql
SHOW TABLES LIKE 'notificaciones%';
```

2. **Verificar triggers:**
```sql
SHOW TRIGGERS WHERE `Trigger` LIKE 'trg_actualizar_carrito%';
```

---

## Próximas Mejoras

- [ ] Preferencias de notificación por usuario
- [ ] Notificaciones programadas
- [ ] Notificaciones de ofertas especiales
- [ ] Analytics de engagement
- [ ] A/B testing de mensajes
- [ ] Rich notifications con imágenes
- [ ] Deep linking mejorado
- [ ] Notificaciones en tiempo real con WebSockets

---

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.
