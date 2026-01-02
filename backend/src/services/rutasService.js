const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const deliveryService = require('./deliveryService');

/**
 * Servicio de gestión de rutas para repartidores
 */

const RUTA_ESTADO_PLANIFICADA = 'planificada';
const RUTA_ESTADO_ACTIVA = 'activa';
const RUTA_ESTADO_EN_CURSO = 'en_curso';
const RUTA_ESTADO_COMPLETADA = 'completada';
const RUTA_ESTADO_CANCELADA = 'cancelada';

const PEDIDO_RUTA_ESTADO_PENDIENTE = 'pendiente';
const PEDIDO_RUTA_ESTADO_EN_CAMINO = 'en_camino';
const PEDIDO_RUTA_ESTADO_ENTREGADO = 'entregado';
const PEDIDO_RUTA_ESTADO_NO_ENTREGADO = 'no_entregado';
const PEDIDO_RUTA_ESTADO_CANCELADO = 'cancelado';

/**
 * Crear una nueva ruta para un repartidor
 */
const crearRuta = async (repartidorId, nombre, descripcion, capacidadMaxima, pedidosIds, creadoPorId) => {
  return await transaction(async (connection) => {
    const rutaId = uuidv4();

    // Validar que el repartidor existe y es repartidor
    const [repartidor] = await connection.query(
      'SELECT id, rol FROM usuarios WHERE id = ? AND LOWER(TRIM(rol)) = ?',
      [repartidorId, 'repartidor']
    );

    if (!repartidor || repartidor.length === 0) {
      throw new Error('Repartidor no encontrado o no tiene el rol correcto');
    }

    // Validar capacidad
    if (pedidosIds.length > capacidadMaxima) {
      throw new Error(`La cantidad de pedidos (${pedidosIds.length}) excede la capacidad máxima (${capacidadMaxima})`);
    }

    // Validar que los pedidos estén en estado adecuado para asignar
    // Aceptar pedidos en: pendiente, confirmada, en_proceso, enviada
    const placeholders = pedidosIds.map(() => '?').join(',');
    const [pedidos] = await connection.query(
      `SELECT id, estado, numero_orden 
       FROM ordenes 
       WHERE id IN (${placeholders}) 
       AND estado IN ('pendiente', 'confirmada', 'en_proceso', 'enviada')`,
      pedidosIds
    );

    if (pedidos.length !== pedidosIds.length) {
      throw new Error('Algunos pedidos no están disponibles para asignar a ruta');
    }

    // Crear la ruta
    await connection.query(
      `INSERT INTO rutas 
       (id, repartidor_id, nombre, descripcion, capacidad_maxima, pedidos_asignados, estado, creado_por_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rutaId, repartidorId, nombre, descripcion, capacidadMaxima, pedidosIds.length, RUTA_ESTADO_PLANIFICADA, creadoPorId]
    );

    // Asignar pedidos a la ruta con orden secuencial
    for (let i = 0; i < pedidosIds.length; i++) {
      const pedidoId = pedidosIds[i];
      const rutaPedidoId = uuidv4();

      // Verificar si ya existe una entrega para este pedido
      const [entregaExistente] = await connection.query(
        'SELECT id FROM entregas WHERE orden_id = ? AND estado NOT IN (?, ?)',
        [pedidoId, 'cancelada', 'entregada']
      );

      let entregaId = null;
      if (entregaExistente && entregaExistente.length > 0) {
        entregaId = entregaExistente[0].id;
        // Actualizar entrega con ruta_id
        await connection.query(
          'UPDATE entregas SET ruta_id = ? WHERE id = ?',
          [rutaId, entregaId]
        );
      } else {
        // Crear nueva entrega
        entregaId = uuidv4();
        await connection.query(
          `INSERT INTO entregas 
           (id, orden_id, repartidor_id, ruta_id, estado, fecha_asignacion)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [entregaId, pedidoId, repartidorId, rutaId, 'asignada']
        );
      }

      // Insertar en ruta_pedidos
      await connection.query(
        `INSERT INTO ruta_pedidos 
         (id, ruta_id, orden_id, entrega_id, orden_secuencia, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [rutaPedidoId, rutaId, pedidoId, entregaId, i + 1, PEDIDO_RUTA_ESTADO_PENDIENTE]
      );
    }

    return rutaId;
  });
};

/**
 * Obtener ruta activa de un repartidor
 */
const obtenerRutaActiva = async (repartidorId) => {
  // query() ya devuelve las filas directamente (no [rows, fields])
  const rutas = await query(
    `SELECT r.*, 
            u.nombre_completo as repartidor_nombre,
            u.email as repartidor_email,
            u.telefono as repartidor_telefono
     FROM rutas r
     INNER JOIN usuarios u ON r.repartidor_id = u.id
     WHERE r.repartidor_id = ? 
     AND r.estado IN (?, ?, ?)
     ORDER BY r.fecha_creacion DESC
     LIMIT 1`,
    [repartidorId, RUTA_ESTADO_PLANIFICADA, RUTA_ESTADO_ACTIVA, RUTA_ESTADO_EN_CURSO]
  );

  // Asegurar que rutas sea un array
  const rutasArray = Array.isArray(rutas) ? rutas : [];

  if (rutasArray.length === 0) {
    return null;
  }

  const ruta = rutasArray[0];

  // Obtener pedidos de la ruta principal
  const pedidos = await query(
    `SELECT rp.*, 
            o.numero_orden,
            o.estado as orden_estado,
            o.total,
            e.estado as entrega_estado,
            e.fecha_asignacion,
            e.fecha_salida,
            e.fecha_llegada,
            e.fecha_entrega,
            COALESCE(de.direccion, 'Dirección no disponible') as direccion,
            de.ciudad,
            de.departamento,
            de.nombre_destinatario,
            de.telefono
     FROM ruta_pedidos rp
     INNER JOIN ordenes o ON rp.orden_id = o.id
     LEFT JOIN entregas e ON rp.entrega_id = e.id
     LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
     WHERE rp.ruta_id = ?
     ORDER BY rp.orden_secuencia ASC`,
    [ruta.id]
  );
  ruta.pedidos = Array.isArray(pedidos) ? pedidos : [];

  // Obtener ruta alternativa activa si existe
  const rutaAlternativaQuery = await query(
    `SELECT * FROM ruta_alternativa 
     WHERE ruta_id = ? AND activa = 1
     ORDER BY fecha_creacion DESC
     LIMIT 1`,
    [ruta.id]
  );
  const rutaAlternativa = Array.isArray(rutaAlternativaQuery) && rutaAlternativaQuery.length > 0 ? rutaAlternativaQuery[0] : null;

  if (rutaAlternativa) {
    ruta.ruta_alternativa = rutaAlternativa;
    // Parsear JSON si viene como string
    if (typeof rutaAlternativa.orden_secuencia_modificada === 'string') {
      ruta.ruta_alternativa.orden_secuencia_modificada = JSON.parse(rutaAlternativa.orden_secuencia_modificada);
    }
  }

  return ruta;
};

/**
 * Cambiar orden de pedidos en la ruta (crear ruta alternativa)
 */
const cambiarOrdenRuta = async (rutaId, repartidorId, nuevoOrden, motivo, esAdmin = false) => {
  return await transaction(async (connection) => {
    // Validar que la ruta pertenece al repartidor (o es admin)
    // connection.query() devuelve [rows, fields], necesitamos desestructurar
    const [rutasRows] = await connection.query(
      'SELECT id, repartidor_id, estado FROM rutas WHERE id = ?',
      [rutaId]
    );
    const rutas = Array.isArray(rutasRows) ? rutasRows : [];

    if (rutas.length === 0) {
      throw new Error('Ruta no encontrada');
    }

    if (!esAdmin && rutas[0].repartidor_id !== repartidorId) {
      throw new Error('No tienes permiso para modificar esta ruta');
    }

    if (!['planificada', 'activa', 'en_curso'].includes(rutas[0].estado)) {
      throw new Error('Solo se pueden modificar rutas planificadas, activas o en curso');
    }

    // Validar que todos los pedidos pertenecen a la ruta
    // connection.query() devuelve [rows, fields], necesitamos desestructurar
    const [pedidosRutaRows] = await connection.query(
      'SELECT orden_id FROM ruta_pedidos WHERE ruta_id = ?',
      [rutaId]
    );
    const pedidosRuta = Array.isArray(pedidosRutaRows) ? pedidosRutaRows : [];
    const pedidosIdsRuta = pedidosRuta.map((p) => p.orden_id);
    const nuevoOrdenIds = nuevoOrden.map((item) => item.orden_id);

    if (pedidosIdsRuta.length !== nuevoOrdenIds.length) {
      throw new Error('El nuevo orden debe incluir todos los pedidos de la ruta');
    }

    const todosIncluidos = nuevoOrdenIds.every((id) => pedidosIdsRuta.includes(id));
    if (!todosIncluidos) {
      throw new Error('El nuevo orden contiene pedidos que no pertenecen a la ruta');
    }

    // Desactivar rutas alternativas anteriores
    await connection.query(
      'UPDATE ruta_alternativa SET activa = 0 WHERE ruta_id = ?',
      [rutaId]
    );

    // Crear nueva ruta alternativa
    const rutaAlternativaId = uuidv4();
    await connection.query(
      `INSERT INTO ruta_alternativa 
       (id, ruta_id, repartidor_id, orden_secuencia_modificada, motivo, activa)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [rutaAlternativaId, rutaId, repartidorId, JSON.stringify(nuevoOrden), motivo || null]
    );

    return rutaAlternativaId;
  });
};

