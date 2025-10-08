const Favorite = require('../models/Favorite');
const { validationResult } = require('express-validator');
const ImageHelper = require('../helpers/imageHelper');

class FavoriteController {
  // Obtener lista de favoritos del usuario autenticado
  static async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, include_details = 'true' } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 items por página
      const offset = (pageNum - 1) * limitNum;
      const includeProductDetails = include_details === 'true';

      // Obtener favoritos
      const favorites = await Favorite.findByUserId(userId, {
        limit: limitNum,
        offset,
        includeProductDetails
      });

      // Obtener total de favoritos para paginación
      const totalFavorites = await Favorite.countByUserId(userId);
      const totalPages = Math.ceil(totalFavorites / limitNum);

      // Las imágenes ya están formateadas por el modelo usando ImageHelper

      // Obtener estadísticas básicas
      const stats = await Favorite.getStats(userId);

      res.status(200).json({
        success: true,
        data: {
          favorites,
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_items: totalFavorites,
            items_per_page: limitNum,
            has_next_page: pageNum < totalPages,
            has_prev_page: pageNum > 1
          },
          stats
        }
      });

    } catch (error) {
      console.error('Error al obtener favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Añadir producto a favoritos
  static async addFavorite(req, res) {
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
      const { producto_id } = req.body;

      // Verificar si el producto ya está en favoritos
      const isAlreadyFavorite = await Favorite.isFavorite(userId, producto_id);
      if (isAlreadyFavorite) {
        return res.status(409).json({
          success: false,
          message: 'Este producto ya está en tus favoritos'
        });
      }

      // Añadir a favoritos
      const favorite = await Favorite.add(userId, producto_id);

      res.status(201).json({
        success: true,
        message: 'Producto añadido a favoritos exitosamente',
        data: {
          favorite: favorite.toPublicObject()
        }
      });

    } catch (error) {
      console.error('Error al añadir favorito:', error);
      
      if (error.message === 'Este producto ya está en tus favoritos') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('producto_id')) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Eliminar producto de favoritos
  static async removeFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      // Validar que se proporcione un ID de producto
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto requerido'
        });
      }

      // Eliminar de favoritos
      const result = await Favorite.remove(userId, productId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          removed_product_id: productId
        }
      });

    } catch (error) {
      console.error('Error al eliminar favorito:', error);
      
      if (error.message === 'El producto no estaba en tus favoritos') {
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

  // Verificar si un producto está en favoritos
  static async checkFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto requerido'
        });
      }

      const isFavorite = await Favorite.isFavorite(userId, productId);

      res.status(200).json({
        success: true,
        data: {
          product_id: productId,
          is_favorite: isFavorite
        }
      });

    } catch (error) {
      console.error('Error al verificar favorito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas de favoritos del usuario
  static async getFavoriteStats(req, res) {
    try {
      const userId = req.user.id;
      
      const stats = await Favorite.getStats(userId);

      res.status(200).json({
        success: true,
        data: {
          stats
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Eliminar todos los favoritos del usuario
  static async removeAllFavorites(req, res) {
    try {
      const userId = req.user.id;

      const result = await Favorite.removeAllByUserId(userId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          deleted_count: result.deletedCount
        }
      });

    } catch (error) {
      console.error('Error al eliminar todos los favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = FavoriteController;

