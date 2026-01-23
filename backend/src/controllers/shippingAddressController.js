const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Normalizar ciudad para búsqueda (remover acentos)
 * normalize("NFD") separa los caracteres base de sus acentos (por ejemplo, "ú" → "u" + "´")
 * replace(/[\u0300-\u036f]/g, "") elimina todos esos signos diacríticos (tildes, diéresis, etc.)
 * Funciona también con letras como "Ñ" → no se elimina, porque no es un acento, es una letra propia
 */
const normalizeCity = (city) => {
  if (!city) return '';
  return city
    .normalize("NFD")  // Separar caracteres base de acentos
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar signos diacríticos
    .toUpperCase()
    .trim();
};

/**
 * Normalizar ciudad para almacenamiento (mantener acentos pero normalizar formato)
 */
const normalizeCityForStorage = (city) => {
  if (!city) return '';
  return city
    .trim()
    .replace(/\s+/g, ' ')  // Normalizar espacios múltiples
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

class ShippingAddressController {
  // Obtener direcciones del usuario autenticado
  static async getUserAddresses(req, res) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT * FROM direcciones_envio 
        WHERE usuario_id = ? AND activa = TRUE 
        ORDER BY es_principal DESC, fecha_creacion DESC
      `;
      
      const addresses = await query(sql, [userId]);

      res.json({
        success: true,
        message: 'Direcciones obtenidas exitosamente',
        data: addresses.map(address => ({
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }))
      });
    } catch (error) {
      console.error('Error al obtener direcciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener dirección específica del usuario
  static async getUserAddress(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const sql = `
        SELECT * FROM direcciones_envio 
        WHERE id = ? AND usuario_id = ? AND activa = TRUE
      `;
      
      const addresses = await query(sql, [id, userId]);

      if (addresses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dirección no encontrada'
        });
      }

      const address = addresses[0];

      res.json({
        success: true,
        message: 'Dirección obtenida exitosamente',
        data: {
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error al obtener dirección:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener dirección principal del usuario
  static async getPrimaryAddress(req, res) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT * FROM direcciones_envio 
        WHERE usuario_id = ? AND es_principal = TRUE AND activa = TRUE
        LIMIT 1
      `;
      
      const addresses = await query(sql, [userId]);

      if (addresses.length === 0) {
        return res.json({
          success: true,
          message: 'No hay dirección principal',
          data: null
        });
      }

      const address = addresses[0];

      res.json({
        success: true,
        message: 'Dirección principal obtenida exitosamente',
        data: {
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error al obtener dirección principal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva dirección de envío
  static async createAddress(req, res) {
    try {
      const userId = req.user.id;
      const {
        nombreDestinatario,
        telefono,
        direccion,
        ciudad,
        departamento,
        codigoPostal,
        pais = 'Colombia',
        esPrincipal = false,
        instrucciones
      } = req.body;

      // Normalizar ciudad para almacenamiento
      const ciudadNormalizada = normalizeCityForStorage(ciudad);
      const departamentoNormalizado = normalizeCityForStorage(departamento);
      
      console.log('🏙️ Normalización de ciudad:', {
        original: ciudad,
        normalizada: ciudadNormalizada,
        departamentoOriginal: departamento,
        departamentoNormalizado: departamentoNormalizado
      });

      // Si se marca como principal, quitar la marca de principal de otras direcciones
      if (esPrincipal) {
        const updatePrimarySql = `
          UPDATE direcciones_envio 
          SET es_principal = FALSE, fecha_actualizacion = NOW() 
          WHERE usuario_id = ?
        `;
        await query(updatePrimarySql, [userId]);
      }

      // Generar UUID para la dirección (similar a productos y usuarios)
      const addressId = uuidv4();

      const sql = `
        INSERT INTO direcciones_envio (
          id, usuario_id, nombre_destinatario, telefono, direccion, 
          ciudad, departamento, codigo_postal, pais, instrucciones, es_principal, activa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `;

      await query(sql, [
        addressId,
        userId,
        nombreDestinatario,
        telefono || null,
        direccion,
        ciudadNormalizada,  // Usar ciudad normalizada
        departamentoNormalizado,  // Usar departamento normalizado
        codigoPostal || null,
        pais,
        instrucciones || null,
        esPrincipal
      ]);

      // Obtener la dirección creada usando el UUID generado
      const getAddressSql = 'SELECT * FROM direcciones_envio WHERE id = ?';
      const addresses = await query(getAddressSql, [addressId]);
      const address = addresses[0];
      
      // Validar que la dirección se encontró
      if (!address) {
        console.error('❌ No se encontró dirección con id:', addressId);
        throw new Error('No se pudo recuperar la dirección creada');
      }

      res.status(201).json({
        success: true,
        message: 'Dirección creada exitosamente',
        data: {
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error al crear dirección:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar dirección de envío
  static async updateAddress(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que la dirección pertenece al usuario
      const checkSql = 'SELECT id FROM direcciones_envio WHERE id = ? AND usuario_id = ?';
      const checkResult = await query(checkSql, [id, userId]);

      if (checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dirección no encontrada'
        });
      }

      // Si se marca como principal, quitar la marca de principal de otras direcciones
      if (updateData.esPrincipal) {
        const updatePrimarySql = `
          UPDATE direcciones_envio 
          SET es_principal = FALSE, fecha_actualizacion = NOW() 
          WHERE usuario_id = ? AND id != ?
        `;
        await query(updatePrimarySql, [userId, id]);
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          switch (key) {
            case 'nombreDestinatario':
              updateFields.push('nombre_destinatario = ?');
              updateValues.push(updateData[key]);
              break;
            case 'telefono':
              updateFields.push('telefono = ?');
              updateValues.push(updateData[key]);
              break;
            case 'direccion':
              updateFields.push('direccion = ?');
              updateValues.push(updateData[key]);
              break;
            case 'ciudad':
              updateFields.push('ciudad = ?');
              updateValues.push(normalizeCityForStorage(updateData[key]));
              console.log('🏙️ Ciudad actualizada:', {
                original: updateData[key],
                normalizada: normalizeCityForStorage(updateData[key])
              });
              break;
            case 'departamento':
              updateFields.push('departamento = ?');
              updateValues.push(normalizeCityForStorage(updateData[key]));
              console.log('🏙️ Departamento actualizado:', {
                original: updateData[key],
                normalizada: normalizeCityForStorage(updateData[key])
              });
              break;
            case 'codigoPostal':
              updateFields.push('codigo_postal = ?');
              updateValues.push(updateData[key]);
              break;
            case 'pais':
              updateFields.push('pais = ?');
              updateValues.push(updateData[key]);
              break;
            case 'instrucciones':
              updateFields.push('instrucciones = ?');
              updateValues.push(updateData[key] || null);
              break;
            case 'esPrincipal':
              updateFields.push('es_principal = ?');
              updateValues.push(updateData[key]);
              break;
            case 'activa':
              updateFields.push('activa = ?');
              updateValues.push(updateData[key]);
              break;
          }
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateFields.push('fecha_actualizacion = NOW()');
      updateValues.push(id);

      const sql = `UPDATE direcciones_envio SET ${updateFields.join(', ')} WHERE id = ?`;
      await query(sql, updateValues);

      // Obtener la dirección actualizada
      const getAddressSql = 'SELECT * FROM direcciones_envio WHERE id = ?';
      const addresses = await query(getAddressSql, [id]);
      const address = addresses[0];

      res.json({
        success: true,
        message: 'Dirección actualizada exitosamente',
        data: {
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error al actualizar dirección:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar dirección de envío
  static async deleteAddress(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Verificar que la dirección pertenece al usuario
      const checkSql = 'SELECT id FROM direcciones_envio WHERE id = ? AND usuario_id = ?';
      const checkResult = await query(checkSql, [id, userId]);

      if (checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dirección no encontrada'
        });
      }

      // Marcar como inactiva en lugar de eliminar (soft delete)
      const sql = 'UPDATE direcciones_envio SET activa = FALSE, fecha_actualizacion = NOW() WHERE id = ?';
      await query(sql, [id]);

      res.json({
        success: true,
        message: 'Dirección eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Establecer dirección como principal
  static async setPrimaryAddress(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Verificar que la dirección pertenece al usuario
      const checkSql = 'SELECT id FROM direcciones_envio WHERE id = ? AND usuario_id = ? AND activa = TRUE';
      const checkResult = await query(checkSql, [id, userId]);

      if (checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dirección no encontrada'
        });
      }

      // Quitar la marca de principal de todas las direcciones del usuario
      const updateAllSql = `
        UPDATE direcciones_envio 
        SET es_principal = FALSE, fecha_actualizacion = NOW() 
        WHERE usuario_id = ?
      `;
      await query(updateAllSql, [userId]);

      // Establecer esta dirección como principal
      const updatePrimarySql = `
        UPDATE direcciones_envio 
        SET es_principal = TRUE, fecha_actualizacion = NOW() 
        WHERE id = ?
      `;
      await query(updatePrimarySql, [id]);

      // Obtener la dirección actualizada
      const getAddressSql = 'SELECT * FROM direcciones_envio WHERE id = ?';
      const addresses = await query(getAddressSql, [id]);
      const address = addresses[0];

      res.json({
        success: true,
        message: 'Dirección establecida como principal exitosamente',
        data: {
          id: address.id,
          usuarioId: address.usuario_id,
          nombreDestinatario: address.nombre_destinatario,
          telefono: address.telefono,
          direccion: address.direccion,
          ciudad: address.ciudad,
          departamento: address.departamento,
          codigoPostal: address.codigo_postal,
          pais: address.pais,
          instrucciones: address.instrucciones,
          esPrincipal: address.es_principal,
          activa: address.activa,
          fechaCreacion: address.fecha_creacion,
          fechaActualizacion: address.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error al establecer dirección principal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ShippingAddressController;











































