// migration-script.js

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// Asegúrate de que estos datos sean correctos para tu entorno.
// ¡He actualizado el nombre de la base de datos a TiendaMovil2!
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Coloca tu contraseña si tienes una
  database: 'TiendaMovil2', // <--- ¡IMPORTANTE! Base de datos correcta.
};

// Función para parsear campos JSON de forma segura
const safeJsonParse = (jsonString, fieldName) => {
  if (!jsonString) {
    return [];
  }
  try {
    const data = JSON.parse(jsonString);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(`  - Advertencia: No se pudo parsear el campo '${fieldName}'. Valor: "${jsonString}". Se omitirá.`);
    return [];
  }
};

// Función principal de la migración
async function runMigration() {
  let connection;
  console.log('🚀 Iniciando script de migración de datos...');

  try {
    // 1. Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a la base de datos establecida.');

    // 2. Iniciar una transacción para garantizar la integridad de los datos
    await connection.beginTransaction();
    console.log('🔄 Transacción iniciada.');

    // 3. Obtener todos los productos con sus campos de imágenes y etiquetas
    const [products] = await connection.execute(
      'SELECT id, imagenes, etiquetas FROM productos'
    );
    console.log(`🔍 Se encontraron ${products.length} productos para migrar.`);

    if (products.length === 0) {
        console.log('🏁 No hay productos que necesiten migración. Proceso finalizado.');
        await connection.commit();
        await connection.end();
        return;
    }

    // Contadores para el resumen final
    let imagesMigrated = 0;
    let tagsMigrated = 0;
    let productsProcessed = 0;

    // 4. Iterar sobre cada producto
    for (const product of products) {
      console.log(`\n--- Procesando producto ID: ${product.id} ---`);
      
      // --- MIGRACIÓN DE IMÁGENES ---
      const imageUrls = safeJsonParse(product.imagenes, 'imagenes');
      if (imageUrls.length > 0) {
        console.log(`  🖼️  Encontradas ${imageUrls.length} imágenes.`);
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
            console.warn(`  - Omitiendo URL de imagen inválida: ${imageUrl}`);
            continue;
          }

          // Verificar si la imagen ya existe para este producto para evitar duplicados
          const [existingImage] = await connection.execute(
            'SELECT id FROM producto_imagenes WHERE producto_id = ? AND url = ?',
            [product.id, imageUrl]
          );

          if (existingImage.length === 0) {
            // Insertar la imagen en la nueva tabla
            await connection.execute(
              'INSERT INTO producto_imagenes (id, producto_id, url, orden) VALUES (?, ?, ?, ?)',
              [uuidv4(), product.id, imageUrl, i]
            );
            imagesMigrated++;
            console.log(`    -> Imagen insertada: ${imageUrl}`);
          } else {
            console.log(`    -> Imagen ya existe, omitiendo: ${imageUrl}`);
          }
        }
      } else {
        console.log('  🖼️  No se encontraron imágenes para este producto.');
      }

      // --- MIGRACIÓN DE ETIQUETAS ---
      const tagNames = safeJsonParse(product.etiquetas, 'etiquetas');
      if (tagNames.length > 0) {
        console.log(`  🏷️  Encontradas ${tagNames.length} etiquetas.`);
        for (const tagName of tagNames) {
          if (typeof tagName !== 'string' || !tagName.trim()) {
            console.warn(`  - Omitiendo etiqueta inválida: ${tagName}`);
            continue;
          }

          // "Get or Create" para la etiqueta
          // 1. Buscar si la etiqueta ya existe en la tabla `etiquetas`
          let [existingTag] = await connection.execute(
            'SELECT id FROM etiquetas WHERE nombre = ?',
            [tagName]
          );

          let tagId;
          if (existingTag.length > 0) {
            // La etiqueta ya existe, usamos su ID
            tagId = existingTag[0].id;
          } else {
            // La etiqueta no existe, la creamos
            const [result] = await connection.execute(
              'INSERT INTO etiquetas (nombre) VALUES (?)',
              [tagName]
            );
            tagId = result.insertId;
            console.log(`    -> Nueva etiqueta creada en 'etiquetas': "${tagName}" (ID: ${tagId})`);
          }

          // 2. Crear la relación en la tabla `producto_etiquetas`
          // Usamos INSERT IGNORE para evitar errores si la relación ya existe
          const [relationResult] = await connection.execute(
            'INSERT IGNORE INTO producto_etiquetas (producto_id, etiqueta_id) VALUES (?, ?)',
            [product.id, tagId]
          );

          if (relationResult.affectedRows > 0) {
            tagsMigrated++;
            console.log(`    -> Relación creada: Producto ${product.id} <-> Etiqueta "${tagName}"`);
          } else {
            console.log(`    -> Relación ya existe, omitiendo: Producto ${product.id} <-> Etiqueta "${tagName}"`);
          }
        }
      } else {
        console.log('  🏷️  No se encontraron etiquetas para este producto.');
      }
      productsProcessed++;
    }

    // 5. Si todo fue exitoso, confirmar los cambios
    await connection.commit();
    console.log('\n\n✅ ¡Migración completada exitosamente!');
    console.log('-----------------------------------------');
    console.log('📊 RESUMEN:');
    console.log(`   - Productos procesados: ${productsProcessed}`);
    console.log(`   - Nuevas imágenes insertadas: ${imagesMigrated}`);
    console.log(`   - Nuevas relaciones de etiquetas creadas: ${tagsMigrated}`);
    console.log('-----------------------------------------');
    console.log('🔄 Transacción confirmada (commit). Los datos están guardados.');

  } catch (error) {
    console.error('\n❌ ¡ERROR DURANTE LA MIGRACIÓN!', error);
    if (connection) {
      // Si hubo un error, revertir todos los cambios
      await connection.rollback();
      console.error('⏪ Transacción revertida (rollback). No se guardó ningún cambio.');
    }
  } finally {
    if (connection) {
      // 6. Cerrar la conexión
      await connection.end();
      console.log('🔌 Conexión a la base de datos cerrada.');
    }
  }
}

// Ejecutar la función de migración
runMigration();











