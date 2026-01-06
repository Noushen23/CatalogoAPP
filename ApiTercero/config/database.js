/**
 * Configuración y funciones de base de datos TNS
 * Plataforma Web de Pedidos de Venta
 */

const Firebird = require('node-firebird');
const config = require('./app.config');

// Pool de conexiones para mejor rendimiento
const pool = Firebird.pool(5, config.database.firebird);

/**
 * Crear una nueva conexión
 * @returns {Promise<Object>} Conexión a la base de datos
 */
async function createConnection() {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('Error obteniendo conexión:', err);
                reject(err);
                return;
            }
            resolve(db);
        });
    });
}

/**
 * Ejecutar consulta simple
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Array>} Resultados de la consulta
 */
async function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('Error obteniendo conexión:', err);
                reject(err);
                return;
            }

            db.query(query, params, (err, results) => {
                db.detach();
                
                if (err) {
                    console.error('Error ejecutando consulta:', err);
                    reject(err);
                    return;
                }
                
                resolve(results);
            });
        });
    });
}

/**
 * Ejecutar consulta simple (versión original para compatibilidad)
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Array>} Resultados de la consulta
 */
async function ejecutarConsulta(query, params = []) {
    return executeQuery(query, params);
}

/**
 * Ejecutar consulta dentro de una transacción
 * @param {Object} transaction - Objeto de transacción
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Array>} Resultados de la consulta
 */
async function executeQueryInTransaction(transaction, query, params = []) {
    return new Promise((resolve, reject) => {
        transaction.query(query, params, (err, result) => {
            if (err) {
                console.error('Error ejecutando query en transacción:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Ejecutar transacción con callback
 * @param {Object} connection - Conexión a la base de datos
 * @param {Function} callback - Función con la transacción
 * @returns {Promise<any>} Resultado de la transacción
 */
async function executeTransactionWithCallback(connection, callback) {
    return new Promise((resolve, reject) => {
        connection.transaction(Firebird.ISOLATION_READ_COMMITTED, async (err, transaction) => {
            if (err) {
                console.error('Error iniciando transacción:', err);
                reject(err);
                return;
            }

            try {
                const resultado = await callback(transaction);
                transaction.commit((err) => {
                    if (err) {
                        console.error('Error haciendo commit:', err);
                        transaction.rollback();
                        reject(err);
                    } else {
                        resolve(resultado);
                    }
                });
            } catch (error) {
                console.error('Error en transacción:', error);
                transaction.rollback();
                reject(error);
            }
        });
    });
}

/**
 * Ejecutar transacción (versión original para compatibilidad)
 * @param {Function} callback - Función con la transacción
 * @returns {Promise<any>} Resultado de la transacción
 */
async function ejecutarTransaccion(callback) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('Error obteniendo conexión:', err);
                reject(err);
                return;
            }

            db.transaction(Firebird.ISOLATION_READ_COMMITTED, async (err, transaction) => {
                if (err) {
                    console.error('Error iniciando transacción:', err);
                    db.detach();
                    reject(err);
                    return;
                }

                try {
                    const resultado = await callback(transaction);
                    transaction.commit((err) => {
                        if (err) {
                            console.error('Error haciendo commit:', err);
                            transaction.rollback();
                            reject(err);
                        } else {
                            resolve(resultado);
                        }
                        db.detach();
                    });
                } catch (error) {
                    console.error('Error en transacción:', error);
                    transaction.rollback();
                    db.detach();
                    reject(error);
                }
            });
        });
    });
}

/**
 * Obtener información del sistema TNS
 * @returns {Promise<Object>} Información del sistema
 */
async function obtenerInfoSistema() {
    try {
        const info = {};
        
        // Información de TERCEROS
        const terceros = await executeQuery(`
            SELECT COUNT(*) as total, 
                   COUNT(CASE WHEN CLIENTE = 'S' THEN 1 END) as clientes,
                   COUNT(CASE WHEN VENDED = 'S' THEN 1 END) as vendedores
            FROM TERCEROS
        `);
        info.terceros = terceros[0];
        
        // Información de MATERIAL
        const material = await executeQuery(`
            SELECT COUNT(*) as total
            FROM MATERIAL
        `);
        info.material = material[0];
        
        // Información de BODEGA
        const bodega = await executeQuery(`
            SELECT COUNT(*) as total
            FROM BODEGA
        `);
        info.bodega = bodega[0];
        
        // Información de KARDEX (pedidos)
        const kardex = await executeQuery(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN FECANULADO IS NULL THEN 1 END) as activos,
                   COUNT(CASE WHEN FECANULADO IS NOT NULL THEN 1 END) as anulados
            FROM KARDEX
        `);
        info.kardex = kardex[0];
        
        // Información de DEKARDEX (líneas de pedidos)
        const dekardex = await executeQuery(`
            SELECT COUNT(*) as total
            FROM DEKARDEX
        `);
        info.dekardex = dekardex[0];
        
        return info;
    } catch (error) {
        console.error('Error obteniendo información del sistema:', error);
        throw error;
    }
}

module.exports = {
    createConnection,
    executeQuery,
    executeQueryInTransaction,
    executeTransactionWithCallback,
    ejecutarConsulta,
    ejecutarTransaccion,
    obtenerInfoSistema,
    pool
};
