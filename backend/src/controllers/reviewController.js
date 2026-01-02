const Review = require('../models/Review');
const { validationResult } = require('express-validator');

class ReviewController {
  // Crear una nueva reseña
  static async createReview(req, res) {
    try {
      // Validar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { id: productId } = req.params;
      const { calificacion, comentario, ordenId } = req.body;
      // Validaciones adicionales
      if (!calificacion || calificacion < 1 || calificacion > 5) {
        return res.status(400).json({
          success: false,
          message: 'La calificación debe estar entre 1 y 5'
        });
      }

      // Crear la reseña
      const review = await Review.create({
        usuarioId: userId,
        productoId: productId,
        ordenId: ordenId || null,
        calificacion,
        comentario: comentario || null
      });

      res.status(201).json({
        success: true,
        message: 'Reseña creada exitosamente',
        data: review.toPublicObject()
      });

    } catch (error) {
      console.error('Error al crear reseña:', error);
      
      if (error.message === 'Ya has enviado una reseña para este producto') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Producto no encontrado o no disponible') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener reseñas de un producto
  static async getReviewsByProduct(req, res) {
    try {
      const { id: productId } = req.params;
      const { page = 1, limit = 20, includeInactive = false } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;
      const includeInactiveBool = includeInactive === 'true';

      // Obtener reseñas
      const reviews = await Review.findByProductId(productId, {
        limit: limitNum,
        offset,
        includeInactive: includeInactiveBool
      });

      // Obtener total de reseñas para paginación
      const totalReviews = await Review.countByProductId(productId, includeInactiveBool);
      const totalPages = Math.ceil(totalReviews / limitNum);

      // Obtener estadísticas de calificación
      const stats = await Review.getAverageRatingAndCount(productId, includeInactiveBool);

      res.status(200).json({
        success: true,
        message: 'Reseñas obtenidas exitosamente',
        data: {
          reviews: reviews.map(review => review.toPublicObjectSimple()),
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_items: totalReviews,
            items_per_page: limitNum,
            has_next_page: pageNum < totalPages,
            has_prev_page: pageNum > 1
          },
          stats
        }
      });

    } catch (error) {
      console.error('Error al obtener reseñas del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener reseñas de un usuario
  static async getReviewsByUser(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, includeInactive = false } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;
      const includeInactiveBool = includeInactive === 'true';

      // Obtener reseñas
      const reviews = await Review.findByUserId(userId, {
        limit: limitNum,
        offset,
        includeInactive: includeInactiveBool
      });

      res.status(200).json({
        success: true,
        message: 'Reseñas obtenidas exitosamente',
        data: {
          reviews: reviews.map(review => review.toPublicObject()),
          pagination: {
            current_page: pageNum,
            total_pages: Math.ceil(reviews.length / limitNum),
            total_items: reviews.length,
            items_per_page: limitNum,
            has_next_page: pageNum < Math.ceil(reviews.length / limitNum),
            has_prev_page: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener reseñas del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Actualizar reseña
  static async updateReview(req, res) {
    try {
      // Validar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { reviewId } = req.params;
      const { calificacion, comentario} = req.body;

      // Validaciones adicionales
      if (calificacion !== undefined && (calificacion < 1 || calificacion > 5)) {
        return res.status(400).json({
          success: false,
          message: 'La calificación debe estar entre 1 y 5'
        });
      }

      // Obtener la reseña
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar que el usuario es el propietario de la reseña
      if (review.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar esta reseña'
        });
      }

      // Actualizar la reseña
      const updatedReview = await review.update({ calificacion, comentario});

      res.status(200).json({
        success: true,
        message: 'Reseña actualizada exitosamente',
        data: updatedReview.toPublicObject()
      });

    } catch (error) {
      console.error('Error al actualizar reseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Eliminar reseña
  static async deleteReview(req, res) {
    try {
      const userId = req.user.id;
      const { reviewId } = req.params;

      // Obtener la reseña
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar que el usuario es el propietario de la reseña
      if (review.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta reseña'
        });
      }

      // Eliminar la reseña (soft delete)
      await review.delete();

      res.status(200).json({
        success: true,
        message: 'Reseña eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar reseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas de reseñas de un producto
  static async getProductReviewStats(req, res) {
    try {
      const { id: productId } = req.params;
      const { includeInactive = false } = req.query;

      const includeInactiveBool = includeInactive === 'true';
      const stats = await Review.getAverageRatingAndCount(productId, includeInactiveBool);

      res.status(200).json({
        success: true,
        message: 'Estadísticas de reseñas obtenidas exitosamente',
        data: stats
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de reseñas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Verificar si un usuario puede reseñar un producto
  static async canUserReviewProduct(req, res) {
    try {
      const userId = req.user.id;
      const { id: productId } = req.params;

      // Verificar si ya existe una reseña del usuario para este producto
      const existingReview = await Review.findByUserAndProduct(userId, productId);
      
      res.status(200).json({
        success: true,
        data: {
          canReview: !existingReview,
          existingReviewId: existingReview ? existingReview.id : null,
          existingReview: existingReview ? existingReview.toPublicObject() : null
        }
      });

    } catch (error) {
      console.error('Error al verificar si el usuario puede reseñar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener reseña específica
  static async getReview(req, res) {
    try {
      const { reviewId } = req.params;

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Reseña obtenida exitosamente',
        data: review.toPublicObject()
      });

    } catch (error) {
      console.error('Error al obtener reseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ReviewController;
