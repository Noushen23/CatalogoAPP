const { query, getConnection } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Review {
  constructor(data) {
    this.id = data.id;
    this.usuarioId = data.usuario_id;
    this.productoId = data.producto_id;
    this.ordenId = data.orden_id;
    this.calificacion = data.calificacion;
    this.comentario = data.comentario;
    this.activa = data.activa;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
    
    // Datos relacionados
    this.usuario = data.usuario || null;
    this.producto = data.producto || null;
    this.orden = data.orden || null;
  }

  // Crear una nueva reseña
  static async create(reviewData) {
    try {
      const {
        usuarioId,
        productoId,
        ordenId = null,
        calificacion,
        comentario = null
      } = reviewData;

      // Validar datos
      if (!usuarioId || !productoId || !calificacion) {
        throw new Error('Datos requeridos: usuarioId, productoId, calificacion');
      }

      if (calificacion < 1 || calificacion > 5) {
        throw new Error('La calificación debe estar entre 1 y 5');
      }

      // Verificar si ya existe una reseña del usuario para este producto
      const existingReview = await this.findByUserAndProduct(usuarioId, productoId);
      if (existingReview) {
        throw new Error('Ya has enviado una reseña para este producto');
      }

      // Verificar que el producto existe y está activo
      const productSql = 'SELECT id, nombre FROM productos WHERE id = ? AND activo = 1';
      const [products] = await query(productSql, [productoId]);
      
      if (products.length === 0) {
        throw new Error('Producto no encontrado o no disponible');
      }

      const reviewId = uuidv4();
      
      const insertSql = `
        INSERT INTO resenas (
          id, usuario_id, producto_id, orden_id, 
          calificacion, comentario, activa
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await query(insertSql, [
        reviewId,
        usuarioId,
        productoId,
        ordenId,
        calificacion,
        comentario,
        true
      ]);
      
      if (result.affectedRows === 0) {
        throw new Error('No se pudo crear la reseña');
      }

      // Obtener la reseña recién creada con datos relacionados
      const review = await this.findById(reviewId);
      return review;
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya has enviado una reseña para este producto');
      }
      throw error;
    }
  }

  // Encontrar reseña por ID
  static async findById(reviewId) {
    try {
      const sql = `
        SELECT 
          r.*,
          u.email as usuario_email,
          u.nombre_completo as usuario_nombre,
          p.nombre as producto_nombre,
          o.numero_orden
        FROM resenas r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN productos p ON r.producto_id = p.id
        LEFT JOIN ordenes o ON r.orden_id = o.id
        WHERE r.id = ? AND r.activa = 1
      `;
      
      const result = await query(sql, [reviewId]);
      
      if (result.length === 0) {
        return null;
      }

      const reviewData = result[0];
      return new Review({
        ...reviewData,
        usuario: {
          email: reviewData.usuario_email,
          nombreCompleto: reviewData.usuario_nombre
        },
        producto: {
          nombre: reviewData.producto_nombre
        },
        orden: reviewData.numero_orden ? {
          numeroOrden: reviewData.numero_orden
        } : null
      });
      
    } catch (error) {
      throw error;
    }
  }

  // Encontrar reseña por usuario y producto
  static async findByUserAndProduct(usuarioId, productoId) {
    try {
      const sql = `
        SELECT 
          r.*,
          u.email as usuario_email,
          u.nombre_completo as usuario_nombre,
          p.nombre as producto_nombre
        FROM resenas r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN productos p ON r.producto_id = p.id
        WHERE r.usuario_id = ? AND r.producto_id = ? AND r.activa = 1
      `;
      
      const result = await query(sql, [usuarioId, productoId]);
      
      if (result.length === 0) {
        return null;
      }

      const reviewData = result[0];
      return new Review({
        ...reviewData,
        usuario: {
          email: reviewData.usuario_email,
          nombreCompleto: reviewData.usuario_nombre
        },
        producto: {
          nombre: reviewData.producto_nombre
        }
      });
      
    } catch (error) {
      throw error;
    }
  }

  // Obtener reseñas por producto
  static async findByProductId(productoId, options = {}) {
    try {
      const { limit = 20, offset = 0, includeInactive = false } = options;
      
      let sql = `
        SELECT 
          r.*,
          u.email as usuario_email,
          u.nombre_completo as usuario_nombre
        FROM resenas r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.producto_id = ?
      `;
      
      const params = [productoId];
      
      if (!includeInactive) {
        sql += ' AND r.activa = 1';
      }
      
      sql += ' ORDER BY r.fecha_creacion DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const result = await query(sql, params);
      
      return result.map(reviewData => new Review({
        ...reviewData,
        usuario: {
          email: reviewData.usuario_email,
          nombreCompleto: reviewData.usuario_nombre
        }
      }));
      
    } catch (error) {
      throw error;
    }
  }

  // Obtener reseñas por usuario
  static async findByUserId(usuarioId, options = {}) {
    try {
      const { limit = 20, offset = 0, includeInactive = false } = options;
      
      let sql = `
        SELECT 
          r.*,
          p.nombre as producto_nombre,
          p.imagen_principal as producto_imagen
        FROM resenas r
        LEFT JOIN productos p ON r.producto_id = p.id
        WHERE r.usuario_id = ?
      `;
      
      const params = [usuarioId];
      
      if (!includeInactive) {
        sql += ' AND r.activa = 1';
      }
      
      sql += ' ORDER BY r.fecha_creacion DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const result = await query(sql, params);
      
      return result.map(reviewData => new Review({
        ...reviewData,
        producto: {
          nombre: reviewData.producto_nombre,
          imagenPrincipal: reviewData.producto_imagen
        }
      }));
      
    } catch (error) {
      throw error;
    }
  }

  // Contar reseñas por producto
  static async countByProductId(productoId, includeInactive = false) {
    try {
      let sql = 'SELECT COUNT(*) as total FROM resenas WHERE producto_id = ?';
      const params = [productoId];
      
      if (!includeInactive) {
        sql += ' AND activa = 1';
      }
      
      const result = await query(sql, params);
      return result[0].total;
      
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de calificación por producto
  static async getAverageRatingAndCount(productoId, includeInactive = false) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_resenas,
          AVG(calificacion) as promedio_calificacion,
          MIN(calificacion) as calificacion_minima,
          MAX(calificacion) as calificacion_maxima,
          SUM(CASE WHEN calificacion = 5 THEN 1 ELSE 0 END) as calificacion_5,
          SUM(CASE WHEN calificacion = 4 THEN 1 ELSE 0 END) as calificacion_4,
          SUM(CASE WHEN calificacion = 3 THEN 1 ELSE 0 END) as calificacion_3,
          SUM(CASE WHEN calificacion = 2 THEN 1 ELSE 0 END) as calificacion_2,
          SUM(CASE WHEN calificacion = 1 THEN 1 ELSE 0 END) as calificacion_1
        FROM resenas 
        WHERE producto_id = ?
      `;
      
      const params = [productoId];
      
      if (!includeInactive) {
        sql += ' AND activa = 1';
      }
      
      const result = await query(sql, params);
      
      if (result.length === 0 || result[0].total_resenas === 0) {
        return {
          totalResenas: 0,
          promedioCalificacion: 0,
          calificacionMinima: 0,
          calificacionMaxima: 0,
          distribucion: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
          }
        };
      }

      const stats = result[0];
      return {
        totalResenas: parseInt(stats.total_resenas),
        promedioCalificacion: parseFloat(stats.promedio_calificacion || 0),
        calificacionMinima: parseInt(stats.calificacion_minima || 0),
        calificacionMaxima: parseInt(stats.calificacion_maxima || 0),
        distribucion: {
          5: parseInt(stats.calificacion_5 || 0),
          4: parseInt(stats.calificacion_4 || 0),
          3: parseInt(stats.calificacion_3 || 0),
          2: parseInt(stats.calificacion_2 || 0),
          1: parseInt(stats.calificacion_1 || 0)
        }
      };
      
    } catch (error) {
      throw error;
    }
  }

  // Actualizar reseña
  async update(updateData) {
    try {
      const { calificacion, comentario } = updateData;
      
      if (calificacion !== undefined && (calificacion < 1 || calificacion > 5)) {
        throw new Error('La calificación debe estar entre 1 y 5');
      }

      const updateFields = [];
      const params = [];
      
      if (calificacion !== undefined) {
        updateFields.push('calificacion = ?');
        params.push(calificacion);
      }
      
      if (comentario !== undefined) {
        updateFields.push('comentario = ?');
        params.push(comentario);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      updateFields.push('fecha_actualizacion = NOW()');
      params.push(this.id);

      const sql = `UPDATE resenas SET ${updateFields.join(', ')} WHERE id = ?`;
      const result = await query(sql, params);
      
      if (result.affectedRows === 0) {
        throw new Error('No se pudo actualizar la reseña');
      }

      // Actualizar propiedades locales
      if (calificacion !== undefined) this.calificacion = calificacion;
      if (comentario !== undefined) this.comentario = comentario;
      this.fechaActualizacion = new Date().toISOString();

      return this;
      
    } catch (error) {
      throw error;
    }
  }

  // Eliminar reseña (soft delete)
  async delete() {
    try {
      const sql = 'UPDATE resenas SET activa = 0, fecha_actualizacion = NOW() WHERE id = ?';
      const result = await query(sql, [this.id]);
      
      if (result.affectedRows === 0) {
        throw new Error('No se pudo eliminar la reseña');
      }

      this.activa = false;
      this.fechaActualizacion = new Date().toISOString();
      
      return this;
      
    } catch (error) {
      throw error;
    }
  }

  // Eliminar reseña permanentemente
  async deletePermanently() {
    try {
      const sql = 'DELETE FROM resenas WHERE id = ?';
      const result = await query(sql, [this.id]);
      
      if (result.affectedRows === 0) {
        throw new Error('No se pudo eliminar la reseña');
      }
      
      return { success: true, message: 'Reseña eliminada permanentemente' };
      
    } catch (error) {
      throw error;
    }
  }

  // Convertir a objeto público
  toPublicObject() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      productoId: this.productoId,
      ordenId: this.ordenId,
      calificacion: this.calificacion,
      comentario: this.comentario,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      usuario: this.usuario,
      producto: this.producto,
      orden: this.orden
    };
  }

  // Convertir a objeto público simplificado
  toPublicObjectSimple() {
    return {
      id: this.id,
      calificacion: this.calificacion,
      comentario: this.comentario,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      usuario: {
        nombreCompleto: this.usuario?.nombreCompleto
      }
    };
  }
}

module.exports = Review;
