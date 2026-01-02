const rutasService = require('../services/rutasService');

/**
 * Crear una nueva ruta para un repartidor
 */
const crearRuta = async (req, res) => {
  try {
    const { repartidor_id, nombre, descripcion, capacidad_maxima, pedidos_ids } = req.body;
    const creadoPorId = req.user?.id;

    if (!repartidor_id || !nombre || !pedidos_ids || !Array.isArray(pedidos_ids) || pedidos_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'repartidor_id, nombre y pedidos_ids son requeridos',
      });
    }

    if (capacidad_maxima && pedidos_ids.length > capacidad_maxima) {
      return res.status(400).json({
        success: false,
        message: `La cantidad de pedidos (${pedidos_ids.length}) excede la capacidad máxima (${capacidad_maxima})`,
      });
    }

    const rutaId = await rutasService.crearRuta(
      repartidor_id,
      nombre,
      descripcion || null,
      capacidad_maxima || 10,
      pedidos_ids,
      creadoPorId
    );

    res.json({
      success: true,
      message: 'Ruta creada exitosamente',
      data: { ruta_id: rutaId },
    });
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear ruta',
    });
  }
};

/**
 * Obtener ruta activa del repartidor autenticado
 */
const obtenerMiRuta = async (req, res) => {
  try {
    const repartidorId = req.user?.id;

    if (!repartidorId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const ruta = await rutasService.obtenerRutaActiva(repartidorId);

    if (!ruta) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una ruta activa asignada',
      });
    }

    res.json({
      success: true,
      message: 'Ruta obtenida correctamente',
      data: ruta,
    });
  } catch (error) {
    console.error('Error al obtener ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener ruta',
    });
  }
};

/**
 * Cambiar orden de pedidos en la ruta (crear ruta alternativa)
 */
const cambiarOrdenRuta = async (req, res) => {
  try {
    const { ruta_id, nuevo_orden, motivo } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    if (!ruta_id || !nuevo_orden || !Array.isArray(nuevo_orden)) {
      return res.status(400).json({
        success: false,
        message: 'ruta_id y nuevo_orden (array) son requeridos',
      });
    }

    // Validar formato de nuevo_orden
    const formatoValido = nuevo_orden.every(
      (item) => item.orden_id && typeof item.secuencia === 'number'
    );

    if (!formatoValido) {
      return res.status(400).json({
        success: false,
        message: 'nuevo_orden debe ser un array de objetos con orden_id y secuencia',
      });
    }

    // Si es admin o moderator, puede modificar cualquier ruta
    const esAdmin = userRole === 'admin' || userRole === 'moderator';
    const rutaAlternativaId = await rutasService.cambiarOrdenRuta(
      ruta_id,
      userId,
      nuevo_orden,
      motivo || null,
      esAdmin
    );

    res.json({
      success: true,
      message: 'Orden de ruta modificado exitosamente. La ruta alternativa está activa.',
      data: { ruta_alternativa_id: rutaAlternativaId },
    });
  } catch (error) {
    console.error('Error al cambiar orden de ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cambiar orden de ruta',
    });
  }
};

/**
 * Activar/desactivar ruta alternativa
 */
const toggleRutaAlternativa = async (req, res) => {
  try {
    const { ruta_id, activar } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    if (!ruta_id || typeof activar !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'ruta_id y activar (boolean) son requeridos',
      });
    }

    // Si es admin o moderator, puede activar/desactivar cualquier ruta alternativa
    const esAdmin = userRole === 'admin' || userRole === 'moderator';
    await rutasService.toggleRutaAlternativa(ruta_id, userId, activar, esAdmin);

    res.json({
      success: true,
      message: activar ? 'Ruta alternativa activada' : 'Ruta alternativa desactivada. Se usa la ruta principal.',
    });
  } catch (error) {
    console.error('Error al cambiar estado de ruta alternativa:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cambiar estado de ruta alternativa',
    });
  }
};

/**
 * Iniciar ruta
 */
const iniciarRuta = async (req, res) => {
  try {
    const { ruta_id } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    if (!ruta_id) {
      return res.status(400).json({
        success: false,
        message: 'ruta_id es requerido',
      });
    }

    // Si es admin o moderator, puede iniciar cualquier ruta
    const esAdmin = userRole === 'admin' || userRole === 'moderator';
    await rutasService.iniciarRuta(ruta_id, userId, esAdmin);

    res.json({
      success: true,
      message: 'Ruta iniciada exitosamente',
    });
  } catch (error) {
    console.error('Error al iniciar ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al iniciar ruta',
    });
  }
};

/**
 * Finalizar ruta y liberar pedidos no entregados
 */
const finalizarRuta = async (req, res) => {
  try {
    const { ruta_id, pedidos_entregados, pedidos_no_entregados } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    if (!ruta_id) {
      return res.status(400).json({
        success: false,
        message: 'ruta_id es requerido',
      });
    }

    if (!pedidos_entregados || !Array.isArray(pedidos_entregados)) {
      return res.status(400).json({
        success: false,
        message: 'pedidos_entregados debe ser un array',
      });
    }

    if (!pedidos_no_entregados || !Array.isArray(pedidos_no_entregados)) {
      return res.status(400).json({
        success: false,
        message: 'pedidos_no_entregados debe ser un array',
      });
    }

    // Si es admin o moderator, puede finalizar cualquier ruta
    const esAdmin = userRole === 'admin' || userRole === 'moderator';
    await rutasService.finalizarRuta(
      ruta_id,
      userId,
      pedidos_entregados,
      pedidos_no_entregados,
      esAdmin
    );

    res.json({
      success: true,
      message: 'Ruta finalizada exitosamente. Pedidos no entregados han sido liberados.',
    });
  } catch (error) {
    console.error('Error al finalizar ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al finalizar ruta',
    });
  }
};

/**
 * Obtener todas las rutas (admin)
 */
const obtenerTodasRutas = async (req, res) => {
  try {
    const { repartidor_id, estado, limit, offset } = req.query;

    const filtros = {};
    if (repartidor_id) filtros.repartidor_id = repartidor_id;
    if (estado) filtros.estado = estado;
    if (limit) filtros.limit = parseInt(limit);
    if (offset) filtros.offset = parseInt(offset);

    const resultado = await rutasService.obtenerTodasRutas(filtros);

    res.json({
      success: true,
      message: 'Rutas obtenidas correctamente',
      data: resultado,
    });
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener rutas',
    });
  }
};

module.exports = {
  crearRuta,
  obtenerMiRuta,
  cambiarOrdenRuta,
  toggleRutaAlternativa,
  iniciarRuta,
  finalizarRuta,
  obtenerTodasRutas,
};

