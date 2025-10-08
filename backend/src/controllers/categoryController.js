const Category = require('../models/Category');
const { saveBase64Image, deleteImage } = require('../middleware/upload');
const path = require('path');
const fs = require('fs').promises;

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

      res.json({
        success: true,
        message: 'Productos de categoría obtenidos exitosamente',
        data: {
          category: category.toPublicObject(),
          products
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
      
      // Si se proporciona una imagen en base64, guardarla localmente
      if (categoryData.imagenUrl && categoryData.imagenUrl.startsWith('data:image/')) {
        try {
          console.log('📸 Guardando imagen base64 localmente...');
          const imagePath = await saveBase64Image(categoryData.imagenUrl, categoryData.nombre);
          categoryData.imagenUrl = imagePath;
          console.log('✅ Imagen guardada en:', imagePath);
        } catch (imageError) {
          console.error('❌ Error al guardar imagen:', imageError);
          // Continuar sin imagen si hay error
          categoryData.imagenUrl = null;
        }
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

      // Guardar la imagen anterior para posible eliminación
      const previousImageUrl = category.imagenUrl;

      // Si se proporciona una nueva imagen en base64, guardarla localmente
      if (updateData.imagenUrl && updateData.imagenUrl.startsWith('data:image/')) {
        try {
          console.log('📸 Guardando nueva imagen base64...');
          const imagePath = await saveBase64Image(updateData.imagenUrl, updateData.nombre || category.nombre);
          updateData.imagenUrl = imagePath;
          console.log('✅ Nueva imagen guardada en:', imagePath);

          // Eliminar imagen anterior si existe y es diferente
          if (previousImageUrl && previousImageUrl !== imagePath) {
            try {
              await deleteImage(previousImageUrl);
              console.log('🗑️ Imagen anterior eliminada');
            } catch (deleteError) {
              console.warn('⚠️ No se pudo eliminar la imagen anterior:', deleteError.message);
            }
          }
        } catch (imageError) {
          console.error('❌ Error al guardar nueva imagen:', imageError);
          // Mantener imagen anterior si hay error
          updateData.imagenUrl = previousImageUrl;
        }
      } else if (updateData.imagenUrl === null || updateData.imagenUrl === '') {
        // Si se quiere eliminar la imagen
        if (previousImageUrl) {
          try {
            await deleteImage(previousImageUrl);
            console.log('🗑️ Imagen eliminada por solicitud del usuario');
          } catch (deleteError) {
            console.warn('⚠️ No se pudo eliminar la imagen:', deleteError.message);
          }
        }
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

      // Solo actualizar campos que se proporcionen
      const allowedFields = ['nombre', 'descripcion', 'imagenUrl', 'activa', 'orden'];
      const filteredData = {};

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          filteredData[key] = value;
        }
      }

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos válidos para actualizar'
        });
      }

      // Manejar imagen si se proporciona
      if (filteredData.imagenUrl && filteredData.imagenUrl.startsWith('data:image/')) {
        const previousImageUrl = category.imagenUrl;
        
        try {
          console.log('📸 Guardando nueva imagen base64...');
          const imagePath = await saveBase64Image(filteredData.imagenUrl, filteredData.nombre || category.nombre);
          filteredData.imagenUrl = imagePath;
          console.log('✅ Nueva imagen guardada en:', imagePath);

          // Eliminar imagen anterior si existe
          if (previousImageUrl && previousImageUrl !== imagePath) {
            try {
              await deleteImage(previousImageUrl);
              console.log('🗑️ Imagen anterior eliminada');
            } catch (deleteError) {
              console.warn('⚠️ No se pudo eliminar la imagen anterior:', deleteError.message);
            }
          }
        } catch (imageError) {
          console.error('❌ Error al guardar nueva imagen:', imageError);
          filteredData.imagenUrl = category.imagenUrl; // Mantener imagen anterior
        }
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
   * Subir imagen de categoría
   */
  static async uploadCategoryImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
      }

      // Generar URL de la imagen
      const imageUrl = `/uploads/categories/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Imagen subida exitosamente',
        data: {
          url: imageUrl,
          filename: req.file.filename
        }
      });

    } catch (error) {
      console.error('Error al subir imagen:', error);
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
