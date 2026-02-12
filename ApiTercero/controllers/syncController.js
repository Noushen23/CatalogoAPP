/**
 * Controlador de Sincronización MySQL -> TNS
 * Sincroniza terceros desde la base de datos MySQL del backend hacia TNS
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { executeQuery, executeTransactionWithCallback, createConnection } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { ERROR_CODES } = require('../utils/constants');

// Configuración de MySQL (debe coincidir con el backend)
const mysqlConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Bomberos2025#',
    database: process.env.MYSQL_DATABASE || 'tiendamovil',
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de conexiones MySQL
let mysqlPool = null;

/**
 * Inicializa el pool de conexiones MySQL
 */
const initMySQLPool = async () => {
    if (!mysqlPool) {
        mysqlPool = mysql.createPool(mysqlConfig);
        console.log('✅ Pool MySQL inicializado para sincronización');
    }
    return mysqlPool;
};

/**
 * Obtiene usuarios desde MySQL que no existen en TNS
 */
const getUsuariosFromMySQL = async (limit = 100) => {
    const pool = await initMySQLPool();
    
    const query = `
        SELECT 
            id,
            email,
            nombre_completo,
            telefono,
            tipo_identificacion,
            numero_identificacion,
            fecha_creacion,
            fecha_actualizacion
        FROM usuarios 
        WHERE activo = 1
        ORDER BY fecha_creacion DESC
        LIMIT ?
    `;
    
    const [rows] = await pool.execute(query, [limit]);
    return rows;
};

/**
 * Verifica si un usuario ya existe en TNS por NIT/identificación
 */
const usuarioExistsInTNS = async (numeroIdentificacion) => {
    if (!numeroIdentificacion) return false;
    
    const query = `
        SELECT TERID, NIT, NOMBRE 
        FROM TERCEROS 
        WHERE TRIM(NIT) = ?
    `;
    
    const result = await executeQuery(query, [numeroIdentificacion.trim()]);
    return result && result.length > 0 ? result[0] : null;
};

/**
 * Busca una ciudad en TNS por nombre
 */
const findCiudadInTNS = async (ciudadNombre, departamento = null) => {
    if (!ciudadNombre) return null;
    
    let query = `
        SELECT CIUDANEID, CODIGO, NOMBRE, DEPARTAMENTO
        FROM CIUDANE 
        WHERE UPPER(NOMBRE) LIKE UPPER(?)
    `;
    let params = [`%${ciudadNombre.trim()}%`];
    
    if (departamento) {
        query += ` AND UPPER(DEPARTAMENTO) LIKE UPPER(?)`;
        params.push(`%${departamento.trim()}%`);
    }
    
    query += ` ORDER BY NOMBRE ASC`;
    
    const result = await executeQuery(query, params);
    return result && result.length > 0 ? result[0] : null;
};

/**
 * Crea un tercero en TNS desde datos de MySQL
 */
