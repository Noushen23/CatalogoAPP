/**
 * Servicio de Migración de Órdenes a TNS
 * Migra datos de tablas ordenes e items_orden al sistema TNS
 */

const { executeQuery, executeTransactionWithCallback, createConnection } = require('../config/database');

// Cliente para la base de datos móvil (donde están las tablas ordenes e items_orden)
const mysql = require('mysql2/promise');

// Redondeo a 2 decimales
function round2(value) {
    const num = Number(value) || 0;
    return Math.round(num * 100) / 100;
}

// Configuración de la base de datos móvi





const mobileDbConfig = {
    host: process.env.MOBILE_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MOBILE_DB_PORT || process.env.DB_PORT || '3306', 10),
    user: process.env.MOBILE_DB_USER || process.env.DB_USER || 'desarrollador',
    password: process.env.MOBILE_DB_PASSWORD || process.env.DB_PASSWORD || 'Bomberos2025#',
    database: process.env.MOBILE_DB_NAME || process.env.DB_NAME || 'tiendamovil',
    charset: 'utf8mb4',
    timezone: 'Z',
    acquireTimeout: 60000,
    timeout: 60000
};

/**
 * Crear conexión a la base de datos móvil
 */
async function createMobileConnection() {
    try {
        const connection = await mysql.createConnection(mobileDbConfig);
        return connection;
    } catch (error) {
        console.error('❌ Error creando conexión a base de datos móvil:', error.message);
        console.error('❌ Configuración intentada:', {
            host: mobileDbConfig.host,
            port: mobileDbConfig.port,
            database: mobileDbConfig.database,
            user: mobileDbConfig.user
        });
        console.error('💡 Sugerencia: Si MySQL está en el mismo servidor, usa "localhost" en lugar de la IP');
        throw error;
    }
}













/**
 * Ejecutar consulta en la base de datos móvil
 */
async function executeMobileQuery(query, params = []) {
    const connection = await createMobileConnection();
    try {
        const [rows] = await connection.execute(query, params);
        return rows;
    } finally {
        await connection.end();
    }
}

/**
 * Migrar orden completa a TNS
 * @param {string} ordenId - ID de la orden en tabla ordenes
 * @param {Object} options - Opciones de migración
 * @returns {Promise<Object>} Resultado de la migración
 */