/**
 * Activar/desactivar ruta alternativa
 */
const toggleRutaAlternativa = async (rutaId, repartidorId, activar, esAdmin = false) => {
  return await transaction(async (connection) => {
    // Validar que la ruta pertenece al repartidor (o es admin)
    // connection.query() devuelve [rows, fields], necesitamos desestructurar
    const [rutasRows] = await connection.query(
      'SELECT id, repartidor_id FROM rutas WHERE id = ?',
      [rutaId]
    );
    const rutas = Array.isArray(rutasRows) ? rutasRows : [];

    if (rutas.length === 0) {
      throw new Error('Ruta no encontrada');
    }

    if (!esAdmin && rutas[0].repartidor_id !== repartidorId) {
      throw new Error('No tienes permiso para modificar esta ruta');
    }

    // Verificar que existe una ruta alternativa
    // connection.query() devuelve [rows, fields], necesitamos desestructurar
    const [rutaAlternativaRows] = await connection.query(
      'SELECT id FROM ruta_alternativa WHERE ruta_id = ? ORDER BY fecha_creacion DESC LIMIT 1',
      [rutaId]
    );
    const rutaAlternativa = Array.isArray(rutaAlternativaRows) && rutaAlternativaRows.length > 0 ? rutaAlternativaRows[0] : null;

    if (!rutaAlternativa) {
      throw new Error('No existe una ruta alternativa para esta ruta');
    }

    // Activar o desactivar
    await connection.query(
      'UPDATE ruta_alternativa SET activa = ? WHERE id = ?',
      [activar ? 1 : 0, rutaAlternativa.id]
    );

    return true;
  });
};

