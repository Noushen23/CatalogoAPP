const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const mapsService = require('./mapsService');

// Constantes de estados de entrega
const DELIVERY_STATE_ASSIGNED = 'asignada';
const DELIVERY_STATE_IN_TRANSIT = 'en_camino';
const DELIVERY_STATE_ARRIVED = 'llegada';
const DELIVERY_STATE_DELIVERED = 'entregada';
const DELIVERY_STATE_CANCELLED = 'cancelada';
const DELIVERY_STATE_FAILED = 'fallida';

// Constantes de estados logísticos
const LOGISTIC_STATE_PENDING = 'pendiente_ruta';
const LOGISTIC_STATE_ASSIGNED = 'ruta_asignada';
const LOGISTIC_STATE_IN_TRANSIT = 'en_transito';
const LOGISTIC_STATE_DELIVERED = 'entregado';
const LOGISTIC_STATE_CANCELLED = 'cancelado';

/**
 * Verificar que las tablas de delivery existen
 */
const ensureDeliveryTables = async () => {
  try {
    await query('SELECT 1 FROM entregas LIMIT 1');
  } catch (error) {
    console.error('Error al verificar tablas de delivery:', error.message);
    throw new Error('Las tablas de delivery no están creadas. Ejecuta la migración 009_delivery_tracking_system.sql');
  }
};

/**
 * Obtener entrega por ID
 */
const obtenerEntregaPorId = async (entregaId) => {
  try {
    const resultados = await query(
      `SELECT 
        e.*,
        o.numero_orden,
        o.estado as orden_estado,
        u.nombre_completo as repartidor_nombre,
        u.email as repartidor_email,
        de.direccion,
        de.ciudad,
        de.nombre_destinatario,
        de.telefono
      FROM entregas e
      INNER JOIN ordenes o ON o.id = e.orden_id
      INNER JOIN usuarios u ON u.id = e.repartidor_id
      LEFT JOIN direcciones_envio de ON de.id = o.direccion_envio_id
      WHERE e.id = ?`,
      [entregaId]
    );
    return resultados?.[0] || null;
  } catch (error) {
    console.error('Error al obtener entrega:', error);
    throw error;
  }
};

/**
 * Verificar si un pedido cumple todas las condiciones para estar en proceso
 */
const verificarCondicionesEnProceso = async (ordenId) => {
  try {
    const pedido = await query(
      `SELECT 
        o.id,
        o.tercero_id,
        o.tns_kardex_id,
        o.montado_carro,
        e.id as entrega_id,
        e.repartidor_id,
        e.estado as entrega_estado
       FROM ordenes o
       LEFT JOIN entregas e ON e.orden_id = o.id 
         AND e.estado NOT IN ('cancelada', 'fallida', 'entregada')
       WHERE o.id = ?`,
      [ordenId]
    );

    if (!pedido?.[0]) {
      return { cumple: false, razon: 'Pedido no encontrado' };
    }

    const datos = pedido[0];
    const condiciones = {
      terceroEnTNS: !!datos.tercero_id,
      pedidoEnTNS: !!datos.tns_kardex_id,
      repartidorAsignado: !!datos.entrega_id && !!datos.repartidor_id,
      montadoAlCarro: datos.montado_carro === 1 || datos.montado_carro === true,
    };

    const todasCumplidas = Object.values(condiciones).every(c => c);

    return {
      cumple: todasCumplidas,
      condiciones,
      razon: todasCumplidas 
        ? null 
        : `Faltan condiciones: ${Object.entries(condiciones)
            .filter(([_, cumple]) => !cumple)
            .map(([nombre]) => nombre)
            .join(', ')}`,
    };
  } catch (error) {
    console.error('Error al verificar condiciones en proceso:', error);
    return { cumple: false, razon: `Error: ${error.message}` };
  }
};

/**
 * Actualizar ordenes_logistica de forma segura
 */