async function migrateOrderToTNS(ordenId, options = {}) {
    const {
        usuario = 'MOBILE_MIGRATION',
        codprefijo = 'PA',
        codcomp = 'PV',
        sucid = 1,
        iniciarPreparacion = true
    } = options;

    // Obtener datos de la orden desde la base de datos móvil
    const ordenQuery = `
        SELECT 
            id, numero_orden, usuario_id, direccion_envio_id, estado,
            subtotal, descuento, costo_envio, impuestos, total,
            metodo_pago, referencia_pago, notas, fecha_creacion,
            fecha_actualizacion, fecha_entrega_estimada, tercero_id,
            COALESCE(tns_kardex_id, NULL) as tns_kardex_id,
            COALESCE(tns_numero, NULL) as tns_numero,
            COALESCE(tns_sincronizado, 'pendiente') as tns_sincronizado,
            COALESCE(tns_fecha_sincronizacion, NULL) as tns_fecha_sincronizacion,
            COALESCE(tns_error_message, NULL) as tns_error_message,
            COALESCE(tns_cliente_id, NULL) as tns_cliente_id
        FROM ordenes 
        WHERE id = ?
    `;

    const ordenes = await executeMobileQuery(ordenQuery, [ordenId]);
    if (!ordenes || ordenes.length === 0) {
        throw new Error(`Orden ${ordenId} no encontrada`);
    }

    const orden = ordenes[0];

    // Obtener items de la orden desde la base de datos móvil con información del producto
    const itemsQuery = `
        SELECT 
            io.id, io.orden_id, io.producto_id, io.cantidad, io.precio_unitario, io.subtotal,
            COALESCE(io.tns_dekardex_id, NULL) as tns_dekardex_id,
            COALESCE(io.tns_matid, NULL) as tns_matid,
            COALESCE(io.tns_codigo_material, NULL) as tns_codigo_material,
            COALESCE(io.tns_nombre_material, NULL) as tns_nombre_material,
            COALESCE(io.tns_precio_tns, NULL) as tns_precio_tns,
            COALESCE(io.tns_sincronizado, 'pendiente') as tns_sincronizado,
            p.CodVinculacion as producto_matid,
            p.nombre as producto_nombre,
            p.sku as producto_sku
        FROM items_orden io
        LEFT JOIN productos p ON io.producto_id = p.id
        WHERE io.orden_id = ?
    `;

    const items = await executeMobileQuery(itemsQuery, [ordenId]);
    if (!items || items.length === 0) {
        throw new Error(`No se encontraron items para la orden ${ordenId}`);
    }

    console.log(`📦 Migrando ${items.length} items de la orden ${ordenId}`);
    console.log(`📊 Datos de la orden móvil:`, {
        numero_orden: orden.numero_orden,
        total: orden.total,
        fecha_creacion: orden.fecha_creacion,
        estado: orden.estado
    });

    // Buscar tercero en TNS usando el tercero_id de la orden móvil
    let terceroId = null;
    let terceroNombre = 'Cliente Móvil';
    
    // Usar tercero_id directamente como TERID si existe
    if (orden.tercero_id && orden.tercero_id > 0) {
        // Verificar que el tercero existe en TNS
        const terceroQuery = `
            SELECT FIRST 1 TERID, NIT, CLIENTE, VENDED
            FROM TERCEROS 
            WHERE TERID = ?
        `;
        const terceros = await executeQuery(terceroQuery, [orden.tercero_id]);
        if (terceros && terceros.length > 0) {
            const tercero = terceros[0];
            terceroId = tercero.TERID;
            terceroNombre = tercero.NIT || `Cliente ${terceroId}`;
            console.log(`✅ Cliente encontrado en TNS: TERID=${terceroId}, NIT=${terceroNombre}`);
        } else {
            console.warn(`⚠️ Cliente con TERID ${orden.tercero_id} no encontrado en TNS, usando cliente por defecto`);
            // Buscar un tercero por defecto en TNS
            const terceroDefaultQuery = `
                SELECT FIRST 1 TERID, NIT, CLIENTE, VENDED
                FROM TERCEROS 
                WHERE CLIENTE = 'S'
                ORDER BY TERID
            `;
            const tercerosDefault = await executeQuery(terceroDefaultQuery);
            if (!tercerosDefault || tercerosDefault.length === 0) {
                throw new Error('No se encontró cliente por defecto en TNS');
            }
            const tercero = tercerosDefault[0];
            terceroId = tercero.TERID;
            terceroNombre = tercero.NIT || 'Cliente Móvil';
        }
    } else {
        // Si no hay tercero_id, buscar un tercero por defecto en TNS
        const terceroDefaultQuery = `
            SELECT FIRST 1 TERID, NIT, CLIENTE, VENDED
            FROM TERCEROS 
            WHERE CLIENTE = 'S'
            ORDER BY TERID
        `;
        const tercerosDefault = await executeQuery(terceroDefaultQuery);
        if (!tercerosDefault || tercerosDefault.length === 0) {
            throw new Error('No se encontró cliente por defecto en TNS');
        }
        const tercero = tercerosDefault[0];
        terceroId = tercero.TERID;
        terceroNombre = tercero.NIT || 'Cliente Móvil';
    }

    // Usar vendedor específico por TERID
    const vendedorId = 1007816;
    
    // Verificar que el vendedor existe y es activo
    const vendedorQuery = `
        SELECT TERID, VENDED
        FROM TERCEROS 
        WHERE TERID = ?
    `;
    const vendedores = await executeQuery(vendedorQuery, [vendedorId]);
    if (!vendedores || vendedores.length === 0) {
        throw new Error(`Vendedor con TERID ${vendedorId} no encontrado en TNS`);
    }
    
    const vendedor = vendedores[0];
    if (vendedor.VENDED !== 'S') {
        console.warn(`Vendedor ${vendedorId} no está marcado como vendedor activo, pero se usará de todas formas`);
    }

    // Validar y mapear items
    const itemsValidados = [];
    for (const item of items) {
        let matid, codigo, bodegaId;
        
        // Prioridad 1: Si ya tenemos datos TNS del item, usarlos
        if (item.tns_matid && item.tns_matid > 0) {
            matid = item.tns_matid;
            codigo = item.tns_codigo_material || 'Material Móvil';
            bodegaId = 2; // Usar BODID = 2 como solicitado
            console.log(`✅ Usando MATID existente del item: ${matid}`);
        }
        // Prioridad 2: Si el producto tiene CodVinculacion (MATID), usarlo
        else if (item.producto_matid && item.producto_matid > 0) {
            // Verificar que el material existe en TNS
            const materialQuery = `
                SELECT FIRST 1 MATID, CODIGO
                FROM MATERIAL 
                WHERE MATID = ?
            `;
            const materiales = await executeQuery(materialQuery, [item.producto_matid]);
            if (materiales && materiales.length > 0) {
                const material = materiales[0];
                matid = material.MATID;
                codigo = material.CODIGO || 'Material Móvil';
                bodegaId = 2;
                console.log(`✅ Usando MATID del producto (CodVinculacion): ${matid} - ${item.producto_nombre}`);
            } else {
                console.warn(`⚠️ MATID ${item.producto_matid} del producto no encontrado en TNS, usando material por defecto`);
                // Usar material por defecto
                const materialDefaultQuery = `
                    SELECT FIRST 1 MATID, CODIGO
                    FROM MATERIAL 
                    ORDER BY MATID
                `;
                const materialesDefault = await executeQuery(materialDefaultQuery);
                if (!materialesDefault || materialesDefault.length === 0) {
                    throw new Error('No se encontró material por defecto en TNS');
                }
                const material = materialesDefault[0];
                matid = material.MATID;
                codigo = material.CODIGO || 'Material Móvil';
                bodegaId = 2;
            }
        }
        // Prioridad 3: Usar material por defecto si no hay vinculación
        else {
            console.warn(`⚠️ Producto ${item.producto_nombre} (${item.producto_id}) no tiene CodVinculacion, usando material por defecto`);
            // Buscar material por defecto si no hay datos TNS
            const materialDefaultQuery = `
                SELECT FIRST 1 MATID, CODIGO
                FROM MATERIAL 
                ORDER BY MATID
            `;
            const materiales = await executeQuery(materialDefaultQuery);
            if (!materiales || materiales.length === 0) {
                throw new Error('No se encontró material por defecto en TNS');
            }

            const material = materiales[0];
            matid = material.MATID;
            codigo = material.CODIGO || 'Material Móvil';

            // Usar BODID = 2 como solicitado
            bodegaId = 2;
        }

        itemsValidados.push({
            ...item,
            tns_matid: matid,
            tns_codigo: codigo,
            tns_nombre: codigo || 'Material Móvil',
            tns_precio: item.precio_unitario, // Usar precio real de la orden móvil
            tns_bodid: bodegaId,
            // Asegurar que usamos los datos reales de la orden móvil
            cantidad_real: item.cantidad,
            precio_unitario_real: item.precio_unitario,
            subtotal_real: item.subtotal
        });

        console.log(`✅ Item migrado:`, {
            producto_id: item.producto_id,
            producto_nombre: item.producto_nombre,
            producto_sku: item.producto_sku,
            producto_matid: item.producto_matid,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            tns_matid: matid,
            tns_codigo: codigo,
            tns_precio: item.precio_unitario,
            cantidad_real: item.cantidad,
            precio_unitario_real: item.precio_unitario,
            subtotal_real: item.subtotal
        });
    }

    // Crear pedido en TNS
    const connection = await createConnection();
    const resultado = await executeTransactionWithCallback(connection, async (transaction) => {
        const horaActual = new Date().toTimeString().slice(0, 5);
        // Usar la fecha de creación de la orden móvil
        const fechaActual = orden.fecha_creacion ? 
            new Date(orden.fecha_creacion).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];

        // Derivar PERIODO desde fecha
        let periodoCalc = '01';
        try {
            const d = new Date(orden.fecha_creacion);
            const m = d && !isNaN(d.getTime()) ? d.getMonth() + 1 : 1;
            periodoCalc = String(m).padStart(2, '0');
        } catch (_) {
            periodoCalc = '01';
        }

        // Generar número usando la misma lógica que pedidos.js
        let numeroVal = null;
        let siguienteDesdeConsecutivo = null;
        
        // Prioridad 1: Intentar obtener desde tabla CONSECUTIVO
        try {
            const consRows = await executeQueryInTransaction(
                transaction,
                'SELECT FIRST 1 CONSECUTIVO FROM CONSECUTIVO WHERE CODCOMP = ? AND CODPREFIJO = ? AND SUCID = ?',
                [codcomp, codprefijo, sucid || 1]
            );
            if (consRows && consRows[0] && consRows[0].CONSECUTIVO !== undefined) {
                const lastNum = parseInt(String(consRows[0].CONSECUTIVO || '').replace(/\D/g, ''), 10) || 0;
                siguienteDesdeConsecutivo = lastNum + 1;
            }
        } catch (_) {}

        // Si se obtuvo desde CONSECUTIVO, usar ese valor
        if (siguienteDesdeConsecutivo !== null) {
            numeroVal = String(siguienteDesdeConsecutivo).padStart(8, '0');
        }

        // Prioridad 2: Si no hay número desde CONSECUTIVO, usar número de orden móvil
        if (!numeroVal && orden.numero_orden && orden.numero_orden.trim() !== '') {
            const numeroLimpio = orden.numero_orden.replace(/\D/g, '').substring(0, 8);
            numeroVal = numeroLimpio.padStart(8, '0');
        }

        // Prioridad 3: Fallback a máximo de KARDEX por CODCOMP+CODPREFIJO
        if (!numeroVal) {
            const maxNumRows = await executeQueryInTransaction(
                transaction,
                `SELECT COALESCE(MAX(CAST(NUMERO AS INTEGER)), 0) AS MAXNUM
                 FROM KARDEX
                 WHERE CODCOMP = ? AND CODPREFIJO = ? AND NUMERO SIMILAR TO '[0-9]+'`,
                [codcomp, codprefijo]
            );
            const maxNum = Number(maxNumRows && maxNumRows[0] && maxNumRows[0].MAXNUM) || 0;
            const siguiente = maxNum + 1;
            numeroVal = String(siguiente).padStart(8, '0');
        }

        // Validar no duplicidad justo antes de insertar (evitar carreras)
        const dupRows = await executeQueryInTransaction(
            transaction,
            'SELECT COUNT(*) AS TOTAL FROM KARDEX WHERE CODCOMP = ? AND CODPREFIJO = ? AND NUMERO = ?',
            [codcomp, codprefijo, numeroVal]
        );
        if (Number(dupRows && dupRows[0] && dupRows[0].TOTAL) > 0) {
            const err = new Error(`El consecutivo ${numeroVal} ya existe para CODCOMP=${codcomp}, CODPREFIJO=${codprefijo}, SUCID=${sucid || 1}`);
            err.code = 'CONSECUTIVO_DUPLICADO';
            err.status = 409;
            err.data = { numero: numeroVal, codcomp: codcomp, codprefijo: codprefijo, sucid: sucid || 1 };
            throw err;
        }

        // Intentar actualizar CONSECUTIVO con el nuevo valor si se obtuvo desde esa tabla
        if (siguienteDesdeConsecutivo !== null) {
            try {
                await executeQueryInTransaction(
                    transaction,
                    'UPDATE CONSECUTIVO SET CONSECUTIVO = ? WHERE CODCOMP = ? AND CODPREFIJO = ? AND SUCID = ?',
                    [siguienteDesdeConsecutivo, codcomp, codprefijo, sucid || 1]
                );
            } catch (_) {}
        }

        // Calcular fecha de vencimiento (30 días por defecto)
        const fechaVence = new Date(orden.fecha_creacion);
        fechaVence.setDate(fechaVence.getDate() + 30);

        // Calcular valores adicionales para KARDEX
        const totalOrden = Math.min(orden.total || 0, 999999999);
        const ivaPorcentaje = 19; // IVA 19%
        const vribase = Math.round(totalOrden / (1 + (ivaPorcentaje / 100))); // Valor base sin IVA
        const vriba = Math.round(totalOrden - vribase); // Valor del IVA
        const plazodias = 30; // Plazo por defecto
        const fecVence = new Date(fechaActual);
        fecVence.setDate(fecVence.getDate() + plazodias);
        const fecVenceStr = fecVence.toISOString().split('T')[0];

        // Limitar longitud de observaciones para evitar truncación
        const observaciones = `Migrado desde orden movil: ${orden.numero_orden} - ${orden.notas || 'Sin observaciones'}`.substring(0, 200);

        console.log(`📊 Valores calculados para KARDEX:`, {
            totalOrden: totalOrden,
            vribase: vribase,
            vriba: vriba,
            periodoCalc: periodoCalc,
            plazodias: plazodias,
            fecVenceStr: fecVenceStr,
            observaciones: observaciones.substring(0, 50) + '...'
        });

        // Obtener CODDESPACHAA del cliente: NIT o fallback TERID (máx 20 chars)
        let codDespachaA = '';
        let nitObtenido = null;
        try {
            const nitRows = await executeQueryInTransaction(
                transaction,
                `SELECT TERID, NIT, COALESCE(NULLIF(TRIM(NIT), ''), CAST(TERID AS VARCHAR(20))) AS COD
                 FROM TERCEROS WHERE TERID = ?`,
                [terceroId]
            );
            if (nitRows && nitRows[0]) {
                nitObtenido = nitRows[0].NIT;
                codDespachaA = (nitRows[0].COD || '').toString().trim() || '';
                if (codDespachaA.length > 20) {
                    codDespachaA = codDespachaA.slice(0, 20);
                }
                console.log(`📋 NIT obtenido de TERCEROS: TERID=${terceroId}, NIT="${nitObtenido}", codDespachaA="${codDespachaA}"`);
            }
        } catch (error) {
            console.error('❌ Error obteniendo NIT de TERCEROS:', error.message);
        }

        // Obtener nombre del cliente para NOMDESPACHA (máx 120 chars)
        let nomDespacha = '';
        try {
            const nomRows = await executeQueryInTransaction(
                transaction,
                'SELECT NOMBRE FROM TERCEROS WHERE TERID = ?',
                [terceroId]
            );
            nomDespacha = (nomRows && nomRows[0] && (nomRows[0].NOMBRE || '').toString().trim()) || '';
            if (nomDespacha.length > 120) {
                nomDespacha = nomDespacha.slice(0, 120);
            }
            console.log(`📋 Nombre del cliente obtenido: "${nomDespacha}"`);
        } catch (error) {
            console.error('❌ Error obteniendo nombre de TERCEROS:', error.message);
        }

        // Insertar encabezado KARDEX con estructura completa de pedidos.js
        const insertKardexQuery = `
            INSERT INTO KARDEX (
                CODCOMP, CODPREFIJO, NUMERO, FECHA, OBSERV, PERIODO,
                CENID, AREADID, SUCID, CLIENTE, VENDEDOR, FORMAPAGO,
                PLAZODIAS, VRBASE, VRIVA, TOTAL, USUARIO, HORA, HORACREA, MONEDA,
                BCOID, CODDESPACHAA, NOMDESPACHA, DESPACHAR_A,
                RETIVA, RETICA, RETFTE, AJUSTEBASE, AJUSTEIVA, AJUSTEIVAEXC, AJUSTENETO,
                VRICONSUMO, VRRFTE, VRRIVA, VRRICA, FPCONTADO, DESXCAMBIO, VRIVAEXC,
                RETCREE, VRRCREE, NETOIVA, NETOIVAEXC, TIPOFACTURA, VRADVA, VRDCTOS,
                VRINC, VRIPUU, VRICUI,
                FECVENCE, FPCREDITO
            ) VALUES (
                ?, ?, ?, CAST(? AS DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?
            )
        `;

        // Preparar parámetros para inserción de KARDEX
        const pedidoParams = [
            codcomp,           // CODCOMP
            codprefijo,        // CODPREFIJO
            numeroVal,         // NUMERO
            fechaActual,       // FECHA (Date)
            observaciones,     // OBSERV (máx 500)
            periodoCalc,       // PERIODO derivado
            1,                 // CENID
            1,                 // AREADID
            sucid,             // SUCID
            terceroId,         // CLIENTE
            vendedorId,        // VENDEDOR
            'CO',              // FORMAPAGO (Contado)
            plazodias,         // PLAZODIAS
            0,                 // VRBASE (se actualizará después)
            0,                 // VRIVA (se actualizará después)
            0,                 // TOTAL (se actualizará después)
            usuario,           // USUARIO
            horaActual,        // HORA
            horaActual,        // HORACREA
            'COP',             // MONEDA
            1,                // BCOID fijo
            codDespachaA,      // CODDESPACHAA (NIT/TERID del cliente)
            nomDespacha,       // NOMDESPACHA (nombre cliente)
            Number(terceroId) || 0, // DESPACHAR_A (TERID del cliente)
            0,                 // RETIVA
            0,                 // RETICA
            0,                 // RETFTE
            0,                 // AJUSTEBASE
            0,                 // AJUSTEIVA
            0,                 // AJUSTEIVAEXC
            0,                 // AJUSTENETO
            0,                 // VRICONSUMO
            0,                 // VRRFTE
            0,                 // VRRIVA
            0,                 // VRRICA
            0,                 // FPCONTADO
            0,                 // DESXCAMBIO
            0,                 // VRIVAEXC
            0,                 // RETCREE
            0,                 // VRRCREE
            0,                 // NETOIVA
            0,                 // NETOIVAEXC
            0,                 // TIPOFACTURA
            0,                 // VRADVA
            0,                 // VRDCTOS
            0,                 // VRINC
            0,                 // VRIPUU
            0,                 // VRICUI
            fecVenceStr,       // FECVENCE (YYYY-MM-DD)
            0                  // FPCREDITO (0 para contado)
        ];

        // Log de datos que se están enviando a KARDEX
        console.log('📝 DATOS QUE SE ESTÁN ENVIANDO A KARDEX:');
        console.log({
            codcomp,
            codprefijo,
            numeroVal,
            fechaActual,
            observaciones: observaciones.substring(0, 50) + '...',
            periodoCalc,
            sucid,
            terceroId,
            vendedorId,
            plazodias,
            usuario,
            horaActual,
            moneda: 'COP',
            codDespachaA,
            nomDespacha,
            despacharA: Number(terceroId) || 0,
            fecVenceStr,
            totalOrden
        });
        console.log('📊 Primeros parámetros del INSERT:', pedidoParams.slice(0, 25));

        // Insertar KARDEX y obtener KARDEXID usando la misma lógica que pedidos.js
        let kardexId;
        try {
            await executeQueryInTransaction(transaction, insertKardexQuery, pedidoParams);
            const idRows = await executeQueryInTransaction(
                transaction,
                `SELECT KARDEXID FROM KARDEX 
                 WHERE CODCOMP = ? AND CODPREFIJO = ? AND NUMERO = ? AND SUCID = ?
                 ORDER BY KARDEXID DESC ROWS 1`,
                [codcomp, codprefijo, String(numeroVal), sucid]
            );
            kardexId = Number(idRows && idRows[0] && idRows[0].KARDEXID);
        } catch (e) {
            console.error('Fallo INSERT KARDEX', { insertKardexQuery, pedidoParams });
            throw e;
        }

        // Insertar líneas DEKARDEX con estructura completa de pedidos.js
        let totalDocumento = 0; // VRBASE acumulado (sin IVA)
        let totalIVA = 0;       // IVA acumulado
        const dekardexIds = [];
        
        for (const item of itemsValidados) {
            // Cálculos por unidad y totales de documento
            const cantidad = Number(item.cantidad_real);
            let precioUnit = Number(item.precio_unitario_real);
            const descuentoUnit = 0; // Sin descuento por defecto
            let porciva = 0; // IVA por defecto 19%
            
            // Intentar obtener el porcentaje de IVA del material
            try {
                const ivaRows = await executeQueryInTransaction(
                    transaction,
                    `SELECT COALESCE(TI.PORCIVA, 0) AS PORCIVA
                     FROM MATERIAL M
                     LEFT JOIN TIPOIVA TI ON TI.TIPOIVAID = M.TIPOIVAID
                     WHERE M.MATID = ?`,
                    [item.tns_matid]
                );
                const materialPorcIva = Number((ivaRows && ivaRows[0] && ivaRows[0].PORCIVA) || 0);
                if (Number.isFinite(materialPorcIva) && materialPorcIva > 0) {
                    porciva = materialPorcIva;
                }
            } catch (_) {
                // Usar 19% por defecto si no se puede obtener
                porciva = 0;
            }

            // Obtener precio lista desde MATERIALSUC si está disponible
            let precioListaUnit = precioUnit;
            try {
                const precioListaRows = await executeQueryInTransaction(
                    transaction,
                    `SELECT FIRST 1 
                        PRECIO1, PRECIO2, PRECIO3, PRECIO4, PRECIO5
                     FROM MATERIALSUC WHERE MATID = ? AND SUCID = ?`,
                    [item.tns_matid, sucid]
                );
                
                const pickPrecio = (row) => {
                    if (!row) return precioUnit;
                    const candidates = [
                        row.PRECIO1, row.PRECIO2, row.PRECIO3, row.PRECIO4, row.PRECIO5
                    ];
                    for (const v of candidates) {
                        const n = Number(v || 0);
                        if (Number.isFinite(n) && n > 0) return n;
                    }
                    return precioUnit;
                };
                
                precioListaUnit = pickPrecio(precioListaRows && precioListaRows[0]);
            } catch (_) {
                precioListaUnit = precioUnit;
            }

            const precioBaseUnit = precioUnit - descuentoUnit; // Base por unidad (sin IVA)
            if (precioBaseUnit < 0) {
                throw new Error(`Item ${item.producto_id} inválido: el descuento por unidad no puede superar el precio`);
            }
            if (!Number.isFinite(cantidad) || cantidad <= 0) {
                throw new Error(`Item ${item.producto_id} inválido: la cantidad debe ser mayor que cero`);
            }
            if (!Number.isFinite(precioUnit) || precioUnit < 0) {
                throw new Error(`Item ${item.producto_id} inválido: el precio no puede ser negativo`);
            }
            
            const ivaUnit = round2(precioBaseUnit * (porciva / 100));
            const precioNetoUnit = round2(precioBaseUnit + ivaUnit); // Neto por unidad (incluye IVA)
            
            // Insertar línea DEKARDEX con estructura completa de pedidos.js
            const insertDekardexQuery = `
                INSERT INTO DEKARDEX (
                    KARDEXID, MATID, BODID, REMTOTFAC,
                    TIPUND, PORCIVA, DESCUENTO, CANLISTA, CANMAT, 
                    PRECIOLISTA, PRECIOVTA, PRECIOBASE, PRECIOIVA, 
                    PRECIONETO, PARCVTA, SALCAN, SALCOST, IMPRESO, PRECIOEXCENTO, PRECIOICONSUMO, DAJUSTEBASE, PRECIOIPUU, IMPICUI
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await executeQueryInTransaction(transaction, insertDekardexQuery, [
                kardexId,                      // KARDEXID
                item.tns_matid,                // MATID
                item.tns_bodid,                // BODID
                0,                             // REMTOTFAC
                'D',                           // TIPUND
                porciva,                       // PORCIVA
                descuentoUnit,                 // DESCUENTO (por unidad)
                cantidad,                      // CANLISTA
                cantidad,                      // CANMAT
                round2(precioListaUnit),       // PRECIOLISTA
                precioUnit,                    // PRECIOVTA (por unidad)
                round2(precioBaseUnit),        // PRECIOBASE (por unidad, sin IVA)
                round2(ivaUnit),               // PRECIOIVA (IVA por unidad)
                round2(precioNetoUnit),        // PRECIONETO (por unidad, con IVA)
                round2(precioNetoUnit * cantidad), // PARCVTA (total línea)
                cantidad,                      // SALCAN
                0,                             // SALCOST
                'N',                           // IMPRESO
                0,                             // PRECIOEXCENTO
                0,                             // PRECIOICONSUMO
                0,                             // DAJUSTEBASE
                0,                             // PRECIOIPUU
                0                              // IMPICUI
            ]);

            console.log(`📝 DEKARDEX insertado:`, {
                KARDEXID: kardexId,
                MATID: item.tns_matid,
                BODID: item.tns_bodid,
                TIPUND: 'D',
                PORCIVA: porciva,
                DESCUENTO: descuentoUnit,
                CANLISTA: cantidad,
                CANMAT: cantidad,
                PRECIOLISTA: precioListaUnit,
                PRECIOVTA: precioUnit,
                PRECIOBASE: precioBaseUnit,
                PRECIOIVA: ivaUnit,
                PRECIONETO: precioNetoUnit,
                PARCVTA: round2(precioNetoUnit * cantidad),
                SALCAN: cantidad,
                producto_id: item.producto_id
            });

            // Acumular totales del documento
            totalDocumento += round2(precioBaseUnit * cantidad); // acumular base
            totalIVA += round2(ivaUnit * cantidad);              // acumular IVA

            // Obtener DEKARDEXID
            const dekardexIdQuery = `
                SELECT FIRST 1 DEKARDEXID 
                FROM DEKARDEX 
                WHERE KARDEXID = ? AND MATID = ? AND BODID = ?
                ORDER BY DEKARDEXID DESC
            `;
            const dekardexRows = await executeQueryInTransaction(transaction, dekardexIdQuery, [kardexId, item.tns_matid, item.tns_bodid]);
            dekardexIds.push(dekardexRows[0].DEKARDEXID);
        }

        // Actualizar totales del documento en KARDEX
        const totalGeneral = round2(totalDocumento + totalIVA);
        
        const updateTotalesQuery = `
            UPDATE KARDEX 
            SET VRBASE = ?, VRIVA = ?, TOTAL = ?,
                NETO = ?, NETOBASE = ?, VRTOTAL = ?
            WHERE KARDEXID = ?
        `;
        
        await executeQueryInTransaction(transaction, updateTotalesQuery, [
            totalDocumento, totalIVA, totalGeneral,
            totalGeneral, totalDocumento, totalGeneral,
            kardexId
        ]);

        return {
            kardexId,
            numero: numeroVal,
            terceroId: terceroId,
            vendedorId,
            total: orden.total,
            itemsCount: itemsValidados.length,
            dekardexIds,
            iniciarPreparacion
        };
    });

    // Actualizar tabla ordenes con datos TNS (solo columnas que existen)
    const updateOrdenQuery = `
        UPDATE ordenes SET 
            tns_kardex_id = ?,
            tns_numero = ?,
            tns_cliente_id = ?,
            tns_sincronizado = 'sincronizado',
            tns_fecha_sincronizacion = NOW(),
            tns_error_message = NULL
        WHERE id = ?
    `;

    const estadoTNS = iniciarPreparacion ? 'CERRADO' : 'ABIERTO';
    const horaActual = new Date().toTimeString().slice(0, 5);
    const fechaActual = new Date().toISOString().split('T')[0];

    await executeMobileQuery(updateOrdenQuery, [
        resultado.kardexId,
        resultado.numero,
        terceroId,
        ordenId
    ]);

    // Actualizar tabla items_orden con datos TNS
    for (let i = 0; i < itemsValidados.length; i++) {
        const item = itemsValidados[i];
        const dekardexId = resultado.dekardexIds[i];

        const updateItemQuery = `
            UPDATE items_orden SET 
                tns_dekardex_id = ?,
                tns_matid = ?,
                tns_codigo_material = ?,
                tns_nombre_material = ?,
                tns_precio_tns = ?,
                tns_sincronizado = 'sincronizado'
            WHERE id = ?
        `;

        await executeMobileQuery(updateItemQuery, [
            dekardexId,
            item.tns_matid,
            item.tns_codigo,
            item.tns_nombre,
            item.tns_precio,
            item.id
        ]);
    }

    return resultado;
}

/**
 * Obtener detalles de migración de una orden
 * @param {string} ordenId - ID de la orden
 * @returns {Promise<Object>} Detalles de la migración
 */
async function getOrderMigrationDetails(ordenId) {
    // Obtener datos de la orden desde la base de datos móvil
    const ordenQuery = `
        SELECT 
            id, numero_orden, estado, total, fecha_creacion,
            COALESCE(tns_kardex_id, NULL) as tns_kardex_id,
            COALESCE(tns_numero, NULL) as tns_numero,
            COALESCE(tns_sincronizado, 'pendiente') as tns_sincronizado,
            COALESCE(tns_fecha_sincronizacion, NULL) as tns_fecha_sincronizacion,
            COALESCE(tns_error_message, NULL) as tns_error_message,
            COALESCE(tns_cliente_id, NULL) as tns_cliente_id
        FROM ordenes 
        WHERE id = ?
    `;

    const ordenes = await executeMobileQuery(ordenQuery, [ordenId]);
    if (!ordenes || ordenes.length === 0) {
        throw new Error(`Orden ${ordenId} no encontrada`);
    }

    const orden = ordenes[0];

    // Obtener items desde la base de datos móvil
    const itemsQuery = `
        SELECT 
            id, producto_id, cantidad, precio_unitario, subtotal,
            COALESCE(tns_dekardex_id, NULL) as tns_dekardex_id,
            COALESCE(tns_matid, NULL) as tns_matid,
            COALESCE(tns_codigo_material, NULL) as tns_codigo_material,
            COALESCE(tns_nombre_material, NULL) as tns_nombre_material,
            COALESCE(tns_precio_tns, NULL) as tns_precio_tns,
            COALESCE(tns_sincronizado, 'pendiente') as tns_sincronizado
        FROM items_orden 
        WHERE orden_id = ?
    `;

    const items = await executeMobileQuery(itemsQuery, [ordenId]);

    // Obtener información del cliente desde TNS si existe
    let clienteInfo = {};
    if (orden.tns_cliente_id) {
        try {
            const clienteQuery = `
                SELECT NOMBRE, NIT
                FROM TERCEROS 
                WHERE TERID = ?
            `;
            const clientes = await executeQuery(clienteQuery, [orden.tns_cliente_id]);
            if (clientes && clientes.length > 0) {
                clienteInfo = {
                    CLIENTE_NOMBRE: clientes[0].NOMBRE,
                    CLIENTE_NIT: clientes[0].NIT
                };
            }
        } catch (error) {
            console.warn('Error obteniendo información del cliente desde TNS:', error.message);
        }
    }

    return {
        orden: { ...orden, ...clienteInfo },
        items,
        migrationStatus: {
            ordenSincronizada: orden.tns_sincronizado === 'sincronizado',
            itemsSincronizados: items.filter(item => item.tns_sincronizado === 'sincronizado').length,
            totalItems: items.length,
            tieneErrores: orden.tns_error_message !== null
        }
    };
}

/**
 * Función helper para ejecutar consultas en transacciones
 */
async function executeQueryInTransaction(transaction, query, params = []) {
    return new Promise((resolve, reject) => {
        transaction.query(query, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

module.exports = {
    migrateOrderToTNS,
    getOrderMigrationDetails
};
