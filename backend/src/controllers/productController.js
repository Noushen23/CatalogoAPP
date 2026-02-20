const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs').promises;
const path = require('path');
const imageProcessor = require('../services/imageProcessor');
const { query, getConnection, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const ImageHelper = require('../helpers/imageHelper');

class ProductController {
  // Obtener todos los productos
  static async getProducts(req, res) {
    try {
      const {
        categoriaId, precioMin, precioMax, calificacionMin, enOferta, search, stockFilter,
        esServicio, // Nuevo filtro para servicios
        es_servicio, // Alias alternativo
        activo, // Filtro para productos activos/inactivos
        sortBy = 'recientes', // recientes, precio_asc, precio_desc, ventas, calificacion
        page = 1,
        limit = 20
      } = req.query;

      // Construir query con filtros dinámicos
      let whereConditions = [];
      let queryParams = [];

      // Filtro por productos activos (SIEMPRE con ?)
      if (activo !== undefined) {
        const activoValue = activo === 'true' || activo === '1' || activo === 1 || activo === true;
        whereConditions.push('p.activo = ?');
        queryParams.push(Number(activoValue ? 1 : 0));
      } else {
        whereConditions.push('p.activo = ?');
        queryParams.push(1);
      }

      // Filtro por categoría
      if (categoriaId) {
        whereConditions.push('p.categoria_id = ?');
        queryParams.push(String(categoriaId));
      }

      // Filtro por rango de precio
      if (precioMin) {
        whereConditions.push('p.precio >= ?');
        queryParams.push(Number(parseFloat(precioMin)));
      }
      if (precioMax) {
        whereConditions.push('p.precio <= ?');
        queryParams.push(Number(parseFloat(precioMax)));
      }

      // Filtro por calificación mínima
      if (calificacionMin) {
        whereConditions.push('p.calificacion_promedio >= ?');
        queryParams.push(Number(parseFloat(calificacionMin)));
      }

      // Filtro por productos en oferta
      if (enOferta === 'true' || enOferta === '1') {
        // Ser robustos: considerar columna calculada y condición por precios
        whereConditions.push('(p.en_oferta = 1 OR (p.precio_oferta IS NOT NULL AND p.precio_oferta < p.precio))');
      }

      // Filtro por búsqueda de texto
      if (search && search.trim()) {
        console.log('🔍 Búsqueda recibida:', search.trim());
        whereConditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ? OR p.codigo_barras LIKE ? OR p.etiquetas LIKE ?)');
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Filtro por estado de stock
      if (stockFilter) {
        switch (stockFilter) {
          case 'in_stock':
            whereConditions.push('p.stock > 0');
            break;
          case 'low_stock':
            whereConditions.push('p.stock <= p.stock_minimo');
            break;
          case 'out_of_stock':
            whereConditions.push('p.stock = 0');
            break;
        }
      }

      // Filtro por servicios (es_servicio)
      if (esServicio !== undefined || es_servicio !== undefined) {
        // Normalizar el valor: puede venir como string 'true'/'false', número 1/0, o boolean
        const esServicioValue = esServicio !== undefined ? esServicio : es_servicio;
        const isService = esServicioValue === 'true' || esServicioValue === '1' || esServicioValue === 1 || esServicioValue === true;

        if (isService) {
          // Filtrar solo servicios: es_servicio = 1 O (es_servicio IS NULL Y tiene etiqueta servicio)
          whereConditions.push('(p.es_servicio = 1 OR (p.es_servicio IS NULL AND p.etiquetas LIKE ?))');
          queryParams.push('%"servicio"%');
        } else {
          // Excluir servicios: es_servicio = 0 O es_servicio IS NULL (pero sin etiqueta servicio)
          whereConditions.push('(p.es_servicio = 0 OR (p.es_servicio IS NULL AND (p.etiquetas IS NULL OR p.etiquetas NOT LIKE ?)))');
          queryParams.push('%"servicio"%');
        }
      }

      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

      // Validar y convertir parámetros de paginación a enteros
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Determinar ordenamiento
      let orderBy = 'p.fecha_creacion DESC'; // Por defecto: más recientes

      switch (sortBy) {
        case 'precio_asc':
          orderBy = 'p.precio ASC';
          break;
        case 'precio_desc':
          orderBy = 'p.precio DESC';
          break;
        case 'nombre':
        case 'nombre_asc':
          orderBy = 'p.nombre ASC';
          break;
        case 'nombre_desc':
          orderBy = 'p.nombre DESC';
          break;
        case 'stock_asc':
          orderBy = 'p.stock ASC';
          break;
        case 'stock_desc':
          orderBy = 'p.stock DESC';
          break;
        case 'ventas':
          orderBy = 'p.ventas_totales DESC, p.fecha_creacion DESC';
          break;
        case 'calificacion':
          orderBy = 'p.calificacion_promedio DESC, p.total_resenas DESC';
          break;
        case 'recientes':
        default:
          orderBy = 'p.fecha_creacion DESC';
          break;
      }

      const productsQuery = `
        SELECT
          p.id, p.nombre, p.descripcion, p.precio, p.precio_oferta, p.en_oferta,
          p.categoria_id, p.stock, p.stock_minimo, p.activo, p.destacado, p.codigo_barras,
          p.sku, p.ventas_totales, p.calificacion_promedio, p.total_resenas, p.es_servicio,
          p.fecha_creacion, p.fecha_actualizacion,
          c.nombre as categoriaNombre, p.etiquetas as etiquetas_raw
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      // Asegurar que los parámetros sean del tipo correcto (enteros)
      queryParams.push(Number(limitNum), Number(offset));

      const products = await query(productsQuery, queryParams);

      if (!Array.isArray(products)) {
        throw new Error(`products no es un array: ${typeof products}`);
      }

      // Obtener imágenes para todos los productos de forma separada (más confiable)
      console.log('📦 [getProducts] Iniciando obtención de imágenes para', products.length, 'productos');

      const formattedProducts = await Promise.all(products.map(async (product) => {
        // Obtener imágenes del producto de forma separada
        let imagenes = [];
        try {
          console.log(`🔍 [getProducts] Consultando imágenes para producto ${product.id}`);

          const imagesQuery = `
            SELECT id, url_imagen, orden, es_principal
            FROM imagenes_producto
            WHERE producto_id = ?
            ORDER BY orden ASC
          `;
          const images = await query(imagesQuery, [product.id]);

          console.log(`📊 [getProducts] Producto ${product.id}: ${images.length} imagen(es) encontrada(s) en BD`);
          if (images.length > 0) {
            console.log(`📋 [getProducts] URLs en BD para producto ${product.id}:`,
              images.map(img => ({ id: img.id, url: img.url_imagen, orden: img.orden }))
            );
          }

          // Usar ImageHelper para formatear todas las imágenes de forma centralizada
          imagenes = ImageHelper.formatProductImages(images);

          console.log(`✅ [getProducts] Producto ${product.id}: ${imagenes.length} imagen(es) formateada(s)`);
          if (imagenes.length > 0) {
            console.log(`📤 [getProducts] URLs finales para producto ${product.id}:`,
              imagenes.map(img => ({ id: img.id, url: img.urlImagen, orden: img.orden }))
            );
          }
        } catch (error) {
          console.error(`❌ [getProducts] Error obteniendo imágenes para producto ${product.id}:`, error.message);
          imagenes = [];
        }

        // Parsear etiquetas
        let etiquetas = [];
        if (product.etiquetas_raw) {
          try {
            etiquetas = JSON.parse(product.etiquetas_raw);
          } catch (error) {
            etiquetas = product.etiquetas_raw.split(',').filter(tag => tag.trim());
          }
        }

        return {
          id: product.id,
          nombre: product.nombre,
          title: product.nombre,
          descripcion: product.descripcion,
          precio: parseFloat(product.precio),
          precioOferta: product.precio_oferta ? parseFloat(product.precio_oferta) : null,
          precioFinal: product.precio_oferta && product.precio_oferta < product.precio
            ? parseFloat(product.precio_oferta)
            : parseFloat(product.precio),
          enOferta: Boolean(product.en_oferta),
          categoriaId: product.categoria_id,
          categoriaNombre: product.categoriaNombre,
          stock: product.stock,
          stockMinimo: product.stock_minimo,
          stockBajo: product.stock <= product.stock_minimo,
          activo: Boolean(product.activo),
          esServicio: Boolean(product.es_servicio),
          es_servicio: Boolean(product.es_servicio), // Alias para compatibilidad
          isActive: Boolean(product.activo),
          destacado: Boolean(product.destacado),
          codigoBarras: product.codigo_barras,
          sku: product.sku,
          ventasTotales: product.ventas_totales || 0,
          calificacionPromedio: parseFloat(product.calificacion_promedio) || 0,
          totalResenas: product.total_resenas || 0,
          imagenes: imagenes,
          etiquetas: etiquetas,
          fechaCreacion: product.fecha_creacion,
          fechaActualizacion: product.fecha_actualizacion
        };
      }));

      // Contar total de productos con los mismos filtros
      let countQuery = 'SELECT COUNT(*) as total FROM productos p WHERE ' + whereClause;
      const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remover LIMIT y OFFSET
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: {
          products: formattedProducts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: totalPages,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener producto por ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;

      const productQuery = `
        SELECT
          p.*,
          c.nombre as categoriaNombre,
          p.etiquetas as etiquetas_raw
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ?
      `;

      const products = await query(productQuery, [id]);

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const product = products[0];

      // Obtener imágenes del producto de forma separada (más confiable)
      console.log(`🖼️ [getProductById] Iniciando obtención de imágenes para producto ${id}`);

      let imagenes = [];
      try {
        const imagesQuery = `
          SELECT id, url_imagen, orden, es_principal
          FROM imagenes_producto
          WHERE producto_id = ?
          ORDER BY orden ASC
        `;

        console.log(`🔍 [getProductById] Ejecutando consulta SQL para producto ${id}`);
        const images = await query(imagesQuery, [id]);

        console.log(`📊 [getProductById] Producto ${id}: ${images.length} imagen(es) encontrada(s) en BD`);
        if (images.length > 0) {
          console.log(`📋 [getProductById] URLs en BD para producto ${id}:`,
            images.map(img => ({
              id: img.id,
              url_imagen: img.url_imagen,
              orden: img.orden,
              es_principal: img.es_principal
            }))
          );
        }

        // Usar ImageHelper para formatear todas las imágenes de forma centralizada
        console.log(`🔄 [getProductById] Formateando imágenes para producto ${id}`);
        imagenes = ImageHelper.formatProductImages(images);

        console.log(`✅ [getProductById] Producto ${id}: ${imagenes.length} imagen(es) procesada(s) y enviada(s)`);
        if (imagenes.length > 0) {
          console.log(`📤 [getProductById] URLs finales para producto ${id}:`,
            imagenes.map(img => ({
              id: img.id,
              url: img.urlImagen,
              orden: img.orden,
              esPrincipal: img.esPrincipal
            }))
          );
        }
      } catch (error) {
        console.error(`❌ [getProductById] Error obteniendo imágenes para producto ${id}:`, error.message);
        imagenes = [];
      }

      // Parsear etiquetas
      let etiquetas = [];
      if (product.etiquetas_raw) {
        try {
          etiquetas = JSON.parse(product.etiquetas_raw);
        } catch (error) {
          etiquetas = product.etiquetas_raw.split(',').filter(tag => tag.trim());
        }
      }

      // Obtener estadísticas de reseñas
      const Review = require('../models/Review');
      const reviewStats = await Review.getAverageRatingAndCount(id);

      // Formatear producto con las imágenes ya procesadas
      const formattedProduct = {
        id: product.id,
        nombre: product.nombre,
        title: product.nombre,
        descripcion: product.descripcion,
        precio: parseFloat(product.precio),
        precioOferta: product.precio_oferta ? parseFloat(product.precio_oferta) : null,
        precioFinal: product.precio_oferta && product.precio_oferta < product.precio
          ? parseFloat(product.precio_oferta)
          : parseFloat(product.precio),
        enOferta: Boolean(product.en_oferta),
        categoriaId: product.categoria_id,
        categoriaNombre: product.categoriaNombre,
        stock: product.stock,
        stockMinimo: product.stock_minimo,
        stockBajo: product.stock <= product.stock_minimo,
        activo: Boolean(product.activo),
        esServicio: Boolean(product.es_servicio),
        es_servicio: Boolean(product.es_servicio),
        isActive: Boolean(product.activo),
        destacado: Boolean(product.destacado),
        codigoBarras: product.codigo_barras,
        sku: product.sku,
        ventasTotales: product.ventas_totales || 0,
        calificacionPromedio: parseFloat(reviewStats.promedioCalificacion) || 0,
        totalResenas: reviewStats.totalResenas || 0,
        imagenes: imagenes, // Usar las imágenes ya procesadas
        etiquetas: etiquetas,
        fechaCreacion: product.fecha_creacion,
        fechaActualizacion: product.fecha_actualizacion,
        // Estadísticas de reseñas
        reviewStats: {
          promedio: parseFloat(reviewStats.promedioCalificacion) || 0,
          total: reviewStats.totalResenas || 0,
          distribucion: reviewStats.distribucion || {}
        }
      };

      // Agregar headers para evitar caché en desarrollo
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Log final para verificar
      console.log(`📦 Producto ${id} - Total imágenes en respuesta: ${formattedProduct.imagenes.length}`);
      console.log(`🖼️  Estructura de imágenes:`, JSON.stringify(formattedProduct.imagenes, null, 2));

      res.json({
        success: true,
        message: 'Producto obtenido exitosamente',
        data: {
          product: formattedProduct
        }
      });

    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Invalidar cache de productos (para sincronización con móvil)
  static async invalidateProductCache(req, res) {
    try {
      const { productId } = req.params;

      // Esta función puede ser extendida para invalidar cache específico
      // Por ahora solo confirmamos que el producto existe
      if (productId) {
        const product = await query('SELECT id FROM productos WHERE id = ?', [productId]);
        if (product.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Cache invalidado exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error invalidando cache:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Verificar si un producto ya existe por SKU o CodVinculacion
  static async checkProductExists(req, res) {
    const { sku, CodVinculacion } = req.query;

    try {
      let existingProduct = null;
      let searchField = '';
      let searchValue = '';

      if (sku) {
        const products = await query('SELECT id, nombre, sku, CodVinculacion FROM productos WHERE sku = ?', [sku]);
        if (products.length > 0) {
          existingProduct = products[0];
          searchField = 'SKU';
          searchValue = sku;
        }
      } else if (CodVinculacion) {
        const products = await query('SELECT id, nombre, sku, CodVinculacion FROM productos WHERE CodVinculacion = ?', [CodVinculacion]);
        if (products.length > 0) {
          existingProduct = products[0];
          searchField = 'Código de Vinculación';
          searchValue = CodVinculacion;
        }
      }

      res.status(200).json({
        success: true,
        exists: !!existingProduct,
        product: existingProduct,
        searchField,
        searchValue
      });
    } catch (error) {
      console.error('Error verificando producto existente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear producto
  static async createProduct(req, res) {
    const { nombre, descripcion, precio, stock, categoria_id, activo, imagenes, etiquetas, sku, codigo_barras, precio_oferta, destacado, CodVinculacion, esServicio, es_servicio } = req.body;
    const productId = uuidv4();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      // Verificar que la categoría existe si se proporciona
      if (categoria_id) {
        const category = await Category.findById(categoria_id);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Categoría no encontrada'
          });
        }
      }

      // Usar transacción para garantizar la integridad de los datos
      const result = await transaction(async (connection) => {
        // 1. Insertar en la tabla principal `productos`
        const slug = nombre.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
        const categoriaIdFinal = categoria_id || null;

        const esServicioValue = Boolean(esServicio || es_servicio || false);
        await connection.execute(
          'INSERT INTO productos (id, nombre, slug, descripcion, precio, precio_oferta, categoria_id, stock, stock_minimo, sku, codigo_barras, activo, destacado, en_oferta, CodVinculacion, es_servicio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, nombre, slug, descripcion, precio, precio_oferta || null, categoriaIdFinal, stock || 0, 5, sku || null, codigo_barras || null, activo !== false, destacado || false, Boolean(precio_oferta && precio_oferta < precio), CodVinculacion || null, esServicioValue]
        );

        // 2. Insertar en `producto_imagenes`
        if (imagenes && imagenes.length > 0) {
          console.log(`📸 [createProduct] Procesando ${imagenes.length} imagen(es) para producto ${productId}...`);

          // Crear directorio específico para este producto
          const productUploadsDir = path.join(__dirname, '../../uploads/products', productId);
          console.log(`📁 [createProduct] Creando directorio para imágenes:`, productUploadsDir);
          await fs.mkdir(productUploadsDir, { recursive: true });
          console.log(`✅ [createProduct] Directorio creado exitosamente`);

          for (let i = 0; i < imagenes.length; i++) {
            console.log(`🖼️ [createProduct] Procesando imagen ${i + 1}/${imagenes.length} para producto ${productId}`);
            const imageData = imagenes[i];
            let imageUrl = imageData;

            // Si es base64, convertir a archivo
            if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
              const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = imageData.split(';')[0].split('/')[1];
              const filename = `product_${Date.now()}_${i}_optimized.${ext}`.replace(/\s+/g, '_');

              // Guardar buffer temporalmente para optimizar
              const tempPath = path.join(productUploadsDir, `temp_${filename}`);
              const finalPath = path.join(productUploadsDir, filename);
              await fs.writeFile(tempPath, buffer);

              // Optimizar imagen con Sharp si está disponible
              try {
                await imageProcessor.optimizeImage(tempPath, finalPath);
                await fs.unlink(tempPath); // Eliminar temporal
              } catch (optimizeError) {
                // Si falla la optimización, renombrar el temporal
                await fs.rename(tempPath, finalPath);
              }

              imageUrl = `/uploads/products/${productId}/${filename}`;
              console.log(`✅ Imagen ${i + 1} guardada: ${imageUrl}`);
            } else if (typeof imageData === 'string' && (imageData.startsWith('/uploads/') || imageData.startsWith('http'))) {
              // Si ya viene como ruta, conservarla tal cual
              // Normalizar a ruta relativa si es necesario
              if (imageData.startsWith('http')) {
                // Si es URL completa, extraer solo la ruta relativa
                const urlObj = new URL(imageData);
                imageUrl = urlObj.pathname;
              } else {
                imageUrl = imageData;
              }
              console.log(`📋 Imagen ${i + 1} conservada (ruta existente): ${imageUrl}`);
            } else if (typeof imageData === 'object' && imageData.url_imagen) {
              // Si viene como objeto con url_imagen, usar esa ruta
              imageUrl = imageData.url_imagen;
              console.log(`📋 Imagen ${i + 1} conservada (objeto con ruta): ${imageUrl}`);
            }

            const imageId = uuidv4();
            console.log(`💾 [createProduct] Guardando imagen ${i + 1} en BD:`, {
              id: imageId,
              productoId: productId,
              url_imagen: imageUrl,
              orden: i,
              es_principal: i === 0
            });

            await connection.execute(
              'INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal) VALUES (?, ?, ?, ?, ?)',
              [imageId, productId, imageUrl, i, i === 0]
            );

            console.log(`✅ [createProduct] Imagen ${i + 1} guardada en BD exitosamente`);
          }

          console.log(`✅ [createProduct] Todas las imágenes procesadas para producto ${productId}`);
        } else {
          console.log(`📭 [createProduct] No hay imágenes para procesar en producto ${productId}`);
        }

        // 3. Actualizar etiquetas como JSON en la tabla productos
        if (etiquetas && etiquetas.length > 0) {
          console.log(`🏷️ Procesando ${etiquetas.length} etiqueta(s) para producto...`);

          const etiquetasJson = JSON.stringify(etiquetas);
          await connection.execute('UPDATE productos SET etiquetas = ? WHERE id = ?', [etiquetasJson, productId]);
          console.log(`✅ Etiquetas actualizadas: ${etiquetas.join(', ')}`);
        }

        return productId;
      });

      // Obtener el producto creado con todas sus relaciones
      const productQuery = `
        SELECT
          p.*,
          c.nombre as categoriaNombre,
          (
            SELECT GROUP_CONCAT(
              CONCAT(
                '{"id":"', pi.id, '","url":"', pi.url_imagen, '","orden":', pi.orden, ',"es_principal":', pi.es_principal, '}'
              )
              ORDER BY pi.orden ASC
              SEPARATOR ','
            )
            FROM imagenes_producto pi
            WHERE pi.producto_id = p.id
          ) as imagenes_raw,
          p.etiquetas as etiquetas_raw
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ?
      `;

      const products = await query(productQuery, [productId]);
      const product = products[0];

      // Parsear imágenes y etiquetas desde GROUP_CONCAT
      console.log(`🔄 [createProduct] Formateando imágenes del producto creado ${productId}`);
      let imagenesFormateadas = [];
      if (product.imagenes_raw) {
        try {
          console.log(`📋 [createProduct] Imágenes raw encontradas:`, product.imagenes_raw);
          const imagenesArray = JSON.parse(`[${product.imagenes_raw}]`);
          console.log(`📊 [createProduct] ${imagenesArray.length} imagen(es) parseada(s) desde GROUP_CONCAT`);

          // Usar ImageHelper para formatear todas las imágenes de forma centralizada
          imagenesFormateadas = imagenesArray.map((img, idx) => {
            console.log(`🖼️ [createProduct] Formateando imagen ${idx + 1}/${imagenesArray.length}`);
            // Convertir el formato del GROUP_CONCAT al formato esperado por ImageHelper
            const imageObj = {
              id: img.id,
              url_imagen: img.url,
              orden: img.orden || 0,
              es_principal: Boolean(img.es_principal)
            };
            return ImageHelper.formatProductImage(imageObj);
          }).filter(img => img !== null); // Filtrar imágenes inválidas

          console.log(`✅ [createProduct] ${imagenesFormateadas.length} imagen(es) formateada(s) exitosamente`);
        } catch (error) {
          console.error(`❌ [createProduct] Error parseando imágenes:`, error.message);
          imagenesFormateadas = [];
        }
      } else {
        console.log(`📭 [createProduct] No hay imágenes raw para formatear`);
      }

      let etiquetasFormateadas = [];
      if (product.etiquetas_raw) {
        etiquetasFormateadas = product.etiquetas_raw.split(',');
      }

      const formattedProduct = {
        id: product.id,
        nombre: product.nombre,
        title: product.nombre,
        descripcion: product.descripcion,
        precio: parseFloat(product.precio),
        precioOferta: product.precio_oferta ? parseFloat(product.precio_oferta) : null,
        precioFinal: product.precio_oferta && product.precio_oferta < product.precio
          ? parseFloat(product.precio_oferta)
          : parseFloat(product.precio),
        enOferta: product.precio_oferta && product.precio_oferta < product.precio,
        categoriaId: product.categoria_id,
        categoriaNombre: product.categoriaNombre,
        stock: product.stock,
        stockMinimo: product.stock_minimo,
        stockBajo: product.stock <= product.stock_minimo,
        activo: Boolean(product.activo),
        isActive: Boolean(product.activo),
        destacado: Boolean(product.destacado),
        esServicio: Boolean(product.es_servicio),
        es_servicio: Boolean(product.es_servicio),
        dimensiones: product.dimensiones ? JSON.parse(product.dimensiones) : null,
        codigoBarras: product.codigo_barras,
        sku: product.sku,
        imagenes: imagenesFormateadas,
        etiquetas: etiquetasFormateadas,
        fechaCreacion: product.fecha_creacion,
        fechaActualizacion: product.fecha_actualizacion
      };

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: {
          product: formattedProduct
        }
      });

    } catch (error) {
      console.error('Error al crear producto:', error);

      // Manejar errores específicos de duplicación
      if (error.code === 'ER_DUP_ENTRY') {
        let duplicateField = 'campo';
        let duplicateValue = 'valor';

        // Extraer información del error de duplicación
        if (error.sqlMessage.includes('sku')) {
          duplicateField = 'SKU';
          duplicateValue = sku || 'N/A';
        } else if (error.sqlMessage.includes('codigo_barras')) {
          duplicateField = 'código de barras';
          duplicateValue = codigo_barras || 'N/A';
        } else if (error.sqlMessage.includes('CodVinculacion')) {
          duplicateField = 'código de vinculación';
          duplicateValue = CodVinculacion || 'N/A';
        }

        return res.status(409).json({
          success: false,
          message: `Ya existe un producto con el mismo ${duplicateField}: ${duplicateValue}`,
          error: 'DUPLICATE_PRODUCT',
          duplicateField,
          duplicateValue
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar producto
  static async updateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { nombre, descripcion, precio, stock, categoria_id, activo, imagenes, etiquetas, sku, codigo_barras, precio_oferta, destacado, CodVinculacion, esServicio, es_servicio } = req.body;

      console.log('🔍 Backend - Datos recibidos en updateProduct:', {
        categoria_id,
        categoria_id_type: typeof categoria_id,
        categoria_id_value: categoria_id,
        body: req.body
      });

      // Verificar que el producto existe
      const existingProduct = await query('SELECT id FROM productos WHERE id = ?', [id]);
      if (existingProduct.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar que la categoría existe si se proporciona
      if (categoria_id) {
        const category = await Category.findById(categoria_id);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Categoría no encontrada'
          });
        }
      }

      // Usar transacción para sincronizar datos
      await transaction(async (connection) => {
        // 1. Actualizar la tabla principal `productos`
        const slug = nombre ? nombre.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() : null;

        const updateFields = [];
        const updateValues = [];

        if (nombre !== undefined) {
          updateFields.push('nombre = ?', 'slug = ?');
          updateValues.push(nombre, slug);
        }
        if (descripcion !== undefined) {
          updateFields.push('descripcion = ?');
          updateValues.push(descripcion);
        }
        if (precio !== undefined) {
          updateFields.push('precio = ?');
          updateValues.push(precio);
        }
        if (precio_oferta !== undefined) {
          updateFields.push('precio_oferta = ?');
          updateValues.push(precio_oferta);
        }
        if (categoria_id !== undefined) {
          // Convertir string vacío a null para MySQL
          const categoriaIdValue = (categoria_id === '' || categoria_id === null) ? null : categoria_id;
          console.log('🔧 Backend - Procesando categoria_id:', {
            original: categoria_id,
            processed: categoriaIdValue,
            type: typeof categoria_id
          });
          updateFields.push('categoria_id = ?');
          updateValues.push(categoriaIdValue);
        }
        if (stock !== undefined) {
          updateFields.push('stock = ?');
          updateValues.push(stock);
        }
        if (sku !== undefined) {
          updateFields.push('sku = ?');
          updateValues.push(sku);
        }
        if (codigo_barras !== undefined) {
          updateFields.push('codigo_barras = ?');
          updateValues.push(codigo_barras);
        }
        if (activo !== undefined) {
          updateFields.push('activo = ?');
          updateValues.push(activo);
        }
        if (destacado !== undefined) {
          updateFields.push('destacado = ?');
          updateValues.push(destacado);
        }
        if (esServicio !== undefined || es_servicio !== undefined) {
          const esServicioValue = esServicio !== undefined ? Boolean(esServicio) : Boolean(es_servicio);
          updateFields.push('es_servicio = ?');
          updateValues.push(esServicioValue);
        }
        if (CodVinculacion !== undefined) {
          updateFields.push('CodVinculacion = ?');
          updateValues.push(CodVinculacion);
        }

        // Calcular en_oferta
        if (precio_oferta !== undefined || precio !== undefined) {
          const enOferta = precio_oferta && precio !== undefined && precio_oferta < precio ? 1 : 0;
          updateFields.push('en_oferta = ?');
          updateValues.push(enOferta);
        }

        updateFields.push('fecha_actualizacion = NOW()');
        updateValues.push(id);

        if (updateFields.length > 1) { // Más que solo fecha_actualizacion
          await connection.execute(
            `UPDATE productos SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
          );
        }

        // 2. Sincronizar imágenes: Solo si se proporcionan imágenes explícitamente
        if (imagenes !== undefined) {
          console.log(`🔄 [updateProduct] Sincronizando imágenes para producto ${id}...`);
          console.log(`📊 [updateProduct] Imágenes recibidas:`, {
            total: imagenes?.length || 0,
            tipo: Array.isArray(imagenes) ? 'array' : typeof imagenes
          });

          // Obtener imágenes existentes antes de eliminarlas (para borrar archivos físicos)
          console.log(`🔍 [updateProduct] Obteniendo imágenes existentes del producto ${id}...`);
          const existingImagesQuery = 'SELECT url_imagen FROM imagenes_producto WHERE producto_id = ?';
          const existingImages = await connection.query(existingImagesQuery, [id]);

          console.log(`📋 [updateProduct] Imágenes existentes encontradas:`, {
            total: existingImages?.length || 0,
            urls: existingImages?.map(img => img.url_imagen) || []
          });

          // Eliminar imágenes existentes de la base de datos
          console.log(`🗑️ [updateProduct] Eliminando imágenes existentes de la BD para producto ${id}...`);
          await connection.execute('DELETE FROM imagenes_producto WHERE producto_id = ?', [id]);
          console.log(`✅ [updateProduct] Imágenes eliminadas de la BD`);

          // Eliminar archivos físicos de las imágenes antiguas
          if (existingImages && existingImages.length > 0) {
            console.log(`🗑️ [updateProduct] Eliminando ${existingImages.length} archivo(s) físico(s)...`);
            for (const oldImage of existingImages) {
              if (oldImage.url_imagen && oldImage.url_imagen.startsWith('/uploads/')) {
                try {
                  const oldFilePath = path.join(__dirname, '../../', oldImage.url_imagen);
                  console.log(`🗑️ [updateProduct] Eliminando archivo:`, oldFilePath);
                  await fs.unlink(oldFilePath);
                  console.log(`✅ [updateProduct] Archivo antiguo eliminado: ${oldImage.url_imagen}`);
                } catch (fileError) {
                  console.warn(`⚠️ [updateProduct] No se pudo eliminar archivo antiguo ${oldImage.url_imagen}:`, fileError.message);
                }
              }
            }
          } else {
            console.log(`📭 [updateProduct] No hay archivos físicos antiguos para eliminar`);
          }

          // Insertar nuevas imágenes si las hay
          if (imagenes && imagenes.length > 0) {
            console.log(`📸 [updateProduct] Procesando ${imagenes.length} nueva(s) imagen(es)...`);

            // Crear directorio específico para este producto
            const productUploadsDir = path.join(__dirname, '../../uploads/products', id);
            console.log(`📁 [updateProduct] Creando/verificando directorio:`, productUploadsDir);
            await fs.mkdir(productUploadsDir, { recursive: true });
            console.log(`✅ [updateProduct] Directorio listo`);

            for (let i = 0; i < imagenes.length; i++) {
              console.log(`🖼️ [updateProduct] Procesando imagen ${i + 1}/${imagenes.length}...`);
              const imageData = imagenes[i];
              let imageUrl = imageData;

              // Si es base64, convertir a archivo
              if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
                const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const ext = imageData.split(';')[0].split('/')[1];
                const filename = `product_${Date.now()}_${i}_optimized.${ext}`.replace(/\s+/g, '_');
                const filePath = path.join(productUploadsDir, filename);

                // Guardar buffer temporalmente para optimizar
                const tempPath = path.join(productUploadsDir, `temp_${filename}`);
                await fs.writeFile(tempPath, buffer);

                // Optimizar imagen con Sharp si está disponible
                try {
                  await imageProcessor.optimizeImage(tempPath, filePath);
                  await fs.unlink(tempPath); // Eliminar temporal
                } catch (optimizeError) {
                  // Si falla la optimización, renombrar el temporal
                  await fs.rename(tempPath, filePath);
                }

                imageUrl = `/uploads/products/${id}/${filename}`;
                console.log(`✅ Imagen ${i + 1} guardada: ${imageUrl}`);
              } else if (typeof imageData === 'string' && (imageData.startsWith('/uploads/') || imageData.startsWith('http'))) {
                // Si ya viene como ruta, conservarla tal cual
                // Normalizar a ruta relativa si es necesario
                if (imageData.startsWith('http')) {
                  // Si es URL completa, extraer solo la ruta relativa
                  try {
                    const urlObj = new URL(imageData);
                    imageUrl = urlObj.pathname;
                  } catch (urlError) {
                    imageUrl = imageData;
                  }
                } else {
                  imageUrl = imageData;
                }
                console.log(`📋 Imagen ${i + 1} conservada (ruta existente): ${imageUrl}`);
              } else if (typeof imageData === 'object' && imageData.url_imagen) {
                // Si viene como objeto con url_imagen, usar esa ruta
                imageUrl = imageData.url_imagen;
                console.log(`📋 Imagen ${i + 1} conservada (objeto con ruta): ${imageUrl}`);
              }

              const imageId = uuidv4();
              console.log(`💾 [updateProduct] Guardando imagen ${i + 1} en BD:`, {
                id: imageId,
                productoId: id,
                url_imagen: imageUrl,
                orden: i,
                es_principal: i === 0
              });

              await connection.execute(
                'INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal) VALUES (?, ?, ?, ?, ?)',
                [imageId, id, imageUrl, i, i === 0]
              );

              console.log(`✅ [updateProduct] Imagen ${i + 1} guardada en BD exitosamente`);
            }
            console.log(`✅ [updateProduct] ${imagenes.length} imagen(es) sincronizada(s) exitosamente`);
          } else {
            console.log(`📝 [updateProduct] Imágenes eliminadas (array vacío)`);
          }
        } else {
          console.log(`📝 [updateProduct] Imágenes no modificadas (campo no enviado)`);
        }

        // 3. Sincronizar etiquetas: Actualizar como JSON
        if (etiquetas !== undefined) {
          console.log(`🔄 Sincronizando etiquetas para producto ${id}...`);

          const etiquetasJson = etiquetas && etiquetas.length > 0 ? JSON.stringify(etiquetas) : null;
          await connection.execute('UPDATE productos SET etiquetas = ? WHERE id = ?', [etiquetasJson, id]);
          console.log(`✅ Etiquetas sincronizadas: ${etiquetas ? etiquetas.join(', ') : 'ninguna'}`);
        }
      });

      // Obtener el producto actualizado con todas sus relaciones
      const productQuery = `
        SELECT
          p.*,
          c.nombre as categoriaNombre,
          (
            SELECT GROUP_CONCAT(
              CONCAT(
                '{"id":"', pi.id, '","url":"', pi.url_imagen, '","orden":', pi.orden, ',"es_principal":', pi.es_principal, '}'
              )
              ORDER BY pi.orden ASC
              SEPARATOR ','
            )
            FROM imagenes_producto pi
            WHERE pi.producto_id = p.id
          ) as imagenes_raw,
          p.etiquetas as etiquetas_raw
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ?
      `;

      const products = await query(productQuery, [id]);
      const product = products[0];

      // Parsear imágenes y etiquetas desde GROUP_CONCAT
      console.log(`🔄 [updateProduct] Formateando imágenes del producto actualizado ${id}`);
      let imagenesUpdate = [];
      if (product.imagenes_raw) {
        try {
          console.log(`📋 [updateProduct] Imágenes raw encontradas:`, product.imagenes_raw);
          const imagenesArray = JSON.parse(`[${product.imagenes_raw}]`);
          console.log(`📊 [updateProduct] ${imagenesArray.length} imagen(es) parseada(s) desde GROUP_CONCAT`);

          // Usar ImageHelper para formatear todas las imágenes de forma centralizada
          imagenesUpdate = imagenesArray.map((img, idx) => {
            console.log(`🖼️ [updateProduct] Formateando imagen ${idx + 1}/${imagenesArray.length}`);
            // Convertir el formato del GROUP_CONCAT al formato esperado por ImageHelper
            const imageObj = {
              id: img.id,
              url_imagen: img.url,
              orden: img.orden || 0,
              es_principal: Boolean(img.es_principal)
            };
            return ImageHelper.formatProductImage(imageObj);
          }).filter(img => img !== null); // Filtrar imágenes inválidas

          console.log(`✅ [updateProduct] ${imagenesUpdate.length} imagen(es) formateada(s) exitosamente`);
        } catch (error) {
          console.error(`❌ [updateProduct] Error parseando imágenes:`, error.message);
          imagenesUpdate = [];
        }
      } else {
        console.log(`📭 [updateProduct] No hay imágenes raw para formatear`);
      }

      let etiquetasUpdate = [];
      if (product.etiquetas_raw) {
        try {
          etiquetasUpdate = JSON.parse(product.etiquetas_raw);
        } catch (error) {
          console.warn('Error parseando etiquetas:', error);
          etiquetasUpdate = [];
        }
      }

      const formattedProduct = {
        id: product.id,
        nombre: product.nombre,
        title: product.nombre,
        descripcion: product.descripcion,
        precio: parseFloat(product.precio),
        precioOferta: product.precio_oferta ? parseFloat(product.precio_oferta) : null,
        precioFinal: product.precio_oferta && product.precio_oferta < product.precio
          ? parseFloat(product.precio_oferta)
          : parseFloat(product.precio),
        enOferta: product.precio_oferta && product.precio_oferta < product.precio,
        categoriaId: product.categoria_id,
        categoriaNombre: product.categoriaNombre,
        stock: product.stock,
        stockMinimo: product.stock_minimo,
        stockBajo: product.stock <= product.stock_minimo,
        activo: Boolean(product.activo),
        isActive: Boolean(product.activo),
        destacado: Boolean(product.destacado),
        esServicio: Boolean(product.es_servicio),
        es_servicio: Boolean(product.es_servicio),
        dimensiones: product.dimensiones ? JSON.parse(product.dimensiones) : null,
        codigoBarras: product.codigo_barras,
        sku: product.sku,
        imagenes: imagenesUpdate,
        etiquetas: etiquetasUpdate,
        fechaCreacion: product.fecha_creacion,
        fechaActualizacion: product.fecha_actualizacion
      };

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: {
          product: formattedProduct
        }
      });

    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar producto
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Desactivar producto en lugar de eliminarlo
      await product.update({ activo: false });

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar stock de producto
  static async updateStock(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { cantidad, operacion = 'suma' } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      await product.updateStock(parseInt(cantidad), operacion);

      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
          product: product.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  // Obtener productos destacados
  static async getFeaturedProducts(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await Product.find({
        destacado: true,
        activo: true,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        message: 'Productos destacados obtenidos exitosamente',
        data: {
          products: products.map(product => product.toPublicObject())
        }
      });

    } catch (error) {
      console.error('Error al obtener productos destacados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener productos populares/top
  static async getTopProducts(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Por ahora devolvemos productos destacados, pero se puede mejorar con lógica de ventas
      const products = await Product.find({
        destacado: true,
        activo: true,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        message: 'Productos populares obtenidos exitosamente',
        data: {
          products: products.map(product => product.toPublicObject())
        }
      });

    } catch (error) {
      console.error('Error al obtener productos populares:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de productos
  static async getProductStats(req, res) {
    try {
      const totalProducts = await Product.count();
      const activeProducts = await Product.count({ activo: true });
      const inactiveProducts = await Product.count({ activo: false });
      const lowStockProducts = await Product.count({ stockMinimo: true });

      res.json({
        success: true,
        message: 'Estadísticas de productos obtenidas exitosamente',
        data: {
          stats: {
            totalProducts,
            activeProducts,
            inactiveProducts,
            lowStockProducts
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Buscar productos
  static async searchProducts(req, res) {
    try {
      const {
        q: busqueda,
        page = 1,
        limit = 20,
        categoriaId,
        precioMin,
        precioMax,
        enOferta,
        calificacionMin,
        esServicio,
        es_servicio,
        activo,
        orderBy = 'fecha_creacion',
        orderDir = 'DESC'
      } = req.query;

      if (!busqueda) {
        return res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
      }

      const offset = (page - 1) * limit;

      // Determinar el valor de activo (por defecto true si no se especifica)
      let activoValue = true;
      if (activo !== undefined) {
        activoValue = activo === 'true' || activo === '1' || activo === 1 || activo === true;
      }

      const filters = {
        busqueda,
        categoriaId,
        precioMin: precioMin ? parseFloat(precioMin) : undefined,
        precioMax: precioMax ? parseFloat(precioMax) : undefined,
        enOferta: enOferta !== undefined ? (enOferta === 'true' || enOferta === '1' || enOferta === true || enOferta === 1) : undefined,
        calificacionMin: calificacionMin ? parseFloat(calificacionMin) : undefined,
        esServicio: esServicio !== undefined ? (esServicio === 'true' || esServicio === '1') : undefined,
        es_servicio: es_servicio !== undefined ? (es_servicio === 'true' || es_servicio === '1') : undefined,
        activo: activoValue,
        orderBy,
        orderDir,
        limit: parseInt(limit),
        offset
      };

      const [products, total] = await Promise.all([
        Product.find(filters),
        Product.count(filters)
      ]);

      const publicProducts = await Promise.all(
        products.map(async (product) => {
          return await product.toPublicObject(true, false); // includeImages = true
        })
      );

      res.json({
        success: true,
        message: 'Búsqueda realizada exitosamente',
        data: {
          products: publicProducts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          searchTerm: busqueda
        }
      });

    } catch (error) {
      console.error('Error en búsqueda de productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Subir imágenes para un producto específico
  static async uploadProductImages(req, res) {
    try {
      const { id } = req.params;
      const files = req.files;

      console.log(`📸 [uploadProductImages] Iniciando subida de imágenes para producto ${id}`);
      console.log(`📊 [uploadProductImages] Archivos recibidos:`, {
        total: files?.length || 0,
        archivos: files?.map(f => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size
        }))
      });

      // Validar que el producto existe
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Validar que se subieron archivos
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron archivos de imagen'
        });
      }

      // Validar que todos los archivos son imágenes
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const invalidFiles = files.filter(file => !allowedTypes.includes(file.mimetype));

      if (invalidFiles.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'
        });
      }

      // Obtener el orden actual de las imágenes del producto
      const existingImages = await product.getImages();
      const nextOrder = existingImages.length > 0 ? Math.max(...existingImages.map(img => img.orden || 0)) + 1 : 1;

      console.log(`📋 [uploadProductImages] Estado actual de imágenes:`, {
        productoId: id,
        imagenesExistentes: existingImages.length,
        siguienteOrden: nextOrder
      });

      // Procesar todas las imágenes en paralelo con Sharp
      console.log(`🔄 [uploadProductImages] Procesando ${files.length} imagen(es) en paralelo`);
      const imagePromises = files.map(async (file, i) => {
        try {
          const order = nextOrder + i;
          const isPrincipal = existingImages.length === 0 && i === 0;

          console.log(`🖼️ [uploadProductImages] Procesando imagen ${i + 1}/${files.length}:`, {
            productoId: id,
            archivo: file.originalname,
            orden: order,
            esPrincipal: isPrincipal,
            rutaTemporal: file.path
          });

          // Validar imagen con Sharp
          console.log(`🔍 [uploadProductImages] Validando imagen ${i + 1}...`);
          const validation = await imageProcessor.validateImage(file.path);
          if (!validation.isValid) {
            console.error(`❌ [uploadProductImages] Imagen ${i + 1} inválida:`, validation.error);
            throw new Error(`Imagen inválida: ${validation.error}`);
          }
          console.log(`✅ [uploadProductImages] Imagen ${i + 1} validada correctamente`);

          // Crear nombre de archivo optimizado
          const ext = path.extname(file.originalname);
          const baseName = `product_${Date.now()}_${i}`;
          const optimizedFileName = `${baseName}_optimized${ext}`;
          const optimizedPath = path.join(path.dirname(file.path), optimizedFileName);

          console.log(`📝 [uploadProductImages] Generando nombre de archivo:`, {
            original: file.originalname,
            optimizado: optimizedFileName,
            rutaOptimizada: optimizedPath
          });

          // Optimizar imagen con Sharp
          console.log(`⚙️ [uploadProductImages] Optimizando imagen ${i + 1}...`);
          const optimizationResult = await imageProcessor.optimizeImage(file.path, optimizedPath);

          if (!optimizationResult.success) {
            console.error(`❌ [uploadProductImages] Error optimizando imagen ${i + 1}:`, optimizationResult.error);
            throw new Error(`Error optimizando imagen: ${optimizationResult.error}`);
          }

          console.log(`✅ [uploadProductImages] Imagen ${i + 1} optimizada:`, {
            dimensiones: `${optimizationResult.metadata.width}x${optimizationResult.metadata.height}`,
            tamaño: `${Math.round(optimizationResult.metadata.size / 1024)}KB`
          });

          // Crear ruta relativa para la imagen optimizada (guardar en BD)
          const imagePath = `/uploads/products/${id}/${optimizedFileName}`;

          console.log(`💾 [uploadProductImages] Guardando imagen ${i + 1} en BD:`, {
            rutaRelativa: imagePath,
            orden: order,
            esPrincipal: isPrincipal
          });

          // Agregar imagen a la base de datos (guardar ruta relativa)
          const imageData = {
            urlImagen: imagePath,
            orden: order,
            esPrincipal: isPrincipal
          };

          await product.addImage(imageData);
          console.log(`✅ [uploadProductImages] Imagen ${i + 1} guardada en BD exitosamente`);

          // Eliminar archivo original (no optimizado)
          try {
            await fs.unlink(file.path);
            console.log(`🗑️ [uploadProductImages] Archivo original ${i + 1} eliminado:`, file.path);
          } catch (unlinkError) {
            console.warn(`⚠️ [uploadProductImages] No se pudo eliminar archivo original ${i + 1}:`, unlinkError.message);
          }

          // Construir URL completa para el frontend
          const fullUrl = ImageHelper.buildImageUrl(imagePath);
          console.log(`🔗 [uploadProductImages] URL completa generada para imagen ${i + 1}:`, fullUrl);

          return fullUrl;

        } catch (error) {
          console.error(`Error procesando imagen ${i + 1}:`, error.message);
          throw error;
        }
      });

      // Esperar a que todas las imágenes se procesen
      console.log(`⏳ [uploadProductImages] Esperando procesamiento de ${files.length} imagen(es)...`);
      const uploadedImages = await Promise.all(imagePromises);

      console.log(`✅ [uploadProductImages] Proceso completado para producto ${id}:`, {
        totalProcesadas: uploadedImages.length,
        urls: uploadedImages
      });

      res.json({
        success: true,
        message: `${uploadedImages.length} imagen(es) subida(s) y optimizada(s) exitosamente`,
        data: uploadedImages
      });

    } catch (error) {
      console.error('Error al subir imágenes del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar imágenes'
      });
    }
  }

  // Eliminar una imagen específica de un producto
  static async deleteProductImage(req, res) {
    try {
      const { id, index } = req.params;
      const imageIndex = parseInt(index);

      console.log(`🗑️ [deleteProductImage] Iniciando eliminación de imagen:`, {
        productoId: id,
        indice: imageIndex,
        indiceOriginal: index
      });

      // Validar que el producto existe
      const product = await Product.findById(id);
      if (!product) {
        console.error(`❌ [deleteProductImage] Producto ${id} no encontrado`);
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Obtener las imágenes del producto
      console.log(`🔍 [deleteProductImage] Obteniendo imágenes del producto ${id}...`);
      const images = await product.getImages();

      console.log(`📊 [deleteProductImage] Imágenes encontradas:`, {
        total: images.length,
        imagenes: images.map((img, idx) => ({
          indice: idx,
          id: img.id,
          url: img.url_imagen,
          orden: img.orden
        }))
      });

      // Validar el índice
      if (imageIndex < 0 || imageIndex >= images.length) {
        console.error(`❌ [deleteProductImage] Índice inválido:`, {
          indice: imageIndex,
          totalImagenes: images.length,
          rangoValido: `0-${images.length - 1}`
        });
        return res.status(400).json({
          success: false,
          message: 'Índice de imagen inválido'
        });
      }

      const imageToDelete = images[imageIndex];

      console.log(`🎯 [deleteProductImage] Imagen a eliminar:`, {
        id: imageToDelete.id,
        url_imagen: imageToDelete.url_imagen,
        orden: imageToDelete.orden,
        es_principal: imageToDelete.es_principal
      });

      // Eliminar el archivo físico del servidor
      if (imageToDelete.url_imagen && imageToDelete.url_imagen.startsWith('/uploads/')) {
        try {
          const filePath = path.join(__dirname, '../../', imageToDelete.url_imagen);
          console.log(`🗑️ [deleteProductImage] Eliminando archivo físico:`, filePath);
          await fs.unlink(filePath);
          console.log(`✅ [deleteProductImage] Archivo físico eliminado exitosamente`);
        } catch (fileError) {
          console.warn(`⚠️ [deleteProductImage] No se pudo eliminar el archivo físico:`, {
            ruta: imageToDelete.url_imagen,
            error: fileError.message
          });
          // Continuar con la eliminación de la base de datos aunque falle la eliminación del archivo
        }
      } else {
        console.log(`📝 [deleteProductImage] Imagen no tiene archivo físico asociado:`, {
          url: imageToDelete.url_imagen,
          razon: !imageToDelete.url_imagen ? 'URL vacía' : 'No es ruta local'
        });
      }

      // Eliminar la imagen de la base de datos
      console.log(`💾 [deleteProductImage] Eliminando imagen de la BD:`, imageToDelete.id);
      await product.removeImage(imageToDelete.id);
      console.log(`✅ [deleteProductImage] Imagen eliminada de la BD exitosamente`);

      console.log(`✅ [deleteProductImage] Proceso completado para producto ${id}`);

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar imagen del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al eliminar imagen'
      });
    }
  }

  // Obtener todas las imágenes de un producto
  static async getProductImages(req, res) {
    try {
      const { id } = req.params;

      console.log(`📸 Obteniendo imágenes del producto ${id}`);

      // Validar que el producto existe
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Obtener las imágenes del producto
      const images = await product.getImages();

      console.log(`${images.length} imagen(es) obtenida(s) para producto ${id}`);

      res.json({
        success: true,
        message: 'Imágenes obtenidas exitosamente',
        data: images
      });

    } catch (error) {
      console.error('Error al obtener imágenes del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener imágenes'
      });
    }
  }


  /**
     * Obtener analíticas de un producto
     * Devuelve datos de ventas, ingresos, stock y precio por mes
     */



  static async getProductAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { months = 3 } = req.query; // Por defecto últimos 3 meses

      // Validar que el producto existe
      const productCheck = await query(
        'SELECT id, nombre, precio, stock FROM productos WHERE id = ?',
        [id]
      );

      if (productCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const product = productCheck[0];
      const currentStock = product.stock || 0;
      const currentPrice = parseFloat(product.precio) || 0;

      // Obtener ventas por mes del producto
      // Agrupar por mes y año desde items_orden
      const salesQuery = `
      SELECT 
        DATE_FORMAT(o.fecha_creacion, '%Y-%m') as mes,
        DATE_FORMAT(o.fecha_creacion, '%b') as mes_corto,
        YEAR(o.fecha_creacion) as año,
        MONTH(o.fecha_creacion) as mes_numero,
        SUM(io.cantidad) as ventas,
        SUM(io.cantidad * io.precio_unitario) as ingresos,
        AVG(io.precio_unitario) as precio_promedio
      FROM items_orden io
      INNER JOIN ordenes o ON io.orden_id = o.id
      WHERE io.producto_id = ?
        AND o.estado NOT IN ('cancelada', 'cancelado', 'reembolsada')
        AND o.fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(o.fecha_creacion, '%Y-%m'), 
               DATE_FORMAT(o.fecha_creacion, '%b'),
               YEAR(o.fecha_creacion),
               MONTH(o.fecha_creacion)
      ORDER BY año ASC, mes_numero ASC
    `;

      const salesData = await query(salesQuery, [id, parseInt(months)]);

      // Generar datos mensuales completos (rellenar meses sin ventas)
      const monthlyData = [];
      const currentDate = new Date();
      const monthsToShow = parseInt(months);

      // Mapa de meses en español
      const mesesEsp = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      // Crear un mapa de los datos de ventas por mes
      const salesMap = {};
      salesData.forEach(item => {
        const key = `${item.año}-${String(item.mes_numero).padStart(2, '0')}`;
        salesMap[key] = {
          ventas: parseInt(item.ventas) || 0,
          ingresos: parseFloat(item.ingresos) || 0,
          precio: parseFloat(item.precio_promedio) || currentPrice
        };
      });

      // Generar datos para cada mes
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${String(month).padStart(2, '0')}`;
        const mesNombre = mesesEsp[date.getMonth()];

        const salesInfo = salesMap[key] || {
          ventas: 0,
          ingresos: 0,
          precio: currentPrice
        };

        monthlyData.push({
          mes: mesNombre,
          mes_completo: `${mesNombre} ${year}`,
          año: year,
          mes_numero: month,
          ventas: salesInfo.ventas,
          stock: currentStock, // Stock actual (en producción se podría tener histórico)
          precio: salesInfo.precio,
          ingresos: salesInfo.ingresos,
          unidadesVendidas: salesInfo.ventas
        });
      }

      // Calcular estadísticas totales
      const totalVentas = monthlyData.reduce((sum, item) => sum + item.ventas, 0);
      const totalIngresos = monthlyData.reduce((sum, item) => sum + item.ingresos, 0);
      const promedioVentas = totalVentas / monthlyData.length || 0;
      const mesesConVentas = monthlyData.filter(item => item.ventas > 0).length;

      res.json({
        success: true,
        message: 'Analíticas del producto obtenidas exitosamente',
        data: {
          producto: {
            id: product.id,
            nombre: product.nombre,
            precioActual: currentPrice,
            stockActual: currentStock
          },
          estadisticas: {
            totalVentas,
            totalIngresos,
            promedioVentas: Math.round(promedioVentas * 100) / 100,
            stockActual: currentStock,
            mesesConVentas,
            mesesAnalizados: monthlyData.length
          },
          datosMensuales: monthlyData
        }
      });

    } catch (error) {
      console.error('Error al obtener analíticas del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener analíticas',
        error: error.message
      });
    }
  }

  /**
   * Obtener historial de cambios de un producto
   * Devuelve todos los eventos relacionados con el producto (creación, actualizaciones, ventas, etc.)
   */
  static async getProductHistory(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Validar que el producto existe
      const productCheck = await query(
        'SELECT id, nombre FROM productos WHERE id = ?',
        [id]
      );

      if (productCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Obtener historial del producto
      const historyQuery = `
      SELECT 
        hp.id,
        hp.tipo_evento,
        hp.campo_modificado,
        hp.valor_anterior,
        hp.valor_nuevo,
        hp.descripcion,
        hp.cantidad,
        hp.orden_id,
        hp.fecha_evento,
        hp.datos_adicionales,
        u.email as usuario_email,
        u.nombre_completo as usuario_nombre,
        o.numero_orden
      FROM historial_productos hp
      LEFT JOIN usuarios u ON hp.usuario_id = u.id
      LEFT JOIN ordenes o ON hp.orden_id = o.id
      WHERE hp.producto_id = ?
      ORDER BY hp.fecha_evento DESC
      LIMIT ? OFFSET ?
    `;

      const historyData = await query(historyQuery, [id, parseInt(limit), parseInt(offset)]);

      // Obtener total de registros
      const countQuery = `
      SELECT COUNT(*) as total
      FROM historial_productos
      WHERE producto_id = ?
    `;
      const countResult = await query(countQuery, [id]);
      const total = countResult[0]?.total || 0;

      // Formatear datos del historial
      const formattedHistory = historyData.map(item => {
        let datosAdicionales = null;
        if (item.datos_adicionales) {
          try {
            datosAdicionales = typeof item.datos_adicionales === 'string'
              ? JSON.parse(item.datos_adicionales)
              : item.datos_adicionales;
          } catch (e) {
            console.error('Error parseando datos_adicionales:', e);
          }
        }

        return {
          id: item.id,
          tipoEvento: item.tipo_evento,
          campoModificado: item.campo_modificado,
          valorAnterior: item.valor_anterior,
          valorNuevo: item.valor_nuevo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          ordenId: item.orden_id,
          numeroOrden: item.numero_orden,
          fechaEvento: item.fecha_evento,
          datosAdicionales: datosAdicionales,
          usuario: item.usuario_email ? {
            email: item.usuario_email,
            nombreCompleto: item.usuario_nombre
          } : null
        };
      });

      res.json({
        success: true,
        message: 'Historial del producto obtenido exitosamente',
        data: {
          producto: {
            id: productCheck[0].id,
            nombre: productCheck[0].nombre
          },
          historial: formattedHistory,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener historial del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener historial',
        error: error.message
      });
    }                                                                                                                                                                                                                                                                                                                      
  }
}





module.exports = ProductController;
