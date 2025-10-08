const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TiendaMovil',
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configuraciones adicionales para mejorar la estabilidad
  keepAliveInitialDelay: 0,
  enableKeepAlive: true,
  // Reintentar conexiones perdidas
  retryAttempts: 3,
  retryDelay: 2000
};

// Pool de conexiones
let pool = null;

/**
 * Inicializa el pool de conexiones a MySQL
 */
const initDatabase = async () => {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Probar la conexión
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    console.log(`📊 Base de datos: ${dbConfig.database}`);
    console.log(`🌐 Host: ${dbConfig.host}:${dbConfig.port}`);
    
    connection.release();
    return pool;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    throw error;
  }
};

/**
 * Obtiene una conexión del pool
 */
const getConnection = async () => {
  if (!pool) {
    await initDatabase();
  }
  return pool.getConnection();
};

/**
 * Ejecuta una consulta SQL con reintentos en caso de conexión perdida
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros para la consulta
 * @param {number} retries - Número de reintentos
 * @returns {Promise} Resultado de la consulta
 */
const query = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!pool) {
        await initDatabase();
      }
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error(`❌ Error en consulta SQL (intento ${attempt}/${retries}):`, error.message);
      
      // Si es un error de conexión y no es el último intento, reintentar
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') && attempt < retries) {
        console.log(`🔄 Reintentando conexión en ${dbConfig.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, dbConfig.retryDelay));
        
        // Recrear el pool si la conexión se perdió
        if (pool) {
          await pool.end();
          pool = null;
        }
        continue;
      }
      
      console.error('📝 Query:', query);
      console.error('🔢 Parámetros:', params);
      throw error;
    }
  }
};

/**
 * Ejecuta una transacción con manejo mejorado de errores
 * @param {Function} callback - Función que contiene las operaciones de la transacción
 * @returns {Promise} Resultado de la transacción
 */
const transaction = async (callback) => {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('❌ Error durante rollback:', rollbackError.message);
    }
    throw error;
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      console.error('❌ Error al liberar conexión:', releaseError.message);
    }
  }
};

/**
 * Cierra el pool de conexiones
 */
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('🔌 Pool de conexiones MySQL cerrado');
  }
};

module.exports = {
  initDatabase,
  getConnection,
  query,
  transaction,
  closeDatabase,
  pool: () => pool
};
