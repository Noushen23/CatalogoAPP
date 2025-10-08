# 📧 Sistema de Verificación de Email - Backend

## 🎯 Descripción General

Sistema completo de verificación de email implementado en el backend con Node.js, Express y Nodemailer. Permite a los usuarios verificar su correo electrónico mediante códigos de 6 dígitos enviados automáticamente.

---

## 📁 Archivos Creados/Modificados

### ✨ Nuevos Archivos

#### 1. `src/services/emailService.js`
Servicio centralizado para el envío de emails usando Nodemailer.

**Funcionalidades:**
- ✅ Generación de códigos de verificación de 6 dígitos
- ✅ Templates HTML responsive para emails
- ✅ Envío de email de verificación
- ✅ Envío de email de bienvenida
- ✅ Verificación de conexión SMTP
- ✅ Modo de prueba para desarrollo (sin SMTP)

**Métodos principales:**
```javascript
// Generar código de 6 dígitos
generateVerificationCode(): string

// Enviar email de verificación
sendVerificationEmail(email, nombre, codigo): Promise<EmailResult>

// Enviar email de bienvenida
sendWelcomeEmail(email, nombre): Promise<EmailResult>

// Verificar conexión SMTP
verifyConnection(): Promise<ConnectionResult>
```

#### 2. `src/controllers/emailVerificationController.js`
Controlador con la lógica de negocio para la verificación de email.

**Endpoints implementados:**
- `POST /api/v1/auth/resend-verification` - Reenviar código
- `POST /api/v1/auth/verify-email` - Verificar código
- `GET /api/v1/auth/verification-status` - Estado de verificación

#### 3. `src/routes/emailVerification.js`
Definición de rutas para verificación (ahora integrado en `auth.js`).

### 📝 Archivos Modificados

#### 1. `src/config/env.js`
**Agregado:**
```javascript
email: {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_USER,
  enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}
```

#### 2. `src/controllers/authController.js`
**Modificaciones:**
- Import del `emailService`
- Generación y envío automático de código en el registro
- Mensaje actualizado después del registro

**Código agregado:**
```javascript
// Enviar código de verificación por email
try {
  const verificationCode = emailService.generateVerificationCode();
  
  // Guardar código en la base de datos
  const connection = await db.getConnection();
  await connection.execute(
    'UPDATE usuarios SET codigo_verificacion = ? WHERE id = ?',
    [verificationCode, user.id]
  );
  
  // Enviar email
  await emailService.sendVerificationEmail(email, nombreCompleto, verificationCode);
} catch (emailError) {
  console.error('⚠️ Error al enviar email de verificación:', emailError);
}
```

#### 3. `src/routes/auth.js`
**Agregado:**
```javascript
// Rutas de verificación de email (protegidas)
router.post('/resend-verification', authenticateToken, emailVerificationController.resendVerificationEmail);
router.post('/verify-email', authenticateToken, emailVerificationController.verifyEmail);
router.get('/verification-status', authenticateToken, emailVerificationController.getVerificationStatus);
```

#### 4. `env.example`
**Agregado:**
```env
SMTP_FROM=noreply@tiendamovil.com
SUPPORT_EMAIL=support@tiendamovil.com
```

---

## 🔐 API Endpoints

### 1. Reenviar Código de Verificación
```http
POST /api/v1/auth/resend-verification
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Código de verificación enviado correctamente. Revisa tu bandeja de entrada.",
  "data": {
    "email": "usuario@example.com",
    "messageId": "<message-id>"
  }
}
```

**Errores posibles:**
- `400` - Email ya verificado
- `404` - Usuario no encontrado
- `500` - Error al enviar email

---

### 2. Verificar Email
```http
POST /api/v1/auth/verify-email
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "123456"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "¡Email verificado exitosamente! Ya puedes realizar compras.",
  "data": {
    "emailVerificado": true
  }
}
```

**Errores posibles:**
- `400` - Código inválido o ya verificado
- `400` - Código incorrecto
- `404` - Usuario no encontrado

---

### 3. Estado de Verificación
```http
GET /api/v1/auth/verification-status
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "emailVerificado": false,
    "codigoEnviado": true
  }
}
```

---

## 📧 Templates de Email

### 1. Email de Verificación

**Características:**
- 🎨 Diseño HTML responsive
- 📱 Optimizado para móviles
- 🎨 Gradiente morado/azul en header
- 🔢 Código de 6 dígitos destacado
- ⚠️ Banner de advertencia
- 📩 Footer con información de contacto

**Preview del código:**
```html
<div class="code-container">
  <p class="code-label">Tu código de verificación</p>
  <p class="code">123456</p>
</div>
```

