# 📍 Funcionalidad GPS - Ubicación Automática

## 🎯 Descripción

La aplicación ahora incluye funcionalidad GPS para obtener automáticamente la ubicación del usuario y convertirla en una dirección de envío. Esto mejora significativamente la experiencia de usuario al hacer pedidos.

## 🚀 Características Implementadas

### 1. **Hook de Geolocalización** (`useLocation`)
- ✅ Obtención de coordenadas GPS con alta precisión
- ✅ Solicitud automática de permisos de ubicación
- ✅ Geocodificación inversa (coordenadas → dirección)
- ✅ Manejo de errores y estados de carga
- ✅ Validación de permisos

### 2. **Componente Selector de Ubicación** (`LocationSelector`)
- ✅ Botón para obtener ubicación GPS
- ✅ Indicadores de estado (cargando, error, permisos)
- ✅ Información sobre privacidad y seguridad
- ✅ Manejo de errores de ubicación

### 3. **Formulario GPS Avanzado** (`GPSAddressForm`)
- ✅ Obtención automática de dirección
- ✅ Edición manual de datos obtenidos por GPS
- ✅ Visualización de coordenadas y precisión
- ✅ Validación de datos completos

### 4. **Integración en Checkout**
- ✅ Opción "Usar ubicación GPS" en el checkout
- ✅ Creación automática de dirección de envío
- ✅ Validación de datos GPS antes de crear orden
- ✅ Fallback a dirección manual si GPS falla

## 📱 Permisos Configurados

### iOS
```json
"NSLocationWhenInUseUsageDescription": "Esta aplicación necesita acceso a tu ubicación para obtener automáticamente tu dirección de envío."
```

### Android
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```

## 🔧 Uso en el Código

### Hook Básico
```typescript
import { useLocation } from '@/presentation/location/hooks/useLocation';

const { getLocationAndAddress, isLoading, error } = useLocation();

const handleGetLocation = async () => {
  const addressData = await getLocationAndAddress();
  if (addressData) {
    console.log('Dirección obtenida:', addressData);
  }
};
```

### Componente Selector
```typescript
import { LocationSelector } from '@/presentation/location/components/LocationSelector';

<LocationSelector
  onLocationSelect={(addressData) => {
    // Manejar dirección obtenida
  }}
  onLocationError={(error) => {
    // Manejar error
  }}
/>
```

### Formulario Completo
```typescript
import { GPSAddressForm } from '@/presentation/location/components/GPSAddressForm';

<GPSAddressForm
  onAddressChange={(addressData) => {
    // Actualizar datos de dirección
  }}
  initialData={existingAddressData}
/>
```

## 🛡️ Seguridad y Privacidad

- ✅ **Permisos Granulares**: Solo solicita ubicación cuando es necesario
- ✅ **Datos Locales**: La ubicación se procesa localmente en el dispositivo
- ✅ **Transparencia**: Mensajes claros sobre el uso de la ubicación
- ✅ **Control del Usuario**: Opción de editar o rechazar la ubicación GPS

## 📊 Datos Obtenidos por GPS

```typescript
interface AddressData {
  address: string;        // Dirección completa
  city: string;          // Ciudad
  department: string;    // Departamento/Estado
  country: string;       // País
  postalCode?: string;    // Código postal (si disponible)
  coordinates: {
    latitude: number;    // Latitud GPS
    longitude: number;   // Longitud GPS
    accuracy?: number;   // Precisión en metros
  };
}
```

## 🔄 Flujo de Trabajo

1. **Usuario selecciona "Usar ubicación GPS"**
2. **Sistema solicita permisos de ubicación**
3. **Se obtienen coordenadas GPS con alta precisión**
4. **Se realiza geocodificación inversa**
5. **Se muestra dirección obtenida para edición**
6. **Usuario confirma o edita la dirección**
7. **Se crea dirección de envío automáticamente**
8. **Se procede con el checkout**

## ⚠️ Consideraciones

### Precisión GPS
- **Alta Precisión**: Configurado para obtener ubicación con precisión de metros
- **Timeout**: 15 segundos máximo para obtener ubicación
- **Fallback**: Si GPS falla, usuario puede usar dirección manual

### Compatibilidad
- ✅ **iOS**: Funciona en simulador y dispositivos físicos
- ✅ **Android**: Funciona en emulador y dispositivos físicos
- ✅ **Web**: Limitado por políticas del navegador

### Rendimiento
- **Caché**: Los datos de ubicación se almacenan temporalmente
- **Lazy Loading**: Solo se carga cuando el usuario lo solicita
- **Error Handling**: Manejo robusto de errores de red y GPS

## 🧪 Testing

### Casos de Prueba
1. ✅ Solicitud de permisos por primera vez
2. ✅ Obtención de ubicación en interior/exterior
3. ✅ Manejo de GPS deshabilitado
4. ✅ Fallback a dirección manual
5. ✅ Edición de datos GPS obtenidos
6. ✅ Creación de orden con dirección GPS

### Dispositivos de Prueba
- **iOS Simulator**: Ubicación simulada
- **Android Emulator**: Ubicación simulada
- **Dispositivos Físicos**: Ubicación real GPS

## 🚀 Próximas Mejoras

- [ ] **Historial de Ubicaciones**: Guardar ubicaciones frecuentes
- [ ] **Mapa Interactivo**: Mostrar ubicación en mapa para confirmación
- [ ] **Geofencing**: Detectar cuando el usuario está en casa/trabajo
- [ ] **Optimización de Rutas**: Sugerir rutas de entrega
- [ ] **Notificaciones Push**: Recordatorios basados en ubicación

---

## 📞 Soporte

Si encuentras problemas con la funcionalidad GPS:

1. **Verifica permisos**: Asegúrate de que la app tenga permisos de ubicación
2. **Revisa configuración**: Verifica que el GPS esté habilitado en el dispositivo
3. **Prueba en exterior**: El GPS funciona mejor al aire libre
4. **Reinicia la app**: Si hay problemas persistentes, reinicia la aplicación

La funcionalidad GPS está completamente integrada y lista para usar en producción! 🎉






















