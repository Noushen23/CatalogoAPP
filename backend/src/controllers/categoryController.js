const Category = require('../models/Category');
const ImageHelper = require('../helpers/imageHelper');
const { query } = require('../config/database');

class CategoryController {
  /**
   * Obtener todas las categorías
   */
  static async getAllCategories(req, res) {
    try {
      const { activa = true, limit } = req.query;
      
      const filters = {
        activa: activa === 'true' ? true : activa === 'false' ? false : undefined
      };

      if (limit) {
        filters.limit = parseInt(limit);
      }

      const categories = await Category.findAll(filters);

      res.json({
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: {
          categories: categories.map(category => category.toPublicObject())
        }
      });

    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener categoría por ID
   */
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Categoría obtenida exitosamente',
        data: {
          category: category.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al obtener categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener productos de una categoría
   */
  static async getCategoryProducts(req, res) {
    try {
      const { id } = req.params;
      const { activo = true, destacado, limit } = req.query;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      const filters = {
        activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
        destacado: destacado === 'true' ? true : destacado === 'false' ? false : undefined
      };

      if (limit) {
        filters.limit = parseInt(limit);
      }

      const products = await category.getProducts(filters);

      // Formatear productos con imágenes validadas
      const formattedProducts = await Promise.all(
        products.map(async (product) => {
          // Obtener imágenes del producto
          const imagesQuery = `
            SELECT id, url_imagen, orden, es_principal
            FROM imagenes_producto
            WHERE producto_id = ?
            ORDER BY orden ASC
          `;
          const images = await query(imagesQuery, [product.id]);
          
          // Usar ImageHelper para formatear todas las imágenes de forma centralizada
          const formattedImages = ImageHelper.formatProductImages(images);

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
            categoriaNombre: product.categoria_nombre,
            stock: product.stock,
            stockMinimo: product.stock_minimo,
            stockBajo: product.stock <= product.stock_minimo,
            activo: Boolean(product.activo),
            isActive: Boolean(product.activo),
            destacado: Boolean(product.destacado),
            codigoBarras: product.codigo_barras,
            sku: product.sku,
            ventasTotales: product.ventas_totales || 0,
            calificacionPromedio: parseFloat(product.calificacion_promedio) || 0,
            totalResenas: product.total_resenas || 0,
            imagenes: formattedImages,
            fechaCreacion: product.fecha_creacion,
            fechaActualizacion: product.fecha_actualizacion
          };
        })
      );

      res.json({
        success: true,
        message: 'Productos de categoría obtenidos exitosamente',
        data: {
          category: category.toPublicObject(),
          products: formattedProducts
        }
      });

    } catch (error) {
      console.error('Error al obtener productos de categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva categoría
   */
  static async createCategory(req, res) {
    try {
      const categoryData = req.body;
      
      // Eliminar imagenUrl si se proporciona (las categorías no tienen imágenes)
      if (categoryData.imagenUrl !== undefined) {
        delete categoryData.imagenUrl;
      }
      
      const category = await Category.create(categoryData);

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        data: {
          category: category.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al crear categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar categoría existente
   */
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Eliminar imagenUrl si se proporciona (las categorías no tienen imágenes)
      if (updateData.imagenUrl !== undefined) {
        delete updateData.imagenUrl;
      }

      // Actualizar la categoría
      const updatedCategory = await category.update(updateData);

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: {
          category: updatedCategory.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar parcialmente una categoría (PATCH)
   */
  static async patchCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Solo actualizar campos que se proporcionen (sin imagenUrl)
      const allowedFields = ['nombre', 'descripcion', 'activa', 'orden'];
      const filteredData = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          filteredData[key] = value;
        }
      }

      // Eliminar imagenUrl si se proporciona (las categorías no tienen imágenes)
      if (updateData.imagenUrl !== undefined) {
        delete updateData.imagenUrl;
      }

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos válidos para actualizar'
        });
      }

      const updatedCategory = await category.update(filteredData);

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: {
          category: updatedCategory.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar categoría (desactivar)
   */
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Desactivar categoría en lugar de eliminarla
      await category.deactivate();

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Reordenar categorías
   */
  static async reorderCategories(req, res) {
    try {
      const { categoryOrders } = req.body;

      if (!Array.isArray(categoryOrders)) {
        return res.status(400).json({
          success: false,
          message: 'categoryOrders debe ser un array'
        });
      }

      // Validar que cada elemento tenga id y orden
      for (const item of categoryOrders) {
        if (!item.id || typeof item.orden !== 'number') {
          return res.status(400).json({
            success: false,
            message: 'Cada elemento debe tener id y orden válidos'
          });
        }
      }

      await Category.reorder(categoryOrders);

      res.json({
        success: true,
        message: 'Categorías reordenadas exitosamente'
      });

    } catch (error) {
      console.error('Error al reordenar categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Activar/Desactivar categoría
   */
  static async toggleCategoryStatus(req, res) {
    try {
      const { id } = req.params;
      const { activa } = req.body;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      if (activa === true) {
        await category.activate();
      } else if (activa === false) {
        await category.deactivate();
      } else {
        return res.status(400).json({
          success: false,
          message: 'El campo activa debe ser true o false'
        });
      }

      res.json({
        success: true,
        message: `Categoría ${activa ? 'activada' : 'desactivada'} exitosamente`,
        data: {
          category: category.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al cambiar estado de categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de categoría
   */
  static async getCategoryStats(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      const productCount = await category.getProductCount();
      const activeProductCount = await category.getProductCount({ activo: true });

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          category: category.toPublicObject(),
          stats: {
            totalProducts: productCount,
            activeProducts: activeProductCount,
            inactiveProducts: productCount - activeProductCount
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = CategoryController;
