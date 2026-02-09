/**
 * SINCRONIZADOR DE INVENTARIO ENTRE TNS Y BASE LOCAL
 * -------------------------------------------------
 * Autor: Pallares
 * Descripción: Sincroniza SOLO productos existentes desde TNS a la tabla `productos`
 * del aplicativo móvil. Solo actualiza productos que ya existen en MySQL
 * (donde el código TNS coincide con el SKU en la tabla productos).
 * NO crea productos nuevos ni desactiva productos obsoletos.
 */

const cron = require("node-cron");
const crypto = require("crypto");
const { executeQuery, executeTransactionWithCallback } = require("./config/database");
const { executeMySQLQuery } = require("./config-mysql");
const config = require("./config/app.config");

/* ============================================================
   CONFIGURACIÓN GENERAL
   ============================================================ */
const SYNC_CONFIG = {
  cronExpression: "*/5 * * * *", // cada 5 minutos
  logLevel: process.env.SYNC_LOG_LEVEL || "info",
  maxRetries: 3,
  retryDelay: 5000,
  queryTimeout: 30000,
  batchSize: 100,
};

/* ============================================================
   LOGGING
   ============================================================ */
class SyncLogger {
  constructor(level = "info") {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [SYNC-${level.toUpperCase()}] ${message}`;
      console.log(logMessage + (data ? ` ${JSON.stringify(data)}` : ""));
    }
  }

  error(message, data = null) { this.log("error", message, data); }
  warn(message, data = null) { this.log("warn", message, data); }
  info(message, data = null) { this.log("info", message, data); }
  debug(message, data = null) { this.log("debug", message, data); }
}

const logger = new SyncLogger(SYNC_CONFIG.logLevel);

/* ============================================================
   FUNCIÓN: OBTENER PRODUCTOS EXISTENTES EN MYSQL
   ============================================================ */
async function obtenerProductosExistentesEnMySQL() {
  try {
    logger.debug("Consultando productos existentes en MySQL...");
    
    const query = "SELECT sku FROM productos WHERE sku IS NOT NULL AND sku != ''";
    const resultados = await executeMySQLQuery(query);
    
    const skusExistentes = resultados.map(row => row.sku);
    logger.info(`Encontrados ${skusExistentes.length} productos con SKU en MySQL`);
    
    return skusExistentes;
  } catch (error) {
    logger.error("Error obteniendo productos existentes en MySQL:", error.message);
    throw error;
  }
}

/* ============================================================
   FUNCIÓN: OBTENER INVENTARIO DESDE TNS (SOLO PRODUCTOS EXISTENTES)
   ============================================================ */
async function obtenerInventarioTNS() {
  try {
    logger.debug("Consultando inventario desde TNS...");

    // Primero obtener los SKUs existentes en MySQL
    const skusExistentes = await obtenerProductosExistentesEnMySQL();
    
    if (skusExistentes.length === 0) {
      logger.warn("No hay productos con SKU en MySQL para sincronizar");
      return [];
    }

    // Crear placeholders para la consulta IN
    const placeholders = skusExistentes.map(() => '?').join(',');
    
    const query = `
      SELECT 
        m.MATID, m.CODIGO, m.DESCRIP, m.UNIDAD, m.GRUPMATID,
        b.EXISTENC, b.PRECIO1, b.PRECIO2, b.INACTIVO
      FROM MATERIAL m
      LEFT JOIN MATERIALSUC b ON m.MATID = b.MATID
      WHERE (b.INACTIVO = 'N' OR b.INACTIVO IS NULL)
      AND m.CODIGO IN (${placeholders})
      ORDER BY m.CODIGO
    `;

    const resultados = await executeQuery(query, skusExistentes);
    logger.info(`Obtenidos ${resultados.length} productos desde TNS (solo existentes en MySQL)`);
    return resultados;
  } catch (error) {
    logger.error("Error obteniendo inventario desde TNS:", error.message);
    throw error;
  }
}

/* ============================================================
   FUNCIÓN: VERIFICAR PRODUCTO EXISTENTE
   ============================================================ */
async function verificarProductoExistente(sku) {
  try {
    const query = "SELECT COUNT(*) AS existe FROM productos WHERE sku = ?";
    const resultado = await executeMySQLQuery(query, [sku]);
    return resultado?.[0]?.existe > 0;
  } catch (error) {
    logger.error(`Error verificando producto existente ${sku}:`, error.message);
    return false;
  }
}

/* ============================================================
   FUNCIÓN: ACTUALIZAR PRODUCTO EXISTENTE
   ============================================================ */
async function actualizarProductoExistente(producto) {
  try {
    const query = `
      UPDATE productos SET
        nombre = ?,
        slug = ?,
        descripcion = ?,
        precio = ?,
        stock = ?,
        activo = ?,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE sku = ?
    `;

    const slug = generarSlug(producto.DESCRIP);

    // Validar y preparar datos según las restricciones de la tabla
    const precio = Math.max(0, producto.PRECIO1 || 0);
    const stock = Math.max(0, producto.EXISTENC || 0);

    const params = [
      producto.DESCRIP,
      slug,
      producto.DESCRIP,
      precio,
      stock,
      producto.INACTIVO === "N" || producto.INACTIVO === null ? 1 : 0,
      producto.CODIGO,
    ];

    await executeMySQLQuery(query, params);
    logger.debug(`Producto actualizado: ${producto.CODIGO}`);
  } catch (error) {
    logger.error(`Error actualizando producto ${producto.CODIGO}:`, error.message);
    throw error;
  }
}

/* ============================================================
   FUNCIÓN: CREAR NUEVO PRODUCTO (COMENTADA)
   ============================================================ */
/*
async function crearNuevoProducto(producto) {
  try {
    const uuid = crypto.randomUUID();
    const slug = generarSlug(producto.DESCRIP);

    const query = `
      INSERT INTO productos (
        id, nombre, slug, descripcion, precio, categoria_id,
        stock, stock_minimo, activo, destacado, peso, dimensiones, etiquetas,
        codigo_barras, sku, fecha_creacion, fecha_actualizacion,
        ventas_totales, calificacion_promedio, total_resenas
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP, ?, ?, ?
      )
    `;

    // Validar y preparar datos según las restricciones de la tabla
    const precio = Math.max(0, producto.PRECIO1 || 0);
    const stock = Math.max(0, producto.EXISTENC || 0);
    const stockMinimo = Math.max(0, 5); // stock mínimo por defecto
    const peso = Math.max(0, 0.0); // peso por defecto
    
    // Preparar etiquetas como JSON válido
    const etiquetasJson = producto.UNIDAD ? JSON.stringify([producto.UNIDAD]) : null;
    
    // Preparar dimensiones como JSON válido (vacío por defecto)
    const dimensionesJson = null; // JSON.stringify({});

    const params = [
      uuid,
      producto.DESCRIP,
      slug,
      producto.DESCRIP,
      precio,
      null, // categoría
      stock,
      stockMinimo,
      1, // activo
      0, // destacado
      peso,
      dimensionesJson, // dimensiones como JSON válido
      etiquetasJson, // etiquetas como JSON válido
      null, // código de barras
      producto.CODIGO, // sku (código TNS)
      0, // ventas_totales
      0.00, // calificación_promedio
      0, // total_resenas
    ];

    await executeMySQLQuery(query, params);
    logger.debug(`Producto creado: ${producto.CODIGO}`);
  } catch (error) {
    logger.error(`Error creando nuevo producto ${producto.CODIGO}:`, error.message);
    throw error;
  }
}
*/

/* ============================================================
   FUNCIÓN: GENERAR SLUG
   ============================================================ */
function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ============================================================
   FUNCIÓN: ACTUALIZAR INVENTARIO LOCAL (SOLO PRODUCTOS EXISTENTES)
   ============================================================ */
async function actualizarInventarioLocal(productosTNS) {
  try {
    logger.debug("Actualizando Inventario Local (solo productos existentes)...");
    let productosActualizados = 0;
    let productosConErrores = 0;
    let productosNoEncontrados = 0;

    for (let i = 0; i < productosTNS.length; i += SYNC_CONFIG.batchSize) {
      const lote = productosTNS.slice(i, i + SYNC_CONFIG.batchSize);

      for (const producto of lote) {
        try {
          const existe = await verificarProductoExistente(producto.CODIGO);

          if (existe) {
            await actualizarProductoExistente(producto);
            productosActualizados++;
            logger.debug(`✅ Producto actualizado: ${producto.CODIGO} - ${producto.DESCRIP}`);
          } else {
            productosNoEncontrados++;
            logger.warn(`⚠️ Producto no encontrado en MySQL: ${producto.CODIGO} - ${producto.DESCRIP}`);
          }
        } catch (error) {
          logger.error(`Error procesando producto ${producto.CODIGO}:`, error.message);
          productosConErrores++;
        }
      }
    }

    logger.info(
      `Sincronización completada: ${productosActualizados} actualizados, ${productosNoEncontrados} no encontrados en MySQL, ${productosConErrores} errores`
    );

    return {
      actualizados: productosActualizados,
      creados: 0, // Ya no se crean productos nuevos
      noEncontrados: productosNoEncontrados,
      errores: productosConErrores,
      total: productosTNS.length,
    };
  } catch (error) {
    logger.error("Error actualizando inventario local:", error.message);
    throw error;
  }
}

/* ============================================================
   FUNCIÓN: LIMPIAR PRODUCTOS OBSOLETOS (DESHABILITADA)
   ============================================================ */
async function limpiarProductosObsoletos(codigosActivosTNS) {
  try {
    logger.debug("Función limpiarProductosObsoletos deshabilitada - solo sincronizamos productos existentes");
    logger.info("No se desactivarán productos obsoletos (modo solo actualización)");
    return 0;
  } catch (error) {
    logger.error("Error en limpiarProductosObsoletos:", error.message);
    throw error;
  }
}

/* ============================================================
   FUNCIÓN PRINCIPAL DE SINCRONIZACIÓN
   ============================================================ */
async function sincronizarInventario() {
  try {
    logger.info("🔄 Iniciando sincronización de inventario...");
    const productosTNS = await obtenerInventarioTNS();

    const resultado = await actualizarInventarioLocal(productosTNS);

    const codigosActivos = productosTNS.map((p) => p.CODIGO);
    await limpiarProductosObsoletos(codigosActivos);

    logger.info(
      `✅ Sincronización finalizada: ${resultado.total} productos procesados (${resultado.actualizados} actualizados, ${resultado.noEncontrados} no encontrados en MySQL).`
    );
  } catch (error) {
    logger.error("❌ Error general en la sincronización:", error.message);
  }
}

/* ============================================================
   PROGRAMAR TAREA AUTOMÁTICA (CRON) - Solo si se ejecuta directamente
   ============================================================ */
if (require.main === module) {
  cron.schedule(SYNC_CONFIG.cronExpression, sincronizarInventario);
  logger.info(`⏱️ Tarea de sincronización programada cada ${SYNC_CONFIG.cronExpression}`);
}

/* ============================================================
   FUNCIÓN: SINCRONIZACIÓN MANUAL
   ============================================================ */
async function ejecutarSincronizacionManual() {
  logger.info("🔄 === Sincronización manual iniciada ===");
  try {
    await sincronizarInventario();
    logger.info("✅ === Sincronización manual completada ===");
    return true;
  } catch (error) {
    logger.error("❌ === Error en sincronización manual ===", error.message);
    return false;
  }
}

/* ============================================================
   EXPORTACIONES PARA USO EXTERNO
   ============================================================ */
module.exports = {
  sincronizarInventario,
  ejecutarSincronizacionManual,
  obtenerInventarioTNS,
  actualizarInventarioLocal,
  verificarProductoExistente,
  actualizarProductoExistente,
  // crearNuevoProducto,
  limpiarProductosObsoletos,
  generarSlug,
  SYNC_CONFIG,
  logger
};
