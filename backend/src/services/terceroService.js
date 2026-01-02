/**
 * Servicio de integración con ApiTercero
 * Gestiona la sincronización de usuarios con el sistema de terceros externo
 */

const axios = require('axios');
const config = require('../config/env');
const User = require('../models/User');
const { query } = require('../config/database');

class TerceroService {
  constructor() {
    // Configurar cliente axios con la URL base y headers
    this.client = axios.create({
      baseURL: config.terceroApi.url,
      timeout: 10000, // 10 segundos timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.terceroApi.token}`
      }
    });

    // Log de configuración (solo en desarrollo)
    if (config.nodeEnv === 'development') {
      console.log('🔧 TerceroService configurado con URL:', config.terceroApi.url);
    }
  }

  /**
   * Busca un tercero en ApiTercero por número de identificación
   * @param {string} numeroIdentificacion - Número de documento del tercero
   * @returns {Promise<Object|null>} - Datos del tercero o null si no existe
   */
  async findTerceroByIdentificacion(numeroIdentificacion) {
    if (!numeroIdentificacion) return null;

    try {
      console.log(`🔍 Buscando tercero por identificación: ${numeroIdentificacion}`);
      
      // Buscar por NIT usando el endpoint específico de búsqueda
      const response = await this.client.get('/api/terceros/search', {
        params: {
          nit: numeroIdentificacion
        }
      });

      if (response.data?.success && response.data?.data) {
        const tercero = response.data.data;
        console.log(`✅ Tercero encontrado por identificación: ${tercero.NOMBRE} (ID: ${tercero.TERID})`);
        return tercero;
      }

      console.log('ℹ️ No se encontró tercero con esa identificación');
      return null;
    } catch (error) {
      console.error('❌ Error buscando tercero por identificación:', error.message);
      
      // Si el error es de red o timeout, propagar el error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('No se pudo conectar con el servicio de terceros. Verifique que el servicio esté activo.');
      }
      
      // Para otros errores, retornar null (no encontrado)
      return null;
    }
  }

  /**
   * Busca un tercero en ApiTercero por email
   * @param {string} email - Email del tercero
   * @returns {Promise<Object|null>} - Datos del tercero o null si no existe
   */
  async findTerceroByEmail(email) {
    if (!email) return null;

    try {
      console.log(`🔍 Buscando tercero por email: ${email}`);
      
      // Buscar por email usando el endpoint específico de búsqueda
      const response = await this.client.get('/api/terceros/search', {
        params: {
          email: email
        }
      });

      if (response.data?.success && response.data?.data) {
        const tercero = response.data.data;
        console.log(`✅ Tercero encontrado por email: ${tercero.NOMBRE} (ID: ${tercero.TERID})`);
        return tercero;
      }

      console.log('ℹ️ No se encontró tercero con ese email');
      return null;
    } catch (error) {
      console.error('❌ Error buscando tercero por email:', error.message);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('No se pudo conectar con el servicio de terceros. Verifique que el servicio esté activo.');
      }
      
      return null;
    }
  }

  /**
   * Crea un nuevo tercero en ApiTercero
   * @param {Object} userData - Datos del usuario de nuestra base de datos
   * @returns {Promise<Object>} - Datos del tercero creado
   */
  async createTercero(userData) {
    try {
      console.log(`📝 Creando tercero para usuario: ${userData.nombreCompleto}`);

      // 🔍 Obtener dirección principal del usuario desde direcciones_envio
      let direccionPrincipal = null;
      try {
        const direccionQuery = `
          SELECT direccion, ciudad, departamento 
          FROM direcciones_envio 
          WHERE usuario_id = ? AND activa = 1 
          ORDER BY es_principal DESC, fecha_creacion DESC 
          LIMIT 1
        `;
        const direcciones = await query(direccionQuery, [userData.id]);
        
        if (direcciones && direcciones.length > 0) {
          direccionPrincipal = direcciones[0];
          console.log('🏠 Dirección principal encontrada:', direccionPrincipal);
        } else {
          console.log('⚠️ No se encontró dirección principal para el usuario');
        }
      } catch (error) {
        console.error('❌ Error obteniendo dirección principal:', error.message);
      }

      // Preparar datos para ApiTercero según el formato esperado
      console.log('🔍 DEBUG: userData recibido en createTercero:', {
        id: userData.id,
        email: userData.email,
        nombreCompleto: userData.nombreCompleto,
        numeroIdentificacion: userData.numeroIdentificacion,
        tipoIdentificacion: userData.tipoIdentificacion
      });
      
      const terceroData = {
        NIT: userData.numeroIdentificacion || userData.email.split('@')[0], // Usar identificación o parte del email
        TIPODOCIDEN: this.mapTipoDocumento(userData.tipoIdentificacion),
        NOMBRE: userData.nombreCompleto,
        DIRECC1: direccionPrincipal?.direccion || 'Sin dirección',
        CIUDAD: direccionPrincipal?.ciudad || 'SIN CIUDAD', // Usar ciudad real de la dirección principal
        TELEF1: userData.telefono || '',
        EMAIL: userData.email
        // Los campos CLIENTE, PROVEED, VENDED, NATJURIDICA se asignan automáticamente en el controlador
      };
      
      console.log('🔍 DEBUG: Datos enviados a ApiTercero:', terceroData);
      console.log('🔍 DEBUG: NIT que se usará:', terceroData.NIT);

      // Llamar al endpoint de registro móvil de ApiTercero
      const response = await this.client.post('/api/mobile/register', terceroData);

      if (response.data?.success && response.data?.data) {
        console.log(`✅ Tercero creado exitosamente: ${response.data.data.nombre} (ID: ${response.data.data.tercero_id})`);
        
        // Si hay advertencia de duplicado, loguear pero no detener el flujo
        if (response.data?.warning) {
          console.log(`⚠️ ADVERTENCIA: ${response.data.warning}`);
        }
        
        // Guardar el tercero_id en nuestra base de datos para referencia futura
        await this.saveTerceroIdInUser(userData.id, response.data.data.tercero_id);
        
        return {
          terceroId: response.data.data.tercero_id,
          nit: response.data.data.nit,
          nombre: response.data.data.nombre,
          email: response.data.data.email,
          warning: response.data?.warning // Incluir advertencia en la respuesta
        };
      }

      throw new Error('Respuesta inválida del servicio de terceros al crear');
    } catch (error) {
      console.error('❌ Error creando tercero:', error.message);
      
      if (error.response?.data) {
        console.error('Detalles del error:', error.response.data);
        
        // Si es un error de duplicado, intentar buscar el tercero existente
        if (error.response.status === 409) {
          console.log('ℹ️ El tercero ya existe, intentando buscarlo...');
          
          // Intentar buscar por identificación primero
          if (userData.numeroIdentificacion) {
            const existingTercero = await this.findTerceroByIdentificacion(userData.numeroIdentificacion);
            if (existingTercero) {
              await this.saveTerceroIdInUser(userData.id, existingTercero.TERID);
              return {
                terceroId: existingTercero.TERID,
                nit: existingTercero.NIT,
                nombre: existingTercero.NOMBRE,
                email: existingTercero.EMAIL
              };
            }
          }
          
          // Si no se encuentra por identificación, buscar por email
          const existingTercero = await this.findTerceroByEmail(userData.email);
          if (existingTercero) {
            await this.saveTerceroIdInUser(userData.id, existingTercero.TERID);
            return {
              terceroId: existingTercero.TERID,
              nit: existingTercero.NIT,
              nombre: existingTercero.NOMBRE,
              email: existingTercero.EMAIL
            };
          }
        }
        
        throw new Error(error.response.data.message || 'Error al crear tercero en el sistema externo');
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('No se pudo conectar con el servicio de terceros. Verifique que el servicio esté activo.');
      }
      
      throw error;
    }
  }

  /**
   * Guarda el tercero_id en la tabla de usuarios para referencia futura
   * @param {string} userId - ID del usuario
   * @param {number} terceroId - ID del tercero en ApiTercero
   */
  async saveTerceroIdInUser(userId, terceroId) {
    try {
      // Verificar si la columna tercero_id existe, si no, la creamos dinámicamente
      const checkColumnSql = `
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'usuarios' 
        AND COLUMN_NAME = 'tercero_id'
      `;
      
      const columnExists = await query(checkColumnSql);
      
      if (columnExists[0].count === 0) {
        console.log('ℹ️ Creando columna tercero_id en tabla usuarios...');
        await query('ALTER TABLE usuarios ADD COLUMN tercero_id INT DEFAULT NULL');
        await query('CREATE INDEX idx_tercero_id ON usuarios(tercero_id)');
      }
      
      // Guardar el tercero_id
      await query('UPDATE usuarios SET tercero_id = ? WHERE id = ?', [terceroId, userId]);
      console.log(`✅ tercero_id ${terceroId} guardado para usuario ${userId}`);
    } catch (error) {
      console.error('❌ Error guardando tercero_id:', error.message);
      // No propagamos el error porque no es crítico
    }
  }

  /**
   * Mapea el tipo de documento de nuestro sistema al de ApiTercero
   * @param {string} tipoIdentificacion - Tipo de identificación (CC, NIT, CE, TR)
   * @returns {string} - Tipo de documento mapeado (C, N, E, T)
   */
  mapTipoDocumento(tipoIdentificacion) {
    const mapping = {
      'CC': 'C',   // Cédula de Ciudadanía
      'NIT': 'N',  // NIT
      'CE': 'E',   // Cédula de Extranjería
      'TR': 'T'    // Tarjeta de Identidad
    };
    
    return mapping[tipoIdentificacion] || 'C'; // Por defecto Cédula
  }

  /**
   * Obtiene o crea un tercero en ApiTercero a partir de un usuario de nuestra BD
   * Esta es la función principal que debe ser llamada desde el flujo de pedidos
   * 
   * @param {string} userId - ID del usuario en nuestra base de datos
   * @returns {Promise<Object>} - Datos del tercero (existente o creado)
   * @throws {Error} - Si no se puede obtener/crear el tercero
   */
  async getOrCreateTerceroFromUser(userId) {
    try {
      console.log(`\n🚀 Iniciando sincronización de tercero para usuario: ${userId}`);

      // 1. Obtener datos completos del usuario de nuestra base de datos
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`Usuario con ID ${userId} no encontrado`);
      }

      console.log(`👤 Usuario encontrado: ${user.nombreCompleto} (${user.email})`);

      // 2. Verificar si ya tiene un tercero_id guardado
      const userWithTerceroId = await query(
        'SELECT tercero_id FROM usuarios WHERE id = ?',
        [userId]
      );

      if (userWithTerceroId[0]?.tercero_id) {
        console.log(`ℹ️ Usuario ya tiene tercero_id: ${userWithTerceroId[0].tercero_id}`);
        
        // Verificar que el tercero existe en ApiTercero
        try {
          const response = await this.client.get(`/api/terceros/${userWithTerceroId[0].tercero_id}`);
          if (response.data?.status) {
            console.log(`✅ Tercero encontrado en ApiTercero: ${response.data.data.nombre}`);
            return {
              terceroId: response.data.data.id,
              nit: response.data.data.nit,
              nombre: response.data.data.nombre,
              email: response.data.data.email,
              existed: true
            };
          }
        } catch (error) {
          console.log('⚠️ El tercero_id guardado no es válido, buscando de nuevo...');
        }
      }

      // 3. Buscar tercero por número de identificación
      if (user.numeroIdentificacion) {
        const terceroByIdentificacion = await this.findTerceroByIdentificacion(user.numeroIdentificacion);
        
        if (terceroByIdentificacion) {
          await this.saveTerceroIdInUser(userId, terceroByIdentificacion.TERID);
          return {
            terceroId: terceroByIdentificacion.TERID,
            nit: terceroByIdentificacion.NIT,
            nombre: terceroByIdentificacion.NOMBRE,
            email: terceroByIdentificacion.EMAIL,
            existed: true
          };
        }
      }

      // 4. Buscar tercero por email
      const terceroByEmail = await this.findTerceroByEmail(user.email);
      
      if (terceroByEmail) {
        await this.saveTerceroIdInUser(userId, terceroByEmail.TERID);
        return {
          terceroId: terceroByEmail.TERID,
          nit: terceroByEmail.NIT,
          nombre: terceroByEmail.NOMBRE,
          email: terceroByEmail.EMAIL,
          existed: true
        };
      }

      // 5. Si no existe, crear nuevo tercero
      console.log('📝 No se encontró tercero existente, creando uno nuevo...');
      
      const newTercero = await this.createTercero({
        id: user.id,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        telefono: user.telefono,
        direccion: user.direccion,
        tipoIdentificacion: user.tipoIdentificacion,
        numeroIdentificacion: user.numeroIdentificacion
      });

      console.log(`\n✅ Sincronización completada exitosamente para usuario ${userId}\n`);

      return {
        ...newTercero,
        existed: false
      };

    } catch (error) {
      console.error(`\n❌ Error en sincronización de tercero para usuario ${userId}:`, error.message);
      throw error;
    }
  }
}

// Exportar una instancia única del servicio (Singleton)
module.exports = new TerceroService();

