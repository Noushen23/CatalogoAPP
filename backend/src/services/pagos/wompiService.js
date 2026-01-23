
const axios = require('axios'); //Libreria para hacer peticiones HTTP
const crypto = require('crypto'); //libreria para encriptar, generar hashes,firmas 
const config = require('../../config/env'); // Variable de configuracion

/**
 * Servicio de integración con Wompi
 * 
 * Wompi es la pasarela de pagos de Bancolombia para Colombia.
 * Este servicio maneja la comunicación con Wompi usando Web Checkout:
 * - Generar URLs de Web Checkout
 * - Verificar el estado de pagos
 * - Procesar webhooks
 * - Validar firmas de seguridad
 */
class WompiService {
  constructor() {
    // Configuración de Wompi desde variables de entorno
    this.configuracion = {
      // URL base de la API de Wompi (para consultas y webhooks)
      urlBase: config.wompi?.urlBase || process.env.WOMPI_URL_BASE || 'https://production.wompi.co/v1',
      // URL base para ambiente de pruebas
      urlBasePruebas: config.wompi?.urlBasePruebas || process.env.WOMPI_URL_BASE_PRUEBAS || 'https://sandbox.wompi.co/v1',
      // Clave pública (para frontend)
      clavePublica: config.wompi?.clavePublica || process.env.WOMPI_CLAVE_PUBLICA || '',
      // Clave privada (solo backend)
      clavePrivada: config.wompi?.clavePrivada || process.env.WOMPI_CLAVE_PRIVADA || '',
      // Clave de integridad (para validar webhooks)
      claveIntegridad: config.wompi?.claveIntegridad || process.env.WOMPI_CLAVE_INTEGRIDAD || '',
      // Ambiente: 'produccion' o 'pruebas'
      ambiente: config.wompi?.ambiente || process.env.WOMPI_AMBIENTE || 'pruebas',
      // Moneda por defecto
      moneda: config.wompi?.moneda || process.env.WOMPI_MONEDA || 'COP',
      // URL de redirección después del pago
      urlRedireccion: config.wompi?.urlRedireccion || process.env.WOMPI_URL_REDIRECCION || '',
      // URL de redirección en caso de error
      urlRedireccionError: config.wompi?.urlRedireccionError || process.env.WOMPI_URL_REDIRECCION_ERROR || ''
    };

    // Determinar URL base según el ambiente
    this.urlBase = this.configuracion.ambiente === 'produccion' 
      ? this.configuracion.urlBase 
      : this.configuracion.urlBasePruebas;

    // Cliente HTTP configurado (para consultas y webhooks)
    this.cliente = axios.create({
      baseURL: this.urlBase,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configuracion.clavePrivada}`
      }
    });
  }

  /**
   * Generar signature (firma de integridad) para Web Checkout
   * @param {string} referencia - Referencia única de la transacción
   * @param {number} monto - Monto en centavos
   * @param {string} moneda - Moneda (COP, USD, etc.)
   * @param {string|null} expirationTime - Tiempo de expiración en formato ISO8601 (opcional)
   * @returns {string} Signature SHA256
   */
  generarSignature(referencia, monto, moneda, expirationTime = null) {
    try {
      // 🚨 CRÍTICO: El monto DEBE ser un número entero (centavos)
      // Wompi requiere que sea exactamente el mismo valor que se usa en amount-in-cents
      const montoEntero = typeof monto === 'number' ? Math.round(monto) : parseInt(monto, 10);
      
      if (isNaN(montoEntero) || montoEntero <= 0) {
        throw new Error(`Monto inválido para firma: ${monto} (tipo: ${typeof monto})`);
      }
      
      // Construir cadena para el hash
      // Formato EXACTO según documentación de Wompi:
      // referencia + monto (número entero como string) + moneda + (expiration_time si existe) + claveIntegridad
      let cadena = `${referencia}${montoEntero}${moneda}`;
      
      if (expirationTime) {
        cadena += expirationTime;
      }
      
      cadena += this.configuracion.claveIntegridad;
      
      // 🚨 VALIDACIÓN CRÍTICA: Verificar que la clave de integridad esté configurada
      if (!this.configuracion.claveIntegridad || this.configuracion.claveIntegridad.trim() === '') {
        throw new Error('La clave de integridad de Wompi no está configurada. Configura WOMPI_CLAVE_INTEGRIDAD en las variables de entorno.');
      }
      
      // 🔍 DEBUG: Log detallado de la cadena usada para la firma
      const claveIntegridad = this.configuracion.claveIntegridad.trim();
      const isTestKey = claveIntegridad.startsWith('test_integrity_') || claveIntegridad.startsWith('test_');
      const isProdKey = claveIntegridad.startsWith('prod_integrity_') || claveIntegridad.startsWith('prod_');
      
      console.log('🔐 [Wompi] Construyendo cadena para firma:', {
        referencia,
        montoOriginal: monto,
        montoEntero,
        tipoMontoOriginal: typeof monto,
        moneda,
        hasExpirationTime: !!expirationTime,
        expirationTime: expirationTime || 'N/A',
        claveIntegridadPrefix: claveIntegridad.substring(0, 20) + '...',
        claveIntegridadLength: claveIntegridad.length,
        claveIntegridadTipo: isTestKey ? 'TEST' : (isProdKey ? 'PROD' : 'DESCONOCIDA'),
        cadenaCompleta: cadena,
        cadenaLength: cadena.length,
        cadenaSinClave: cadena.substring(0, cadena.length - claveIntegridad.length) + '[CLAVE_INTEGRIDAD]'
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:128',message:'ANTES generar hash',data:{cadenaLength:cadena.length,cadenaPrefix:cadena.substring(0,50),hasExpirationTime:!!expirationTime,claveIntegridadLength:this.configuracion.claveIntegridad?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      // Generar hash SHA256
      const hash = crypto.createHash('sha256').update(cadena).digest('hex');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:132',message:'DESPUÉS generar hash',data:{hashLength:hash.length,hashPrefix:hash.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      console.log('🔐 [Wompi] Signature generado:', {
        referencia,
        monto,
        moneda,
        hasExpirationTime: !!expirationTime,
        hashLength: hash.length,
        cadenaUsada: `${referencia}${monto}${moneda}${expirationTime || ''}[CLAVE_INTEGRIDAD]`,
        hashCompleto: hash
      });

      return hash;
    } catch (error) {
      console.error('❌ [Wompi] Error al generar signature:', error);
      throw new Error(`Error al generar signature: ${error.message}`);
    }
  }

  /**
   * Generar URL de Web Checkout de Wompi
   * En lugar de crear transacciones directamente con la API, generamos una URL
   * que redirige al usuario al Web Checkout de Wompi
   * @param {Object} datosTransaccion - Datos de la transacción
   * @param {string} datosTransaccion.referencia - Referencia única de la transacción
   * @param {number} datosTransaccion.monto - Monto en centavos (COP)
   * @param {string} datosTransaccion.moneda - Moneda (COP, USD, etc.)
   * @param {Object} datosTransaccion.cliente - Datos del cliente
   * @param {Object} datosTransaccion.metodoPago - Método de pago (opcional, el usuario elegirá en el checkout)
   * @param {string} datosTransaccion.urlRedireccion - URL de redirección después del pago
   * @returns {Promise<Object>} URL del Web Checkout de Wompi
   */
  async generarUrlWebCheckout(datosTransaccion) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:161',message:'generarUrlWebCheckout ENTRY',data:{hasReferencia:!!datosTransaccion.referencia,hasMonto:!!datosTransaccion.monto,hasCliente:!!datosTransaccion.cliente,monto:datosTransaccion.monto,moneda:datosTransaccion.moneda},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      const {
        referencia,
        monto,
        moneda = this.configuracion.moneda,
        cliente,
        metodoPago = null, // Opcional: el usuario elegirá en el checkout
        urlRedireccion = this.configuracion.urlRedireccion,
        urlRedireccionError = this.configuracion.urlRedireccionError
      } = datosTransaccion;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:172',message:'Datos extraídos',data:{referencia,monto,moneda,clienteEmail:cliente?.email,clienteNombre:cliente?.nombre,clienteTelefono:cliente?.telefono,clienteNumeroId:cliente?.numeroIdentificacion},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      // Validar datos requeridos
      if (!referencia || !monto || !cliente) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:175',message:'VALIDATION ERROR - Datos faltantes',data:{hasReferencia:!!referencia,hasMonto:!!monto,hasCliente:!!cliente},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        throw new Error('Faltan datos requeridos para generar URL de Web Checkout');
      }

      // Validar monto mínimo (Wompi requiere mínimo 1000 COP = 100000 centavos)
      if (monto < 100000) {
        throw new Error('El monto mínimo es de 1000 COP (100000 centavos)');
      }

      // Validar y preparar URL de redirección (debe ser HTTP/HTTPS válida, NO localhost)
      // 🚨 IMPORTANTE: Wompi NO permite localhost en Web Checkout, especialmente en mobile
      // En desarrollo, DEBE usarse ngrok o una URL pública HTTPS
      let redirectUrlFinal = urlRedireccion || this.configuracion.urlRedireccion;
      let redirectUrlErrorFinal = urlRedireccionError || this.configuracion.urlRedireccionError;
      
      // Función helper para validar y normalizar URLs
      const validarYNormalizarUrl = (url, tipo = 'redirección') => {
        if (!url || url.trim() === '') {
          return null;
        }
        
        // Si es un deep link (no HTTP/HTTPS), rechazar
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          console.warn(`⚠️ [Wompi] URL de ${tipo} no es HTTP/HTTPS, rechazando:`, url);
          return null;
        }
        
        // 🚨 RECHAZAR localhost explícitamente (Wompi no lo permite)
        const urlLower = url.toLowerCase();
        if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1') || urlLower.includes('0.0.0.0')) {
          console.error(`❌ [Wompi] URL de ${tipo} contiene localhost, Wompi NO lo permite en Web Checkout:`, url);
          throw new Error(`URL de ${tipo} no puede ser localhost. En desarrollo, usa ngrok (configura WOMPI_NGROK_URL o NGROK_URL)`);
        }
        
        // En desarrollo, preferir HTTPS (ngrok siempre usa HTTPS)
        // En producción, solo permitir HTTPS
        const isDevelopment = this.configuracion.ambiente === 'pruebas' || process.env.NODE_ENV === 'development';
        if (!isDevelopment && !url.startsWith('https://')) {
          console.warn(`⚠️ [Wompi] En producción, la URL de ${tipo} debe ser HTTPS:`, url);
        }
        
        return url.trim();
      };
      
      // Validar URLs
      redirectUrlFinal = validarYNormalizarUrl(redirectUrlFinal, 'redirección');
      redirectUrlErrorFinal = validarYNormalizarUrl(redirectUrlErrorFinal, 'redirección de error');
      
      // Si no hay URLs válidas configuradas, intentar usar ngrok
      if (!redirectUrlFinal || !redirectUrlErrorFinal) {
        const ngrokUrl = process.env.WOMPI_NGROK_URL || process.env.NGROK_URL || null;
        
        if (ngrokUrl) {
          // Validar que ngrok URL no sea localhost
          if (ngrokUrl.toLowerCase().includes('localhost') || ngrokUrl.toLowerCase().includes('127.0.0.1')) {
            throw new Error('WOMPI_NGROK_URL o NGROK_URL no puede ser localhost. Debe ser la URL pública de ngrok (ej: https://xxxxx.ngrok-free.dev)');
          }
          
          // Asegurar que ngrok URL sea HTTPS
          const ngrokUrlFinal = ngrokUrl.startsWith('https://') ? ngrokUrl : `https://${ngrokUrl.replace(/^https?:\/\//, '')}`;
          
          if (!redirectUrlFinal) {
            redirectUrlFinal = `${ngrokUrlFinal}/pago-exitoso`;
            console.log('✅ [Wompi] Usando ngrok para URL de redirección:', redirectUrlFinal);
          }
          
          if (!redirectUrlErrorFinal) {
            redirectUrlErrorFinal = `${ngrokUrlFinal}/pago-error`;
            console.log('✅ [Wompi] Usando ngrok para URL de redirección de error:', redirectUrlErrorFinal);
          }
        } else {
          // Si no hay ngrok configurado, lanzar error claro
          throw new Error(
            '❌ URLs de redirección no configuradas y ngrok no disponible.\n' +
            '🚨 Wompi NO permite localhost en Web Checkout.\n' +
            '📝 Configura una de estas opciones:\n' +
            '   1. WOMPI_URL_REDIRECCION y WOMPI_URL_REDIRECCION_ERROR (URLs HTTPS públicas)\n' +
            '   2. WOMPI_NGROK_URL o NGROK_URL (URL base de ngrok, ej: https://xxxxx.ngrok-free.dev)\n' +
            '💡 En desarrollo, usa ngrok: ngrok http 3001'
          );
        }
      }

