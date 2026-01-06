const Order = require('../models/Order');
const Cart = require('../models/Cart');

const { query } = require('../config/database');
const notificationService = require('../services/notificationService');
const terceroService = require('../services/terceroService');

class OrderController {
  // Obtener pedidos del usuario autenticado
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { estado, limit = 20, offset = 0 } = req.query;

      const orders = await Order.findByUserId(userId, {
        estado: estado || null,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        message: 'Pedidos obtenidos exitosamente',
        data: {
          orders: orders.map(order => order.toPublicObjectSimple()),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: orders.length
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener pedidos del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener pedido específico del usuario
  static async getUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      console.log('📦 [getUserOrder] Obteniendo pedido:', id, 'para usuario:', userId);

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (order.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este pedido'
        });
      }

      console.log('✅ [getUserOrder] Pedido obtenido - Estado:', order.estado, 'ID:', id);

      const orderData = order.toPublicObject();
      console.log('📋 [getUserOrder] Datos enviados - Estado:', orderData.estado);

      res.json({
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: orderData
      });
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear pedido desde carrito
  static async createOrderFromCart(req, res) {
    try {
      const userId = req.user.id;
      const { 
        direccionEnvioId, 
        metodoPago = 'efectivo', 
        referenciaPago = null, 
        notas = null 
      } = req.body;

      // 1. OBTENER CARRITO DEL USUARIO
      const cart = await Cart.findActiveCartByUser(userId);
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El carrito está vacío'
        });
      }

