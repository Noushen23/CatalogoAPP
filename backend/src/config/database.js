const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Bomberos2025#',
  database: process.env.DB_NAME || 'tiendamovil',
  charset: 'utf8mb4',
  timezone: '+00:00',
  // Configuraciones del pool (válidas para mysql2)
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  // Configuraciones adicionales para mejorar la estabilidad
  keepAliveInitialDelay: 0,
  enableKeepAlive: true,
  // Configuraciones específicas para MySQL 8.0
  decimalNumbers: true, // Mantener números decimales como números
  supportBigNumbers: true, // Soporte para números grandes
  bigNumberStrings: false, // No convertir números grandes a strings
  dateStrings: false, // No convertir fechas a strings automáticamente
  // Configuración de tipos para MySQL 8.0
  typeCast: function (field, next) {
    // Manejo personalizado de tipos para MySQL 8.0
    if (field.type === 'TINY' && field.length === 1) {
      // Convertir TINYINT(1) a boolean
      return field.string() === '1';
    }
    return next();
  }
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
  // Normalizar parámetros una vez antes de los intentos
  // MySQL 8.0 es más estricto con los tipos en sentencias preparadas
  const normalizedParams = params.map((param, index) => {
    // Si es null o undefined, mantenerlo
    if (param === null || param === undefined) {
      return null;
    }
    
    // Si es boolean, convertir a número (MySQL usa TINYINT para booleanos)
    if (typeof param === 'boolean') {
      return param ? 1 : 0;
    }
    
    // Si ya es un número, asegurar que sea del tipo correcto
    if (typeof param === 'number') {
      // Verificar si es NaN o Infinity
      if (!isFinite(param)) {
        console.warn(`⚠️ Parámetro ${index} no es un número finito:`, param);
        return null;
      }
      return param;
    }
    
    // Para strings, mantener como string (no convertir automáticamente)
    // Esto evita problemas con UUIDs, códigos de barras, etc.
    return param;
  });
  
  // Validar que el número de parámetros coincida con los placeholders
  const placeholderCount = (query.match(/\?/g) || []).length;
  if (normalizedParams.length !== placeholderCount) {
    console.error('❌ Desajuste de parámetros:');
    console.error(`   Placeholders en query: ${placeholderCount}`);
    console.error(`   Parámetros proporcionados: ${normalizedParams.length}`);
    console.error('   Query:', query.substring(0, 200) + '...');
    console.error('   Parámetros:', normalizedParams);
    throw new Error(`Desajuste de parámetros: ${placeholderCount} placeholders pero ${normalizedParams.length} parámetros`);
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!pool) {
        await initDatabase();
      }
      
      // Usar pool.query() en lugar de pool.execute() para evitar problemas con MySQL 8.0
      // pool.query() también escapa parámetros y protege contra inyección SQL
      // La diferencia es que no usa sentencias preparadas del lado del servidor
      const [rows] = await pool.query(query, normalizedParams);
      return rows;
    } catch (error) {
      console.error(`❌ Error en consulta SQL (intento ${attempt}/${retries}):`, error.message);
      console.error(`   Código de error: ${error.code || 'N/A'}`);
      console.error(`   Número de error: ${error.errno || 'N/A'}`);
      
      // Si es un error de argumentos incorrectos (MySQL 8.0 específico)
      if (error.code === 'ER_WRONG_ARGUMENTS' || error.errno === 1210) {
        console.error('🔍 Error específico de MySQL 8.0: Argumentos incorrectos en sentencia preparada');
        console.error('📝 Query completa:', query);
        console.error('🔢 Parámetros originales:', params);
        console.error('🔢 Parámetros normalizados:', normalizedParams);
        console.error('🔢 Tipos de parámetros:', normalizedParams.map(p => {
          if (p === null) return 'null';
          if (typeof p === 'number') return `number(${p})`;
          if (typeof p === 'boolean') return `boolean(${p})`;
          return `string(${typeof p})`;
        }));
        
        // Contar placeholders
        console.error(`🔢 Número de placeholders (?): ${placeholderCount}`);
        console.error(`🔢 Número de parámetros: ${normalizedParams.length}`);
      }
      
      // Si es un error de conexión y no es el último intento, reintentar
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') && attempt < retries) {
        const retryDelay = 2000; // 2 segundos
        console.log(`🔄 Reintentando conexión en ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Recrear el pool si la conexión se perdió
        if (pool) {
          await pool.end();
          pool = null;
        }
        continue;
      }
      
      // Si no es un error de conexión, no reintentar
      if (error.code !== 'ECONNRESET' && error.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw error;
      }
      
      // Si es el último intento y sigue siendo error de conexión, lanzar error
      if (attempt === retries) {
        throw error;
      }
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