      // Preparar expiration_time si existe (formato ISO8601 UTC)
      // 🔒 CRÍTICO: Usar la MISMA variable para firma y URL
      // Si expirationTime existe pero no se normaliza igual, la firma será inválida
      const expirationTimeFinal = 
        metodoPago?.tiempoExpiracion && metodoPago.tiempoExpiracion.trim() !== ''
          ? metodoPago.tiempoExpiracion.trim()
          : null;
      
      // Validar que la clave pública esté configurada
      if (!this.configuracion.clavePublica || this.configuracion.clavePublica.trim() === '') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:222',message:'ERROR - Clave pública no configurada',data:{hasClavePublica:!!this.configuracion.clavePublica},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        throw new Error('La clave pública de Wompi no está configurada');
      }

      // Validar que la clave de integridad esté configurada
      if (!this.configuracion.claveIntegridad || this.configuracion.claveIntegridad.trim() === '') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:228',message:'ERROR - Clave integridad no configurada',data:{hasClaveIntegridad:!!this.configuracion.claveIntegridad},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        throw new Error('La clave de integridad de Wompi no está configurada');
      }

      // URL base del Web Checkout de Wompi
      // 🚨 CRÍTICO: La URL debe terminar con /p/ (con barra final) según la documentación oficial
      const checkoutBaseUrl = 'https://checkout.wompi.co/p/';

      // Parámetros obligatorios
      // 🚨 CRÍTICO: Limpiar la clave pública de cualquier carácter invisible o espacios
      let publicKey = this.configuracion.clavePublica;
      
      // Log del valor original antes de limpiar
      console.log('🔍 [Wompi] Clave pública RAW (antes de limpiar):', {
        valorOriginal: publicKey,
        tipo: typeof publicKey,
        longitud: publicKey?.length || 0,
        tieneEspacios: publicKey?.includes(' ') || false,
        tieneComillas: publicKey?.includes('"') || publicKey?.includes("'") || false,
        tieneSaltosLinea: publicKey?.includes('\n') || publicKey?.includes('\r') || false,
        caracteresEspeciales: publicKey ? Array.from(publicKey).filter(c => !/[a-zA-Z0-9_]/.test(c)) : []
      });
      
      // Limpiar la clave pública
      if (!publicKey || typeof publicKey !== 'string') {
        throw new Error('La clave pública de Wompi no está configurada o no es una cadena válida');
      }
      
      // Eliminar espacios, comillas, saltos de línea y cualquier carácter no alfanumérico excepto guiones bajos
      publicKey = publicKey.trim().replace(/["'`\s\n\r\t]/g, '').replace(/[^a-zA-Z0-9_]/g, '');
      
      const integrityKey = this.configuracion.claveIntegridad.trim();
      
      // 🚨 VALIDACIÓN CRÍTICA: Verificar formato de la clave pública
      // Wompi requiere que la clave pública tenga el formato: pub_test_... o pub_prod_...
      if (!publicKey.startsWith('pub_test_') && !publicKey.startsWith('pub_prod_')) {
        console.error('❌ [Wompi] ERROR: Formato de clave pública inválido:', {
          clavePublicaOriginal: this.configuracion.clavePublica,
          clavePublicaLimpia: publicKey,
          longitud: publicKey.length,
          prefijo: publicKey.substring(0, 10),
          formatoEsperado: 'Debe empezar con pub_test_ o pub_prod_',
          primerosCaracteres: Array.from(publicKey.substring(0, 20)).map(c => ({
            char: c,
            code: c.charCodeAt(0),
            hex: c.charCodeAt(0).toString(16)
          }))
        });
        throw new Error(`Formato de clave pública inválido. Debe empezar con 'pub_test_' o 'pub_prod_'. Clave recibida: ${publicKey.substring(0, 20)}...`);
      }
      
      // Validar longitud mínima de la clave pública (debe tener al menos 30 caracteres)
      if (publicKey.length < 30) {
        console.error('❌ [Wompi] ERROR: Clave pública muy corta:', {
          longitud: publicKey.length,
          clavePublica: publicKey
        });
        throw new Error(`Clave pública inválida: longitud insuficiente (${publicKey.length} caracteres). Debe tener al menos 30 caracteres.`);
      }
      
      // 🚨 VALIDACIÓN CRÍTICA: Verificar que la clave pública solo contenga caracteres válidos
      // Wompi espera claves alfanuméricas con guiones bajos, sin espacios ni caracteres especiales
      const publicKeyRegex = /^[a-zA-Z0-9_]+$/;
      if (!publicKeyRegex.test(publicKey)) {
        const caracteresInvalidos = publicKey.match(/[^a-zA-Z0-9_]/g) || [];
        console.error('❌ [Wompi] ERROR: Clave pública contiene caracteres inválidos:', {
          clavePublica: publicKey,
          caracteresInvalidos: caracteresInvalidos,
          posiciones: caracteresInvalidos.map(char => ({
            caracter: char,
            codigo: char.charCodeAt(0),
            posicion: publicKey.indexOf(char)
          }))
        });
        throw new Error(`Clave pública contiene caracteres inválidos: ${caracteresInvalidos.join(', ')}. Solo se permiten letras, números y guiones bajos (_).`);
      }
      
      console.log('✅ [Wompi] Clave pública validada:', {
        formato: publicKey.startsWith('pub_test_') ? 'TEST' : 'PROD',
        longitud: publicKey.length,
        prefijo: publicKey.substring(0, 15) + '...',
        soloAlfanumerico: true
      });
      
      // 🚨 VALIDACIÓN CRÍTICA: Verificar que las claves coincidan (sandbox vs producción)
      // Si firmas con integridad de producción y usas clave pública test, Wompi responde con "Página no disponible"
      const isPublicKeyTest = publicKey.startsWith('pub_test_');
      const isPublicKeyProd = publicKey.startsWith('pub_prod_');
      const isIntegrityKeyTest = integrityKey.startsWith('test_integrity_') || integrityKey.startsWith('test_');
      const isIntegrityKeyProd = integrityKey.startsWith('prod_integrity_') || integrityKey.startsWith('prod_');
      
      if (isPublicKeyTest && !isIntegrityKeyTest) {
        console.error('❌ [Wompi] ERROR CRÍTICO: Clave pública es TEST pero clave de integridad NO es TEST');
        console.error('   Esto causará "Página no disponible" en Wompi');
        throw new Error('Las claves no coinciden: clave pública es TEST pero clave de integridad no es TEST. Deben coincidir (ambas TEST o ambas PROD)');
      }
      
      if (isPublicKeyProd && !isIntegrityKeyProd) {
        console.error('❌ [Wompi] ERROR CRÍTICO: Clave pública es PROD pero clave de integridad NO es PROD');
        console.error('   Esto causará "Página no disponible" en Wompi');
        throw new Error('Las claves no coinciden: clave pública es PROD pero clave de integridad no es PROD. Deben coincidir (ambas TEST o ambas PROD)');
      }
      
      console.log('✅ [Wompi] Validación de claves:', {
        publicKeyType: isPublicKeyTest ? 'TEST' : (isPublicKeyProd ? 'PROD' : 'DESCONOCIDA'),
        integrityKeyType: isIntegrityKeyTest ? 'TEST' : (isIntegrityKeyProd ? 'PROD' : 'DESCONOCIDA'),
        clavesCoinciden: (isPublicKeyTest && isIntegrityKeyTest) || (isPublicKeyProd && isIntegrityKeyProd)
      });
      const amountInCents = Math.round(monto).toString();
      
      // 🚨 VALIDAR que la referencia sea única (Wompi NO permite reutilizar referencias)
      // La referencia debe venir del backend ya con garantía de unicidad (UUID + timestamp)
      if (!referencia || referencia.trim() === '') {
        throw new Error('La referencia de pago es requerida y debe ser única');
      }
      
      // 🔧 DEFINIR referenciaTrimmed ANTES de usarla en generarSignature()
      const referenciaTrimmed = referencia.trim();
      
      // Validar formato de referencia (debe tener al menos 10 caracteres para ser única)
      if (referenciaTrimmed.length < 10) {
        throw new Error(`La referencia de pago es muy corta (${referenciaTrimmed.length} caracteres). Debe tener al menos 10 caracteres para garantizar unicidad.`);
      }
      
      // 🚨 REGLA OFICIAL: Wompi requiere máximo 40 caracteres para reference
      if (referenciaTrimmed.length > 40) {
        throw new Error(`La referencia de pago excede el límite oficial de Wompi (${referenciaTrimmed.length} caracteres). Wompi acepta máximo 40 caracteres. Referencia: ${referenciaTrimmed}`);
      }
      
      // Validar que contenga caracteres alfanuméricos válidos (Wompi acepta letras, números, guiones y guiones bajos)
      const referenciaRegex = /^[a-zA-Z0-9_-]+$/;
      if (!referenciaRegex.test(referenciaTrimmed)) {
        throw new Error('La referencia de pago contiene caracteres inválidos. Solo se permiten letras, números, guiones (-) y guiones bajos (_).');
      }
      
      console.log('✅ [Wompi] Referencia validada (única y formato correcto):', {
        referencia: referenciaTrimmed,
        length: referenciaTrimmed.length,
        formatoValido: true
      });
      
      // Generar signature (OBLIGATORIO para Web Checkout)
      // 🔒 CRÍTICO: Usar expirationTimeFinal (la misma variable que se usará en la URL)
      // Si expirationTimeFinal es null, NO se incluye en la firma ni en la URL
      // 🔧 AHORA referenciaTrimmed ya está definida y validada
      // 🚨 CRÍTICO: El monto usado en la firma DEBE ser exactamente el mismo que se usa en amount-in-cents
      const montoRedondeado = Math.round(monto);
      
      // 🔍 DEBUG: Verificar consistencia entre amountInCents y montoRedondeado
      if (montoRedondeado.toString() !== amountInCents) {
        console.error('❌ [Wompi] ERROR CRÍTICO: montoRedondeado y amountInCents no coinciden:', {
          montoRedondeado,
          amountInCents,
          montoOriginal: monto,
          tipoMontoRedondeado: typeof montoRedondeado,
          tipoAmountInCents: typeof amountInCents
        });
        throw new Error('Inconsistencia en el monto: montoRedondeado y amountInCents deben ser iguales');
      }
      
      console.log('✅ [Wompi] Monto validado para firma y URL:', {
        montoOriginal: monto,
        montoRedondeado,
        amountInCents,
        sonIguales: montoRedondeado.toString() === amountInCents
      });
      
      const signature = this.generarSignature(
        referenciaTrimmed,
        montoRedondeado, // 🔒 Debe ser el mismo valor que amountInCents (pero como número para la firma)
        moneda,
        expirationTimeFinal // 🔒 Usar expirationTimeFinal, no expirationTime
      );
      
      console.log('✅ [Wompi] Referencia validada (única y formato correcto):', {
        referencia: referenciaTrimmed,
        length: referenciaTrimmed.length,
        formatoValido: true
      });
      
      // Construir URL final del Web Checkout
      // 🚨 CRÍTICO: URLSearchParams codifica los dos puntos (:) como %3A
      // Wompi requiere los dos puntos sin codificar en los nombres de parámetros
      // Por eso construimos la query string manualmente
      const queryParts = [];
      
      // Agregar parámetros básicos (sin dos puntos, se pueden usar URLSearchParams)
      // 🚨 CRÍTICO: Wompi rechaza la clave pública si está codificada
      // Las claves públicas de Wompi son alfanuméricas (pub_test_... o pub_prod_...)
      // NO deben codificarse con encodeURIComponent, Wompi espera el valor literal
      // Solo codificamos si hay caracteres que realmente lo requieren (espacios, etc.)
      
      // Verificar si la clave pública tiene caracteres que requieren codificación
      const tieneCaracteresEspeciales = /[\s\n\r\t]/.test(publicKey);
      
      console.log('🔍 [Wompi] Clave pública para URL:', {
        publicKeyOriginal: publicKey,
        longitud: publicKey.length,
        tieneEspacios: publicKey.includes(' '),
        tieneSaltosLinea: publicKey.includes('\n') || publicKey.includes('\r'),
        tieneCaracteresEspeciales: tieneCaracteresEspeciales,
        necesitaCodificacion: tieneCaracteresEspeciales
      });
      
      // 🚨 CRÍTICO: NO codificar la clave pública a menos que tenga espacios o caracteres especiales
      // Wompi espera la clave pública sin codificar (valor literal)
      // Si codificamos pub_test_... con encodeURIComponent, Wompi rechaza el formato
      const publicKeyForUrl = tieneCaracteresEspeciales ? encodeURIComponent(publicKey) : publicKey;
      
      // 🔍 DEBUG DETALLADO: Verificar cada carácter de la clave pública
      const publicKeyChars = Array.from(publicKeyForUrl).map((char, index) => ({
        index,
        char,
        code: char.charCodeAt(0),
        hex: char.charCodeAt(0).toString(16),
        isValid: /[a-zA-Z0-9_]/.test(char)
      }));
      
      console.log('🔍 [Wompi] Clave pública final para URL:', {
        publicKeyForUrl: publicKeyForUrl,
        esCodificada: publicKeyForUrl !== publicKey,
        longitud: publicKeyForUrl.length,
        primerosCaracteres: publicKeyForUrl.substring(0, 20),
        ultimosCaracteres: publicKeyForUrl.substring(Math.max(0, publicKeyForUrl.length - 10)),
        caracteresDetallados: publicKeyChars.slice(0, 20), // Primeros 20 caracteres
        tieneCaracteresInvalidos: publicKeyChars.some(c => !c.isValid)
      });
      
      // 🚨 VALIDACIÓN FINAL: Verificar que la clave pública para URL sea válida
      if (!/^pub_(test|prod)_[a-zA-Z0-9_]+$/.test(publicKeyForUrl)) {
        console.error('❌ [Wompi] ERROR CRÍTICO: Clave pública para URL no cumple el formato esperado:', {
          publicKeyForUrl: publicKeyForUrl,
          longitud: publicKeyForUrl.length,
          primerosCaracteres: publicKeyForUrl.substring(0, 20),
          caracteresInvalidos: publicKeyChars.filter(c => !c.isValid)
        });
        throw new Error(`Clave pública para URL inválida. Formato esperado: pub_test_... o pub_prod_...`);
      }
      
      // 🚨 CRÍTICO: Verificar que la clave pública no tenga ningún problema antes de agregarla
      console.log('🔍 [Wompi] Clave pública que se agregará a la URL:', {
        publicKeyForUrl: publicKeyForUrl,
        longitud: publicKeyForUrl.length,
        primerCaracter: publicKeyForUrl[0],
        ultimoCaracter: publicKeyForUrl[publicKeyForUrl.length - 1],
        tieneEspacios: publicKeyForUrl.includes(' '),
        tieneComillas: publicKeyForUrl.includes('"') || publicKeyForUrl.includes("'"),
        formatoCompleto: publicKeyForUrl.substring(0, 10) + '...' + publicKeyForUrl.substring(publicKeyForUrl.length - 10),
        codigoAscii: Array.from(publicKeyForUrl.substring(0, 10)).map(c => c.charCodeAt(0))
      });
      
      // 🚨 CRÍTICO: Agregar parámetros obligatorios en el orden correcto
      // Wompi puede ser muy estricto con el orden y formato de los parámetros
      queryParts.push(`public-key=${publicKeyForUrl}`);
      queryParts.push(`currency=${encodeURIComponent(moneda)}`);
      queryParts.push(`amount-in-cents=${encodeURIComponent(amountInCents)}`);
      queryParts.push(`reference=${encodeURIComponent(referenciaTrimmed)}`);
      queryParts.push(`signature:integrity=${encodeURIComponent(signature)}`); // 🔥 Dos puntos sin codificar en el nombre
      
      // 🔍 DEBUG: Verificar que los parámetros obligatorios estén correctos
      console.log('🔍 [Wompi] Parámetros obligatorios agregados:', {
        publicKey: publicKeyForUrl,
        currency: moneda,
        amountInCents: amountInCents,
        reference: referenciaTrimmed,
        signature: signature.substring(0, 20) + '...',
        publicKeyLength: publicKeyForUrl.length,
        referenceLength: referenciaTrimmed.length,
        signatureLength: signature.length
      });
      
      if (redirectUrlFinal) {
        queryParts.push(`redirect-url=${encodeURIComponent(redirectUrlFinal)}`);
      }
      
      if (expirationTimeFinal) {
        queryParts.push(`expiration-time=${encodeURIComponent(expirationTimeFinal)}`);
      }
      
      // Agregar customer-data (con dos puntos en el nombre, sin codificar)
      // 🚨 REGLA: Los campos pueden enviarse individualmente, pero phone-number DEBE ir con phone-number-prefix
      // y legal-id DEBE ir con legal-id-type
      if (cliente.email && cliente.email.trim() !== '') {
        queryParts.push(`customer-data:email=${encodeURIComponent(cliente.email.trim())}`);
      }
      if (cliente.nombre && cliente.nombre.trim() !== '') {
        queryParts.push(`customer-data:full-name=${encodeURIComponent(cliente.nombre.trim())}`);
      }
      // 🚨 CRÍTICO: phone-number DEBE ir acompañado de phone-number-prefix
      // 🔒 IMPORTANTE: Wompi acepta el prefijo con el signo + codificado como %2B
      // Aunque Wompi acepta + literal, algunos navegadores/móviles lo decodifican como espacio
      // Por seguridad, codificamos el + como %2B para evitar problemas de interpretación
      if (cliente.telefono && cliente.telefono.trim() !== '') {
        const telefonoPrefix = (cliente.telefonoPrefix || '+57').trim();
        
        // Codificar el + como %2B para evitar que el navegador lo interprete como espacio
        // Wompi acepta tanto + como %2B, pero %2B es más seguro para móviles
        const telefonoPrefixEncoded = telefonoPrefix.replace(/\+/g, '%2B');
        
        // 🔍 DEBUG: Verificar formato del prefijo
        console.log('📱 [Wompi] Prefijo telefónico procesado:', {
          telefonoPrefixOriginal: cliente.telefonoPrefix || 'NO_PROVIDED',
          telefonoPrefixFinal: telefonoPrefix,
          telefonoPrefixEncoded: telefonoPrefixEncoded,
          tieneSignoMas: telefonoPrefix.includes('+'),
          seEnviaraCodificado: true,
          esColombia: telefonoPrefix === '+57'
        });
        
        queryParts.push(`customer-data:phone-number=${encodeURIComponent(cliente.telefono.trim())}`);
        queryParts.push(`customer-data:phone-number-prefix=${telefonoPrefixEncoded}`);
      }
      // 🚨 CRÍTICO: legal-id DEBE ir acompañado de legal-id-type
      if (cliente.numeroIdentificacion && cliente.numeroIdentificacion.trim() !== '') {
        const tipoIdentificacion = (cliente.tipoIdentificacion || 'CC').trim();
        queryParts.push(`customer-data:legal-id=${encodeURIComponent(cliente.numeroIdentificacion.trim())}`);
        queryParts.push(`customer-data:legal-id-type=${encodeURIComponent(tipoIdentificacion)}`);
      }
      
      // Agregar shipping-address (con dos puntos en el nombre, sin codificar)
      // 🚨 CRÍTICO: Si enviamos shipping-address, TODOS los campos obligatorios deben estar presentes:
      // - address-line-1 (Obligatorio)
      // - country (Obligatorio)
      // - city (Obligatorio)
      // - phone-number (Obligatorio)
      // - region (Obligatorio)
      // Si falta alguno, NO enviar shipping-address (Wompi rechaza la URL si faltan campos obligatorios)
      if (datosTransaccion.direccionEnvio) {
        const direccion = datosTransaccion.direccionEnvio;
        
        // Normalizar código de país a formato ISO 3166-1 Alpha-2
        let countryCode = direccion.pais || 'CO';
        const countryLower = countryCode.toLowerCase().trim();
        if (countryLower === 'colombia' || countryLower === 'col' || countryLower === 'co') {
          countryCode = 'CO';
        } else if (countryCode.length !== 2) {
          countryCode = 'CO';
        }
        countryCode = countryCode.toUpperCase();
        
        const addressLine1 = (direccion.direccion || direccion.address_line_1 || '').trim();
        const city = (direccion.ciudad || '').trim();
        const region = (direccion.departamento || direccion.region || '').trim();
        const phoneNumber = (direccion.telefono || cliente.telefono || '').trim();
        
        // 🚨 VALIDAR que todos los campos obligatorios estén presentes
        const camposObligatorios = {
          'address-line-1': addressLine1,
          'country': countryCode,
          'city': city,
          'phone-number': phoneNumber,
          'region': region
        };
        
        const camposFaltantes = Object.entries(camposObligatorios)
          .filter(([_, valor]) => !valor || valor.trim() === '')
          .map(([campo, _]) => campo);
        
        if (camposFaltantes.length > 0) {
          console.warn('⚠️ [Wompi] Campos obligatorios de shipping-address faltantes, NO se enviará shipping-address:', {
            camposFaltantes,
            camposPresentes: Object.keys(camposObligatorios).filter(c => !camposFaltantes.includes(c))
          });
          // NO enviar shipping-address si faltan campos obligatorios
        } else {
          // Todos los campos obligatorios están presentes, enviar shipping-address
          queryParts.push(`shipping-address:address-line-1=${encodeURIComponent(addressLine1)}`);
          queryParts.push(`shipping-address:country=${encodeURIComponent(countryCode)}`);
          queryParts.push(`shipping-address:city=${encodeURIComponent(city)}`);
          queryParts.push(`shipping-address:phone-number=${encodeURIComponent(phoneNumber)}`);
          queryParts.push(`shipping-address:region=${encodeURIComponent(region)}`);
          
          // Campos opcionales
          const recipientName = (direccion.nombreDestinatario || direccion.name || cliente.nombre || '').trim();
          if (recipientName) {
            queryParts.push(`shipping-address:name=${encodeURIComponent(recipientName)}`);
          }
          const postalCode = (direccion.codigoPostal || direccion.postal_code || '').trim();
          if (postalCode) {
            queryParts.push(`shipping-address:postal-code=${encodeURIComponent(postalCode)}`);
          }
          const addressLine2 = direccion.instrucciones || direccion.address_line_2 || '';
          if (addressLine2 && addressLine2.length >= 4) {
            queryParts.push(`shipping-address:address-line-2=${encodeURIComponent(addressLine2)}`);
          }
        }
      }
      
      // Agregar impuestos (con dos puntos en el nombre, sin codificar)
      if (datosTransaccion.impuestos && Array.isArray(datosTransaccion.impuestos)) {
        datosTransaccion.impuestos.forEach(impuesto => {
          if (impuesto.tipo === 'VAT') {
            queryParts.push(`tax-in-cents:vat=${encodeURIComponent(Math.round(impuesto.monto * 100).toString())}`);
          } else if (impuesto.tipo === 'CONSUMPTION') {
            queryParts.push(`tax-in-cents:consumption=${encodeURIComponent(Math.round(impuesto.monto * 100).toString())}`);
          }
        });
      }
      
      const queryString = queryParts.join('&');
      
      // 🔍 DEBUG: Log de la query string para verificar codificación
      console.log('🔍 [Wompi] Query string generada:', {
        queryStringLength: queryString.length,
        queryStringPrefix: queryString.substring(0, 200),
        hasPlusSign: queryString.includes('+'),
        hasEncodedPlus: queryString.includes('%2B'),
        paramCount: queryParts.length
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:333',message:'ANTES construir URL final',data:{checkoutBaseUrl,queryStringLength:queryString.length,queryStringPrefix:queryString.substring(0,100),totalParamCount:queryParts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      const checkoutUrl = `${checkoutBaseUrl}?${queryString}`;
      
      // 🔍 DEBUG: Log de la URL completa para verificar
      console.log('🔍 [Wompi] URL completa generada:', {
        urlLength: checkoutUrl.length,
        urlPrefix: checkoutUrl.substring(0, 250),
        urlSuffix: checkoutUrl.substring(checkoutUrl.length - 100),
        hasSignature: checkoutUrl.includes('signature:integrity'),
        signaturePosition: checkoutUrl.indexOf('signature:integrity')
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:336',message:'DESPUÉS construir URL final',data:{checkoutUrlLength:checkoutUrl.length,checkoutUrlPrefix:checkoutUrl.substring(0,150),isValid:checkoutUrl.length>=50},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      // Validar que la URL no esté vacía o mal formada
      if (!checkoutUrl || checkoutUrl.length < 50) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:339',message:'ERROR - URL inválida',data:{checkoutUrlLength:checkoutUrl?.length,checkoutUrl:checkoutUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        throw new Error('La URL generada es inválida o está incompleta');
      }

      // Log detallado para debugging
      console.log('🔄 [Wompi] Generando URL de Web Checkout:', {
        referencia,
        monto,
        moneda,
        ambiente: this.configuracion.ambiente,
        urlLength: checkoutUrl.length,
        publicKeyPrefix: this.configuracion.clavePublica ? this.configuracion.clavePublica.substring(0, 10) + '...' : 'NO CONFIGURADA',
        signaturePrefix: signature.substring(0, 10) + '...',
        hasRedirectUrl: !!redirectUrlFinal,
        hasCustomerData: !!(cliente.email || cliente.nombre),
        hasShippingAddress: !!datosTransaccion.direccionEnvio,
        paramCount: queryParts.length,
        // 🔍 DEBUG: Mostrar URL completa para verificar
        urlCompleta: checkoutUrl
      });
      
      // 🔥 VALIDACIÓN ADICIONAL: Verificar que todos los parámetros obligatorios estén presentes
      const parametrosObligatorios = {
        'public-key': checkoutUrl.includes('public-key='),
        'currency': checkoutUrl.includes('currency='),
        'amount-in-cents': checkoutUrl.includes('amount-in-cents='),
        'reference': checkoutUrl.includes('reference='),
        'signature:integrity': checkoutUrl.includes('signature:integrity=')
      };
      
      const parametrosFaltantes = Object.entries(parametrosObligatorios)
        .filter(([_, presente]) => !presente)
        .map(([param, _]) => param);
      
      if (parametrosFaltantes.length > 0) {
        console.error('❌ [Wompi] Parámetros obligatorios faltantes en la URL:', parametrosFaltantes);
        throw new Error(`Parámetros obligatorios faltantes: ${parametrosFaltantes.join(', ')}`);
      }
      
      // 🚨 DEBUG CRÍTICO: Extraer y verificar el valor exacto de public-key en la URL
      const publicKeyMatch = checkoutUrl.match(/public-key=([^&]+)/);
      const publicKeyEnUrl = publicKeyMatch ? publicKeyMatch[1] : 'NO_ENCONTRADO';
      
      console.log('🔍 [Wompi] Verificación de public-key en URL final:', {
        publicKeyOriginal: publicKeyForUrl,
        publicKeyEnUrl: publicKeyEnUrl,
        sonIguales: publicKeyForUrl === publicKeyEnUrl,
        publicKeyEnUrlLength: publicKeyEnUrl.length,
        publicKeyEnUrlDecoded: decodeURIComponent(publicKeyEnUrl),
        tieneCodificacion: publicKeyEnUrl !== decodeURIComponent(publicKeyEnUrl),
        primerosCaracteres: publicKeyEnUrl.substring(0, 20),
        ultimosCaracteres: publicKeyEnUrl.substring(Math.max(0, publicKeyEnUrl.length - 10))
      });
      
      // 🚨 GENERAR URL MÍNIMA PARA PRUEBA (solo parámetros obligatorios)
      const urlMinima = `${checkoutBaseUrl}?public-key=${publicKeyForUrl}&currency=${encodeURIComponent(moneda)}&amount-in-cents=${encodeURIComponent(amountInCents)}&reference=${encodeURIComponent(referenciaTrimmed)}&signature:integrity=${encodeURIComponent(signature)}`;
      
      console.log('🔍 [Wompi] URL MÍNIMA (solo parámetros obligatorios) para prueba:', {
        urlMinima: urlMinima,
        urlMinimaLength: urlMinima.length,
        diferencia: checkoutUrl.length - urlMinima.length,
        instruccion: 'Prueba esta URL mínima en Chrome para verificar si el problema está en los parámetros opcionales'
      });
      
      console.log('✅ [Wompi] Todos los parámetros obligatorios están presentes en la URL');

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:355',message:'RETURN SUCCESS',data:{urlCheckoutLength:checkoutUrl.length,referencia,monto:Math.round(monto),moneda,hasRedirectUrl:!!redirectUrlFinal},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return {
        exito: true,
        datos: {
          urlCheckout: checkoutUrl,
          referencia: referencia,
          monto: Math.round(monto),
          moneda: moneda,
          redirectUrl: redirectUrlFinal,
          redirectUrlError: redirectUrlErrorFinal
        }
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/160eac0e-a445-4a66-bfc8-5375d2c112f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wompiService.js:368',message:'RETURN ERROR',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      console.error('❌ [Wompi] Error al generar URL de Web Checkout:', error.message);
      
      return {
        exito: false,
        error: error.message,
        detalles: null
      };
    }
  }

  /**
   * Procesar webhook de Wompi (Web Checkout)
   * IMPORTANTE: En Web Checkout, el webhook es la fuente de verdad del estado de la transacción.
   * @param {Object} payload - Body JSON recibido desde Wompi
   * @param {string|null} signatureRecibida - Header X-Event-Checksum (si aplica)
   * @returns {{exito:boolean, evento?:string, datos?:Object, error?:string}}
   */
  procesarWebhook(payload, signatureRecibida) {
    try {
      const evento = payload?.event || null;

      // Validar firma (configurable para desarrollo)
      const skipSignature = process.env.WOMPI_WEBHOOK_SKIP_SIGNATURE === 'true';
      if (!skipSignature) {
        const firmaOk = this.validarFirmaWebhook(payload, signatureRecibida);
        if (!firmaOk) {
          return { exito: false, error: 'Firma de webhook inválida' };
        }
      }

      // Normalizar estructura de transacción
      const tx =
        payload?.data?.transaction ||
        payload?.transaction ||
        payload?.data ||
        null;

      if (!tx) {
        return { exito: false, error: 'Payload inválido: no se encontró transacción' };
      }

      const datos = {
        idTransaccion: tx.id || null,
        referencia: tx.reference || tx.referencia || null,
        estado: tx.status || tx.estado || null,
        monto: tx.amount_in_cents || tx.monto || null,
        moneda: tx.currency || tx.moneda || null,
        metodoPago: tx.payment_method_type || tx.payment_method?.type || null,
        mensaje: tx.status_message || tx.statusMessage || null,
        raw: undefined
      };

      if (!datos.referencia || !datos.estado) {
        return { exito: false, error: 'Transacción inválida: faltan reference/status' };
      }

      return { exito: true, evento, datos };
    } catch (error) {
      return { exito: false, error: error.message };
    }
  }

  /**
   * Consultar el estado de una transacción
   * @param {string} idTransaccion - ID de la transacción en Wompi
   * @returns {Promise<Object>} Estado de la transacción
   */
  async consultarTransaccion(idTransaccion) {
    try {
      if (!idTransaccion) {
        throw new Error('ID de transacción es requerido');
      }

      console.log('🔍 [Wompi] Consultando transacción:', idTransaccion);

      const respuesta = await this.cliente.get(`/transactions/${idTransaccion}`);

      if (!respuesta.data || !respuesta.data.data) {
        throw new Error('Respuesta inválida de Wompi');
      }

      const transaccion = respuesta.data.data;

      console.log('✅ [Wompi] Transacción consultada:', {
        id: transaccion.id,
        referencia: transaccion.reference,
        estado: transaccion.status
      });

      return {
        exito: true,
        datos: {
          id: transaccion.id,
          referencia: transaccion.reference,
          estado: transaccion.status,
          monto: transaccion.amount_in_cents,
          moneda: transaccion.currency,
          metodoPago: transaccion.payment_method_type,
          fechaCreacion: transaccion.created_at,
          fechaFinalizacion: transaccion.finalized_at,
          mensaje: transaccion.status_message || null
        }
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al consultar transacción:', error.response?.data || error.message);
      
      return {
        exito: false,
        error: error.response?.data?.error || error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Validar la firma de un webhook de Wompi
   * @param {Object} payload - Payload del webhook
   * @param {string} signatureRecibida - Firma recibida en el header X-Event-Checksum
   * @returns {boolean} True si la firma es válida
   */
  validarFirmaWebhook(payload, signatureRecibida) {
    try {
      if (!payload || !signatureRecibida) {
        console.warn('⚠️ [Wompi] Firma o payload faltante para validación');
        return false;
      }

      // Wompi envía la firma en el header X-Event-Checksum
      // También puede venir en el body como signature.checksum
      const signature = signatureRecibida || payload?.signature?.checksum;

      if (!signature) {
        console.warn('⚠️ [Wompi] No se encontró firma en el webhook');
        return false;
      }

      // Obtener las propiedades que se usan para generar la firma
      // Wompi indica qué propiedades usar en signature.properties
      const properties = payload?.signature?.properties || ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];

      // Construir la cadena concatenando las propiedades según el orden indicado
      let cadena = '';
      for (const prop of properties) {
        const keys = prop.split('.');
        let value = payload;
        for (const key of keys) {
          value = value?.[key];
        }
        if (value !== undefined && value !== null) {
          cadena += value.toString();
        }
      }

      // Agregar timestamp si está presente
      if (payload.timestamp) {
        cadena += payload.timestamp.toString();
      }

      // Agregar clave de integridad
      cadena += this.configuracion.claveIntegridad;

      // Generar hash SHA256
      const hashCalculado = crypto.createHash('sha256').update(cadena).digest('hex');

      // Comparar firmas
      const esValida = hashCalculado === signature;

      if (!esValida) {
        console.warn('⚠️ [Wompi] Firma de webhook inválida:', {
          hashCalculado: hashCalculado.substring(0, 20) + '...',
          signatureRecibida: signature.substring(0, 20) + '...'
        });
      }

      return esValida;
    } catch (error) {
      console.error('❌ [Wompi] Error al validar firma de webhook:', error);
      return false;
    }
  }

  /**
   * Obtener lista de bancos disponibles para PSE
   * @returns {Promise<Object>} Lista de bancos
   */
  async obtenerBancosPSE() {
    try {
      console.log('🏦 [Wompi] Obteniendo lista de bancos PSE...');

      const respuesta = await this.cliente.get('/pse/financial_institutions');

      if (!respuesta.data || !respuesta.data.data) {
        throw new Error('Respuesta inválida de Wompi');
      }

      const bancos = respuesta.data.data.map(banco => ({
        codigo: banco.financial_institution_code,
        nombre: banco.name
      }));

      console.log(`✅ [Wompi] Se obtuvieron ${bancos.length} bancos PSE`);

      return {
        exito: true,
        datos: bancos
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al obtener bancos PSE:', error.response?.data || error.message);
      
      return {
        exito: false,
        error: error.response?.data?.error || error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Obtener configuración pública de Wompi (para frontend)
   * @returns {Object} Configuración pública
   */
  obtenerConfiguracionPublica() {
    return {
      clavePublica: this.configuracion.clavePublica,
      ambiente: this.configuracion.ambiente,
      moneda: this.configuracion.moneda,
      urlBase: this.urlBase
    };
  }
}

module.exports = new WompiService();
