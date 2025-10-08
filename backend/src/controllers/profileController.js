const Profile = require('../models/Profile');
const User = require('../models/User');
const { query } = require('../config/database');

class ProfileController {
  // Obtener perfil del usuario autenticado
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const profile = await Profile.findByUserId(userId);
      
      if (!profile) {
        return res.json({
          success: true,
          message: 'Perfil no encontrado',
          data: {
            hasProfile: false,
            profile: null
          }
        });
      }

      res.json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          hasProfile: true,
          profile: profile.toPublicObject()
        }
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear o actualizar perfil
  static async createOrUpdateProfile(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      // Validar datos del perfil
      const validation = Profile.validateProfileData(profileData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Datos del perfil inválidos',
          errors: validation.errors
        });
      }

      // Crear o actualizar perfil
      const profile = await Profile.createOrUpdate(userId, profileData);

      res.json({
        success: true,
        message: 'Perfil guardado exitosamente',
        data: profile.toPublicObject()
      });
    } catch (error) {
      console.error('Error al crear/actualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar avatar
  static async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;

      if (!avatarUrl) {
        return res.status(400).json({
          success: false,
          message: 'URL del avatar es requerida'
        });
      }

      // Validar URL
      if (!Profile.isValidUrl(avatarUrl)) {
        return res.status(400).json({
          success: false,
          message: 'URL del avatar inválida'
        });
      }

      // Obtener perfil existente o crear uno básico
      let profile = await Profile.findByUserId(userId);
      if (!profile) {
        profile = await Profile.createOrUpdate(userId, { avatarUrl });
      } else {
        await profile.updateAvatar(avatarUrl);
      }

      res.json({
        success: true,
        message: 'Avatar actualizado exitosamente',
        data: profile.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar información personal
  static async updatePersonalInfo(req, res) {
    try {
      const userId = req.user.id;
      const { fechaNacimiento, genero } = req.body;

      // Validar datos
      const validation = Profile.validateProfileData({ fechaNacimiento, genero });
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: validation.errors
        });
      }

      // Obtener perfil existente
      let profile = await Profile.findByUserId(userId);
      if (!profile) {
        // Crear perfil básico si no existe
        profile = await Profile.createOrUpdate(userId, { fechaNacimiento, genero });
      } else {
        await profile.updatePersonalInfo({ fecha_nacimiento: fechaNacimiento, genero });
      }

      res.json({
        success: true,
        message: 'Información personal actualizada exitosamente',
        data: profile.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar información personal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar preferencias de notificaciones
  static async updateNotificationPreferences(req, res) {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      // Validar estructura de preferencias
      const validKeys = ['email', 'push', 'sms', 'marketing'];
      const invalidKeys = Object.keys(preferences).filter(key => !validKeys.includes(key));
      
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Claves de preferencias inválidas',
          invalidKeys
        });
      }

      // Obtener perfil existente
      let profile = await Profile.findByUserId(userId);
      if (!profile) {
        // Crear perfil básico si no existe
        profile = await Profile.createOrUpdate(userId, { preferenciasNotificaciones: preferences });
      } else {
        await profile.updateNotificationPreferences(preferences);
      }

      res.json({
        success: true,
        message: 'Preferencias de notificaciones actualizadas exitosamente',
        data: profile.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar preferencias de notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar configuración de privacidad
  static async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      // Validar estructura de configuración
      const validKeys = ['profileVisibility', 'orderHistory', 'dataSharing'];
      const invalidKeys = Object.keys(settings).filter(key => !validKeys.includes(key));
      
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Claves de configuración inválidas',
          invalidKeys
        });
      }

      // Obtener perfil existente
      let profile = await Profile.findByUserId(userId);
      if (!profile) {
        // Crear perfil básico si no existe
        profile = await Profile.createOrUpdate(userId, { configuracionPrivacidad: settings });
      } else {
        await profile.updatePrivacySettings(settings);
      }

      res.json({
        success: true,
        message: 'Configuración de privacidad actualizada exitosamente',
        data: profile.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar configuración de privacidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas del perfil
  static async getProfileStats(req, res) {
    try {
      const userId = req.user.id;
      
      const profile = await Profile.findByUserId(userId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil no encontrado'
        });
      }

      const stats = await profile.getStats();
      
      // Obtener estadísticas de favoritos
      const Favorite = require('../models/Favorite');
      const favoriteStats = await Favorite.getStats(userId);

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalOrders: stats.total_orders,
          activeCarts: stats.active_carts,
          totalSpent: parseFloat(stats.total_spent),
          memberSince: profile.fechaCreacion,
          totalFavorites: favoriteStats.total_favoritos
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar perfil
  static async deleteProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const profile = await Profile.findByUserId(userId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil no encontrado'
        });
      }

      await profile.delete();

      res.json({
        success: true,
        message: 'Perfil eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener perfil público (para otros usuarios)
  static async getPublicProfile(req, res) {
    try {
      const { userId } = req.params;
      
      const profile = await Profile.findByUserId(userId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil no encontrado'
        });
      }

      // Verificar configuración de privacidad
      const privacySettings = profile.configuracionPrivacidad;
      if (privacySettings.profileVisibility === 'private') {
        return res.status(403).json({
          success: false,
          message: 'Este perfil es privado'
        });
      }

      res.json({
        success: true,
        message: 'Perfil público obtenido exitosamente',
        data: profile.toPublicObjectSafe()
      });
    } catch (error) {
      console.error('Error al obtener perfil público:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar información básica del usuario (nombre, teléfono, dirección)
  static async updateUserInfo(req, res) {
    try {
      const userId = req.user.id;
      const { nombreCompleto, telefono, direccion } = req.body;

      // Validaciones básicas
      if (nombreCompleto && (nombreCompleto.length < 2 || nombreCompleto.length > 255)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre completo debe tener entre 2 y 255 caracteres'
        });
      }

      if (telefono && (telefono.length < 7 || telefono.length > 15)) {
        return res.status(400).json({
          success: false,
          message: 'El teléfono debe tener entre 7 y 15 caracteres'
        });
      }

      if (direccion && direccion.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'La dirección no puede exceder 500 caracteres'
        });
      }

      // Obtener usuario y actualizar
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const updateData = {};
      if (nombreCompleto !== undefined) updateData.nombre_completo = nombreCompleto;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (direccion !== undefined) updateData.direccion = direccion;

      await user.updateProfile(updateData);

      res.json({
        success: true,
        message: 'Información del usuario actualizada exitosamente',
        data: user.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar información del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Registrar token de push para notificaciones
  static async registerPushToken(req, res) {
    try {
      const userId = req.user.id;
      const { push_token } = req.body;

      console.log('📱 Registrando token de push para usuario:', userId);

      // Verificar si el usuario existe
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar el token de push en la base de datos
      await query(
        'UPDATE usuarios SET push_token = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
        [push_token, userId]
      );

      console.log('✅ Token de push registrado exitosamente para usuario:', userId);

      res.json({
        success: true,
        message: 'Token de push registrado exitosamente',
        data: {
          userId: userId,
          hasPushToken: true
        }
      });

    } catch (error) {
      console.error('❌ Error al registrar token de push:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar token de push
  static async removePushToken(req, res) {
    try {
      const userId = req.user.id;

      console.log('📱 Eliminando token de push para usuario:', userId);

      // Actualizar el token de push a NULL en la base de datos
      await query(
        'UPDATE usuarios SET push_token = NULL, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      console.log('✅ Token de push eliminado exitosamente para usuario:', userId);

      res.json({
        success: true,
        message: 'Token de push eliminado exitosamente',
        data: {
          userId: userId,
          hasPushToken: false
        }
      });

    } catch (error) {
      console.error('❌ Error al eliminar token de push:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ProfileController;