const actualizarOrdenesLogistica = async (ordenId, updates = {}) => {
  try {
    const columnas = await query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'ordenes_logistica' 
       AND COLUMN_NAME IN ('repartidor_id', 'entrega_id', 'estado_logistico')`
    );

    const columnasExistentes = columnas?.map((c) => c.COLUMN_NAME) || [];
    const sqlUpdates = [];
    const valores = [];

    if (updates.repartidor_id && columnasExistentes.includes('repartidor_id')) {
      sqlUpdates.push('repartidor_id = ?');
      valores.push(updates.repartidor_id);
    }

    if (updates.entrega_id && columnasExistentes.includes('entrega_id')) {
      sqlUpdates.push('entrega_id = ?');
      valores.push(updates.entrega_id);
    }

    if (updates.estado_logistico && columnasExistentes.includes('estado_logistico')) {
      sqlUpdates.push('estado_logistico = ?');
      valores.push(updates.estado_logistico);
    }

    sqlUpdates.push('fecha_actualizacion = NOW()');
    valores.push(ordenId);

    if (sqlUpdates.length > 1) {
      await query(
        `UPDATE ordenes_logistica 
         SET ${sqlUpdates.join(', ')}
         WHERE orden_id = ?`,
        valores
      );
    }
  } catch (error) {
    console.warn('⚠️ No se pudo actualizar ordenes_logistica:', error.message);
  }
};

/**
 * Crear entrega para un pedido
 */
const crearEntrega = async (ordenId, repartidorId) => {
  try {
    const id = uuidv4();

    await query(
      `INSERT INTO entregas 
       (id, orden_id, repartidor_id, estado, fecha_asignacion)
       VALUES (?, ?, ?, ?, NOW())`,
      [id, ordenId, repartidorId, DELIVERY_STATE_ASSIGNED]
    );

    await actualizarOrdenesLogistica(ordenId, {
      repartidor_id: repartidorId,
      entrega_id: id,
      estado_logistico: LOGISTIC_STATE_ASSIGNED,
    });

    const verificacion = await verificarCondicionesEnProceso(ordenId);
    if (verificacion.cumple) {
      await query(
        `UPDATE ordenes 
         SET estado = 'en_proceso', fecha_actualizacion = NOW()
         WHERE id = ?`,
        [ordenId]
      );
      console.log(`✅ Pedido ${ordenId} cambió a 'en_proceso'`);
    }

    return await obtenerEntregaPorId(id);
  } catch (error) {
    console.error('Error al crear entrega:', error);
    throw error;
  }
};

/**
 * Obtener entregas de un repartidor
 */
const obtenerEntregasRepartidor = async (repartidorId, estado = null) => {
  const sql = `
    SELECT 
      e.*,
      o.numero_orden,
      o.estado as orden_estado,
      de.direccion,
      de.ciudad,
      de.nombre_destinatario,
      de.telefono,
      ol.latitud,
      ol.longitud
    FROM entregas e
    INNER JOIN ordenes o ON o.id = e.orden_id
    LEFT JOIN direcciones_envio de ON de.id = o.direccion_envio_id
    LEFT JOIN ordenes_logistica ol ON ol.orden_id = e.orden_id
    WHERE e.repartidor_id = ?
    ${estado ? 'AND e.estado = ?' : ''}
    ORDER BY e.fecha_asignacion DESC
  `;

  const params = estado ? [repartidorId, estado] : [repartidorId];

  try {
    return await query(sql, params) || [];
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || /Unknown column 'ol\./.test(error.message)) {
      const sqlSinLogistica = sql.replace(/LEFT JOIN ordenes_logistica ol ON ol.orden_id = e.orden_id/g, '')
        .replace(/ol\.latitud,?\s*/g, '')
        .replace(/ol\.longitud,?\s*/g, '');
      const resultados = await query(sqlSinLogistica, params);
      return (resultados || []).map((r) => ({ ...r, latitud: null, longitud: null }));
    }
    console.error('Error al obtener entregas del repartidor:', error);
    return [];
  }
};

/**
 * Actualizar estado de entrega
 */
const actualizarEstadoEntrega = async (entregaId, nuevoEstado, datosAdicionales = {}) => {
  try {
    const {
      latitud,
      longitud,
      observaciones,
      firma_cliente,
      foto_entrega,
      distancia_km,
      tiempo_minutos,
    } = datosAdicionales;

    const updates = ['estado = ?', 'fecha_actualizacion = NOW()'];
    const params = [nuevoEstado];

    if (nuevoEstado === DELIVERY_STATE_IN_TRANSIT && !datosAdicionales.fecha_salida) {
      updates.push('fecha_salida = NOW()');
    }

    if (nuevoEstado === DELIVERY_STATE_ARRIVED) {
      updates.push('fecha_llegada = NOW()');
      if (latitud) {
        updates.push('latitud_llegada = ?');
        params.push(latitud);
      }
      if (longitud) {
        updates.push('longitud_llegada = ?');
        params.push(longitud);
      }
    }

    if (nuevoEstado === DELIVERY_STATE_DELIVERED) {
      updates.push('fecha_entrega = NOW()');
      if (distancia_km) {
        updates.push('distancia_km = ?');
        params.push(distancia_km);
      }
      if (tiempo_minutos) {
        updates.push('tiempo_minutos = ?');
        params.push(tiempo_minutos);
      }
      if (firma_cliente) {
        updates.push('firma_cliente = ?');
        params.push(firma_cliente);
      }
      if (foto_entrega) {
        updates.push('foto_entrega = ?');
        params.push(foto_entrega);
      }
    }

    if (observaciones) {
      updates.push('observaciones = ?');
      params.push(observaciones);
    }

    params.push(entregaId);
    await query(`UPDATE entregas SET ${updates.join(', ')} WHERE id = ?`, params);

    const entrega = await obtenerEntregaPorId(entregaId);
    const estadoLogisticoMap = {
      [DELIVERY_STATE_IN_TRANSIT]: LOGISTIC_STATE_IN_TRANSIT,
      [DELIVERY_STATE_DELIVERED]: LOGISTIC_STATE_DELIVERED,
      [DELIVERY_STATE_CANCELLED]: LOGISTIC_STATE_CANCELLED,
    };

    if (estadoLogisticoMap[nuevoEstado]) {
      await actualizarOrdenesLogistica(entrega.orden_id, {
        estado_logistico: estadoLogisticoMap[nuevoEstado],
      });
    }

    if (nuevoEstado === DELIVERY_STATE_IN_TRANSIT) {
      await query(
        `UPDATE ordenes SET estado = 'enviada', fecha_actualizacion = NOW() WHERE id = ?`,
        [entrega.orden_id]
      );
    } else if (nuevoEstado === DELIVERY_STATE_DELIVERED) {
      await query(
        `UPDATE ordenes 
         SET estado = 'entregada', 
             fecha_entrega_real = NOW(),
             fecha_actualizacion = NOW()
         WHERE id = ?`,
        [entrega.orden_id]
      );
    }

    return entrega;
  } catch (error) {
    console.error('Error al actualizar estado de entrega:', error);
    throw error;
  }
};

/**
 * Registrar llegada del repartidor
 */
const registrarLlegada = async (entregaId, latitud, longitud) => {
  return await actualizarEstadoEntrega(entregaId, DELIVERY_STATE_ARRIVED, { latitud, longitud });
};

/**
 * Registrar entrega completada
 */
const registrarEntregaCompletada = async (entregaId, datosEntrega = {}) => {
  return await actualizarEstadoEntrega(entregaId, DELIVERY_STATE_DELIVERED, datosEntrega);
};

/**
 * Buscar repartidor disponible para un pedido
 */
const buscarRepartidorDisponible = async (ordenId) => {
  try {
    const pedido = await query(
      `SELECT ol.orden_id, ol.latitud, ol.longitud, ol.zona, de.ciudad
       FROM ordenes_logistica ol
       INNER JOIN ordenes o ON o.id = ol.orden_id
       LEFT JOIN direcciones_envio de ON de.id = o.direccion_envio_id
       WHERE ol.orden_id = ?`,
      [ordenId]
    );

    if (!pedido?.[0]) return null;

    const datosPedido = pedido[0];
    const repartidores = await query(
      `SELECT 
        u.id,
        u.nombre_completo,
        u.email,
        COALESCE(COUNT(DISTINCT e.id), 0) as entregas_en_curso
      FROM usuarios u
      LEFT JOIN entregas e ON e.repartidor_id = u.id 
        AND e.estado IN ('asignada', 'en_camino', 'llegada')
      WHERE u.activo = 1
        AND u.rol IN ('repartidor', 'moderator', 'admin')
      GROUP BY u.id, u.nombre_completo, u.email
      HAVING entregas_en_curso < 5
      ORDER BY entregas_en_curso ASC
      LIMIT 10`,
      []
    );

    if (!repartidores?.length) return null;

    if (datosPedido.latitud && datosPedido.longitud) {
      let repartidorMasCercano = null;
      let distanciaMinima = Infinity;

      for (const repartidor of repartidores) {
        if (repartidor.ultima_latitud && repartidor.ultima_longitud) {
          const distancia = mapsService.calcularDistanciaHaversine(
            datosPedido.latitud,
            datosPedido.longitud,
            repartidor.ultima_latitud,
            repartidor.ultima_longitud
          );
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            repartidorMasCercano = repartidor;
          }
        }
      }
      return repartidorMasCercano || repartidores[0];
    }

    return repartidores[0];
  } catch (error) {
    console.error('Error al buscar repartidor disponible:', error);
    return null;
  }
};

/**
 * Cancelar entrega y reasignar automáticamente
 */
const cancelarEntregaYReasignar = async (entregaId, motivo, motivoDetalle = null, reasignadoPorId = null) => {
  return await transaction(async (conn) => {
    const entrega = await obtenerEntregaPorId(entregaId);
    if (!entrega) throw new Error('Entrega no encontrada');
    if (entrega.estado === DELIVERY_STATE_DELIVERED) {
      throw new Error('No se puede cancelar una entrega ya completada');
    }

    await conn.execute(
      `UPDATE entregas 
       SET estado = ?, fecha_cancelacion = NOW(), fecha_actualizacion = NOW()
       WHERE id = ?`,
      [DELIVERY_STATE_CANCELLED, entregaId]
    );

    await actualizarOrdenesLogistica(entrega.orden_id, {
      estado_logistico: LOGISTIC_STATE_PENDING,
      repartidor_id: null,
      entrega_id: null,
    });

    const repartidorDisponible = await buscarRepartidorDisponible(entrega.orden_id);

    if (repartidorDisponible) {
      const nuevaEntregaId = uuidv4();
      await conn.execute(
        `INSERT INTO entregas (id, orden_id, repartidor_id, estado, fecha_asignacion)
         VALUES (?, ?, ?, ?, NOW())`,
        [nuevaEntregaId, entrega.orden_id, repartidorDisponible.id, DELIVERY_STATE_ASSIGNED]
      );

      await actualizarOrdenesLogistica(entrega.orden_id, {
        repartidor_id: repartidorDisponible.id,
        entrega_id: nuevaEntregaId,
        estado_logistico: LOGISTIC_STATE_ASSIGNED,
      });

      return {
        success: true,
        reasignado: true,
        nueva_entrega_id: nuevaEntregaId,
        repartidor_nuevo: repartidorDisponible,
      };
    }

    return {
      success: true,
      reasignado: false,
      mensaje: 'Pedido reasignado a estado pendiente. No hay repartidores disponibles.',
    };
  });
};

/**
 * Obtener lista de repartidores disponibles
 */
const obtenerRepartidoresDisponibles = async (ordenId = null) => {
  try {
    let sql = `
      SELECT 
        u.id,
        u.nombre_completo,
        u.email,
        u.telefono,
        u.rol,
        u.activo,
        COALESCE(COUNT(DISTINCT e.id), 0) as entregas_en_curso
      FROM usuarios u
      LEFT JOIN entregas e ON e.repartidor_id = u.id 
        AND e.estado IN ('asignada', 'en_camino', 'llegada')
      WHERE u.activo = 1
        AND (
          LOWER(TRIM(u.rol)) = 'repartidor' 
          OR LOWER(TRIM(u.rol)) LIKE '%repartidor%'
          OR LOWER(TRIM(u.rol)) = 'delivery'
          OR LOWER(TRIM(u.rol)) LIKE '%delivery%'
          OR LOWER(TRIM(u.rol)) = 'conductor'
          OR LOWER(TRIM(u.rol)) LIKE '%conductor%'
        )
      GROUP BY u.id, u.nombre_completo, u.email, u.telefono, u.rol, u.activo
      ORDER BY entregas_en_curso ASC, u.nombre_completo ASC
    `;

    let repartidores = await query(sql, []);

    if (!repartidores?.length) {
      const sqlAlternativo = `
        SELECT DISTINCT
          u.id, u.nombre_completo, u.email, u.telefono, u.rol, u.activo,
          COALESCE(COUNT(DISTINCT e.id), 0) as entregas_en_curso
        FROM usuarios u
        LEFT JOIN entregas e ON e.repartidor_id = u.id 
          AND e.estado IN ('asignada', 'en_camino', 'llegada')
        WHERE u.activo = 1
          AND u.id IN (SELECT DISTINCT repartidor_id FROM entregas WHERE repartidor_id IS NOT NULL)
        GROUP BY u.id, u.nombre_completo, u.email, u.telefono, u.rol, u.activo
        ORDER BY entregas_en_curso ASC, u.nombre_completo ASC
      `;
      repartidores = await query(sqlAlternativo, []);
    }

    if (ordenId && repartidores?.length) {
      const pedido = await query(
        `SELECT ol.latitud, ol.longitud 
         FROM ordenes_logistica ol 
         WHERE ol.orden_id = ?`,
        [ordenId]
      );

      if (pedido?.[0]?.latitud && pedido[0].longitud) {
        const { latitud: pedidoLat, longitud: pedidoLng } = pedido[0];
        repartidores.forEach((repartidor) => {
          if (repartidor.ultima_latitud && repartidor.ultima_longitud) {
            repartidor.distancia_km = mapsService.calcularDistanciaHaversine(
              pedidoLat,
              pedidoLng,
              repartidor.ultima_latitud,
              repartidor.ultima_longitud
            );
          } else {
            repartidor.distancia_km = null;
          }
        });

        repartidores.sort((a, b) => {
          if (a.distancia_km === null && b.distancia_km === null) return 0;
          if (a.distancia_km === null) return 1;
          if (b.distancia_km === null) return -1;
          return a.distancia_km - b.distancia_km;
        });
      }
    }

    return repartidores || [];
  } catch (error) {
    console.error('Error al obtener repartidores disponibles:', error);
    return [];
  }
};

/**
 * Asignar pedido directamente a repartidor
 */
const asignarPedidoARepartidor = async (ordenId, repartidorId, motivoReasignacion = null) => {
  try {
    const repartidor = await query(
      `SELECT id, nombre_completo, activo, rol 
       FROM usuarios 
       WHERE id = ? AND activo = 1 
       AND (
         LOWER(TRIM(rol)) = 'repartidor' 
         OR LOWER(TRIM(rol)) LIKE '%repartidor%'
         OR LOWER(TRIM(rol)) = 'delivery'
         OR LOWER(TRIM(rol)) LIKE '%delivery%'
       )`,
      [repartidorId]
    );

    if (!repartidor?.[0]) {
      throw new Error('Repartidor no encontrado, no está activo o no tiene el rol adecuado');
    }

    const pedido = await query(
      `SELECT 
        o.id as orden_id,
        o.numero_orden,
        o.estado as orden_estado,
        ol.orden_id as logistica_orden_id,
        ol.estado_logistico,
        e.id as entrega_id,
        e.repartidor_id as entrega_repartidor_id,
        e.estado as entrega_estado
       FROM ordenes o
       LEFT JOIN ordenes_logistica ol ON ol.orden_id = o.id
       LEFT JOIN entregas e ON e.orden_id = o.id 
         AND e.estado IN ('asignada', 'en_camino', 'llegada')
       WHERE o.id = ?`,
      [ordenId]
    );

    if (!pedido?.[0]) {
      throw new Error('Pedido no encontrado');
    }

    const datosPedido = pedido[0];

    if (datosPedido.orden_estado !== 'confirmada') {
      throw new Error(
        `El pedido está en estado '${datosPedido.orden_estado}' y no puede ser asignado. ` +
        `Solo los pedidos en estado 'confirmada' pueden ser asignados a un repartidor.`
      );
    }

    if (datosPedido.entrega_id && datosPedido.entrega_repartidor_id === repartidorId) {
      const entregaExistente = await obtenerEntregaPorId(datosPedido.entrega_id);
      return {
        success: true,
        entrega: entregaExistente,
        repartidor: repartidor[0],
        mensaje: 'El pedido ya está asignado a este repartidor',
        ya_asignado: true,
      };
    }

    if (datosPedido.entrega_id && datosPedido.entrega_repartidor_id !== repartidorId) {
      if (!motivoReasignacion?.trim()) {
        throw new Error(
          'Este pedido ya está asignado a otro repartidor. ' +
          'Debes proporcionar un motivo para reasignarlo.'
        );
      }

      await query(
        `UPDATE entregas 
         SET estado = 'cancelada', 
             fecha_cancelacion = NOW(),
             fecha_actualizacion = NOW()
         WHERE id = ?`,
        [datosPedido.entrega_id]
      );

      if (datosPedido.logistica_orden_id) {
        await actualizarOrdenesLogistica(ordenId, {
          repartidor_id: null,
          entrega_id: null,
          estado_logistico: LOGISTIC_STATE_PENDING,
        });
      }
    }

    const entrega = await crearEntrega(ordenId, repartidorId);

    if (datosPedido.entrega_id && datosPedido.entrega_repartidor_id !== repartidorId && motivoReasignacion) {
      await query(
        `UPDATE entregas 
         SET observaciones = CONCAT('REASIGNADO desde repartidor anterior. Motivo: ', ?)
         WHERE id = ?`,
        [motivoReasignacion.trim(), entrega.id]
      );
      entrega.observaciones = `REASIGNADO desde repartidor anterior. Motivo: ${motivoReasignacion.trim()}`;
    }

    return {
      success: true,
      entrega,
      repartidor: repartidor[0],
      mensaje: 'Pedido asignado correctamente al repartidor',
      ya_asignado: false,
      reasignado: datosPedido.entrega_id && datosPedido.entrega_repartidor_id !== repartidorId,
    };
  } catch (error) {
    console.error('Error al asignar pedido a repartidor:', error);
    throw error;
  }
};

/**
 * Obtener todos los pedidos asignados a repartidores (vista administrativa)
 */
const obtenerTodosPedidosAsignados = async (filtros = {}) => {
  try {
    const { estadoEntrega, repartidorId, fechaDesde, fechaHasta, ordenEstado, limit = 50, offset = 0 } = filtros;
    const params = [];
    const whereConditions = [
      `(e.id IS NULL OR e.estado NOT IN ('cancelada', 'fallida', 'entregada'))`,
      `o.estado NOT IN ('entregada', 'cancelada', 'reembolsada')`
    ];

    if (estadoEntrega) {
      whereConditions.push('e.estado = ?');
      params.push(estadoEntrega);
    }

    if (repartidorId) {
      whereConditions.push('(e.repartidor_id = ? OR e.id IS NULL)');
      params.push(repartidorId);
    }

    if (fechaDesde) {
      whereConditions.push('(DATE(e.fecha_asignacion) >= ? OR (e.id IS NULL AND DATE(o.fecha_creacion) >= ?))');
      params.push(fechaDesde, fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push('(DATE(e.fecha_asignacion) <= ? OR (e.id IS NULL AND DATE(o.fecha_creacion) <= ?))');
      params.push(fechaHasta, fechaHasta);
    }

    if (ordenEstado) {
      whereConditions.push('o.estado = ?');
      params.push(ordenEstado);
    }

    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM ruta_pedidos rp2 
      INNER JOIN rutas ruta2 ON ruta2.id = rp2.ruta_id 
      WHERE rp2.orden_id = o.id 
      AND ruta2.estado IN ('planificada', 'activa', 'en_curso')
    )`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const entregaSubquery = `
      SELECT e1.*
      FROM entregas e1
      WHERE e1.estado NOT IN ('cancelada', 'fallida', 'entregada')
      AND e1.id = (
        SELECT e2.id
        FROM entregas e2
        WHERE e2.orden_id = e1.orden_id
        AND e2.estado NOT IN ('cancelada', 'fallida', 'entregada')
        ORDER BY e2.fecha_asignacion DESC, e2.fecha_creacion DESC
        LIMIT 1
      )
    `;

    const sql = `
      SELECT 
        o.id, o.numero_orden, o.estado as orden_estado,
        o.total, o.subtotal, o.costo_envio, o.descuento, o.impuestos, o.metodo_pago,
        o.fecha_creacion, o.fecha_actualizacion, o.fecha_entrega_estimada, o.fecha_entrega_real,
        u.id as usuario_id, u.email as usuario_email, u.nombre_completo as usuario_nombre,
        de.id as direccion_id, de.nombre_destinatario, de.telefono, de.direccion,
        de.ciudad, de.departamento, de.codigo_postal, de.pais,
        e.id as entrega_id, e.estado as entrega_estado,
        e.fecha_asignacion, e.fecha_salida, e.fecha_llegada, e.fecha_entrega,
        r.id as repartidor_id, r.nombre_completo as repartidor_nombre,
        r.email as repartidor_email, r.telefono as repartidor_telefono,
        (SELECT prioridad FROM ordenes_logistica WHERE orden_id = o.id LIMIT 1) as prioridad,
        (SELECT fecha_programada FROM ordenes_logistica WHERE orden_id = o.id LIMIT 1) as fecha_programada,
        (SELECT COUNT(*) FROM items_orden io WHERE io.orden_id = o.id) AS items_count,
        (SELECT ruta.id FROM ruta_pedidos rp 
         INNER JOIN rutas ruta ON ruta.id = rp.ruta_id 
         WHERE rp.orden_id = o.id 
         ORDER BY ruta.fecha_creacion DESC LIMIT 1) as ruta_id,
        (SELECT ruta.nombre FROM ruta_pedidos rp 
         INNER JOIN rutas ruta ON ruta.id = rp.ruta_id 
         WHERE rp.orden_id = o.id 
         ORDER BY ruta.fecha_creacion DESC LIMIT 1) as ruta_nombre,
        (SELECT ruta.estado FROM ruta_pedidos rp 
         INNER JOIN rutas ruta ON ruta.id = rp.ruta_id 
         WHERE rp.orden_id = o.id 
         ORDER BY ruta.fecha_creacion DESC LIMIT 1) as ruta_estado
      FROM ordenes o
      LEFT JOIN (${entregaSubquery}) e ON e.orden_id = o.id
      LEFT JOIN usuarios u ON u.id = o.usuario_id
      LEFT JOIN direcciones_envio de ON de.id = o.direccion_envio_id
      LEFT JOIN usuarios r ON r.id = e.repartidor_id
      ${whereClause}
      GROUP BY o.id, e.id, u.id, de.id, r.id
      ORDER BY COALESCE(e.fecha_asignacion, o.fecha_creacion) DESC
      LIMIT ? OFFSET ?
    `;

    const limitNum = Math.min(Number(limit), 100);
    const offsetNum = Math.max(Number(offset), 0);
    params.push(limitNum, offsetNum);

    let resultados;
    try {
      resultados = await query(sql, params);
    } catch (error) {
      if (error.message.includes('ordenes_logistica') || error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ Tabla ordenes_logistica no encontrada, ejecutando consulta sin ella');
        const sqlSinLogistica = sql
          .replace(/LEFT JOIN ordenes_logistica ol ON ol.orden_id = o.id/g, '')
          .replace(/ol\.prioridad,?\s*/g, '')
          .replace(/ol\.fecha_programada,?\s*/g, '');
        resultados = await query(sqlSinLogistica, params);
      } else {
        throw error;
      }
    }

    const countParams = params.slice(0, -2);
    const countWhereConditions = [
      `(e.id IS NULL OR e.estado NOT IN ('cancelada', 'fallida', 'entregada'))`,
      `o.estado NOT IN ('entregada', 'cancelada', 'reembolsada')`
    ];

    if (estadoEntrega) {
      countWhereConditions.push('e.estado = ?');
      countParams.push(estadoEntrega);
    }

    if (repartidorId) {
      countWhereConditions.push('(e.repartidor_id = ? OR e.id IS NULL)');
      countParams.push(repartidorId);
    }

    if (fechaDesde) {
      countWhereConditions.push('(DATE(e.fecha_asignacion) >= ? OR (e.id IS NULL AND DATE(o.fecha_creacion) >= ?))');
      countParams.push(fechaDesde, fechaDesde);
    }

    if (fechaHasta) {
      countWhereConditions.push('(DATE(e.fecha_asignacion) <= ? OR (e.id IS NULL AND DATE(o.fecha_creacion) <= ?))');
      countParams.push(fechaHasta, fechaHasta);
    }

    if (ordenEstado) {
      countWhereConditions.push('o.estado = ?');
      countParams.push(ordenEstado);
    }

    countWhereConditions.push(`NOT EXISTS (
      SELECT 1 FROM ruta_pedidos rp2 
      INNER JOIN rutas ruta2 ON ruta2.id = rp2.ruta_id 
      WHERE rp2.orden_id = o.id 
      AND ruta2.estado IN ('planificada', 'activa', 'en_curso')
    )`);

    const countWhereClause = countWhereConditions.length > 0 ? `WHERE ${countWhereConditions.join(' AND ')}` : '';
    const countSql = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM ordenes o
      LEFT JOIN (${entregaSubquery}) e ON e.orden_id = o.id
      LEFT JOIN usuarios u ON u.id = o.usuario_id
      LEFT JOIN direcciones_envio de ON de.id = o.direccion_envio_id
      ${countWhereClause}
    `;

    const countResult = await query(countSql, countParams);
    const total = Number(countResult?.[0]?.total ?? 0);

    const pedidosUnicos = new Map();
    (resultados || []).forEach((pedido) => {
      const claveUnica = pedido.entrega_id || pedido.id;
      if (!pedidosUnicos.has(claveUnica)) {
        pedidosUnicos.set(claveUnica, pedido);
      }
    });

    const pedidos = Array.from(pedidosUnicos.values()).map((pedido) => ({
      ...pedido,
      items_count: pedido.items_count || 0,
      prioridad: pedido.prioridad || null,
      fecha_programada: pedido.fecha_programada || null,
    }));

    return { pedidos, total, limit: limitNum, offset: offsetNum };
  } catch (error) {
    console.error('Error al obtener todos los pedidos asignados:', error);
    throw new Error(`Error al obtener pedidos asignados: ${error.message}`);
  }
};

/**
 * Marcar pedido como montado al carro y verificar si puede cambiar a en_proceso
 */
const marcarPedidoMontadoAlCarro = async (ordenId) => {
  try {
    const columnas = await query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'ordenes' 
       AND COLUMN_NAME = 'montado_carro'`
    );

    if (!columnas?.length) {
      await query(
        `ALTER TABLE ordenes 
         ADD COLUMN montado_carro TINYINT(1) DEFAULT 0 COMMENT 'Indica si el pedido está montado al carro'`
      );
      console.log('✅ Columna montado_carro creada en tabla ordenes');
    }

    await query(
      `UPDATE ordenes SET montado_carro = 1, fecha_actualizacion = NOW() WHERE id = ?`,
      [ordenId]
    );

    const verificacion = await verificarCondicionesEnProceso(ordenId);
    if (verificacion.cumple) {
      await query(
        `UPDATE ordenes SET estado = 'en_proceso', fecha_actualizacion = NOW() WHERE id = ?`,
        [ordenId]
      );
      console.log(`✅ Pedido ${ordenId} marcado como montado al carro y cambió a 'en_proceso'`);
      return { success: true, estadoActualizado: true, mensaje: 'Pedido montado al carro y estado actualizado a en_proceso' };
    }

    return {
      success: true,
      estadoActualizado: false,
      mensaje: 'Pedido montado al carro',
      condiciones: verificacion.condiciones,
      razon: verificacion.razon,
    };
  } catch (error) {
    console.error('Error al marcar pedido como montado al carro:', error);
    throw error;
  }
};