const createTerceroInTNS = async (usuarioData, ciudadTNS = null) => {
    const connection = await createConnection();
    
    try {
        const nuevoId = await executeTransactionWithCallback(connection, async (transaction) => {
            // Obtener el siguiente TERID
            const maxIdQuery = `SELECT MAX(TERID) as MAX_ID FROM TERCEROS`;
            const maxIdResult = await executeQuery(maxIdQuery);
            const nextId = (maxIdResult[0].MAX_ID || 0) + 1;
            
            // Preparar datos para TNS con validación de longitud
            console.log(`📝 Datos del usuario para TNS:`, {
                numero_identificacion: usuarioData.numero_identificacion,
                tipo_identificacion: usuarioData.tipo_identificacion,
                email: usuarioData.email,
                nombre_completo: usuarioData.nombre_completo
            });
            
            const terceroData = {
                TERID: nextId,
                NIT: (usuarioData.numero_identificacion || usuarioData.email.split('@')[0]).substring(0, 20),
                TIPODOCIDEN: (usuarioData.tipo_identificacion || 'CC').substring(0, 10),
                NITTRI: (usuarioData.numero_identificacion || '').substring(0, 20),
                NOMBRE: (usuarioData.nombre_completo || usuarioData.email).substring(0, 50),
                DIRECC1: 'Sin dirección', // No tenemos dirección en usuarios
                DIRECC2: '',
                CIUDAD: ciudadTNS ? ciudadTNS.CIUDANEID : null,
                CIUDANEID: ciudadTNS ? ciudadTNS.CIUDANEID : null,
                DEPARTAMENTO: (ciudadTNS ? ciudadTNS.DEPARTAMENTO : 'CUNDINAMARCA').substring(0, 50),
                TELEF1: (usuarioData.telefono || '').substring(0, 20),
                TELEF2: '',
                EMAIL: usuarioData.email.substring(0, 100),
                CLIENTE: 'S', // Todos los usuarios son clientes
                PROVEED: 'N',
                VENDED: 'N',
                VRULTCOM: 0,
                ETERRITORIAL: 'N',
                FACTELECT: 'N',
                NOREPORCIR: 'N',
                SINCRONIZADO: 'S',
                FECHCREAC: new Date().toISOString().split('T')[0],
                NATJURIDICA: 'NATURAL',
                RESPONSABILIDADES: '',
                LISTAPRECIOID: 1, // Lista de precio por defecto
                MAXCREDCXC: 0,
                MAXCREDDIAS: 0,
                ZONA1: 1, // Zona por defecto
                CLASIFICAID: 1, // Clasificación por defecto
                PORRETEN: 0,
                CONDUCTOR: 'N',
                TOMADOR: 'N',
                PROPIETARIO: 'N',
                EMPLEADO: 'N',
                FIADOR: 'N',
                NOMREGTRI: '',
                OTRO: 'N',
                MESA: 'N',
                MOSTRADOR: 'N'
            };
            
            // Si EMAIL ya existe, setear a NULL para permitir inserción en Firebird
            if (terceroData.EMAIL) {
                const emailDupQuery = `SELECT TERID FROM TERCEROS WHERE TRIM(UPPER(EMAIL)) = TRIM(UPPER(?))`;
                const emailDupRows = await executeQuery(emailDupQuery, [terceroData.EMAIL]);
                if (emailDupRows && emailDupRows.length > 0) {
                    terceroData.EMAIL = null;
                }
            }

            // Insertar en TERCEROS
            const fields = Object.keys(terceroData);
            const values = Object.values(terceroData);
            const placeholders = fields.map(() => '?').join(', ');
            
            const insertQuery = `
                INSERT INTO TERCEROS (${fields.join(', ')})
                VALUES (${placeholders})
            `;
            
            await transaction.query(insertQuery, values);
            
            // Crear registro en TERCEROSSELF si no existe
            const terceroSelfQuery = `
                INSERT INTO TERCEROSSELF (
                    TERID, VENDEDOR1, SUSPENDIDO, OBSERVCAR, MAXPLAZO,
                    REGSIMPLIF, AUTORRETEN, GRANCONTRI, CREDFISCAL, CLIENTETIPO, TEREXENTO
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const terceroSelfValues = [
                nextId, // TERID
                null,   // VENDEDOR1
                'N',    // SUSPENDIDO
                'Cliente creado desde sistema móvil', // OBSERVCAR
                0,      // MAXPLAZO
                'N',    // REGSIMPLIF
                'N',    // AUTORRETEN
                'N',    // GRANCONTRI
                'N',    // CREDFISCAL
                'NORMAL', // CLIENTETIPO
                'N'     // TEREXENTO
            ];
            
            await transaction.query(terceroSelfQuery, terceroSelfValues);
            
            return nextId;
        });
        
        return nuevoId;
    } finally {
        connection?.detach?.();
    }
};

/**
 * POST /api/sync/usuarios - Sincronizar usuarios desde MySQL a TNS
 */
router.post('/usuarios', authenticate, asyncHandler(async (req, res) => {
    const { limit = 50, force = false } = req.body;
    
    console.log(`🔄 Iniciando sincronización de usuarios (límite: ${limit}, forzar: ${force})`);
    
    try {
        // Obtener usuarios de MySQL
        const usuarios = await getUsuariosFromMySQL(limit);
        console.log(`📊 Usuarios encontrados en MySQL: ${usuarios.length}`);
        
        if (usuarios.length === 0) {
            return res.json({
                success: true,
                message: 'No hay usuarios para sincronizar',
                data: {
                    procesados: 0,
                    creados: 0,
                    existentes: 0,
                    errores: 0
                }
            });
        }
        
        let procesados = 0;
        let creados = 0;
        let existentes = 0;
        let errores = 0;
        const erroresDetalle = [];
        
        // Procesar cada usuario
        for (const usuario of usuarios) {
            try {
                procesados++;
                
                // Verificar si ya existe en TNS
                const existe = await usuarioExistsInTNS(usuario.numero_identificacion);
                
                if (existe && !force) {
                    existentes++;
                    console.log(`⚠️ Usuario ya existe en TNS: ${usuario.email} (TERID: ${existe.TERID})`);
                    continue;
                }
                
                // Buscar ciudad en TNS (usar Cundinamarca por defecto)
                const ciudadTNS = await findCiudadInTNS('Bogotá', 'Cundinamarca');
                
                // Crear tercero en TNS
                const nuevoTerid = await createTerceroInTNS(usuario, ciudadTNS);
                creados++;
                
                console.log(`✅ Usuario sincronizado: ${usuario.email} -> TERID: ${nuevoTerid}`);
                
            } catch (error) {
                errores++;
                erroresDetalle.push({
                    usuario: usuario.email,
                    error: error.message
                });
                console.error(`❌ Error sincronizando usuario ${usuario.email}:`, error.message);
            }
        }
        
        const resultado = {
            procesados,
            creados,
            existentes,
            errores,
            erroresDetalle: erroresDetalle.length > 0 ? erroresDetalle : undefined
        };
        
        console.log(`📈 Sincronización completada:`, resultado);
        
        res.json({
            success: true,
            message: `Sincronización completada: ${creados} creados, ${existentes} existentes, ${errores} errores`,
            data: resultado
        });
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        throw createError(
            'Error durante la sincronización',
            500,
            ERROR_CODES.INTERNAL_ERROR,
            error.message
        );
    }
}));

/**
 * GET /api/sync/usuarios/status - Obtener estado de sincronización
 */
router.get('/usuarios/status', authenticate, asyncHandler(async (req, res) => {
    try {
        // Contar usuarios en MySQL
        const pool = await initMySQLPool();
        const [mysqlCount] = await pool.execute('SELECT COUNT(*) as total FROM usuarios WHERE activo = 1');
        
        // Contar terceros en TNS
        const tnsCount = await executeQuery('SELECT COUNT(*) as total FROM TERCEROS WHERE CLIENTE = ?', ['S']);
        
        // Contar terceros sincronizados (con flag SINCRONIZADO = 'S')
        const syncCount = await executeQuery('SELECT COUNT(*) as total FROM TERCEROS WHERE SINCRONIZADO = ?', ['S']);
        
        res.json({
            success: true,
            data: {
                mysql: {
                    usuariosActivos: mysqlCount[0].total
                },
                tns: {
                    totalClientes: tnsCount[0].TOTAL,
                    sincronizados: syncCount[0].TOTAL,
                    pendientes: tnsCount[0].TOTAL - syncCount[0].TOTAL
                },
                ultimaSincronizacion: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estado:', error);
        throw createError(
            'Error obteniendo estado de sincronización',
            500,
            ERROR_CODES.INTERNAL_ERROR,
            error.message
        );
    }
}));

/**
 * POST /api/sync/usuarios/single - Sincronizar un usuario específico
 */
router.post('/usuarios/single', authenticate, asyncHandler(async (req, res) => {
    const { usuarioId, email } = req.body;
    
    if (!usuarioId && !email) {
        throw createError(
            'Se requiere usuarioId o email',
            400,
            ERROR_CODES.BAD_REQUEST
        );
    }
    
    try {
        const pool = await initMySQLPool();
        
        // Buscar usuario en MySQL
        let query = 'SELECT * FROM usuarios WHERE activo = 1';
        let params = [];
        
        if (usuarioId) {
            query += ' AND id = ?';
            params.push(usuarioId);
        } else {
            query += ' AND email = ?';
            params.push(email);
        }
        
        const [usuarios] = await pool.execute(query, params);
        
        if (usuarios.length === 0) {
            throw createError(
                'Usuario no encontrado en MySQL',
                404,
                ERROR_CODES.NOT_FOUND
            );
        }
        
        const usuario = usuarios[0];
        
        // Verificar si ya existe en TNS
        const existe = await usuarioExistsInTNS(usuario.numero_identificacion);
        
        if (existe) {
            return res.json({
                success: true,
                message: 'Usuario ya existe en TNS',
                data: {
                    usuario: usuario.email,
                    terid: existe.TERID,
                    nombre: existe.NOMBRE,
                    yaExistia: true
                }
            });
        }
        
        // Buscar ciudad en TNS
        const ciudadTNS = await findCiudadInTNS('Bogotá', 'Cundinamarca');
        
        // Crear tercero en TNS
        const nuevoTerid = await createTerceroInTNS(usuario, ciudadTNS);
        
        res.json({
            success: true,
            message: 'Usuario sincronizado exitosamente',
            data: {
                usuario: usuario.email,
                terid: nuevoTerid,
                nombre: usuario.nombre_completo,
                yaExistia: false
            }
        });
        
    } catch (error) {
        console.error('❌ Error sincronizando usuario individual:', error);
        throw error;
    }
}));

module.exports = router;