      // 2. VALIDAR CARRITO ANTES DE CREAR PEDIDO
      const validation = await cart.validateForCheckout();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación del carrito',
          errors: validation.errors
        });
      }

      // 3. PREPARAR DATOS PARA CREAR PEDIDO
      const orderData = {
        usuarioId: userId,
        cartId: cart.id, // Necesario para limpiar el carrito
        direccionEnvioId: direccionEnvioId || null,
        metodoPago,
        referenciaPago: referenciaPago || null,
        notas: notas || null,
        items: cart.items.map(item => ({
          productId: item.productoId,
          productName: item.productoNombre,
          productDescription: item.productoDescripcion,
          cantidad: item.cantidad, // Cambiar quantity por cantidad para coincidir con el modelo
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          imageUrl: item.imagenPrincipal
        }))
      };

      // 4. CREAR PEDIDO DESDE CARRITO (CON TRANSACCIÓN)
      const order = await Order.createFromCart(orderData);

      // 5. RESPUESTA EXITOSA
      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: {
          id: order.id,
          numeroOrden: order.numeroOrden,
          estado: order.estado,
          total: order.total,
          items: order.items,
          fechaCreacion: order.fechaCreacion
        }
      });

    } catch (error) {
      console.error('Error al crear pedido:', error);
      
      // Manejar errores específicos
      if (error.message.includes('Stock insuficiente') || 
          error.message.includes('no encontrado') || 
          error.message.includes('no disponible') ||
          error.message.includes('precio ha cambiado')) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación del carrito',
          error: error.message
        });
      }

      // Error interno del servidor
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el pedido'
      });
    }
  }

  // Cancelar pedido del usuario
  static async cancelUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (order.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cancelar este pedido'
        });
      }


	if (order.referenciaPago){
		 return res.status(400).json({
			success: false,
			message: 'No se puede cancelar un pedido que ya ha sido pagado.'
			});
		}

      // Verificar que el pedido esté en estado 'pendiente' antes de intentar cancelar
      if (order.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `No se puede cancelar el pedido. Solo se pueden cancelar pedidos en estado 'pendiente'. El pedido actual está en estado '${order.estado}'.`
        });
      }

      // Cancelar pedido
      await order.cancel(reason);

      res.json({
        success: true,
        message: 'Pedido cancelado exitosamente',
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al cancelar pedido:', error);
      
      if (error.message.includes('No se puede cancelar') || 
          error.message.includes('ya está cancelado') ||
          error.message.includes('Solo se pueden cancelar')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de pedidos del usuario
  static async getUserOrderStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Order.getStats(userId);

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalOrders: parseInt(stats.total_orders),
          pendingOrders: parseInt(stats.pending_orders),
          confirmedOrders: parseInt(stats.confirmed_orders),
          shippedOrders: parseInt(stats.shipped_orders),
          deliveredOrders: parseInt(stats.delivered_orders),
          cancelledOrders: parseInt(stats.cancelled_orders),
          totalSpent: parseFloat(stats.total_spent || 0),
          averageOrderValue: parseFloat(stats.average_order_value || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todos los pedidos (admin)
  static async getAllOrders(req, res) {
    try {
      const { 
        estado, 
        usuarioId, 
        fechaDesde, 
        fechaHasta,
        migradoTNS,
        limit = 50, 
        offset = 0,
        orderBy = 'fecha_creacion',
        orderDir = 'DESC'
      } = req.query;

      let sql = `
        SELECT o.*,
               u.email as usuario_email, u.nombre_completo as usuario_nombre,
               u.tipo_identificacion as usuario_tipo_identificacion,
               u.numero_identificacion as usuario_numero_identificacion,
               de.id as direccion_id, de.nombre_destinatario, de.telefono, de.direccion, de.ciudad, de.departamento, de.codigo_postal, de.pais,
               (SELECT e.id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_id,
               (SELECT e.repartidor_id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as repartidor_id,
               (SELECT e.estado FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') ORDER BY e.fecha_creacion DESC LIMIT 1) as entrega_estado,
               (SELECT r.nombre_completo FROM entregas e 
                LEFT JOIN usuarios r ON e.repartidor_id = r.id 
                WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida', 'entregada') 
                ORDER BY e.fecha_creacion DESC LIMIT 1) as repartidor_nombre
        FROM ordenes o
        LEFT JOIN usuarios u ON o.usuario_id = u.id
        LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (estado) {
        sql += ' AND o.estado = ?';
        params.push(estado);
      }
      
      if (usuarioId) {
        sql += ' AND o.usuario_id = ?';
        params.push(usuarioId);
      }
      
      if (fechaDesde) {
        sql += ' AND DATE(o.fecha_creacion) >= ?';
        params.push(fechaDesde);
      }
      
      if (fechaHasta) {
        sql += ' AND DATE(o.fecha_creacion) <= ?';
        params.push(fechaHasta);
      }
      
      // Filtro por migración TNS
      if (migradoTNS !== undefined) {
        if (migradoTNS === 'true' || migradoTNS === true) {
          sql += ' AND o.tns_kardex_id IS NOT NULL';
        } else if (migradoTNS === 'false' || migradoTNS === false) {
          sql += ' AND o.tns_kardex_id IS NULL';
        }
      }
      
      // Primero obtener el conteo total de órdenes únicas
      let countSql = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM ordenes o
        WHERE 1=1
      `;
      const countParams = [];
      
      if (estado) {
        countSql += ' AND o.estado = ?';
        countParams.push(estado);
      }
      
      if (usuarioId) {
        countSql += ' AND o.usuario_id = ?';
        countParams.push(usuarioId);
      }
      
      if (fechaDesde) {
        countSql += ' AND DATE(o.fecha_creacion) >= ?';
        countParams.push(fechaDesde);
      }
      
      if (fechaHasta) {
        countSql += ' AND DATE(o.fecha_creacion) <= ?';
        countParams.push(fechaHasta);
      }
      
      // Aplicar mismo filtro TNS al conteo
      if (migradoTNS !== undefined) {
        if (migradoTNS === 'true' || migradoTNS === true) {
          countSql += ' AND o.tns_kardex_id IS NOT NULL';
        } else if (migradoTNS === 'false' || migradoTNS === false) {
          countSql += ' AND o.tns_kardex_id IS NULL';
        }
      }
      
      const countResult = await query(countSql, countParams);
      const totalOrders = countResult[0]?.total || 0;
      
      // VALIDAR Y CONVERTIR LIMIT Y OFFSET A ENTEROS
	const limitValue = Math.max(1, Math.min(1000, parseInt(limit) || 50));
	const offsetValue = Math.max(0, parseInt(offset) || 0); // Minimo 0


	// VALIDAR ORDERBY PARA PREVERNIR INYECCION  SQL


	const allowedOrderBy = ['fecha_creacion', 'total', 'estado', 'numero_orden'];
	const cleanOrderBy = String(orderBy || 'fecha_creacion').replace(/[^a-zA-Z0-9_]/g, '');
	const safeOrderBy = allowedOrderBy.includes(cleanOrderBy) ? cleanOrderBy : 'fecha_creacion';
	const safeOrderDir = String(orderDir || 'DESC'). toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

	//USAR VALORES DIRECTO EN LUGAR DE PLACEHOLDER PARA LIMIT y OFFSET

	sql +=  ` GROUP BY o.id ORDER BY o.${safeOrderBy} ${safeOrderDir} LIMIT ${limitValue} OFFSET ${offsetValue}`;

      const orders = await query(sql, params);
      
      // Eliminar duplicados por ID como medida de seguridad adicional
      const uniqueOrdersMap = new Map();
      orders.forEach(order => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order);
        }
      });
      const uniqueOrders = Array.from(uniqueOrdersMap.values());
      
      const ordersWithItems = await Promise.all(uniqueOrders.map(async (orderData) => {
        const items = await Order.getOrderItems(orderData.id);
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
            pais: orderData.pais
          } : null,
          items
        });
        const publicOrder = order.toPublicObjectSimple();
        
        // Agregar información de entrega y coordenadas
        if (orderData.entrega_id) {
          publicOrder.entrega = {
            id: orderData.entrega_id,
            repartidorId: orderData.repartidor_id,
            repartidorNombre: orderData.repartidor_nombre,
            estado: orderData.entrega_estado
          };
        }
        
        // Coordenadas de entrega no disponibles en direcciones_envio
        
        return publicOrder;
      }));

      res.json({
        success: true,
        message: 'Pedidos obtenidos exitosamente',
        data: {
          orders: ordersWithItems,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: totalOrders
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener todos los pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar estado de pedido (admin)
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado, notas = null } = req.body;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Guardar el estado anterior
      const estadoAnterior = order.estado;

      // Variable para almacenar información de sincronización
      let terceroInfo = null;

      // ⭐ INTEGRACIÓN CON APITERCERO ⭐
      // Si el nuevo estado es 'confirmada' y el estado anterior NO era 'confirmada'
      // entonces sincronizamos el usuario con el sistema de terceros
      if (estado === 'confirmada' && estadoAnterior !== 'confirmada') {
        try {
          console.log(`\n🔄 Estado cambiando a 'confirmada', sincronizando con ApiTercero...`);
          
          // Llamar al servicio de terceros para obtener o crear el tercero
          const terceroResult = await terceroService.getOrCreateTerceroFromUser(order.usuarioId);
          
          // Guardar información para incluir en la respuesta
          terceroInfo = {
            terceroSincronizado: true,
            terceroId: terceroResult.terceroId,
            terceroNombre: terceroResult.nombre,
            terceroExistia: terceroResult.existed || false
          };
          
          console.log(`✅ Tercero sincronizado exitosamente:`, {
            terceroId: terceroResult.terceroId,
            nombre: terceroResult.nombre,
            existed: terceroResult.existed ? 'Ya existía' : 'Creado nuevo'
          });

          // Opcional: Guardar el tercero_id en el pedido para referencia
          try {
            // Verificar si la columna tercero_id existe en la tabla ordenes
            const checkColumnSql = `
              SELECT COUNT(*) as count 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'ordenes' 
              AND COLUMN_NAME = 'tercero_id'
            `;
            
            const columnExists = await query(checkColumnSql);
            
            if (columnExists[0].count === 0) {
              console.log('ℹ️ Creando columna tercero_id en tabla ordenes...');
              await query('ALTER TABLE ordenes ADD COLUMN tercero_id INT DEFAULT NULL');
              await query('CREATE INDEX idx_ordenes_tercero_id ON ordenes(tercero_id)');
            }
            
            // Guardar el tercero_id en el pedido
            await query('UPDATE ordenes SET tercero_id = ? WHERE id = ?', [terceroResult.terceroId, id]);
            console.log(`📝 tercero_id ${terceroResult.terceroId} guardado en pedido ${id}`);
          } catch (error) {
            console.warn('⚠️ No se pudo guardar tercero_id en el pedido:', error.message);
            // No es crítico, continuamos
          }

        } catch (terceroError) {
          console.error('❌ Error en sincronización con ApiTercero:', terceroError.message);
          
          // ⚠️ IMPORTANTE: Si la sincronización falla, permitimos continuar pero con advertencia
          console.warn('⚠️ Continuando con la confirmación del pedido sin sincronización de terceros');
          
          // Marcar que hubo un problema de sincronización pero continuar
          terceroInfo = {
            terceroSincronizado: false,
            error: terceroError.message,
            advertencia: 'El pedido se confirmó pero no se pudo sincronizar con el sistema de terceros. Contacte al administrador.'
          };
        }
      }

      // Actualizar estado
      await order.updateStatus(estado);

      // Actualizar notas si se proporcionan
      if (notas) {
        const updateNotesSql = 'UPDATE ordenes SET notas = ?, fecha_actualizacion = NOW() WHERE id = ?';
        await query(updateNotesSql, [notas, id]);
        order.notas = notas;
      }

      // Preparar respuesta con información de sincronización
      const responseData = order.toPublicObject();
      
      // Si hubo sincronización, agregar la información
      if (terceroInfo) {
        Object.assign(responseData, terceroInfo);
      }

      res.json({
        success: true,
        message: 'Estado del pedido actualizado exitosamente',
        data: responseData
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      
      if (error.message.includes('Estado de pedido inválido')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas generales (admin)
  static async getOrderStats(req, res) {
    try {
      const stats = await Order.getStats();

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalOrders: parseInt(stats.total_orders),
          pendingOrders: parseInt(stats.pending_orders),
          confirmedOrders: parseInt(stats.confirmed_orders),
          shippedOrders: parseInt(stats.shipped_orders),
          deliveredOrders: parseInt(stats.delivered_orders),
          cancelledOrders: parseInt(stats.cancelled_orders),
          totalRevenue: parseFloat(stats.total_spent || 0),
          averageOrderValue: parseFloat(stats.average_order_value || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener pedido específico por ID (admin)
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      const orderData = order.toPublicObject();
      
      // Asegurar que los campos necesarios estén incluidos
      // Estos campos vienen de o.* en el SELECT de findById
      if (order.tercero_id !== undefined) {
        orderData.tercero_id = order.tercero_id;
      }
      if (order.tns_kardex_id !== undefined) {
        orderData.tns_kardex_id = order.tns_kardex_id;
      }
      if (order.montado_carro !== undefined) {
        orderData.montado_carro = order.montado_carro;
      }
      if (order.entrega) {
        orderData.entrega = order.entrega;
      }

      res.json({
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: orderData
      });
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = OrderController;
