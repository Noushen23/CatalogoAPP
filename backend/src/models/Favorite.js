const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { getRequestBaseUrl } = require('../helpers/requestContext');

class Favorite {
  constructor(data) {
    this.id = data.id;
    this.usuario_id = data.usuario_id;
    this.producto_id = data.producto_id;
    this.fecha_agregado = data.fecha_agregado;
  }

  // Método para añadir un producto a favoritos
  static async add(usuarioId, productoId) {
    try {
      const favoriteId = uuidv4();
      
      const insertQuery = `
        INSERT INTO favoritos_usuario (id, usuario_id, producto_id)
        VALUES (?, ?, ?)
      `;
      
      const result = await query(insertQuery, [favoriteId, usuarioId, productoId]);
      
      if (result.affectedRows === 0) {
        throw new Error('No se pudo agregar el producto a favoritos');
      }

      // Obtener el favorito recién creado
      const favorite = await this.findById(favoriteId);
      return favorite;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Este producto ya está en tus favoritos');
      }
      throw error;
    }
  }

  // Método para eliminar un producto de favoritos
  static async remove(usuarioId, productoId) {
    try {
      const deleteQuery = `
        DELETE FROM favoritos_usuario 
        WHERE usuario_id = ? AND producto_id = ?
      `;
      
      const result = await query(deleteQuery, [usuarioId, productoId]);
      
      if (result.affectedRows === 0) {
        throw new Error('El producto no estaba en tus favoritos');
      }

      return { success: true, message: 'Producto eliminado de favoritos' };
    } catch (error) {
      throw error;
    }
  }

  // Método para encontrar favoritos por ID de usuario
  static async findByUserId(usuarioId, options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        includeProductDetails = true 
      } = options;

      if (includeProductDetails) {
        // Consulta con detalles del producto
        const selectQuery = `
          SELECT 
            f.id,
            f.usuario_id,
            f.producto_id,
            f.fecha_agregado,
            p.nombre as producto_nombre,
            p.descripcion as producto_descripcion,
            p.precio as producto_precio,
            p.precio_oferta as producto_precio_oferta,
            p.stock as producto_stock,
            p.activo as producto_activo,
            p.destacado as producto_destacado,
            p.es_servicio as producto_es_servicio,
            c.nombre as categoria_nombre
          FROM favoritos_usuario f
          INNER JOIN productos p ON f.producto_id = p.id
          LEFT JOIN categorias c ON p.categoria_id = c.id
          WHERE f.usuario_id = ? AND p.activo = 1
          ORDER BY f.fecha_agregado DESC
          LIMIT ? OFFSET ?
        `;
        
        const favorites = await query(selectQuery, [usuarioId, limit, offset]);
        
        // Cargar imágenes para cada favorito
        const favoritesWithDetails = await Promise.all(
          favorites.map(async (fav) => {
            // Obtener imágenes del producto
            const imagenesQuery = `
              SELECT id, url_imagen, orden, es_principal
              FROM imagenes_producto
              WHERE producto_id = ?
              ORDER BY orden ASC, fecha_creacion ASC
            `;
            const imagenes = await query(imagenesQuery, [fav.producto_id]);
            
            // Transformar URLs de imágenes
            const imagenesConUrls = imagenes.map(img => ({
              ...img,
              url: Favorite.buildImageUrl(img.url_imagen),
              url_imagen: Favorite.buildImageUrl(img.url_imagen)
            }));
            
            // Obtener etiquetas del producto (están en JSON en la tabla productos)
            const etiquetasQuery = `
              SELECT etiquetas
              FROM productos
              WHERE id = ?
            `;
            const etiquetasResult = await query(etiquetasQuery, [fav.producto_id]);
            
            // Parsear etiquetas JSON
            let etiquetas = [];
            if (etiquetasResult.length > 0 && etiquetasResult[0].etiquetas) {
              try {
                etiquetas = typeof etiquetasResult[0].etiquetas === 'string' 
                  ? JSON.parse(etiquetasResult[0].etiquetas) 
                  : etiquetasResult[0].etiquetas;
              } catch (error) {
                console.error('Error parseando etiquetas:', error);
                etiquetas = [];
              }
            }
            
            return {
              id: fav.id,
              usuario_id: fav.usuario_id,
              producto_id: fav.producto_id,
              fecha_agregado: fav.fecha_agregado,
              producto: {
                id: fav.producto_id,
                nombre: fav.producto_nombre,
                descripcion: fav.producto_descripcion,
                precio: fav.producto_precio,
                precio_oferta: fav.producto_precio_oferta,
                precio_final: fav.producto_precio_oferta || fav.producto_precio,
                stock: fav.producto_stock,
                activo: fav.producto_activo,
                destacado: fav.producto_destacado,
                es_servicio: fav.producto_es_servicio || false,
                esServicio: fav.producto_es_servicio || false,
                categoria_nombre: fav.categoria_nombre,
                imagenes: imagenesConUrls,
                etiquetas: Array.isArray(etiquetas) ? etiquetas : []
              }
            };
          })
        );
        
        return favoritesWithDetails;
      } else {
        // Consulta simple solo con IDs
        const selectQuery = `
          SELECT id, usuario_id, producto_id, fecha_agregado
          FROM favoritos_usuario
          WHERE usuario_id = ?
          ORDER BY fecha_agregado DESC
          LIMIT ? OFFSET ?
        `;
        
        const favorites = await query(selectQuery, [usuarioId, limit, offset]);
        
        return favorites.map(fav => ({
          id: fav.id,
          usuario_id: fav.usuario_id,
          producto_id: fav.producto_id,
          fecha_agregado: fav.fecha_agregado
        }));
      }
    } catch (error) {
      console.error('Error en findByUserId:', error);
      throw error;
    }
  }

  // Método para verificar si un producto está en favoritos
  static async isFavorite(usuarioId, productoId) {
    try {
      const checkQuery = `
        SELECT id FROM favoritos_usuario 
        WHERE usuario_id = ? AND producto_id = ?
      `;
      
      const result = await query(checkQuery, [usuarioId, productoId]);
      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Método para encontrar un favorito por ID
  static async findById(favoriteId) {
    try {
      const selectQuery = `
        SELECT id, usuario_id, producto_id, fecha_agregado
        FROM favoritos_usuario
        WHERE id = ?
      `;
      
      const result = await query(selectQuery, [favoriteId]);
      
      if (result.length === 0) {
        return null;
      }

      return new Favorite(result[0]);
    } catch (error) {
      throw error;
    }
  }

  // Método para contar favoritos de un usuario
  static async countByUserId(usuarioId) {
    try {
      const countQuery = `
        SELECT COUNT(*) as total
        FROM favoritos_usuario f
        INNER JOIN productos p ON f.producto_id = p.id
        WHERE f.usuario_id = ? AND p.activo = 1
      `;
      
      const result = await query(countQuery, [usuarioId]);
      return result[0].total;
    } catch (error) {
      throw error;
    }
  }

  // Método para eliminar todos los favoritos de un usuario
  static async removeAllByUserId(usuarioId) {
    try {
      const deleteQuery = `
        DELETE FROM favoritos_usuario 
        WHERE usuario_id = ?
      `;
      
      const result = await query(deleteQuery, [usuarioId]);
      return { 
        success: true, 
        deletedCount: result.affectedRows,
        message: `${result.affectedRows} favoritos eliminados` 
      };
    } catch (error) {
      throw error;
    }
  }

  // Método para obtener estadísticas de favoritos
  static async getStats(usuarioId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_favoritos,
          COUNT(DISTINCT p.categoria_id) as categorias_diferentes,
          AVG(p.precio) as precio_promedio,
          MIN(p.precio) as precio_minimo,
          MAX(p.precio) as precio_maximo
        FROM favoritos_usuario f
        INNER JOIN productos p ON f.producto_id = p.id
        WHERE f.usuario_id = ? AND p.activo = 1
      `;
      
      const result = await query(statsQuery, [usuarioId]);
      
      if (result.length === 0) {
        return {
          total_favoritos: 0,
          categorias_diferentes: 0,
          precio_promedio: 0,
          precio_minimo: 0,
          precio_maximo: 0
        };
      }

      return {
        total_favoritos: result[0].total_favoritos,
        categorias_diferentes: result[0].categorias_diferentes,
        precio_promedio: parseFloat(result[0].precio_promedio || 0),
        precio_minimo: parseFloat(result[0].precio_minimo || 0),
        precio_maximo: parseFloat(result[0].precio_maximo || 0)
      };
    } catch (error) {
      throw error;
    }
  }

  // Método para convertir a objeto público
  toPublicObject() {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      producto_id: this.producto_id,
      fecha_agregado: this.fecha_agregado
    };
  }

  // Construir URL completa de imagen (igual que en Cart y Product)
  static buildImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // Si ya es una URL completa, devolverla tal como está
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Construir URL completa usando la configuración
    const baseUrl =
      getRequestBaseUrl() ||
      config.apiBaseUrl ||
      config.app?.url ||
      'http://181.49.225.69:3001';
    return imagePath.startsWith('/') 
      ? `${baseUrl}${imagePath}`
      : `${baseUrl}/${imagePath}`;
  }
}

module.exports = Favorite;