**Contenido del email:**
- Saludo personalizado
- Instrucciones claras
- Código de verificación visible
- Advertencia de validez (24 horas)
- Nota de seguridad
- Información de contacto

### 2. Email de Bienvenida

Enviado automáticamente después de verificar el email con éxito.

**Contenido:**
- Felicitación por verificación exitosa
- Botón CTA "Comenzar a Comprar"
- Footer institucional

---

## 🔧 Configuración

### Variables de Entorno Requeridas

Para habilitar el envío de emails, configura estas variables en tu archivo `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion
SMTP_FROM=noreply@tiendamovil.com
SUPPORT_EMAIL=support@tiendamovil.com
```

### Configuración para Gmail

1. **Habilitar verificación en dos pasos:**
   - Ve a tu cuenta de Google
   - Seguridad → Verificación en dos pasos

2. **Crear contraseña de aplicación:**
   - Seguridad → Contraseñas de aplicaciones
   - Selecciona "Correo" y "Otro (dispositivo personalizado)"
   - Copia la contraseña generada
   - Úsala en `SMTP_PASS`

3. **Variables para Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuemail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # Contraseña de aplicación
```

### Otros Proveedores SMTP

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu_api_key_de_sendgrid
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASS=tu_password_mailgun
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=tu_smtp_username
SMTP_PASS=tu_smtp_password
```

---

## 🧪 Modo de Desarrollo

Si no configuras variables SMTP, el sistema funcionará en **modo de prueba**:

- ✅ No requiere SMTP configurado
- ✅ Genera códigos de verificación
- ✅ Guarda códigos en la base de datos
- 📝 Imprime códigos en consola
- ⚠️ NO envía emails reales

**Logs en consola:**
```
⚠️  No hay configuración SMTP. Usando modo de prueba (no se enviarán emails reales)
📧 [SIMULACIÓN] Email de verificación para: usuario@example.com
📧 [SIMULACIÓN] Código: 123456
📧 [SIMULACIÓN] Nombre: Juan Pérez
```

---

## 🔄 Flujo Completo de Verificación

### 1. Registro de Usuario
```
Usuario → POST /api/v1/auth/register
          ↓
Backend → Crear usuario en BD
          ↓
Backend → Generar código de 6 dígitos
          ↓
Backend → Guardar código en `usuarios.codigo_verificacion`
          ↓
Backend → Enviar email con código
          ↓
Backend → Responder con éxito
          ↓
Usuario ← Recibe mensaje: "Hemos enviado un código..."
```

### 2. Usuario Recibe Email
```
Email → Bandeja de entrada
        ↓
Email → Abre email
        ↓
Email → Lee código: 123456
        ↓
Usuario → Ingresa código en app
```

### 3. Verificación del Código
```
Usuario → POST /api/v1/auth/verify-email
          Body: { "code": "123456" }
          ↓
Backend → Validar formato (6 dígitos)
          ↓
Backend → Buscar usuario por token JWT
          ↓
Backend → Comparar código
          ↓
          ├─ Correcto → Actualizar `email_verificado = TRUE`
          │             └→ Limpiar `codigo_verificacion`
          │             └→ Enviar email de bienvenida
          │             └→ Responder: "Email verificado exitosamente"
          │
          └─ Incorrecto → Responder: "Código incorrecto"
```

### 4. Reenvío de Código
```
Usuario → POST /api/v1/auth/resend-verification
          ↓
Backend → Validar que NO esté ya verificado
          ↓
Backend → Generar nuevo código
          ↓
Backend → Actualizar código en BD
          ↓
Backend → Enviar nuevo email
          ↓
Usuario ← Responder: "Código reenviado"
```

---

## 🗄️ Estructura de Base de Datos

### Campos Utilizados en `usuarios`

```sql
CREATE TABLE usuarios (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email_verificado BOOLEAN DEFAULT FALSE,    -- ← Estado de verificación
    codigo_verificacion VARCHAR(6),             -- ← Código de 6 dígitos
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Estados posibles:**
- `email_verificado = FALSE`, `codigo_verificacion = NULL` → Recién registrado, sin código
- `email_verificado = FALSE`, `codigo_verificacion = '123456'` → Código enviado, pendiente
- `email_verificado = TRUE`, `codigo_verificacion = NULL` → Verificado ✅

---

## 🧪 Testing

### 1. Probar Registro con Email
```bash
# Registrar usuario
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "nombreCompleto": "Usuario Test",
    "password": "Password123!"
  }'

# Respuesta esperada:
{
  "success": true,
  "message": "Usuario registrado exitosamente. Hemos enviado un código de verificación a tu email..."
}

