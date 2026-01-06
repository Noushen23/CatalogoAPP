/**
 * Configuración y funciones de base de datos TNS
 * Plataforma Web de Pedidos de Venta
 */

const Firebird = require('node-firebird');
const config = require('./app.config');

// Pool de conexiones (máx 5 conexiones simultáneas)
const pool = Firebird.pool(5, config.database.firebird);

/**
 * Obtener una conexión desde el pool
 * ⚠️ IMPORTANTE: siempre llamar db.detach()
 */
function createConnection() {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('❌ Error obteniendo conexión:', err);
                return reject(err);
            }
            resolve(db);
        });
    });
}

/**
 * Ejecutar una consulta SQL simple
 * @param {string} query
 * @param {Array} params
 * @returns {Promise<Array>}
 */
function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('❌ Error obteniendo conexión:', err);
                return reject(err);
            }

            db.query(query, params, (err, result) => {
                db.detach(); // 🔐 liberar conexión SIEMPRE

                if (err) {
                    console.error('❌ Error ejecutando consulta:', err);
                    return reject(err);
                }

                resolve(result);
            });
        });
    });
}

/**
 * Alias para compatibilidad con código anterior
 */
function ejecutarConsulta(query, params = []) {
    return executeQuery(query, params);
}

/**
 * Ejecutar una transacción recibiendo la conexión
 * @param {Object} db
 * @param {Function} callback
 */
function executeTransactionWithCallback(db, callback) {
    return new Promise((resolve, reject) => {
        db.transaction(
            Firebird.ISOLATION_READ_COMMITTED,
            async (err, transaction) => {
                if (err) {
                    console.error('❌ Error iniciando transacción:', err);
                    return reject(err);
                }

                try {
                    const result = await callback(transaction);

                    transaction.commit(err => {
                        if (err) {
                            transaction.rollback();
                            return reject(err);
                        }
                        resolve(result);
                    });
                } catch (error) {
                    transaction.rollback();
                    reject(error);
                }
            }
        );
    });
}

/**
 * Ejecutar transacción completa desde el pool
 * @param {Function} callback
 */
function ejecutarTransaccion(callback) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('❌ Error obteniendo conexión:', err);
                return reject(err);
            }

            db.transaction(
                Firebird.ISOLATION_READ_COMMITTED,
                async (err, transaction) => {
                    if (err) {
                        db.detach();
                        return reject(err);
                    }

                    try {
                        const result = await callback(transaction);

                        transaction.commit(err => {
                            if (err) {
                                transaction.rollback();
                                db.detach();
                                return reject(err);
                            }

                            db.detach();
                            resolve(result);
                        });
                    } catch (error) {
                        transaction.rollback();
                        db.detach();
                        reject(error);
                    }
                }
            );
        });
    });
}

/**
 * Obtener información general del sistema TNS
 */
async function obtenerInfoSistema() {
    const info = {};

    try {
        const terceros = await executeQuery(`
            SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN CLIENTE = 'S' THEN 1 END) AS clientes,
                COUNT(CASE WHEN VENDED = 'S' THEN 1 END) AS vendedores
            FROM TERCEROS
        `);
        info.terceros = terceros[0];

        const material = await executeQuery(`
            SELECT COUNT(*) AS total
            FROM MATERIAL
        `);
        info.material = material[0];

        const bodega = await executeQuery(`
            SELECT COUNT(*) AS total
            FROM BODEGA
        `);
        info.bodega = bodega[0];

        const kardex = await executeQuery(`
            SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN FECANULADO IS NULL THEN 1 END) AS activos,
                COUNT(CASE WHEN FECANULADO IS NOT NULL THEN 1 END) AS anulados
            FROM KARDEX
        `);
        info.kardex = kardex[0];

        const dekardex = await executeQuery(`
            SELECT COUNT(*) AS total
            FROM DEKARDEX
        `);
        info.dekardex = dekardex[0];

        return info;
    } catch (error) {
        console.error('❌ Error obteniendo información del sistema:', error);
        throw error;
    }
}

module.exports = {
    pool,
    createConnection,
    executeQuery,
    ejecutarConsulta,
    executeTransactionWithCallback,
    ejecutarTransaccion,
    obtenerInfoSistema
};
