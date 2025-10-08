const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs').promises;
const path = require('path');
const imageProcessor = require('../services/imageProcessor');
const { query, getConnection, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ProductController {
  // Obtener todos los productos
  static async getProducts(req, res) {
    try {
      const { categoriaId, page = 1, limit = 20 } = req.query;
      
      // Construir query con filtros dinámicos
      let whereConditions = ['p.activo = 1'];
      let queryParams = [];
      
      // Filtro por categoría
      if (categoriaId) {
        whereConditions.push('p.categoria_id = ?');
        queryParams.push(categoriaId);
      }
      
      const whereClause = whereConditions.join(' AND ');
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const productsQuery = `
        SELECT
          p.id,
          p.nombre,
          p.descripcion,
          p.precio,
          p.precio_oferta,
          p.categoria_id,
          p.stock,
          p.stock_minimo,
          p.activo,
          p.destacado,
          p.codigo_barras,
          p.sku,
          p.fecha_creacion,
          p.fecha_actualizacion,
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
        WHERE ${whereClause}
        ORDER BY p.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      
      queryParams.push(parseInt(limit), offset);

      const products = await query(productsQuery, queryParams);
      
      if (!Array.isArray(products)) {
        throw new Error(`products no es un array: ${typeof products}`);
      }

      const formattedProducts = products.map(product => {
        // Parsear imágenes desde GROUP_CONCAT
        let imagenes = [];
        if (product.imagenes_raw) {
          try {
            const imagenesArray = JSON.parse(`[${product.imagenes_raw}]`);
            imagenes = imagenesArray.map(img => ({
              id: img.id,
              urlImagen: `http://192.168.3.104:3001${img.url}`,
              orden: img.orden,
              es_principal: Boolean(img.es_principal)
            }));
          } catch (error) {
            console.warn('Error parseando imágenes para producto:', product.id, error);
            imagenes = [];
          }
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
          enOferta: product.precio_oferta && product.precio_oferta < product.precio,
          categoriaId: product.categoria_id,
          categoriaNombre: product.categoriaNombre,
          stock: product.stock,
          stockMinimo: product.stock_minimo,
          stockBajo: product.stock <= product.stock_minimo,
          activo: Boolean(product.activo),
          isActive: Boolean(product.activo),
          destacado: Boolean(product.destacado),
          codigoBarras: product.codigo_barras,
          sku: product.sku,
          imagenes: imagenes,
          etiquetas: etiquetas,
          fechaCreacion: product.fecha_creacion,
          fechaActualizacion: product.fecha_actualizacion
        };
      });

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

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const product = products[0];
      
      // Parsear imágenes y etiquetas desde GROUP_CONCAT
      let imagenes = [];
      if (product.imagenes_raw) {
        try {
          imagenes = JSON.parse(`[${product.imagenes_raw}]`);
        } catch (error) {
          console.warn('Error parseando imágenes:', error);
          imagenes = [];
        }
      }
      
      let etiquetas = [];
      if (product.etiquetas_raw) {
        etiquetas = product.etiquetas_raw.split(',');
      }

      // Crear instancia del modelo Product para usar sus métodos
      const Product = require('../models/Product');
      const productInstance = new Product({
        ...product,
        categoria_nombre: product.categoriaNombre,
        imagenes: imagenes,
        etiquetas: etiquetas
      });

      // Obtener el objeto público con estadísticas de reseñas
      const formattedProduct = await productInstance.toPublicObject(true, true);

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

  // Crear producto
  static async createProduct(req, res) {
    const { nombre, descripcion, precio, stock, categoria_id, activo, imagenes, etiquetas, sku, codigo_barras, precio_oferta, destacado } = req.body;
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
        
        await connection.execute(
          'INSERT INTO productos (id, nombre, slug, descripcion, precio, precio_oferta, categoria_id, stock, stock_minimo, sku, codigo_barras, activo, destacado, en_oferta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, nombre, slug, descripcion, precio, precio_oferta || null, categoriaIdFinal, stock || 0, 5, sku || null, codigo_barras || null, activo !== false, destacado || false, Boolean(precio_oferta && precio_oferta < precio)]
        );

        // 2. Insertar en `producto_imagenes`
        if (imagenes && imagenes.length > 0) {
          console.log(`📸 Procesando ${imagenes.length} imagen(es) para producto...`);
          
          for (let i = 0; i < imagenes.length; i++) {
            const imageData = imagenes[i];
            let imageUrl = imageData;
            
            // Si es base64, convertir a archivo
            if (imageData.startsWith('data:image/')) {
              const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = imageData.split(';')[0].split('/')[1];
              const filename = `product_${Date.now()}_${i}.${ext}`.replace(/\s+/g, '_');
              const uploadsDir = path.join(__dirname, '../../uploads/products');
              await fs.mkdir(uploadsDir, { recursive: true });
              const filePath = path.join(uploadsDir, filename);
              
              await fs.writeFile(filePath, buffer);
              imageUrl = `/uploads/products/${filename}`;
              console.log(`✅ Imagen ${i + 1} guardada: ${imageUrl}`);
            }

            await connection.execute(
              'INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), productId, imageUrl, i, i === 0]
            );
          }
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
      const baseUrl = process.env.APP_URL || 'http://192.168.3.104:3001';

      // Parsear imágenes y etiquetas desde GROUP_CONCAT
      let imagenesFormateadas = [];
      if (product.imagenes_raw) {
        try {
          const imagenesArray = JSON.parse(`[${product.imagenes_raw}]`);
          imagenesFormateadas = imagenesArray.map(img => ({
            ...img,
            url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`
          }));
        } catch (error) {
          console.warn('Error parseando imágenes:', error);
          imagenesFormateadas = [];
        }
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
        peso: product.peso ? parseFloat(product.peso) : null,
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
      const { nombre, descripcion, precio, stock, categoria_id, activo, imagenes, etiquetas, sku, codigo_barras, precio_oferta, destacado } = req.body;

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
        if (descripcion !== undefined) updateFields.push('descripcion = ?'), updateValues.push(descripcion);
        if (precio !== undefined) updateFields.push('precio = ?'), updateValues.push(precio);
        if (precio_oferta !== undefined) updateFields.push('precio_oferta = ?'), updateValues.push(precio_oferta);
        if (categoria_id !== undefined) updateFields.push('categoria_id = ?'), updateValues.push(categoria_id);
        if (stock !== undefined) updateFields.push('stock = ?'), updateValues.push(stock);
        if (sku !== undefined) updateFields.push('sku = ?'), updateValues.push(sku);
        if (codigo_barras !== undefined) updateFields.push('codigo_barras = ?'), updateValues.push(codigo_barras);
        if (activo !== undefined) updateFields.push('activo = ?'), updateValues.push(activo);
        if (destacado !== undefined) updateFields.push('destacado = ?'), updateValues.push(destacado);
        
        // Calcular en_oferta
        const enOferta = precio_oferta && precio !== undefined && precio_oferta < precio;
        if (precio_oferta !== undefined || precio !== undefined) {
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

        // 2. Sincronizar imágenes: Eliminar las viejas y añadir las nuevas
        if (imagenes !== undefined) {
          console.log(`🔄 Sincronizando imágenes para producto ${id}...`);
          
          // Eliminar imágenes existentes
          await connection.execute('DELETE FROM imagenes_producto WHERE producto_id = ?', [id]);
          
          // Insertar nuevas imágenes
          if (imagenes && imagenes.length > 0) {
            for (let i = 0; i < imagenes.length; i++) {
              const imageData = imagenes[i];
              let imageUrl = imageData;
              
              // Si es base64, convertir a archivo
              if (imageData.startsWith('data:image/')) {
                const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const ext = imageData.split(';')[0].split('/')[1];
                const filename = `product_${Date.now()}_${i}.${ext}`.replace(/\s+/g, '_');
                const uploadsDir = path.join(__dirname, '../../uploads/products');
                await fs.mkdir(uploadsDir, { recursive: true });
                const filePath = path.join(uploadsDir, filename);
                
                await fs.writeFile(filePath, buffer);
                imageUrl = `/uploads/products/${filename}`;
                console.log(`✅ Imagen ${i + 1} actualizada: ${imageUrl}`);
              }

              await connection.execute(
                'INSERT INTO imagenes_producto (id, producto_id, url_imagen, orden, es_principal) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), id, imageUrl, i, i === 0]
              );
            }
          }
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
      const baseUrl = process.env.APP_URL || 'http://192.168.3.104:3001';

      // Parsear imágenes y etiquetas desde GROUP_CONCAT
      let imagenesUpdate = [];
      if (product.imagenes_raw) {
        try {
          const imagenesArray = JSON.parse(`[${product.imagenes_raw}]`);
          imagenesUpdate = imagenesArray.map(img => ({
            ...img,
            url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`
          }));
        } catch (error) {
          console.warn('Error parseando imágenes:', error);
          imagenesUpdate = [];
        }
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
        peso: product.peso ? parseFloat(product.peso) : null,
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
      const filters = {
        busqueda,
        categoriaId,
        precioMin: precioMin ? parseFloat(precioMin) : undefined,
        precioMax: precioMax ? parseFloat(precioMax) : undefined,
        activo: true,
        orderBy,
        orderDir,
        limit: parseInt(limit),
        offset
      };

      const [products, total] = await Promise.all([
        Product.find(filters),
        Product.count(filters)
      ]);

      res.json({
        success: true,
        message: 'Búsqueda realizada exitosamente',
        data: {
          products: products.map(product => product.toPublicObject()),
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

      console.log(`📸 Subiendo imágenes para producto ${id}`);

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

      // Procesar todas las imágenes en paralelo con Sharp
      const imagePromises = files.map(async (file, i) => {
        try {
          const order = nextOrder + i;
          const isPrincipal = existingImages.length === 0 && i === 0;

          // Validar imagen con Sharp
          const validation = await imageProcessor.validateImage(file.path);
          if (!validation.isValid) {
            throw new Error(`Imagen inválida: ${validation.error}`);
          }

          // Crear nombre de archivo optimizado
          const ext = path.extname(file.originalname);
          const baseName = `product_${Date.now()}_${i}`;
          const optimizedFileName = `${baseName}_optimized${ext}`;
          const optimizedPath = path.join(path.dirname(file.path), optimizedFileName);

          // Optimizar imagen con Sharp
          const optimizationResult = await imageProcessor.optimizeImage(file.path, optimizedPath);
          
          if (!optimizationResult.success) {
            throw new Error(`Error optimizando imagen: ${optimizationResult.error}`);
          }

          // Crear URL para la imagen optimizada
          const imageUrl = `/uploads/products/${id}/${optimizedFileName}`;

          // Agregar imagen a la base de datos
          const imageData = {
            urlImagen: imageUrl,
            orden: order,
            esPrincipal: isPrincipal
          };

          await product.addImage(imageData);

          // Eliminar archivo original (no optimizado)
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.warn('No se pudo eliminar archivo original:', unlinkError.message);
          }

          console.log(`✅ Imagen ${i + 1} procesada: ${optimizationResult.metadata.width}x${optimizationResult.metadata.height}, ${Math.round(optimizationResult.metadata.size / 1024)}KB`);
          
          return imageUrl;

        } catch (error) {
          console.error(`Error procesando imagen ${i + 1}:`, error.message);
          throw error;
        }
      });

      // Esperar a que todas las imágenes se procesen
      const uploadedImages = await Promise.all(imagePromises);

      console.log(`✅ ${uploadedImages.length} imagen(es) procesada(s) exitosamente para producto ${id}`);

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

      console.log(`🗑️ Eliminando imagen ${imageIndex} del producto ${id}`);

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
      
      // Validar el índice
      if (imageIndex < 0 || imageIndex >= images.length) {
        return res.status(400).json({
          success: false,
          message: 'Índice de imagen inválido'
        });
      }

      const imageToDelete = images[imageIndex];
      
      // Eliminar el archivo físico del servidor
      try {
        const filePath = path.join(__dirname, '../../', imageToDelete.url_imagen);
        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ No se pudo eliminar el archivo físico: ${fileError.message}`);
        // Continuar con la eliminación de la base de datos aunque falle la eliminación del archivo
      }
      
      // Eliminar la imagen de la base de datos
      await product.removeImage(imageToDelete.id);

      console.log(`✅ Imagen eliminada exitosamente del producto ${id}`);

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

      console.log(`✅ ${images.length} imagen(es) obtenida(s) para producto ${id}`);

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
}

module.exports = ProductController;
