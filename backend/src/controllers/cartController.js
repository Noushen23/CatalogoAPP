const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { query } = require('../config/database');

class CartController {
  // Obtener carrito del usuario
  static async getCart(req, res) {
    try {
      const userId = req.user.id;
      
      const cart = await Cart.getOrCreateCart(userId);
      
      res.json({
        success: true,
        message: 'Carrito obtenido exitosamente',
        data: cart.toPublicObject()
      });
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Agregar producto al carrito
  static async addItem(req, res) {
    try {
      const userId = req.user.id;
      const { productId, quantity = 1 } = req.body;

      // Validaciones
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del producto es requerido'
        });
      }

      if (quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad debe ser un número entero mayor a 0'
        });
      }

      // Verificar que el producto existe
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      if (!product.activo) {
        return res.status(400).json({
          success: false,
          message: 'El producto no está disponible'
        });
      }

      // Obtener o crear carrito
      const cart = await Cart.getOrCreateCart(userId);
      
      // Agregar item al carrito
      await cart.addItem(productId, quantity);

      res.json({
        success: true,
        message: 'Producto agregado al carrito exitosamente',
        data: cart.toPublicObject()
      });
    } catch (error) {
      console.error('Error al agregar producto al carrito:', error);
      
      if (error.message.includes('Stock insuficiente')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar cantidad de un item
  static async updateItemQuantity(req, res) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      // Validaciones
      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad debe ser un número entero mayor a 0'
        });
      }

      // Obtener carrito del usuario
      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Carrito no encontrado'
        });
      }

      // Actualizar cantidad del item
      await cart.updateItemQuantity(itemId, quantity);

      res.json({
        success: true,
        message: 'Cantidad actualizada exitosamente',
        data: cart.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      
      if (error.message.includes('Item no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Stock insuficiente')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar item del carrito
  static async removeItem(req, res) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      // Obtener carrito del usuario
      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Carrito no encontrado'
        });
      }

      // Eliminar item
      await cart.removeItem(itemId);

      res.json({
        success: true,
        message: 'Producto eliminado del carrito exitosamente',
        data: cart.toPublicObject()
      });
    } catch (error) {
      console.error('Error al eliminar producto del carrito:', error);
      
      if (error.message.includes('Item no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Limpiar carrito
  static async clearCart(req, res) {
    try {
      const userId = req.user.id;

      // Obtener carrito del usuario
      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Carrito no encontrado'
        });
      }

      // Limpiar carrito
      await cart.clearCart();

      res.json({
        success: true,
        message: 'Carrito limpiado exitosamente',
        data: cart.toPublicObject()
      });
    } catch (error) {
      console.error('Error al limpiar carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Validar carrito para checkout
  static async validateCart(req, res) {
    try {
      const userId = req.user.id;

      // Obtener carrito del usuario
      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Carrito no encontrado'
        });
      }

      // Validar carrito
      const validation = await cart.validateForCheckout();

      res.json({
        success: true,
        message: 'Validación completada',
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          cart: cart.toPublicObject()
        }
      });
    } catch (error) {
      console.error('Error al validar carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener resumen del carrito
  static async getCartSummary(req, res) {
    try {
      const userId = req.user.id;

      // Obtener carrito del usuario
      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart) {
        return res.json({
          success: true,
          message: 'Carrito vacío',
          data: {
            totalItems: 0,
            total: 0,
            isEmpty: true
          }
        });
      }

      res.json({
        success: true,
        message: 'Resumen del carrito obtenido exitosamente',
        data: {
          totalItems: cart.totalItems,
          total: cart.total,
          isEmpty: cart.items.length === 0,
          itemCount: cart.items.length
        }
      });
    } catch (error) {
      console.error('Error al obtener resumen del carrito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener historial de carritos del usuario
  static async getCartHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;

      const sql = `
        SELECT c.*, 
               COUNT(ic.id) as total_items,
               COALESCE(SUM(ic.subtotal), 0) as total
        FROM carritos c
        LEFT JOIN items_carrito ic ON c.id = ic.carrito_id
        WHERE c.usuario_id = ?
        GROUP BY c.id
        ORDER BY c.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      
      const carts = await query(sql, [userId, parseInt(limit), parseInt(offset)]);
      
      const cartHistory = carts.map(cart => ({
        id: cart.id,
        activo: cart.activo,
        fechaCreacion: cart.fecha_creacion,
        fechaActualizacion: cart.fecha_actualizacion,
        totalItems: cart.total_items,
        total: parseFloat(cart.total)
      }));

      res.json({
        success: true,
        message: 'Historial de carritos obtenido exitosamente',
        data: cartHistory
      });
    } catch (error) {
      console.error('Error al obtener historial de carritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = CartController;
