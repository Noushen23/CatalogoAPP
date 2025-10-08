const { query, getConnection } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Product {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.precio = parseFloat(data.precio);
    this.precioOferta = data.precio_oferta ? parseFloat(data.precio_oferta) : null;
    this.categoriaId = data.categoria_id;
    this.categoriaNombre = data.categoria_nombre; // Agregar nombre de categoría del JOIN
    this.stock = data.stock;
    this.stockMinimo = data.stock_minimo;
    this.activo = data.activo;
    this.destacado = data.destacado;
    this.peso = data.peso ? parseFloat(data.peso) : null;
    this.dimensiones = data.dimensiones ? JSON.parse(data.dimensiones) : null;
    this.etiquetas = data.etiquetas ? JSON.parse(data.etiquetas) : null;
    this.codigoBarras = data.codigo_barras;
    this.sku = data.sku;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
  }

  // Crear producto
  static async create(productData) {
    const {
      nombre,
      descripcion,
      precio,
      precioOferta,
      categoriaId,
      stock = 0,
      stockMinimo = 5,
      peso,
      dimensiones,
      etiquetas,
      codigoBarras,
      sku,
      imagenes = [] // Soporte para imágenes
    } = productData;

    const id = uuidv4();

    // Usar transacción para asegurar consistencia
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insertar producto
      const sql = `
        INSERT INTO productos (
          id, nombre, descripcion, precio, precio_oferta, categoria_id,
          stock, stock_minimo, peso, dimensiones, etiquetas,
          codigo_barras, sku, activo, destacado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(sql, [
        id,
        nombre,
        descripcion || null,
        precio,
        precioOferta || null,
        categoriaId || null,
        stock,
        stockMinimo,
        peso || null,
        dimensiones ? JSON.stringify(dimensiones) : null,
        etiquetas ? JSON.stringify(etiquetas) : null,
        codigoBarras || null,
        sku || null,
        true,
        false
      ]);

      // Insertar imágenes si se proporcionan
      if (imagenes && imagenes.length > 0) {
        const imageSql = `
          INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (let i = 0; i < imagenes.length; i++) {
          const imagen = imagenes[i];
          await connection.execute(imageSql, [
            uuidv4(),
            id,
            imagen.url || imagen.urlImagen || imagen,
            imagen.orden || i + 1,
            imagen.esPrincipal || imagen.es_principal || i === 0 // Primera imagen como principal por defecto
          ]);
        }
      }

      await connection.commit();
      
      return await this.findById(id);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Buscar producto por ID
  static async findById(id) {
    const sql = 'SELECT * FROM productos WHERE id = ?';
    const products = await query(sql, [id]);
    return products.length > 0 ? new Product(products[0]) : null;
  }

  // Buscar productos con filtros
  static async find(filters = {}) {
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.activo !== undefined) {
      sql += ' AND p.activo = ?';
      params.push(filters.activo);
    }

    if (filters.destacado !== undefined) {
      sql += ' AND p.destacado = ?';
      params.push(filters.destacado);
    }

    if (filters.categoriaId) {
      sql += ' AND p.categoria_id = ?';
      params.push(filters.categoriaId);
    }

    if (filters.busqueda) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${filters.busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.precioMin) {
      sql += ' AND p.precio >= ?';
      params.push(filters.precioMin);
    }

    if (filters.precioMax) {
      sql += ' AND p.precio <= ?';
      params.push(filters.precioMax);
    }

    if (filters.stockMinimo) {
      sql += ' AND p.stock <= p.stock_minimo';
    }

    // Ordenamiento
    const orderBy = filters.orderBy || 'fecha_creacion';
    const orderDir = filters.orderDir || 'DESC';
    sql += ` ORDER BY p.${orderBy} ${orderDir}`;

    // Paginación
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const products = await query(sql, params);
    return products.map(product => new Product(product));
  }

  // Contar productos con filtros
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM productos p WHERE 1=1';
    const params = [];

    if (filters.activo !== undefined) {
      sql += ' AND p.activo = ?';
      params.push(filters.activo);
    }

    if (filters.destacado !== undefined) {
      sql += ' AND p.destacado = ?';
      params.push(filters.destacado);
    }

    if (filters.categoriaId) {
      sql += ' AND p.categoria_id = ?';
      params.push(filters.categoriaId);
    }

    if (filters.busqueda) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${filters.busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const result = await query(sql, params);
    return result[0].total;
  }

  // Actualizar producto
  async update(updateData) {
    const allowedFields = [
      'nombre', 'descripcion', 'precio', 'precio_oferta', 'categoria_id',
      'stock', 'stock_minimo', 'peso', 'dimensiones', 'etiquetas',
      'codigo_barras', 'sku', 'activo', 'destacado'
    ];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'dimensiones' || key === 'etiquetas') {
          updates.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const sql = `UPDATE productos SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`;
    
    await query(sql, values);
    return await Product.findById(this.id);
  }

  // Actualizar stock
  async updateStock(cantidad, operacion = 'suma') {
    const newStock = operacion === 'suma' 
      ? this.stock + cantidad 
      : this.stock - cantidad;

    if (newStock < 0) {
      throw new Error('Stock insuficiente');
    }

    const sql = 'UPDATE productos SET stock = ?, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [newStock, this.id]);
    this.stock = newStock;
  }

  // Obtener imágenes del producto
  async getImages() {
    const sql = `
      SELECT * FROM imagenes_producto 
      WHERE producto_id = ? 
      ORDER BY orden ASC, fecha_creacion ASC
    `;
    return await query(sql, [this.id]);
  }

  // Agregar imagen al producto
  async addImage(imageData) {
    const { urlImagen, orden = 0, esPrincipal = false } = imageData;
    
    const sql = `
      INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await query(sql, [uuidv4(), this.id, urlImagen, orden, esPrincipal]);
  }

  // Eliminar imagen del producto
  async removeImage(imageId) {
    const sql = 'DELETE FROM imagenes_producto WHERE id = ? AND producto_id = ?';
    await query(sql, [imageId, this.id]);
  }

  // Obtener precio final (considerando ofertas)
  getPrecioFinal() {
    return this.precioOferta && this.precioOferta < this.precio 
      ? this.precioOferta 
      : this.precio;
  }

  // Verificar si está en oferta
  isEnOferta() {
    return this.precioOferta && this.precioOferta < this.precio;
  }

  // Verificar si tiene stock bajo
  hasStockBajo() {
    return this.stock <= this.stockMinimo;
  }

  // Obtener estadísticas de reseñas del producto
  async getReviewStats() {
    try {
      const Review = require('./Review');
      return await Review.getAverageRatingAndCount(this.id);
    } catch (error) {
      console.error('Error al obtener estadísticas de reseñas:', error);
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
  }

  // Convertir a objeto público
  async toPublicObject(includeImages = false, includeReviewStats = false) {
    let images = [];
    if (includeImages) {
      const rawImages = await this.getImages();
      // Generar URLs completas para las imágenes
      const baseUrl = process.env.APP_URL || 'http://192.168.3.104:3001';
      images = rawImages.map(img => ({
        ...img,
        urlImagen: img.url_imagen.startsWith('http') 
          ? img.url_imagen 
          : `${baseUrl}${img.url_imagen}`
      }));
    }

    // Obtener estadísticas de reseñas si se solicitan
    let reviewStats = null;
    if (includeReviewStats) {
      reviewStats = await this.getReviewStats();
    }

    const baseObject = {
      id: this.id,
      nombre: this.nombre,
      title: this.nombre, // Compatibilidad con frontend
      descripcion: this.descripcion,
      precio: this.precio,
      precioOferta: this.precioOferta,
      precioFinal: this.getPrecioFinal(),
      enOferta: this.isEnOferta(),
      categoriaId: this.categoriaId,
      categoria_nombre: this.categoriaNombre, // Incluir nombre de categoría
      stock: this.stock,
      stockMinimo: this.stockMinimo,
      stockBajo: this.hasStockBajo(),
      activo: this.activo,
      isActive: this.activo, // Compatibilidad con frontend
      destacado: this.destacado,
      peso: this.peso,
      dimensiones: this.dimensiones,
      etiquetas: this.etiquetas,
      codigoBarras: this.codigoBarras,
      sku: this.sku,
      imagenes: images,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      // Incluir estadísticas de reseñas si se solicitan
      ...(reviewStats && {
        reviewStats,
        rating: reviewStats.promedioCalificacion,
        totalReviews: reviewStats.totalResenas
      })
    };

    return baseObject;
  }
}

module.exports = Product;
