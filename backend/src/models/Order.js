const { query, getConnection } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  constructor(data) {
    this.id = data.id;
    this.numeroOrden = data.numero_orden;
    this.usuarioId = data.usuario_id;
    this.direccionEnvioId = data.direccion_envio_id;
    this.estado = data.estado;
    this.subtotal = parseFloat(data.subtotal || 0);
    this.descuento = parseFloat(data.descuento || 0);
    this.costoEnvio = parseFloat(data.costo_envio || 0);
    this.impuestos = parseFloat(data.impuestos || 0);
    this.total = parseFloat(data.total || 0);
    this.metodoPago = data.metodo_pago;
    this.referenciaPago = data.referencia_pago;
    this.notas = data.notas;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
    this.fechaEntregaEstimada = data.fecha_entrega_estimada;
    this.fechaEntregaReal = data.fecha_entrega_real;
    
    // Datos relacionados
    this.usuario = data.usuario || null;
    this.direccionEnvio = data.direccion_envio || null;
    this.items = data.items || [];
    
    // Campos para verificar condiciones de en_proceso
    this.tercero_id = data.tercero_id || null;
    this.tns_kardex_id = data.tns_kardex_id || null;
    this.montado_carro = data.montado_carro || 0;
    this.entrega = data.entrega || null;
  }

  // Calcular costo de envío por zonas
  static calcularCostoEnvio(subtotal, ciudad) {
    // Envío gratis si el subtotal es >= $300.000
    if (subtotal >= 300000) {
      return 0;
    }

    // Normalizar nombre de ciudad para comparación (sin acentos, mayúsculas)
    const ciudadNormalizada = ciudad ? ciudad.toLowerCase().trim() : '';
    
    // Definición de zonas y costos
    const ZONA_URBANA = {
      ciudades: ['cúcuta', 'cucuta'],
      costo: 5000
    };
    
    const MUNICIPIOS_CERCANOS = {
      ciudades: ['el zulia', 'san cayetano', 'villa del rosario', 'villa del rosario de cúcuta'],
      costo: 8000
    };
    
    // Determinar zona
    if (ZONA_URBANA.ciudades.includes(ciudadNormalizada)) {
      return ZONA_URBANA.costo;
    }
    
    if (MUNICIPIOS_CERCANOS.ciudades.includes(ciudadNormalizada)) {
      return MUNICIPIOS_CERCANOS.costo;
    }
    
    // Resto (cualquier otra ciudad)
    return 12000;
  }

  // Crear pedido desde carrito
  static async createFromCart(cartData) {
    console.log('🚀 Iniciando createFromCart con datos:', {
      usuarioId: cartData.usuarioId,
      direccionEnvioId: cartData.direccionEnvioId,
      metodoPago: cartData.metodoPago,
      itemsCount: cartData.items?.length || 0
    });

    const {
      usuarioId,
      direccionEnvioId,
      metodoPago = 'efectivo',
      referenciaPago = null,
      notas = null,
      items = []
    } = cartData;

    const connection = await getConnection();
    console.log('✅ Conexión a base de datos obtenida');
    
    try {
      await connection.beginTransaction();

      // 1. VALIDAR CARRITO Y PRODUCTOS
      if (!items || items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      console.log('🔍 Validando productos del carrito...');
      // Validar cada producto en el carrito
      for (const item of items) {
        console.log('🔍 Validando producto:', item.productId);
        const productSql = `
          SELECT id, nombre, stock, activo, precio, precio_oferta
          FROM productos 
          WHERE id = ? AND activo = true
        `;
        
        const [products] = await connection.execute(productSql, [item.productId]);
        
        if (products.length === 0) {
          throw new Error(`Producto "${item.productoNombre || item.productId}" no encontrado o no disponible`);
        }

        const product = products[0];
        
        // Verificar stock suficiente
        if (product.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${product.nombre}". Disponible: ${product.stock}, solicitado: ${item.cantidad}`);
        }

        // Verificar que el precio unitario coincida
        const precioFinal = product.precio_oferta && product.precio_oferta < product.precio 
          ? product.precio_oferta 
          : product.precio;
        
        if (Math.abs(precioFinal - item.precioUnitario) > 0.01) {
          throw new Error(`El precio del producto "${product.nombre}" ha cambiado. Actualiza tu carrito.`);
        }
      }

      // 2. OBTENER DIRECCIÓN DE ENVÍO PARA CALCULAR COSTO POR ZONA
      let ciudadEnvio = null;
      if (direccionEnvioId) {
        const direccionesSql = `
          SELECT ciudad 
          FROM direcciones_envio 
          WHERE id = ? AND usuario_id = ? AND activa = true
        `;
        const [direcciones] = await connection.execute(direccionesSql, [direccionEnvioId, usuarioId]);
        
        if (direcciones.length > 0) {
          ciudadEnvio = direcciones[0].ciudad;
          console.log('📍 Ciudad de envío detectada:', ciudadEnvio);
        } else {
          console.warn('⚠️ Dirección de envío no encontrada o inactiva');
        }
      }

      // 3. GENERAR NÚMERO DE ORDEN ÚNICO
      const numeroOrden = await this.generateOrderNumber();
      
      // 4. CALCULAR TOTALES
      const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      // Calcular costo de envío por zona
      const costoEnvio = Order.calcularCostoEnvio(subtotal, ciudadEnvio);
      
      const impuestos = 0;
      const descuento = 0;
      const total = subtotal - descuento + costoEnvio + impuestos;
      

      const id = uuidv4();

      // 4. CREAR LA ORDEN
      const orderSql = `
        INSERT INTO ordenes (
          id, numero_orden, usuario_id, direccion_envio_id, estado,
          subtotal, descuento, costo_envio, impuestos, total,
          metodo_pago, referencia_pago, notas, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await connection.execute(orderSql, [
        id,
        numeroOrden,
        usuarioId,
        direccionEnvioId || null,
        'pendiente',
        subtotal,
        descuento,
        costoEnvio,
        impuestos,
        total,
        metodoPago,
        referenciaPago,
        notas
      ]);

      // 5. CREAR ITEMS DE LA ORDEN Y ACTUALIZAR STOCK
      for (const item of items) {
        const itemId = uuidv4();
        
        // Crear item de la orden
        const itemSql = `
          INSERT INTO items_orden (
            id, orden_id, producto_id, cantidad, precio_unitario, subtotal,
            fecha_creacion
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(itemSql, [
          itemId,
          id,
          item.productId,
          item.cantidad,
          item.precioUnitario,
          item.subtotal
        ]);

        // ACTUALIZAR STOCK DEL PRODUCTO
        const updateStockSql = `
          UPDATE productos 
          SET stock = stock - ?, fecha_actualizacion = NOW()
          WHERE id = ?
        `;
        
        await connection.execute(updateStockSql, [item.cantidad, item.productId]);
      }

      // 6. DESACTIVAR/LIMPIAR CARRITO
      const clearCartSql = 'DELETE FROM items_carrito WHERE carrito_id = ?';
      await connection.execute(clearCartSql, [cartData.cartId]);

      const deactivateCartSql = 'UPDATE carritos SET activo = false, fecha_actualizacion = NOW() WHERE id = ?';
      await connection.execute(deactivateCartSql, [cartData.cartId]);

      await connection.commit();
      console.log('✅ Transacción completada exitosamente');
      
      // Retornar la orden completa
      console.log('🔍 Buscando orden creada con ID:', id);
      const createdOrder = await this.findById(id);
      
      if (!createdOrder) {
        throw new Error('Error: No se pudo encontrar la orden recién creada');
      }
      
      console.log('✅ Orden encontrada y retornada');
      return createdOrder;
      
    } catch (error) {
      console.error('Error en createFromCart:', error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Generar número de orden único
  static async generateOrderNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Contar órdenes del día
    const countSql = `
      SELECT COUNT(*) as count 
      FROM ordenes 
      WHERE DATE(fecha_creacion) = CURDATE()
    `;
    
    const result = await query(countSql);
    const count = result[0].count + 1;
    
    return `ORD-${year}${month}${day}-${String(count).padStart(3, '0')}`;
  }

  // Buscar pedido por ID
  static async findById(id) {
    const sql = `
      SELECT 
        o.*, 
        u.email AS usuario_email, 
        u.nombre_completo AS usuario_nombre,
        u.tipo_identificacion AS usuario_tipo_identificacion,
        u.numero_identificacion AS usuario_numero_identificacion,
        de.id AS direccion_id, 
        de.nombre_destinatario, 
        de.telefono, 
        de.direccion, 
        de.ciudad, 
        de.departamento,
        de.codigo_postal, 
        de.pais,
        (SELECT e.id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_id,
        (SELECT e.repartidor_id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_repartidor_id,
        (SELECT e.estado FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_estado
      FROM ordenes o
      LEFT JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
      WHERE o.id = ?
    `;
    
    const orders = await query(sql, [id]);
    
    if (orders.length === 0) return null;
    
    const orderData = orders[0];
    const items = await this.getOrderItems(id);
  
    const direccionEnvio = orderData.direccion_id ? {
      id: orderData.direccion_id,
      nombreDestinatario: orderData.nombre_destinatario,
      telefono: orderData.telefono,
      direccion: orderData.direccion,
      ciudad: orderData.ciudad,
      departamento: orderData.departamento,
      codigoPostal: orderData.codigo_postal,
      pais: orderData.pais
    } : null;

    return new Order({
      ...orderData,
      usuario: {
        email: orderData.usuario_email,
        nombreCompleto: orderData.usuario_nombre,
        tipoIdentificacion: orderData.usuario_tipo_identificacion,
        numeroIdentificacion: orderData.usuario_numero_identificacion
      },
      direccion_envio: direccionEnvio,
      items,
      // Incluir información de entrega si existe
      entrega: orderData.entrega_id ? {
        id: orderData.entrega_id,
        repartidor_id: orderData.entrega_repartidor_id,
        estado: orderData.entrega_estado
      } : null
    });
  }
  

  // Buscar pedidos por usuario
  static async findByUserId(userId, options = {}) {
    const { limit = 20, offset = 0, estado = null } = options;
    
    let sql = `
      SELECT o.*, 
             u.email as usuario_email, u.nombre_completo as usuario_nombre,
             de.id as direccion_id, de.nombre_destinatario, de.telefono, de.direccion, de.ciudad, de.departamento, de.codigo_postal, de.pais
      FROM ordenes o
      LEFT JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
      WHERE o.usuario_id = ?
    `;
    
    const params = [userId];
    
    if (estado) {
      sql += ' AND o.estado = ?';
      params.push(estado);
    }
    
    sql += ' ORDER BY o.fecha_creacion DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const orders = await query(sql, params);
    
    const ordersWithItems = await Promise.all(orders.map(async (orderData) => {
      const items = await this.getOrderItems(orderData.id);
      return new Order({
        ...orderData,
        usuario: {
          email: orderData.usuario_email,
          nombreCompleto: orderData.usuario_nombre
        },
        direccionEnvio: orderData.direccion_id ? {
          id: orderData.direccion_id,
          nombreDestinatario: orderData.nombre_destinatario,
          telefono: orderData.telefono,
          direccion: orderData.direccion,
          ciudad: orderData.ciudad,
          departamento: orderData.departamento,
          codigoPostal: orderData.codigo_postal,
          pais: orderData.pais
        } : null,
        items
      });
    }));
    
    return ordersWithItems;
  }

  // Obtener items de una orden
  static async getOrderItems(orderId) {
    const sql = `
      SELECT io.*, 
             p.nombre as producto_nombre,
             p.descripcion as producto_descripcion,
             p.sku as producto_sku,
             (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id ORDER BY orden ASC LIMIT 1) as imagen_url
      FROM items_orden io
      JOIN productos p ON io.producto_id = p.id
      WHERE io.orden_id = ?
      ORDER BY io.fecha_creacion ASC
    `;
    
    const items = await query(sql, [orderId]);
    return items.map(item => ({
      id: item.id,
      productId: item.producto_id,
      productName: item.producto_nombre,
      productDescription: item.producto_descripcion,
      productSku: item.producto_sku,
      cantidad: item.cantidad, // Cambiar quantity por cantidad para consistencia
      precioUnitario: parseFloat(item.precio_unitario), // Cambiar unitPrice por precioUnitario
      subtotal: parseFloat(item.subtotal),
      imageUrl: item.imagen_url
    }));
  }

  // Actualizar estado del pedido
  async updateStatus(newStatus) {
    const validStatuses = ['pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Estado de pedido inválido');
    }

    const sql = `
      UPDATE ordenes 
      SET estado = ?, fecha_actualizacion = NOW()
      WHERE id = ?
    `;
    
    await query(sql, [newStatus, this.id]);
    this.estado = newStatus;
    this.fechaActualizacion = new Date();
    
    return this;
  }

  // Cancelar pedido
  async cancel(reason = null, restaurarStock = true) {
    // Verificar si el pedido ya está cancelado
    if (this.estado === 'cancelada') {
      throw new Error('El pedido ya está cancelado');
    }
    
    // Verificar si el pedido ya fue entregado
    if (this.estado === 'entregada') {
      throw new Error('No se puede cancelar un pedido ya entregado');
    }
    
    // Verificar si el pedido tiene referencia de pago (está pagado)
    // PERMITIR cancelar si el pago fue rechazado (no tiene referencia válida o el pago falló)
    if (this.referenciaPago && this.estado === 'confirmada') {
      throw new Error('No se puede cancelar un pedido que ya ha sido pagado y confirmado. Contacta al administrador para más información.');
    }
    
    // Solo se puede cancelar si el pedido está en estado 'pendiente' o si el pago falló
    if (this.estado !== 'pendiente' && this.estado !== 'confirmada') {
      // Para cualquier otro estado (en_proceso, enviada, etc.)
      throw new Error('Solo se pueden cancelar pedidos que están en estado pendiente o confirmada (si el pago falló)');
    }

    // Obtener items del pedido para restaurar stock
    const items = await Order.getOrderItems(this.id);
    
    // Restaurar stock de los productos si se solicita
    if (restaurarStock && items && items.length > 0) {
      for (const item of items) {
        const restoreStockSql = `
          UPDATE productos 
          SET stock = stock + ?, fecha_actualizacion = NOW()
          WHERE id = ?
        `;
        await query(restoreStockSql, [item.cantidad, item.productId]);
        console.log(`✅ [Order] Stock restaurado para producto ${item.productId}: +${item.cantidad}`);
      }
      console.log(`✅ [Order] Stock restaurado para ${items.length} producto(s) del pedido ${this.id}`);
    }

    const sql = `
      UPDATE ordenes 
      SET estado = 'cancelada', notas = ?, fecha_actualizacion = NOW()
      WHERE id = ?
    `;
    
    const newNotes = reason ? 
      (this.notas ? `${this.notas}\n\nCancelado: ${reason}` : `Cancelado: ${reason}`) : 
      this.notas;
    
    await query(sql, [newNotes, this.id]);
    this.estado = 'cancelada';
    this.notas = newNotes;
    this.fechaActualizacion = new Date();
    
    console.log(`✅ [Order] Pedido ${this.id} cancelado${restaurarStock ? ' y stock restaurado' : ''}`);
    
    return this;
  }

  // Obtener estadísticas de pedidos
  static async getStats(userId = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmed_orders,
        SUM(CASE WHEN estado = 'enviada' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN estado = 'entregada' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN estado = 'entregada' THEN total ELSE 0 END) as total_spent,
        AVG(CASE WHEN estado = 'entregada' THEN total ELSE NULL END) as average_order_value
      FROM ordenes
    `;
    
    const params = [];
    if (userId) {
      sql += ' WHERE usuario_id = ?';
      params.push(userId);
    }
    
    const result = await query(sql, params);
    return result[0];
  }

  // Convertir a objeto público
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
      usuario: this.usuario,
      direccionEnvio: this.direccionEnvio,
      items: this.items,
      // Campos necesarios para verificar condiciones de en_proceso
      tercero_id: this.tercero_id,
      tns_kardex_id: this.tns_kardex_id,
      montado_carro: this.montado_carro,
      entrega: this.entrega
    };
  }

  // Convertir a objeto público simplificado (para listas)
  toPublicObjectSimple() {
    return {
      id: this.id,
      numeroOrden: this.numeroOrden,
      usuarioId: this.usuarioId,
      estado: this.estado,
      total: this.total,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      itemsCount: this.items.length,
      metodoPago: this.metodoPago,
      usuario: this.usuario, // Incluir información del usuario
      // Campos necesarios para verificar condiciones de en_proceso
      tercero_id: this.tercero_id,
      tns_kardex_id: this.tns_kardex_id,
      montado_carro: this.montado_carro,
      entrega: this.entrega
    };
  }
}

module.exports = Order;