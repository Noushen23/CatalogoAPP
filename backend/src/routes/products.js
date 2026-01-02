const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ProductController = require('../controllers/productController');
const ReviewController = require('../controllers/reviewController');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/auth');
const { 
  validateProduct, 
  validateProductId, 
  validateReviewProductId,
  validateStockUpdate, 
  validatePagination, 
  validateSearch,
  validateReview,
  validateReviewId
} = require('../middleware/validation');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productId = req.params.id;
    const uploadPath = path.join(__dirname, '../../uploads/products', productId);
    
    // Crear directorio de forma más eficiente
    const fs = require('fs');
    try {
      // Verificar si el directorio existe de forma más rápida
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Directorio creado: ${uploadPath}`);
      }
      cb(null, uploadPath);
    } catch (error) {
      console.error('❌ Error creando directorio:', error);
      cb(error, null);
    }
  },


  




  filename: (req, file, cb) => {
    // Generar nombre único para el archivo sin espacios
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `product_${uniqueSuffix}${ext}`.replace(/\s+/g, '_');
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar solo archivos de imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo (aumentado para Sharp)
    files: 10, // Máximo 10 archivos a la vez
    fieldSize: 20 * 1024 * 1024, // 20MB máximo para todos los campos
    fieldNameSize: 100 // Máximo 100 caracteres para nombres de campo
  }
});

// ===== RUTAS ESPECÍFICAS (deben ir ANTES de las dinámicas) =====

// Endpoints de prueba
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint funcionando' });
});
router.get('/debug', async (req, res) => {
  res.json({ success: true, message: 'Debug endpoint funcionando' });
});

// Rutas de reseñas del usuario (específicas antes de /:id/reviews)
router.get('/reviews/my-reviews', authenticateToken, ReviewController.getReviewsByUser);
router.put('/reviews/:reviewId', authenticateToken, validateReviewId, validateReview, ReviewController.updateReview);
router.delete('/reviews/:reviewId', authenticateToken, validateReviewId, ReviewController.deleteReview);
router.get('/reviews/:reviewId', validateReviewId, ReviewController.getReview);

// Rutas públicas específicas
router.get('/search', validateSearch, ProductController.searchProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/top', ProductController.getTopProducts);
router.get('/stats', ProductController.getProductStats);
router.get('/check-exists', ProductController.checkProductExists);
router.post('/invalidate-cache/:productId?', ProductController.invalidateProductCache);

// Ruta principal (debe ir antes de /:id)
router.get('/', validatePagination, ProductController.getProducts);

// ===== RUTAS PROTEGIDAS =====
router.post('/', authenticateToken, authorize('admin', 'vendedor'), validateProduct, ProductController.createProduct);
router.put('/:id', authenticateToken, authorize('admin', 'vendedor'), validateProductId, validateProduct, ProductController.updateProduct);
router.delete('/:id', authenticateToken, authorize('admin', 'vendedor'), validateProductId, ProductController.deleteProduct);
router.patch('/:id/stock', authenticateToken, authorize('admin', 'vendedor'), validateStockUpdate, ProductController.updateStock);

// ===== RUTAS CON PARÁMETROS (deben ir al final) =====

// Rutas para manejo de imágenes
router.get('/:id/images', validateProductId, ProductController.getProductImages);
router.post('/:id/images', authenticateToken, authorize('admin', 'vendedor'), validateProductId, upload.array('images', 10), ProductController.uploadProductImages);
router.delete('/:id/images/:index', authenticateToken, authorize('admin', 'vendedor'), validateProductId, ProductController.deleteProductImage);

// Rutas de reseñas por producto
router.get('/:id/reviews', validateProductId, ReviewController.getReviewsByProduct);
router.get('/:id/reviews/stats', validateProductId, ReviewController.getProductReviewStats);
router.get('/:id/reviews/can-review', authenticateToken, validateProductId, ReviewController.canUserReviewProduct);
router.post('/:id/reviews', authenticateToken, validateProductId, validateReview, ReviewController.createReview);

// ÚLTIMA: Ruta para obtener producto por ID (debe ir al final)
router.get('/:id', validateProductId, ProductController.getProductById);

module.exports = router;
