const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { 
  validateCategory, 
  validateCategoryUpdate, 
  validateCategoryStatus,
  validateCategoryReorder,
  validateCategoryId, 
  validatePagination 
} = require('../middleware/validation');

// Obtener todas las categorías
router.get('/', validatePagination, CategoryController.getAllCategories);

// Obtener categoría por ID
router.get('/:id', validateCategoryId, CategoryController.getCategoryById);

// Obtener productos de una categoría
router.get('/:id/products', validateCategoryId, validatePagination, CategoryController.getCategoryProducts);

// Obtener estadísticas de categoría
router.get('/:id/stats', validateCategoryId, CategoryController.getCategoryStats);

// Crear categoría (solo admin)
router.post('/', authenticateToken, authorize('admin'), validateCategory, CategoryController.createCategory);

// Actualizar categoría completa (solo admin)
router.put('/:id', authenticateToken, authorize('admin'), validateCategoryId, validateCategory, CategoryController.updateCategory);

// Actualizar categoría parcialmente (solo admin)
router.patch('/:id', authenticateToken, authorize('admin'), validateCategoryId, validateCategoryUpdate, CategoryController.patchCategory);

// Cambiar estado de categoría (solo admin)
router.patch('/:id/status', authenticateToken, authorize('admin'), validateCategoryId, validateCategoryStatus, CategoryController.toggleCategoryStatus);

// Eliminar categoría (solo admin)
router.delete('/:id', authenticateToken, authorize('admin'), validateCategoryId, CategoryController.deleteCategory);

// Reordenar categorías (solo admin)
router.patch('/reorder', authenticateToken, authorize('admin'), validateCategoryReorder, CategoryController.reorderCategories);

module.exports = router;