/**
 * Iniciar ruta (marcar como activa/en_curso)
 */
const iniciarRuta = async (rutaId, repartidorId, esAdmin = false) => {
  return await transaction(async (connection) => {
    // Validar que la ruta pertenece al repartidor (o es admin)
    // connection.query() devuelve [rows, fields], donde rows es un array
    const [rutasRows] = await connection.query(
      'SELECT id, repartidor_id, estado FROM rutas WHERE id = ?',
      [rutaId]
    );
    
    // rows es un array, necesitamos el primer elemento
    const rutas = Array.isArray(rutasRows) ? rutasRows : [];

    if (rutas.length === 0) {
      throw new Error('Ruta no encontrada');
    }

    const ruta = rutas[0];
    
    if (!esAdmin && ruta.repartidor_id !== repartidorId) {
      throw new Error('No tienes permiso para iniciar esta ruta');
    }

    const estadoActual = ruta.estado;
    
    // Debug: verificar qué estado tiene
    console.log('🔍 Estado de la ruta:', estadoActual);
    console.log('🔍 Ruta completa:', JSON.stringify(ruta, null, 2));
    if (estadoActual !== RUTA_ESTADO_PLANIFICADA && estadoActual !== RUTA_ESTADO_ACTIVA) {
      if (estadoActual === RUTA_ESTADO_EN_CURSO) {
        throw new Error('Esta ruta ya está en curso. No se puede iniciar nuevamente.');
      } else if (estadoActual === RUTA_ESTADO_COMPLETADA) {
        throw new Error('Esta ruta ya está completada. No se puede iniciar una ruta finalizada.');
      } else if (estadoActual === RUTA_ESTADO_CANCELADA) {
        throw new Error('Esta ruta está cancelada. No se puede iniciar una ruta cancelada.');
      } else {
        throw new Error(`Solo se pueden iniciar rutas planificadas o activas. Estado actual: ${estadoActual}`);
      }
    }

    // Actualizar estado de la ruta
    // connection.query() devuelve [rows, fields], pero no necesitamos el resultado
    await connection.query(
      'UPDATE rutas SET estado = ?, fecha_inicio = NOW() WHERE id = ?',
      [RUTA_ESTADO_EN_CURSO, rutaId]
    );

    // Actualizar estado de entregas a "en_camino" si están en "asignada"
    await connection.query(
      `UPDATE entregas 
       SET estado = 'en_camino', fecha_salida = NOW() 
       WHERE ruta_id = ? AND estado = 'asignada'`,
      [rutaId]
    );

    return true;
  });
};