/**
 * Verificar y actualizar estado a en_proceso si se cumplen todas las condiciones
 */
const verificarYActualizarEstadoEnProceso = async (ordenId) => {
  try {
    const verificacion = await verificarCondicionesEnProceso(ordenId);
    if (verificacion.cumple) {
      const pedido = await query('SELECT estado FROM ordenes WHERE id = ?', [ordenId]);
      if (pedido?.[0]?.estado === 'confirmada') {
        await query(
          `UPDATE ordenes SET estado = 'en_proceso', fecha_actualizacion = NOW() WHERE id = ?`,
          [ordenId]
        );
        console.log(`✅ Pedido ${ordenId} actualizado a 'en_proceso'`);
        return { actualizado: true, nuevoEstado: 'en_proceso' };
      }
    }
    return { actualizado: false, condiciones: verificacion.condiciones, razon: verificacion.razon };
  } catch (error) {
    console.error('Error al verificar y actualizar estado en proceso:', error);
    throw error;
  }
};

module.exports = {
  ensureDeliveryTables,
  crearEntrega,
  obtenerEntregaPorId,
  obtenerEntregasRepartidor,
  actualizarEstadoEntrega,
  registrarLlegada,
  registrarEntregaCompletada,
  cancelarEntregaYReasignar,
  buscarRepartidorDisponible,
  obtenerRepartidoresDisponibles,
  asignarPedidoARepartidor,
  obtenerTodosPedidosAsignados,
  verificarCondicionesEnProceso,
  marcarPedidoMontadoAlCarro,
  verificarYActualizarEstadoEnProceso,
  DELIVERY_STATE_ASSIGNED,
  DELIVERY_STATE_IN_TRANSIT,
  DELIVERY_STATE_ARRIVED,
  DELIVERY_STATE_DELIVERED,
  DELIVERY_STATE_CANCELLED,
  DELIVERY_STATE_FAILED,
};
