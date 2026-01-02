const { query, getConnection } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

class Cart {
  constructor(data) {
    this.id = data.id;
    this.usuarioId = data.usuario_id;
    this.activo = data.activo;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
    this.items = data.items || [];
    this.total = data.total || 0;
    this.totalItems = data.total_items || 0;
  }

  // Crear o obtener carrito activo del usuario
  static async getOrCreateCart(userId) {
    // Buscar carrito activo existente
    const existingCart = await this.findActiveCartByUser(userId);
    if (existingCart) {
      return existingCart;
    }

    // Crear nuevo carrito si no existe
    const id = uuidv4();
    const sql = `
      INSERT INTO carritos (id, usuario_id, activo)
      VALUES (?, ?, ?)
    `;

    await query(sql, [id, userId, true]);
    return await this.findById(id);
  }

  // Buscar carrito activo por usuario (alias para findByUserId)
  static async findByUserId(userId) {
    return await this.findActiveCartByUser(userId);
  }

  // Buscar carrito activo por usuario
  static async findActiveCartByUser(userId) {
    const sql = `
      SELECT c.*, 
             COUNT(ic.id) as total_items,
             COALESCE(SUM(ic.subtotal), 0) as total
      FROM carritos c
      LEFT JOIN items_carrito ic ON c.id = ic.carrito_id
      WHERE c.usuario_id = ? AND c.activo = true
      GROUP BY c.id
    `;
    
    const carts = await query(sql, [userId]);
    if (carts.length === 0) return null;

    const cart = new Cart(carts[0]);
    cart.items = await this.getCartItems(cart.id);
    return cart;
  }

