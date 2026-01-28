const { getConnection, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

class Order {

  constructor(data) {
    Object.assign(this, {
      id: data.id,
      numeroOrden: data.numero_orden,
      usuarioId: data.usuario_id,
      direccionEnvioId: data.direccion_envio_id,
      estado: data.estado,
      subtotal: Number(data.subtotal || 0),
      descuento: Number(data.descuento || 0),
      costoEnvio: Number(data.costo_envio || 0),
      impuestos: Number(data.impuestos || 0),
      total: Number(data.total || 0),
      metodoPago: data.metodo_pago,
      referenciaPago: data.referencia_pago,
      notas: data.notas,
      fechaCreacion: data.fecha_creacion,
      fechaActualizacion: data.fecha_actualizacion,
      fechaEntregaEstimada: data.fecha_entrega_estimada,
      fechaEntregaReal: data.fecha_entrega_real,
      usuario: data.usuario || null,
      direccionEnvio: data.direccion_envio || null,
      items: data.items || [],
      itemsCount: data.items_count ?? data.itemsCount ?? null,
      tercero_id: data.tercero_id || null,
      tns_kardex_id: data.tns_kardex_id || null,
      montado_carro: data.montado_carro || 0,
      entrega: data.entrega || null
    });
  }

  /* =====================================================
   * BUSCAR PEDIDOS POR USUARIO
   * ===================================================== */
  static async findByUserId(usuarioId, options = {}) {
    const {
      estado = null,
      limit = 20,
      offset = 0
    } = options;

    const limitValue = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offsetValue = Math.max(0, parseInt(offset) || 0);

    let sql = `
      SELECT o.*, COUNT(io.id) as items_count
      FROM ordenes o
      LEFT JOIN items_orden io ON io.orden_id = o.id
      WHERE o.usuario_id = ?
    `;
    const params = [usuarioId];

    if (estado) {
      sql += ' AND o.estado = ?';
      params.push(estado);
    }

    sql += `
      GROUP BY o.id
      ORDER BY o.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limitValue, offsetValue);

    const orders = await query(sql, params);
    return orders.map(order => new Order(order));
  }

  /* =====================================================
   * BUSCAR PEDIDO POR ID
   * ===================================================== */
  static async findById(orderId) {
    const sql = `
      SELECT o.*,
             u.email as usuario_email, u.nombre_completo as usuario_nombre,
             u.tipo_identificacion as usuario_tipo_identificacion,
             u.numero_identificacion as usuario_numero_identificacion,
             de.id as direccion_id, de.nombre_destinatario, de.telefono, de.direccion, de.ciudad, 
             de.departamento, de.codigo_postal, de.pais, de.instrucciones,
             (SELECT e.id FROM entregas e WHERE e.orden_id = o.id ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_id,
             (SELECT e.repartidor_id FROM entregas e WHERE e.orden_id = o.id ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_repartidor_id,
             (SELECT e.estado FROM entregas e WHERE e.orden_id = o.id ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_estado
      FROM ordenes o
      LEFT JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
      WHERE o.id = ?
      LIMIT 1
    `;

    const rows = await query(sql, [orderId]);
    if (!rows.length) return null;

    const orderData = rows[0];
    const items = await Order.getOrderItems(orderId);

    const order = new Order({
      ...orderData,
      usuario: {
        email: orderData.usuario_email,
        nombreCompleto: orderData.usuario_nombre,
        tipoIdentificacion: orderData.usuario_tipo_identificacion,
        numeroIdentificacion: orderData.usuario_numero_identificacion
      },
      direccionEnvio: orderData.direccion_id ? {
        id: orderData.direccion_id,
        nombreDestinatario: orderData.nombre_destinatario,
        telefono: orderData.telefono,
        direccion: orderData.direccion,
        ciudad: orderData.ciudad,
        departamento: orderData.departamento,
        codigoPostal: orderData.codigo_postal,
        pais: orderData.pais,
        instrucciones: orderData.instrucciones || null
      } : null,
      items,
      entrega: orderData.entrega_id ? {
        id: orderData.entrega_id,
        repartidorId: orderData.entrega_repartidor_id,
        estado: orderData.entrega_estado
      } : null
    });

    return order;
  }

  /* =====================================================
   * BUSCAR PEDIDO POR REFERENCIA DE PAGO
   * ===================================================== */
  static async findByReference(referenciaPago, usuarioId) {
    const sql = `
      SELECT id
      FROM ordenes
      WHERE referencia_pago = ? AND usuario_id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [referenciaPago, usuarioId]);
    if (!rows.length) return null;
    return await Order.findById(rows[0].id);
  }

  /* =====================================================
   * OBTENER ITEMS DE LA ORDEN
   * ===================================================== */
  static async getOrderItems(orderId) {
    const sql = `
      SELECT io.*,
             p.nombre as producto_nombre,
             p.descripcion as producto_descripcion,
             COALESCE(
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id AND es_principal = true LIMIT 1),
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id ORDER BY orden ASC LIMIT 1),
               (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id LIMIT 1)
             ) as imagen_principal
      FROM items_orden io
      LEFT JOIN productos p ON io.producto_id = p.id
      WHERE io.orden_id = ?
      ORDER BY io.fecha_creacion ASC
    `;

    const items = await query(sql, [orderId]);
    return items.map(item => ({
      id: item.id,
      productId: item.producto_id,
      nombreProducto: item.producto_nombre,
      productName: item.producto_nombre,
      productDescription: item.producto_descripcion,
      cantidad: item.cantidad,
      quantity: item.cantidad,
      precioUnitario: parseFloat(item.precio_unitario),
      unitPrice: parseFloat(item.precio_unitario),
      subtotal: parseFloat(item.subtotal),
      imageUrl: item.imagen_principal ? Order.buildImageUrl(item.imagen_principal) : null
    }));
  }

  /* =====================================================
   * CONSTRUIR URL COMPLETA DE IMAGEN
   * ===================================================== */
  static buildImageUrl(imagePath) {
    if (!imagePath) return null;

    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    const baseUrl = config.apiBaseUrl;
    return imagePath.startsWith('/')
      ? `${baseUrl}${imagePath}`
      : `${baseUrl}/${imagePath}`;
  }

  /* =====================================================
   * TRANSFORMACIONES PARA API
   * ===================================================== */
  toPublicObjectSimple() {
    const itemsCount = this.itemsCount ?? (this.items ? this.items.length : 0);

    return {
      id: this.id,
      numeroOrden: this.numeroOrden,
      estado: this.estado,
      total: this.total,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      itemsCount: itemsCount,
      metodoPago: this.metodoPago
    };
  }

  toPublicObject() {
    return {
      id: this.id,
      numeroOrden: this.numeroOrden,
      usuarioId: this.usuarioId,
      direccionEnvioId: this.direccionEnvioId,
      estado: this.estado,
      subtotal: this.subtotal,
      descuento: this.descuento,
      costoEnvio: this.costoEnvio,
      impuestos: this.impuestos,
      total: this.total,
      metodoPago: this.metodoPago,
      referenciaPago: this.referenciaPago,
      notas: this.notas,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      fechaEntregaEstimada: this.fechaEntregaEstimada,
      fechaEntregaReal: this.fechaEntregaReal,
      usuario: this.usuario || undefined,
      direccionEnvio: this.direccionEnvio || undefined,
      items: this.items || [],
      entrega: this.entrega || undefined
    };
  }

  /* =====================================================
   * CREAR ORDEN DESDE CARRITO (TRANSACCIONAL REAL)
   * ===================================================== */
  static async createFromCart(cartData, externalConnection = null) {
    const connection = externalConnection || await getConnection();

    try {
      if (!externalConnection) await connection.beginTransaction();

      const {
        usuarioId,
        cartId,
        direccionEnvioId,
        metodoPago,
        referenciaPago,
        notas,
        items
      } = cartData;

      if (!items?.length) throw new Error('Carrito vacío');

      /* 🔒 Lock productos */
      for (const item of items) {
        const [[product]] = await connection.execute(
          `SELECT id, stock, precio, precio_oferta 
           FROM productos 
           WHERE id = ? AND activo = true 
           FOR UPDATE`,
          [item.productId]
        );

        if (!product) throw new Error('Producto no disponible');
        if (product.stock < item.cantidad) throw new Error('Stock insuficiente');

        const precioFinal = product.precio_oferta && product.precio_oferta < product.precio
          ? product.precio_oferta
          : product.precio;

        if (Math.abs(precioFinal - item.precioUnitario) > 0.01) {
          throw new Error('Precio del producto cambió');
        }
      }

      /* 🔢 Número de orden seguro */
      const numeroOrden = await Order.generateOrderNumber(connection);

      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
      const costoEnvio = Order.calcularCostoEnvio(subtotal);
      const total = subtotal + costoEnvio;

      const orderId = uuidv4();

      await connection.execute(
        `INSERT INTO ordenes (
          id, numero_orden, usuario_id, direccion_envio_id, estado,
          subtotal, descuento, costo_envio, impuestos, total,
          metodo_pago, referencia_pago, notas,
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, 'pendiente', ?, 0, ?, 0, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId, numeroOrden, usuarioId, direccionEnvioId || null,
          subtotal, costoEnvio, total,
          metodoPago, referenciaPago, notas
        ]
      );

      for (const item of items) {
        await connection.execute(
          `INSERT INTO items_orden 
           (id, orden_id, producto_id, cantidad, precio_unitario, subtotal, fecha_creacion)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [uuidv4(), orderId, item.productId, item.cantidad, item.precioUnitario, item.subtotal]
        );

        await connection.execute(
          `UPDATE productos SET stock = stock - ? WHERE id = ?`,
          [item.cantidad, item.productId]
        );
      }

      await connection.execute(`DELETE FROM items_carrito WHERE carrito_id = ?`, [cartId]);
      await connection.execute(`UPDATE carritos SET activo = false WHERE id = ?`, [cartId]);

      if (!externalConnection) await connection.commit();
      return await Order.findById(orderId);

    } catch (err) {
      if (!externalConnection) await connection.rollback();
      throw err;
    } finally {
      if (!externalConnection) connection.release();
    }
  }

  /* =====================================================
   * GENERAR NÚMERO DE ORDEN (SIN DUPLICADOS)
   * ===================================================== */
  static async generateOrderNumber(connection) {
    const [[row]] = await connection.execute(
      `SELECT COUNT(*) AS count FROM ordenes WHERE DATE(fecha_creacion) = CURDATE() FOR UPDATE`
    );

    const today = new Date();
    const date = today.toISOString().slice(0, 10).replace(/-/g, '');
    return `ORD-${date}-${String(row.count + 1).padStart(4, '0')}`;
  }

  /* =====================================================
   * COSTO DE ENVÍO
   * ===================================================== */
  static calcularCostoEnvio(subtotal) {
    if (subtotal >= 300000) return 0;
    return 12000;
  }

  /* =====================================================
   * CANCELAR ORDEN (TRANSACCIONAL)
   * ===================================================== */
  async cancel(reason = null) {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      if (this.estado !== 'pendiente') {
        throw new Error('No se puede cancelar este pedido');
      }

      const items = await Order.getOrderItems(this.id);

      for (const item of items) {
        await connection.execute(
          `UPDATE productos SET stock = stock + ? WHERE id = ?`,
          [item.cantidad, item.productId]
        );
      }

      await connection.execute(
        `UPDATE ordenes SET estado = 'cancelada', notas = ?, fecha_actualizacion = NOW() WHERE id = ?`,
        [reason, this.id]
      );

      await connection.commit();
      this.estado = 'cancelada';
      return this;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

}

module.exports = Order;
