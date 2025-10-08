const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4'
};

async function migrate() {
  let connection;
  
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a MySQL');

    // Leer el archivo de esquema
    const schemaPath = path.join(__dirname, '../database/schema_mysql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir el esquema en statements individuales
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Ejecutando ${statements.length} statements...`);

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await connection.execute(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} ejecutado`);
      } catch (error) {
        // Ignorar errores de "ya existe" para tablas e índices
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} ya existe, omitiendo`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Migración completada exitosamente');
    console.log('📊 Base de datos "TiendaMovil" creada y configurada');
    console.log('👤 Usuario administrador creado: admin@tienda.com');
    console.log('🔑 Contraseña: admin123');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  migrate();
}

module.exports = migrate;
