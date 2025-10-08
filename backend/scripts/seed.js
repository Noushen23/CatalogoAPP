const { query } = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    console.log('🌱 Iniciando seed de datos...');

    // Verificar si ya hay datos
    const existingCategories = await query('SELECT COUNT(*) as count FROM categorias');
    if (existingCategories[0].count > 5) {
      console.log('⚠️  Los datos ya existen, omitiendo seed');
      return;
    }

    // Crear categorías adicionales
    const categories = [
      {
        id: uuidv4(),
        nombre: 'Tecnología',
        descripcion: 'Dispositivos tecnológicos y accesorios',
        orden: 1
      },
      {
        id: uuidv4(),
        nombre: 'Moda',
        descripcion: 'Ropa y accesorios de moda',
        orden: 2
      },
      {
        id: uuidv4(),
        nombre: 'Hogar y Jardín',
        descripcion: 'Artículos para el hogar y jardín',
        orden: 3
      },
      {
        id: uuidv4(),
        nombre: 'Deportes',
        descripcion: 'Artículos deportivos y fitness',
        orden: 4
      },
      {
        id: uuidv4(),
        nombre: 'Libros',
        descripcion: 'Libros y material educativo',
        orden: 5
      }
    ];

    console.log('📂 Creando categorías...');
    for (const category of categories) {
      await query(`
        INSERT INTO categorias (id, nombre, descripcion, orden, activa)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
      `, [category.id, category.nombre, category.descripcion, category.orden, true]);
    }

    // Crear productos de ejemplo
    const products = [
      {
        id: uuidv4(),
        nombre: 'iPhone 15 Pro',
        descripcion: 'El iPhone más avanzado con chip A17 Pro',
        precio: 4500000,
        precio_oferta: 4200000,
        categoria_id: categories[0].id,
        stock: 10,
        sku: 'IPH15PRO-128',
        destacado: true
      },
      {
        id: uuidv4(),
        nombre: 'Samsung Galaxy S24',
        descripcion: 'Smartphone Android con IA integrada',
        precio: 3800000,
        categoria_id: categories[0].id,
        stock: 15,
        sku: 'SGS24-256',
        destacado: true
      },
      {
        id: uuidv4(),
        nombre: 'Camiseta Básica',
        descripcion: 'Camiseta 100% algodón, cómoda y versátil',
        precio: 45000,
        categoria_id: categories[1].id,
        stock: 50,
        sku: 'CAM-BAS-001'
      },
      {
        id: uuidv4(),
        nombre: 'Jeans Clásicos',
        descripcion: 'Jeans de corte clásico, talle regular',
        precio: 120000,
        categoria_id: categories[1].id,
        stock: 30,
        sku: 'JEA-CLA-001'
      },
      {
        id: uuidv4(),
        nombre: 'Sofá 3 Puestos',
        descripcion: 'Sofá moderno de 3 puestos, tela gris',
        precio: 1200000,
        categoria_id: categories[2].id,
        stock: 5,
        sku: 'SOF-3P-001'
      },
      {
        id: uuidv4(),
        nombre: 'Mesa de Centro',
        descripcion: 'Mesa de centro de madera maciza',
        precio: 350000,
        categoria_id: categories[2].id,
        stock: 8,
        sku: 'MES-CEN-001'
      },
      {
        id: uuidv4(),
        nombre: 'Pelota de Fútbol',
        descripcion: 'Pelota oficial de fútbol, tamaño 5',
        precio: 85000,
        categoria_id: categories[3].id,
        stock: 25,
        sku: 'PEL-FUT-001'
      },
      {
        id: uuidv4(),
        nombre: 'Raqueta de Tenis',
        descripcion: 'Raqueta profesional de tenis',
        precio: 280000,
        categoria_id: categories[3].id,
        stock: 12,
        sku: 'RAQ-TEN-001'
      },
      {
        id: uuidv4(),
        nombre: 'Libro de Programación',
        descripcion: 'Aprende React Native desde cero',
        precio: 95000,
        categoria_id: categories[4].id,
        stock: 20,
        sku: 'LIB-PRO-001'
      },
      {
        id: uuidv4(),
        nombre: 'Novela de Ciencia Ficción',
        descripcion: 'Bestseller de ciencia ficción',
        precio: 65000,
        categoria_id: categories[4].id,
        stock: 35,
        sku: 'NOV-CF-001'
      }
    ];

    console.log('🛍️  Creando productos...');
    for (const product of products) {
      await query(`
        INSERT INTO productos (
          id, nombre, descripcion, precio, precio_oferta, categoria_id,
          stock, sku, destacado, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
      `, [
        product.id, product.nombre, product.descripcion, product.precio,
        product.precio_oferta, product.categoria_id, product.stock,
        product.sku, product.destacado, true
      ]);
    }

    // Crear usuario de prueba
    const bcrypt = require('bcryptjs');
    const testUserId = uuidv4();
    const hashedPassword = await bcrypt.hash('Test123456', 12);

    console.log('👤 Creando usuario de prueba...');
    await query(`
      INSERT INTO usuarios (
        id, email, nombre_completo, contrasena, telefono, rol, activo, email_verificado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE email = VALUES(email)
    `, [
      testUserId, 'test@tienda.com', 'Usuario de Prueba', hashedPassword,
      '+573001234567', 'cliente', true, true
    ]);

    console.log('🎉 Seed completado exitosamente');
    console.log('📊 Datos creados:');
    console.log(`   - ${categories.length} categorías`);
    console.log(`   - ${products.length} productos`);
    console.log('   - 1 usuario de prueba (test@tienda.com / Test123456)');
    console.log('   - 1 usuario administrador (admin@tienda.com / admin123)');

  } catch (error) {
    console.error('❌ Error durante el seed:', error.message);
    process.exit(1);
  }
}

// Ejecutar seed si este archivo se ejecuta directamente
if (require.main === module) {
  // Inicializar base de datos primero
  const { initDatabase } = require('../src/config/database');
  
  initDatabase()
    .then(() => seed())
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = seed;
