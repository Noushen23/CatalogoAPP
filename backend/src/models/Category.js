const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Category {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.imagenUrl = data.imagen_url;
    this.activa = data.activa;
    this.orden = data.orden;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
  }

  // Crear categoría
  static async create(categoryData) {
    const {
      nombre,
      descripcion,
      imagenUrl,
      orden = 0
    } = categoryData;

    const id = uuidv4();

    const sql = `
      INSERT INTO categorias (id, nombre, descripcion, imagen_url, activa, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      nombre,
      descripcion || null,
      imagenUrl || null,
      true,
      orden
    ]);

    return await this.findById(id);
  }

  // Buscar categoría por ID
  static async findById(id) {
    const sql = 'SELECT * FROM categorias WHERE id = ?';
    const categories = await query(sql, [id]);
    return categories.length > 0 ? new Category(categories[0]) : null;
  }

  // Buscar todas las categorías
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM categorias WHERE 1=1';
    const params = [];

    if (filters.activa !== undefined) {
      sql += ' AND activa = ?';
      params.push(filters.activa);
    }

    sql += ' ORDER BY orden ASC, nombre ASC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const categories = await query(sql, params);
    return categories.map(category => new Category(category));
  }

  // Contar categorías
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM categorias WHERE 1=1';
    const params = [];

    if (filters.activa !== undefined) {
      sql += ' AND activa = ?';
      params.push(filters.activa);
    }

    const result = await query(sql, params);
    return result[0].total;
  }

  // Actualizar categoría
  async update(updateData) {
    const allowedFields = ['nombre', 'descripcion', 'imagen_url', 'activa', 'orden'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const sql = `UPDATE categorias SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`;
    
    await query(sql, values);
    return await Category.findById(this.id);
  }

  // Obtener productos de la categoría
  async getProducts(filters = {}) {
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.categoria_id = ?
    `;
    const params = [this.id];

    if (filters.activo !== undefined) {
      sql += ' AND p.activo = ?';
      params.push(filters.activo);
    }

    if (filters.destacado !== undefined) {
      sql += ' AND p.destacado = ?';
      params.push(filters.destacado);
    }

    sql += ' ORDER BY p.fecha_creacion DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const products = await query(sql, params);
    return products;
  }

  // Contar productos en la categoría
  async getProductCount(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM productos WHERE categoria_id = ?';
    const params = [this.id];

    if (filters.activo !== undefined) {
      sql += ' AND activo = ?';
      params.push(filters.activo);
    }

    const result = await query(sql, params);
    return result[0].total;
  }

  // Desactivar categoría
  async deactivate() {
    const sql = 'UPDATE categorias SET activa = false, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [this.id]);
    this.activa = false;
  }

  // Activar categoría
  async activate() {
    const sql = 'UPDATE categorias SET activa = true, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [this.id]);
    this.activa = true;
  }

  // Reordenar categorías
  static async reorder(categoryOrders) {
    const sql = 'UPDATE categorias SET orden = ?, fecha_actualizacion = NOW() WHERE id = ?';
    
    for (const { id, orden } of categoryOrders) {
      await query(sql, [orden, id]);
    }
  }

  // Convertir a objeto público
  toPublicObject() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      imagenUrl: this.imagenUrl,
      activa: this.activa,
      orden: this.orden,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion
    };
  }
}

module.exports = Category;