  // Buscar carrito por ID
  static async findById(id) {
    const sql = `
      SELECT c.*, 
             COUNT(ic.id) as total_items,
             COALESCE(SUM(ic.subtotal), 0) as total
      FROM carritos c
      LEFT JOIN items_carrito ic ON c.id = ic.carrito_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    
    const carts = await query(sql, [id]);
    if (carts.length === 0) return null;

    const cart = new Cart(carts[0]);
    cart.items = await this.getCartItems(cart.id);
    return cart;
  }

  // Obtener items del carrito
  static async getCartItems(cartId) {
    const sql = `
      SELECT ic.*, 
             p.nombre as producto_nombre,
             p.descripcion as producto_descripcion,
             p.precio as precio_original,
             p.precio_oferta,
             p.stock,
             p.activo as producto_activo,
             c.nombre as categoria_nombre,
             COALESCE(
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id AND es_principal = true LIMIT 1),
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id ORDER BY orden ASC LIMIT 1),
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id LIMIT 1)
             ) as imagen_principal
      FROM items_carrito ic
      LEFT JOIN productos p ON ic.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE ic.carrito_id = ?
      ORDER BY ic.fecha_creacion ASC
    `;
    
    const items = await query(sql, [cartId]);
    
    // Debug: Log de items antes de mapear
    console.log('🔍 Items del carrito (raw):', items.map(item => ({
      producto_nombre: item.producto_nombre,
      imagen_principal: item.imagen_principal,
      url_completa: item.imagen_principal ? this.buildImageUrl(item.imagen_principal) : null,
      producto_id: item.producto_id
    })));
    
    // Debug: Verificar si hay imágenes en la base de datos para estos productos
    if (items.length > 0) {
      const productIds = items.map(item => item.producto_id).filter(Boolean);
      if (productIds.length > 0) {
        const imagesCheck = await query(`
          SELECT p.id, p.nombre, img.url_imagen, img.es_principal
          FROM productos p
          LEFT JOIN imagenes_producto img ON p.id = img.producto_id
          WHERE p.id IN (${productIds.map(() => '?').join(',')})
        `, productIds);
        
        console.log('🖼️ Imágenes disponibles para productos del carrito:', imagesCheck);
      }
    }
    
    return items.map(item => ({
      id: item.id,
      productoId: item.producto_id,
      productoNombre: item.producto_nombre,
      productoDescripcion: item.producto_descripcion,
      cantidad: item.cantidad,
      precioUnitario: parseFloat(item.precio_unitario),
      subtotal: parseFloat(item.subtotal),
      precioOriginal: parseFloat(item.precio_original),
      precioOferta: item.precio_oferta ? parseFloat(item.precio_oferta) : null,
      stock: item.stock,
      productoActivo: item.producto_activo,
      categoriaNombre: item.categoria_nombre,
      imagenPrincipal: item.imagen_principal ? this.buildImageUrl(item.imagen_principal) : null,
      fechaCreacion: item.fecha_creacion,
      fechaActualizacion: item.fecha_actualizacion
    }));
  }

  // Construir URL completa de imagen (igual que en Product)
  static buildImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // Si ya es una URL completa, devolverla tal como está
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Construir URL completa usando la configuración (igual que Product.toPublicObject)
    const baseUrl = config.apiBaseUrl;
    return imagePath.startsWith('/') 
      ? `${baseUrl}${imagePath}`
      : `${baseUrl}/${imagePath}`;
  }

  // Agregar producto al carrito
  async addItem(productId, quantity = 1) {
    // Verificar que el producto existe y está activo
    const productSql = 'SELECT * FROM productos WHERE id = ? AND activo = true';
    const products = await query(productSql, [productId]);
    
    if (products.length === 0) {
      throw new Error('Producto no encontrado o no disponible');
    }

    const product = products[0];
    
    // Verificar stock disponible
    if (product.stock < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
    }

    // Calcular precio final (considerando ofertas)
    const precioFinal = product.precio_oferta && product.precio_oferta < product.precio 
      ? product.precio_oferta 
      : product.precio;

    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar si el producto ya está en el carrito
      const existingItemSql = 'SELECT * FROM items_carrito WHERE carrito_id = ? AND producto_id = ?';
      const existingItems = await connection.execute(existingItemSql, [this.id, productId]);

      if (existingItems[0].length > 0) {
        // Actualizar cantidad existente
        const existingItem = existingItems[0][0];
        const newQuantity = existingItem.cantidad + quantity;
        
        if (product.stock < newQuantity) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock}, solicitado: ${newQuantity}`);
        }

        const updateSql = `
          UPDATE items_carrito 
          SET cantidad = ?, precio_unitario = ?, fecha_actualizacion = NOW()
          WHERE id = ?
        `;
        await connection.execute(updateSql, [newQuantity, precioFinal, existingItem.id]);
      } else {
        // Agregar nuevo item
        const insertSql = `
          INSERT INTO items_carrito (id, carrito_id, producto_id, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?, ?)
        `;
        await connection.execute(insertSql, [uuidv4(), this.id, productId, quantity, precioFinal]);
      }

      // Actualizar fecha de modificación del carrito
      const updateCartSql = 'UPDATE carritos SET fecha_actualizacion = NOW() WHERE id = ?';
      await connection.execute(updateCartSql, [this.id]);

      await connection.commit();
      
      // Refrescar datos del carrito
      const updatedCart = await Cart.findById(this.id);
      Object.assign(this, updatedCart);
      
      return this;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Actualizar cantidad de un item
  async updateItemQuantity(itemId, quantity) {
    if (quantity <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Obtener item actual
      const itemSql = `
        SELECT ic.*, p.stock, p.activo as producto_activo, p.precio, p.precio_oferta
        FROM items_carrito ic
        LEFT JOIN productos p ON ic.producto_id = p.id
        WHERE ic.id = ? AND ic.carrito_id = ?
      `;
      const items = await connection.execute(itemSql, [itemId, this.id]);
      
      if (items[0].length === 0) {
        throw new Error('Item no encontrado en el carrito');
      }

      const item = items[0][0];
      
      if (!item.producto_activo) {
        throw new Error('El producto ya no está disponible');
      }

      if (item.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${item.stock}`);
      }

      // Calcular precio final actualizado
      const precioFinal = item.precio_oferta && item.precio_oferta < item.precio 
        ? item.precio_oferta 
        : item.precio;

      // Actualizar item
      const updateSql = `
        UPDATE items_carrito 
        SET cantidad = ?, precio_unitario = ?, fecha_actualizacion = NOW()
        WHERE id = ?
      `;
      await connection.execute(updateSql, [quantity, precioFinal, itemId]);

      // Actualizar fecha de modificación del carrito
      const updateCartSql = 'UPDATE carritos SET fecha_actualizacion = NOW() WHERE id = ?';
      await connection.execute(updateCartSql, [this.id]);

      await connection.commit();
      
      // Refrescar datos del carrito
      const updatedCart = await Cart.findById(this.id);
      Object.assign(this, updatedCart);
      
      return this;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Eliminar item del carrito
  async removeItem(itemId) {
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar que el item pertenece al carrito
      const itemSql = 'SELECT * FROM items_carrito WHERE id = ? AND carrito_id = ?';
      const items = await connection.execute(itemSql, [itemId, this.id]);
      
      if (items[0].length === 0) {
        throw new Error('Item no encontrado en el carrito');
      }

      // Eliminar item
      const deleteSql = 'DELETE FROM items_carrito WHERE id = ?';
      await connection.execute(deleteSql, [itemId]);

      // Actualizar fecha de modificación del carrito
      const updateCartSql = 'UPDATE carritos SET fecha_actualizacion = NOW() WHERE id = ?';
      await connection.execute(updateCartSql, [this.id]);

      await connection.commit();
      
      // Refrescar datos del carrito
      const updatedCart = await Cart.findById(this.id);
      Object.assign(this, updatedCart);
      
      return this;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Limpiar carrito (eliminar todos los items)
  async clearCart() {
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Eliminar todos los items
      const deleteSql = 'DELETE FROM items_carrito WHERE carrito_id = ?';
      await connection.execute(deleteSql, [this.id]);

      // Actualizar fecha de modificación del carrito
      const updateCartSql = 'UPDATE carritos SET fecha_actualizacion = NOW() WHERE id = ?';
      await connection.execute(updateCartSql, [this.id]);

      await connection.commit();
      
      // Refrescar datos del carrito
      const updatedCart = await Cart.findById(this.id);
      Object.assign(this, updatedCart);
      
      return this;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Desactivar carrito (cuando se completa la orden)
  async deactivate() {
    const sql = 'UPDATE carritos SET activo = false, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [this.id]);
    this.activo = false;
  }

  // Validar carrito antes de checkout
  async validateForCheckout() {
    const errors = [];
    
    if (this.items.length === 0) {
      errors.push('El carrito está vacío');
      return { isValid: false, errors };
    }

    // Verificar stock y disponibilidad de cada item en tiempo real
    for (const item of this.items) {
      try {
        // Consultar el producto actual en la base de datos
        const productSql = `
          SELECT id, nombre, stock, activo, precio, precio_oferta
          FROM productos 
          WHERE id = ?
        `;
        
        const products = await query(productSql, [item.productoId]);
        
        if (products.length === 0) {
          errors.push(`El producto "${item.productoNombre}" ya no existe`);
          continue;
        }

        const product = products[0];
        
        // Verificar que el producto esté activo
        if (!product.activo) {
          errors.push(`El producto "${product.nombre}" ya no está disponible`);
          continue;
        }
        
        // Verificar stock suficiente
        if (product.stock < item.cantidad) {
          errors.push(`Stock insuficiente para "${product.nombre}". Disponible: ${product.stock}, solicitado: ${item.cantidad}`);
          continue;
        }

        // Verificar que el precio unitario coincida (tolerancia de 0.01)
        const precioFinal = product.precio_oferta && product.precio_oferta < product.precio 
          ? product.precio_oferta 
          : product.precio;
        
        if (Math.abs(precioFinal - item.precioUnitario) > 0.01) {
          errors.push(`El precio del producto "${product.nombre}" ha cambiado. Precio actual: $${precioFinal}, precio en carrito: $${item.precioUnitario}`);
        }

        // Verificar que el subtotal sea correcto
        const subtotalEsperado = precioFinal * item.cantidad;
        if (Math.abs(subtotalEsperado - item.subtotal) > 0.01) {
          errors.push(`El subtotal del producto "${product.nombre}" es incorrecto. Actualiza tu carrito.`);
        }

      } catch (error) {
        console.error(`Error validando producto ${item.productoId}:`, error);
        errors.push(`Error al validar el producto "${item.productoNombre}"`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      total: this.total,
      totalItems: this.totalItems
    };
  }

  // Convertir a objeto público
  toPublicObject() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      activo: this.activo,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      items: this.items,
      total: this.total,
      totalItems: this.totalItems
    };
  }
}

module.exports = Cart;