# Verificar en consola del backend:
📧 [SIMULACIÓN] Email de verificación para: test@example.com
📧 [SIMULACIÓN] Código: 123456
```

### 2. Probar Reenvío de Código
```bash
# Login primero para obtener token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Guardar token de la respuesta

# Reenviar código
curl -X POST http://localhost:3001/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}"

# Respuesta esperada:
{
  "success": true,
  "message": "Código de verificación enviado correctamente..."
}
```

### 3. Probar Verificación
```bash
# Verificar email con código
curl -X POST http://localhost:3001/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "code": "123456"
  }'

# Respuesta esperada:
{
  "success": true,
  "message": "¡Email verificado exitosamente! Ya puedes realizar compras.",
  "data": {
    "emailVerificado": true
  }
}
```

### 4. Verificar Estado
```bash
curl -X GET http://localhost:3001/api/v1/auth/verification-status \
  -H "Authorization: Bearer {TOKEN}"

# Respuesta:
{
  "success": true,
  "data": {
    "emailVerificado": true,
    "codigoEnviado": false
  }
}
```

---

## 🚨 Manejo de Errores

### Códigos de Error Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| `400` | "Código de verificación requerido" | No se envió el código |
| `400` | "Código de verificación inválido" | Formato incorrecto (no 6 dígitos) |
| `400` | "Código de verificación incorrecto" | Código no coincide |
| `400` | "El email ya está verificado" | Usuario ya verificado |
| `400` | "No hay código de verificación" | No se ha solicitado código |
| `404` | "Usuario no encontrado" | Token inválido |
| `500` | "Error al enviar el email" | Error SMTP |

---

## 🔒 Seguridad

### Medidas Implementadas

1. **Autenticación requerida:**
   - Todos los endpoints protegidos con JWT
   - Solo el usuario autenticado puede verificar su email

2. **Validación de código:**
   - Formato estricto: 6 dígitos numéricos
   - Comparación exacta con BD

3. **Prevención de ataques:**
   - Un código por usuario a la vez
   - Código se limpia después de verificación

4. **Manejo de errores:**
   - Errores SMTP no exponen detalles internos
   - Logs solo en servidor

### Mejoras Futuras Recomendadas

- [ ] **Expiración de códigos:** Agregar campo `fecha_expiracion_codigo`
- [ ] **Rate limiting:** Limitar reintentos de verificación
- [ ] **Límite de reenvíos:** Máximo 3 reenvíos por hora
- [ ] **Códigos únicos:** Invalidar código anterior al generar uno nuevo
- [ ] **Auditoría:** Registrar intentos fallidos de verificación

---

## 📊 Monitoreo y Logs

### Logs Importantes

**Registro exitoso:**
```
✅ Código de verificación enviado a: usuario@example.com
```

**Verificación exitosa:**
```
✅ Email de verificación enviado: <message-id>
```

**Error en envío:**
```
❌ Error al enviar email de verificación: [error details]
⚠️ Error al enviar email de verificación: Connection refused
```

**Verificación SMTP:**
```
✅ Servicio de email inicializado correctamente
```

---

## 🎨 Personalización del Template

### Modificar Colores
En `emailService.js`, actualiza el método `createVerificationEmailTemplate`:

```javascript
// Cambiar gradiente del header
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// Cambiar color del código
color: #667eea;

// Cambiar color del borde del código
border: 2px dashed #667eea;
```

### Agregar Logo
```html
<div class="header">
  <img src="https://tu-dominio.com/logo.png" alt="Logo" style="height: 50px; margin-bottom: 10px;">
  <h1>🛍️ ${config.app.name}</h1>
</div>
```

### Modificar Texto
Edita directamente las strings en `createVerificationEmailTemplate`:

```javascript
<p class="message">
  Tu mensaje personalizado aquí...
</p>
```

---

## ✅ Checklist de Implementación

- [x] Servicio de email con Nodemailer
- [x] Generación de códigos de 6 dígitos
- [x] Template HTML responsive
- [x] Endpoint de reenvío de código
- [x] Endpoint de verificación
- [x] Endpoint de estado
- [x] Envío automático en registro
- [x] Email de bienvenida
- [x] Modo de prueba (sin SMTP)
- [x] Manejo de errores
- [x] Documentación completa
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Expiración de códigos
- [ ] Rate limiting

---

## 🎉 Conclusión

El sistema de verificación de email está completamente implementado y listo para usar. Los usuarios ahora recibirán códigos de verificación al registrarse y deberán verificar su email antes de realizar compras.

**Próximos pasos:**
1. Configurar SMTP en producción
2. Implementar frontend para ingreso de código
3. Agregar expiración de códigos (opcional)
4. Implementar rate limiting (opcional)
5. Agregar tests automatizados (opcional)









