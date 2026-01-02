// ============================================
// SERVICIO DE ASESOR - COMENTADO (NO EN USO)
// ============================================

/* COMENTADO - MÓDULO DE ASESOR NO EN USO
const { v4: uuidv4 } = require('uuid');

const { query, transaction } = require('../config/database');
const Order = require('../models/Order');

const DEFAULT_CONFIRMATION_WINDOW_HOURS = 4;

const ADVISOR_STATE_PENDING = 'pendiente_ruta';
const ADVISOR_STATE_ASSIGNED = 'ruta_asignada';
const ADVISOR_STATE_REJECTED = 'rechazado';

const PRIORITY_VALUES = ['alta', 'media', 'baja'];

const ORDERABLE_FIELDS = {
  fecha_creacion: 'o.fecha_creacion',
  fecha_programada: 'ol.fecha_programada',
  prioridad: 'ol.prioridad',
};

const formatDateToISO = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const ensureAdvisorTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS ordenes_logistica (
      orden_id CHAR(36) PRIMARY KEY,
      fecha_programada DATETIME NULL,
      fecha_limite_confirmacion DATETIME NULL,
      prioridad ENUM('alta','media','baja') DEFAULT 'media',
      estado_logistico ENUM('pendiente_ruta','ruta_asignada','en_transito','entregado','rechazado') DEFAULT 'pendiente_ruta',
      observaciones TEXT NULL,
      observaciones_asesor TEXT NULL,
      latitud DECIMAL(10,7) NULL,
      longitud DECIMAL(10,7) NULL,
      ruta_asignada_por_id CHAR(36) NULL,
      ruta_asignada_por_nombre VARCHAR(255) NULL,
      fecha_ruta_asignada DATETIME NULL,
      confirmado_por_id CHAR(36) NULL,
      confirmado_por_nombre VARCHAR(255) NULL,
      fecha_confirmacion DATETIME NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orden_logistica_orden FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Añadir columnas de trazabilidad si no existen (para migraciones)
  try {
    const columns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ordenes_logistica' 
      AND COLUMN_NAME = 'ruta_asignada_por_id'
    `);
    
    if (!columns || columns.length === 0) {
      await query(`
        ALTER TABLE ordenes_logistica 
        ADD COLUMN ruta_asignada_por_id CHAR(36) NULL,
        ADD COLUMN ruta_asignada_por_nombre VARCHAR(255) NULL,
        ADD COLUMN fecha_ruta_asignada DATETIME NULL,
        ADD COLUMN confirmado_por_id CHAR(36) NULL,
        ADD COLUMN confirmado_por_nombre VARCHAR(255) NULL,
        ADD COLUMN fecha_confirmacion DATETIME NULL
      `);
    }
  } catch (error) {
    // Ignorar error si las columnas ya existen o hay otro problema
    console.log('ℹ️ Columnas de trazabilidad ya existen o error al verificar:', error.message);
  }
};

const seedDefaultRoutes = async () => {
  const existing = await query('SELECT COUNT(*) as total FROM rutas_logisticas');
  const total = existing?.[0]?.total || 0;
  if (total > 0) {
    return;
  }

  const defaultRoutes = [
    {
      nombre: 'Ruta Centro 1',
      zona: 'Centro',
      capacidadMaxima: 30,
      capacidadDisponible: 30,
      horaSalida: '08:00:00',
      conductor: 'Juan Pérez',
      vehiculo: 'Furgón ABC-123',
    },
    {
      nombre: 'Ruta Norte Express',
      zona: 'Norte',
      capacidadMaxima: 25,
      capacidadDisponible: 25,
      horaSalida: '09:00:00',
      conductor: 'María Gómez',
      vehiculo: 'Camión NRT-908',
    },
    {
      nombre: 'Ruta Sur Programada',
      zona: 'Sur',
      capacidadMaxima: 20,
      capacidadDisponible: 20,
      horaSalida: '10:30:00',
      conductor: 'Carlos Ríos',
      vehiculo: 'Van SUR-456',
    },
  ];

  for (const route of defaultRoutes) {
    await query(
      `INSERT INTO rutas_logisticas (id, nombre, zona, capacidad_maxima, capacidad_disponible, hora_salida, conductor, vehiculo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        route.nombre,
        route.zona,
        route.capacidadMaxima,
        route.capacidadDisponible,
        route.horaSalida,
        route.conductor,
        route.vehiculo,
      ],
    );
  }
};

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }
};

const serializeObservaciones = (observaciones) => {
  if (!observaciones || observaciones.length === 0) {
    return null;
  }
  return JSON.stringify(observaciones);
};

const buildBaseFilters = (filters = {}) => {
  const params = [];
  let whereClause = 'WHERE 1=1';

  // Por defecto, mostrar solo pedidos confirmados (listos para asignar repartidor)
  const estado = filters.estado || 'confirmada';
  whereClause += ' AND o.estado = ?';
  params.push(estado);

  if (filters.fechaDesde) {
    whereClause += ' AND DATE(o.fecha_creacion) >= ?';
    params.push(filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    whereClause += ' AND DATE(o.fecha_creacion) <= ?';
    params.push(filters.fechaHasta);
  }

  if (filters.cliente) {
    whereClause += ' AND (u.nombre_completo LIKE ? OR u.email LIKE ?)';
    const value = `%${filters.cliente}%`;
    params.push(value, value);
  }

  if (filters.zona) {
    whereClause += ' AND (de.departamento = ? OR de.ciudad = ?)';
    params.push(filters.zona, filters.zona);
  }


  if (filters.prioridad && filters.prioridad !== 'todas') {
    whereClause += ' AND ol.prioridad = ?';
    params.push(filters.prioridad);
  }

  if (filters.busqueda) {
    const value = `%${filters.busqueda}%`;
    whereClause += ' AND (o.numero_orden LIKE ? OR u.nombre_completo LIKE ? OR u.email LIKE ?)';
    params.push(value, value, value);
  }

  return { whereClause, params };
};

const mapOrderRow = (row) => {
  const fechaProgramadaEntrega = formatDateToISO(row.fecha_programada);

  const fechaLimite = row.fecha_limite_confirmacion
    ? new Date(row.fecha_limite_confirmacion)
    : row.fecha_creacion
    ? new Date(new Date(row.fecha_creacion).getTime() + DEFAULT_CONFIRMATION_WINDOW_HOURS * 3600 * 1000)
    : null;

  const tiempoRestanteMinutos = fechaLimite
    ? Math.round((fechaLimite.getTime() - Date.now()) / 60000)
    : null;

  return {
    id: row.id,
    numeroOrden: row.numero_orden,
    usuarioId: row.usuario_id,
    estado: row.estado,
    total: Number(row.total),
    subtotal: Number(row.subtotal ?? 0),
    descuento: Number(row.descuento ?? 0),
    costoEnvio: Number(row.costo_envio ?? 0),
    impuestos: Number(row.impuestos ?? 0),
    metodoPago: row.metodo_pago,
    referenciaPago: row.referencia_pago,
    notas: row.notas,
    fechaCreacion: formatDateToISO(row.fecha_creacion),
    fechaActualizacion: formatDateToISO(row.fecha_actualizacion),
    fechaEntregaEstimada: formatDateToISO(row.fecha_entrega_estimada),
    fechaEntregaReal: formatDateToISO(row.fecha_entrega_real),
    itemsCount: row.items_count ? Number(row.items_count) : 0,
    usuario: {
      email: row.usuario_email,
      nombreCompleto: row.usuario_nombre,
      tipoIdentificacion: row.usuario_tipo_identificacion,
      numeroIdentificacion: row.usuario_numero_identificacion,
    },
    direccionEnvio: row.direccion_id
      ? {
          id: row.direccion_id,
          nombreDestinatario: row.nombre_destinatario,
          telefono: row.telefono,
          direccion: row.direccion,
          ciudad: row.ciudad,
          departamento: row.departamento,
          codigoPostal: row.codigo_postal,
          pais: row.pais,
        }
      : null,
    zona: row.departamento || null,
    prioridad: row.prioridad || 'media',
    fechaProgramadaEntrega,
    fechaLimiteConfirmacion: fechaLimite ? fechaLimite.toISOString() : null,
    estadoLogistico: row.estado_logistico || ADVISOR_STATE_PENDING,
    tiempoRestanteMinutos,
    coordenadasEntrega:
      row.latitud && row.longitud
        ? {
            latitud: Number(row.latitud),
            longitud: Number(row.longitud),
          }
        : null,
    observacionesLogistica: parseJsonArray(row.observaciones_logistica),
    observacionesAsesor: parseJsonArray(row.observaciones_asesor),
    rutaAsignadaPor: row.ruta_asignada_por_nombre
      ? {
          id: row.ruta_asignada_por_id,
          nombre: row.ruta_asignada_por_nombre,
          fecha: formatDateToISO(row.fecha_ruta_asignada),
        }
      : null,
    confirmadoPor: row.confirmado_por_nombre
      ? {
          id: row.confirmado_por_id,
          nombre: row.confirmado_por_nombre,
          fecha: formatDateToISO(row.fecha_confirmacion),
        }
      : null,
      repartidor: row.repartidor_nombre
      ?{
        id: row.repartidor_id,
        nombre: row.repartidor_nombre,
        entregaId: row.entrega_id,
        estadoEntrega: row.entrega_estado,
      }
      : null,
  };
};

const getIndicatorsMetrics = async () => {
  const indicatorRows = await query(`
    SELECT
      SUM(CASE WHEN o.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientesTotales,
      SUM(
        CASE
          WHEN o.estado = 'confirmada' AND DATE(o.fecha_actualizacion) = CURDATE() THEN 1
          ELSE 0
        END
      ) AS confirmadosHoy,
      SUM(
        CASE
          WHEN ol.estado_logistico = 'rechazado' AND DATE(ol.fecha_actualizacion) = CURDATE() THEN 1
          ELSE 0
        END
      ) AS rechazadosHoy
    FROM ordenes o
    LEFT JOIN ordenes_logistica ol ON ol.orden_id = o.id
  `);

  const indicatorRow = indicatorRows?.[0];

  return {
    pendientesTotales: Number(indicatorRow?.pendientesTotales ?? 0),
    confirmadosHoy: Number(indicatorRow?.confirmadosHoy ?? 0),
    rechazadosHoy: Number(indicatorRow?.rechazadosHoy ?? 0),
  };
};

const getPendingOrders = async (filters = {}) => {
  const { whereClause, params } = buildBaseFilters(filters);

  const orderByField = ORDERABLE_FIELDS[filters.ordenarPor] || 'o.fecha_creacion';
  const orderDir = filters.direccionOrden === 'DESC' ? 'DESC' : 'ASC';

  const limit = Math.min(Number(filters.limit ?? 25), 100);
  const offset = Math.max(Number(filters.offset ?? 0), 0);

  const baseFrom = `
    FROM ordenes o
    JOIN usuarios u ON o.usuario_id = u.id
    LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
    LEFT JOIN ordenes_logistica ol ON ol.orden_id = o.id
    ${whereClause}
  `;

  const selectSql = `
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
      ol.fecha_programada,
      ol.fecha_limite_confirmacion,
      ol.prioridad,
      ol.estado_logistico,
      ol.observaciones AS observaciones_logistica,
      ol.observaciones_asesor,
      ol.latitud,
      ol.longitud,
      ol.ruta_asignada_por_id,
      ol.ruta_asignada_por_nombre,
      ol.fecha_ruta_asignada,
      ol.confirmado_por_id,
      ol.confirmado_por_nombre,
      ol.fecha_confirmacion,
        (SELECT e.id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida') ORDER BY e.fecha_asignacion DESC LIMIT 1) AS entrega_id,
      (SELECT e.repartidor_id FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida') ORDER BY e.fecha_asignacion DESC LIMIT 1) AS repartidor_id,
      (SELECT r.nombre_completo FROM entregas e 
       LEFT JOIN usuarios r ON e.repartidor_id = r.id 
       WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida') 
       ORDER BY e.fecha_asignacion DESC LIMIT 1) AS repartidor_nombre,
      (SELECT e.estado FROM entregas e WHERE e.orden_id = o.id AND e.estado NOT IN ('cancelada', 'fallida') ORDER BY e.fecha_asignacion DESC LIMIT 1) AS entrega_estado,
      (SELECT COUNT(*) FROM items_orden io WHERE io.orden_id = o.id) AS items_count
    ${baseFrom}
    ORDER BY ${orderByField} ${orderDir}
    LIMIT ? OFFSET ?
  `;

  const rows = await query(selectSql, [...params, limit, offset]);
  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom}`, params);
  const total = Number(countRows?.[0]?.total ?? 0);

  const pedidos = rows.map(mapOrderRow);

  const proximosAVencer = pedidos.filter(
    (pedido) => typeof pedido.tiempoRestanteMinutos === 'number' && pedido.tiempoRestanteMinutos >= 0 && pedido.tiempoRestanteMinutos <= 60,
  ).length;

  const vencidos = pedidos.filter(
    (pedido) => typeof pedido.tiempoRestanteMinutos === 'number' && pedido.tiempoRestanteMinutos < 0,
  ).length;

  const metrics = await getIndicatorsMetrics();

  return {
    pedidos,
    total,
    indicadores: {
      pendientesTotales: metrics.pendientesTotales,
      proximosAVencer,
      vencidos,
      confirmadosHoy: metrics.confirmadosHoy,
      rechazadosHoy: metrics.rechazadosHoy,
      promedioConfirmacionHoras: undefined,
      capacidadRutaDisponible: metrics.capacidadRutaDisponible,
    },
  };
};

const getIndicators = async () => {
  const metrics = await getIndicatorsMetrics();
  return {
    pendientesTotales: metrics.pendientesTotales,
    proximosAVencer: 0,
    vencidos: 0,
    confirmadosHoy: metrics.confirmadosHoy,
    rechazadosHoy: metrics.rechazadosHoy,
    promedioConfirmacionHoras: undefined,
    capacidadRutaDisponible: metrics.capacidadRutaDisponible,
  };
};

const getOrderWithLogistics = async (orderId) => {
  const rows = await query(
    `
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
        ol.fecha_programada,
        ol.fecha_limite_confirmacion,
        ol.prioridad,
        ol.estado_logistico,
        ol.observaciones AS observaciones_logistica,
        ol.observaciones_asesor,
        ol.latitud,
        ol.longitud,
        ol.ruta_asignada_por_id,
        ol.ruta_asignada_por_nombre,
        ol.fecha_ruta_asignada,
        ol.confirmado_por_id,
        ol.confirmado_por_nombre,
        ol.fecha_confirmacion,
        (SELECT COUNT(*) FROM items_orden io WHERE io.orden_id = o.id) AS items_count
      FROM ordenes o
      JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN direcciones_envio de ON o.direccion_envio_id = de.id
      LEFT JOIN ordenes_logistica ol ON ol.orden_id = o.id
      WHERE o.id = ?
    `,
    [orderId],
  );

  if (!rows.length) {
    return null;
  }

  const mapped = mapOrderRow(rows[0]);
  const orderDetail = await Order.findById(orderId);

  if (!orderDetail) {
    return mapped;
  }

  return {
    ...orderDetail.toPublicObject(),
    ...mapped,
    items: orderDetail.items,
    historialEstados: parseJsonArray(rows[0].observaciones_logistica).map((nota) => ({
      estado: mapped.estadoLogistico,
      fecha: mapped.fechaActualizacion,
      notas: nota,
    })),
  };
};

const upsertLogisticEntry = async (connection, orderId, data) => {
  const [rows] = await connection.execute(
    'SELECT * FROM ordenes_logistica WHERE orden_id = ?',
    [orderId],
  );

  const existing = rows?.[0];

  const mergedObservaciones = data.observaciones
    ? [...parseJsonArray(existing?.observaciones), ...data.observaciones]
    : parseJsonArray(existing?.observaciones);

  const mergedObservacionesAsesor = data.observacionesAsesor
    ? [...parseJsonArray(existing?.observaciones_asesor), ...data.observacionesAsesor]
    : parseJsonArray(existing?.observaciones_asesor);

  const payload = {
    fechaProgramada: data.fechaProgramada ?? existing?.fecha_programada ?? null,
    fechaLimiteConfirmacion: data.fechaLimiteConfirmacion ?? existing?.fecha_limite_confirmacion ?? null,
    prioridad: PRIORITY_VALUES.includes(data.prioridad) ? data.prioridad : existing?.prioridad ?? 'media',
    estadoLogistico: data.estadoLogistico ?? existing?.estado_logistico ?? ADVISOR_STATE_PENDING,
    observaciones: serializeObservaciones(mergedObservaciones),
    observacionesAsesor: serializeObservaciones(mergedObservacionesAsesor),
    latitud: data.latitud ?? existing?.latitud ?? null,
    longitud: data.longitud ?? existing?.longitud ?? null,
    rutaAsignadaPorId: data.rutaAsignadaPorId ?? existing?.ruta_asignada_por_id ?? null,
    rutaAsignadaPorNombre: data.rutaAsignadaPorNombre ?? existing?.ruta_asignada_por_nombre ?? null,
    fechaRutaAsignada: data.fechaRutaAsignada ?? existing?.fecha_ruta_asignada ?? null,
    confirmadoPorId: data.confirmadoPorId ?? existing?.confirmado_por_id ?? null,
    confirmadoPorNombre: data.confirmadoPorNombre ?? existing?.confirmado_por_nombre ?? null,
    fechaConfirmacion: data.fechaConfirmacion ?? existing?.fecha_confirmacion ?? null,
  };

  if (existing) {
    await connection.execute(
      `UPDATE ordenes_logistica
         SET fecha_programada = ?,
             fecha_limite_confirmacion = ?,
             prioridad = ?,
             estado_logistico = ?,
             observaciones = ?,
             observaciones_asesor = ?,
             latitud = ?,
             longitud = ?,
             ruta_asignada_por_id = ?,
             ruta_asignada_por_nombre = ?,
             fecha_ruta_asignada = ?,
             confirmado_por_id = ?,
             confirmado_por_nombre = ?,
             fecha_confirmacion = ?
       WHERE orden_id = ?`,
      [
        payload.fechaProgramada,
        payload.fechaLimiteConfirmacion,
        payload.prioridad,
        payload.estadoLogistico,
        payload.observaciones,
        payload.observacionesAsesor,
        payload.latitud,
        payload.longitud,
        payload.rutaAsignadaPorId,
        payload.rutaAsignadaPorNombre,
        payload.fechaRutaAsignada,
        payload.confirmadoPorId,
        payload.confirmadoPorNombre,
        payload.fechaConfirmacion,
        orderId,
      ],
    );
  } else {
    await connection.execute(
      `INSERT INTO ordenes_logistica (
         orden_id,
         fecha_programada,
         fecha_limite_confirmacion,
         prioridad,
         estado_logistico,
         observaciones,
         observaciones_asesor,
         latitud,
         longitud,
         ruta_asignada_por_id,
         ruta_asignada_por_nombre,
         fecha_ruta_asignada,
         confirmado_por_id,
         confirmado_por_nombre,
         fecha_confirmacion
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        payload.fechaProgramada,
        payload.fechaLimiteConfirmacion,
        payload.prioridad,
        payload.estadoLogistico,
        payload.observaciones,
        payload.observacionesAsesor,
        payload.latitud,
        payload.longitud,
        payload.rutaAsignadaPorId,
        payload.rutaAsignadaPorNombre,
        payload.fechaRutaAsignada,
        payload.confirmadoPorId,
        payload.confirmadoPorNombre,
        payload.fechaConfirmacion,
      ],
    );
  }
};

const confirmOrder = async ({ orderId, fechaProgramada, observaciones, userId, userName }) => {
  await transaction(async (connection) => {
    // Obtener información actual del pedido logístico
    const [logisticRows] = await connection.execute('SELECT * FROM ordenes_logistica WHERE orden_id = ?', [orderId]);
    const logisticData = logisticRows?.[0];

    // Cambiar el estado del pedido a confirmada (esto es lo que cambia el estado principal)
    await connection.execute('UPDATE ordenes SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?', [
      'confirmada',
      orderId,
    ]);

    const fechaProgramadaISO = fechaProgramada
      ? new Date(fechaProgramada).toISOString().slice(0, 19).replace('T', ' ')
      : logisticData?.fecha_programada || null;
    const fechaConfirmacionISO = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const observacionesAsesor = observaciones
      ? [...parseJsonArray(logisticData?.observaciones_asesor), `${new Date().toISOString()}: Confirmado - ${observaciones}`]
      : parseJsonArray(logisticData?.observaciones_asesor);

    // Actualizar la entrada logística con información de confirmación
    await upsertLogisticEntry(connection, orderId, {
      fechaProgramada: fechaProgramadaISO,
      fechaLimiteConfirmacion: fechaProgramadaISO || logisticData?.fecha_limite_confirmacion || null,
      prioridad: logisticData?.prioridad || 'media',
      estadoLogistico: ADVISOR_STATE_ASSIGNED, // Mantener como ruta_asignada, el estado del pedido cambió a confirmada
      observacionesAsesor,
      rutaAsignadaPorId: logisticData?.ruta_asignada_por_id || null,
      rutaAsignadaPorNombre: logisticData?.ruta_asignada_por_nombre || null,
      fechaRutaAsignada: logisticData?.fecha_ruta_asignada || null,
      confirmadoPorId: userId,
      confirmadoPorNombre: userName,
      fechaConfirmacion: fechaConfirmacionISO,
    });
  });

  return getOrderWithLogistics(orderId);
};

const rejectOrder = async ({ orderId, motivo, observaciones }) => {
  if (!motivo) {
    throw new Error('Debes especificar un motivo para rechazar el pedido');
  }

  await transaction(async (connection) => {
    const [orderRows] = await connection.execute('SELECT notas FROM ordenes WHERE id = ?', [orderId]);
    const currentNotes = orderRows?.[0]?.notas || '';
    const rejectionNote = `Rechazado (${new Date().toISOString()}): ${motivo}${observaciones ? ` - ${observaciones}` : ''}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${rejectionNote}` : rejectionNote;

    await connection.execute('UPDATE ordenes SET estado = ?, notas = ?, fecha_actualizacion = NOW() WHERE id = ?', [
      'cancelada',
      updatedNotes,
      orderId,
    ]);

    const observacionesAsesor = [rejectionNote];

    await upsertLogisticEntry(connection, orderId, {
      estadoLogistico: ADVISOR_STATE_REJECTED,
      observacionesAsesor,
    });
  });

  return getOrderWithLogistics(orderId);
};

const initAdvisorModule = async () => {
  await ensureAdvisorTables();
};

module.exports = {
  initAdvisorModule,
  getPendingOrders,
  getIndicators,
  confirmOrder,
  rejectOrder,
};
*/