/**
 * Finalizar ruta y liberar pedidos no entregados
 */
const finalizarRuta = async (rutaId, repartidorId, pedidosEntregados, pedidosNoEntregados, esAdmin = false) => {
  return await transaction(async (connection) => {
    // Validar que la ruta pertenece al repartidor (o es admin)
    // connection.query() devuelve [rows, fields], necesitamos desestructurar
    const [rutasRows] = await connection.query(
      'SELECT id, repartidor_id, estado FROM rutas WHERE id = ?',
      [rutaId]
    );
    const rutas = Array.isArray(rutasRows) ? rutasRows : [];

    if (rutas.length === 0) {
      throw new Error('Ruta no encontrada');
    }

    if (!esAdmin && rutas[0].repartidor_id !== repartidorId) {
      throw new Error('No tienes permiso para finalizar esta ruta');
    }

    if (rutas[0].estado !== RUTA_ESTADO_EN_CURSO) {
      throw new Error('Solo se pueden finalizar rutas en curso');
    }

    // Marcar pedidos entregados
    if (pedidosEntregados && pedidosEntregados.length > 0) {
      const placeholders = pedidosEntregados.map(() => '?').join(',');
      await connection.query(
        `UPDATE ruta_pedidos 
         SET estado = ? 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [PEDIDO_RUTA_ESTADO_ENTREGADO, rutaId, ...pedidosEntregados]
      );

      // Actualizar entregas
      await connection.query(
        `UPDATE entregas 
         SET estado = 'entregada', fecha_entrega = NOW() 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [rutaId, ...pedidosEntregados]
      );

      // Actualizar estado de ordenes
      await connection.query(
        `UPDATE ordenes 
         SET estado = 'entregada', fecha_actualizacion = NOW() 
         WHERE id IN (${placeholders})`,
        pedidosEntregados
      );
    }

    // Marcar pedidos no entregados y liberarlos
    if (pedidosNoEntregados && pedidosNoEntregados.length > 0) {
      const placeholders = pedidosNoEntregados.map(() => '?').join(',');
      
      // Actualizar estado en ruta_pedidos
      await connection.query(
        `UPDATE ruta_pedidos 
         SET estado = ? 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [PEDIDO_RUTA_ESTADO_NO_ENTREGADO, rutaId, ...pedidosNoEntregados]
      );

      // Cancelar entregas
      await connection.query(
        `UPDATE entregas 
         SET estado = 'cancelada', fecha_cancelacion = NOW() 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [rutaId, ...pedidosNoEntregados]
      );

      // Liberar pedidos: volver a estado "en_proceso" para que puedan ser reasignados
      await connection.query(
        `UPDATE ordenes 
         SET estado = 'en_proceso', fecha_actualizacion = NOW() 
         WHERE id IN (${placeholders})`,
        pedidosNoEntregados
      );

      // Eliminar relación de entregas con ruta (no eliminar, solo desvincular)
      await connection.query(
        `UPDATE entregas 
         SET ruta_id = NULL 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [rutaId, ...pedidosNoEntregados]
      );

      // Eliminar de ruta_pedidos para liberar completamente
      await connection.query(
        `DELETE FROM ruta_pedidos 
         WHERE ruta_id = ? AND orden_id IN (${placeholders})`,
        [rutaId, ...pedidosNoEntregados]
      );
    }

    // Actualizar estado de la ruta
    await connection.query(
      'UPDATE rutas SET estado = ?, fecha_fin = NOW() WHERE id = ?',
      [RUTA_ESTADO_COMPLETADA, rutaId]
    );

    return true;
  });
};

/**
 * Obtener todas las rutas (admin)
 */
const obtenerTodasRutas = async (filtros = {}) => {
  let sql = `
    SELECT r.*, 
           u.nombre_completo as repartidor_nombre,
           u.email as repartidor_email
    FROM rutas r
    INNER JOIN usuarios u ON r.repartidor_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (filtros.repartidor_id) {
    sql += ' AND r.repartidor_id = ?';
    params.push(filtros.repartidor_id);
  }

  if (filtros.estado) {
    sql += ' AND r.estado = ?';
    params.push(filtros.estado);
  }

  sql += ' ORDER BY r.fecha_creacion DESC';

  if (filtros.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filtros.limit));
  }

  if (filtros.offset) {
    sql += ' OFFSET ?';
    params.push(parseInt(filtros.offset));
  }

  // query() ya devuelve las filas directamente (no [rows, fields])
  const rutas = await query(sql, params);
  
  // Asegurar que rutas sea un array
  const rutasArray = Array.isArray(rutas) ? rutas : [];
  
  console.log(`📦 Rutas encontradas: ${rutasArray.length}`);
  if (rutasArray.length > 0) {
    console.log('Primera ruta:', JSON.stringify(rutasArray[0], null, 2));
  }

  // Obtener pedidos para cada ruta
  for (const ruta of rutasArray) {
    // query() ya devuelve las filas directamente
    const pedidos = await query(
      `SELECT rp.*, 
              o.numero_orden,
              o.estado as orden_estado,
              o.total,
              e.estado as entrega_estado,
              e.fecha_asignacion,
              e.fecha_salida,
              e.fecha_llegada,
              e.fecha_entrega,
              COALESCE(de.direccion, 'Dirección no disponible') as direccion,
              de.ciudad,
              de.departamento,
              de.nombre_destinatario,
              de.telefono
       FROM ruta_pedidos rp
       INNER JOIN ordenes o ON rp.orden_id = o.id
       LEFT JOIN entregas e ON rp.entrega_id = e.id
       LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
       WHERE rp.ruta_id = ?
       ORDER BY rp.orden_secuencia ASC`,
      [ruta.id]
    );
    ruta.pedidos = Array.isArray(pedidos) ? pedidos : [];

    // Obtener ruta alternativa (activa o inactiva) si existe
    // Primero intentar obtener la activa, si no hay, obtener la más reciente
    const rutaAlternativaActivaQuery = await query(
      `SELECT * FROM ruta_alternativa 
       WHERE ruta_id = ? AND activa = 1
       ORDER BY fecha_creacion DESC
       LIMIT 1`,
      [ruta.id]
    );
    
    let rutaAlternativa = null;
    if (Array.isArray(rutaAlternativaActivaQuery) && rutaAlternativaActivaQuery.length > 0) {
      rutaAlternativa = rutaAlternativaActivaQuery[0];
    } else {
      // Si no hay activa, obtener la más reciente (puede estar inactiva)
      const rutaAlternativaRecienteQuery = await query(
        `SELECT * FROM ruta_alternativa 
         WHERE ruta_id = ?
         ORDER BY fecha_creacion DESC
         LIMIT 1`,
        [ruta.id]
      );
      if (Array.isArray(rutaAlternativaRecienteQuery) && rutaAlternativaRecienteQuery.length > 0) {
        rutaAlternativa = rutaAlternativaRecienteQuery[0];
      }
    }

    if (rutaAlternativa) {
      ruta.ruta_alternativa = rutaAlternativa;
      // Parsear JSON si viene como string
      if (typeof rutaAlternativa.orden_secuencia_modificada === 'string') {
        try {
          ruta.ruta_alternativa.orden_secuencia_modificada = JSON.parse(rutaAlternativa.orden_secuencia_modificada);
        } catch (parseError) {
          console.error('❌ Error al parsear orden_secuencia_modificada:', parseError);
          ruta.ruta_alternativa.orden_secuencia_modificada = [];
        }
      }
      console.log(`✅ Ruta alternativa encontrada para ruta ${ruta.id}:`, {
        activa: rutaAlternativa.activa,
        motivo: rutaAlternativa.motivo,
        tiene_orden: !!ruta.ruta_alternativa.orden_secuencia_modificada,
      });
    } else {
      console.log(`ℹ️ No hay ruta alternativa para ruta ${ruta.id}`);
    }
  }

  // Obtener conteo total
  let countSql = `
    SELECT COUNT(*) as total
    FROM rutas r
    WHERE 1=1
  `;
  const countParams = [];

  if (filtros.repartidor_id) {
    countSql += ' AND r.repartidor_id = ?';
    countParams.push(filtros.repartidor_id);
  }

  if (filtros.estado) {
    countSql += ' AND r.estado = ?';
    countParams.push(filtros.estado);
  }

  // query() ya devuelve las filas directamente
  const countResult = await query(countSql, countParams);
  const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0]?.total || 0) : 0;

  console.log(`📊 Total de rutas: ${total}`);
  console.log(`📦 Rutas a retornar: ${rutasArray.length}`);

  const resultado = {
    rutas: rutasArray,
    total,
  };
  
  console.log('✅ Resultado final:', JSON.stringify({ total: resultado.total, rutasCount: resultado.rutas.length }, null, 2));

  return resultado;
};

module.exports = {
  crearRuta,
  obtenerRutaActiva,
  cambiarOrdenRuta,
  toggleRutaAlternativa,
  iniciarRuta,
  finalizarRuta,
  obtenerTodasRutas,
};
