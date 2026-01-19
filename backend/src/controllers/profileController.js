const Profile = require('../models/Profile');
const User = require('../models/User');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const db = require('../config/database');

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
      const { nombreCompleto, telefono, direccion, tipoIdentificacion, numeroIdentificacion } = req.body;

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

      if (tipoIdentificacion && !['CC', 'NIT', 'CE', 'TR'].includes(tipoIdentificacion)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de identificación inválido'
        });
      }

      if (numeroIdentificacion && (numeroIdentificacion.length < 5 || numeroIdentificacion.length > 20)) {
        return res.status(400).json({
          success: false,
          message: 'El número de identificación debe tener entre 5 y 20 caracteres'
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

      // Verificar si el documento ya existe en otro usuario (si se está actualizando)
      if (tipoIdentificacion && numeroIdentificacion) {
        const existingUserByDocument = await User.findByDocument(
          tipoIdentificacion,
          numeroIdentificacion
        );
        // Solo validar si existe otro usuario diferente al actual con el mismo documento
        if (existingUserByDocument && existingUserByDocument.id !== userId) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe otro usuario registrado con este número de documento'
          });
        }
      }

      const updateData = {};
      if (nombreCompleto !== undefined) updateData.nombre_completo = nombreCompleto;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (direccion !== undefined) updateData.direccion = direccion;
      if (tipoIdentificacion !== undefined) updateData.tipo_identificacion = tipoIdentificacion;
      if (numeroIdentificacion !== undefined) updateData.numero_identificacion = numeroIdentificacion;

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


  //cambiar contraseña

  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      console.log('🔐 [changePassword] Iniciando cambio de contraseña para usuario:', userId);

      // PRIMERO: Validar que existe contraseña actual
      if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
        console.log('❌ [changePassword] Contraseña actual no proporcionada');
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual requerida'
        });
      }

      // SEGUNDO: Obtener usuario
      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ [changePassword] Usuario no encontrado:', userId);
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // TERCERO: Verificar contraseña actual ANTES de cualquier otra validación
      console.log('🔍 [changePassword] Verificando contraseña actual...');
      
      // Obtener contraseña actual del usuario desde la BD para verificación
      const userPasswordSql = 'SELECT contrasena FROM usuarios WHERE id = ?';
      const userPasswordResult = await query(userPasswordSql, [userId]);
      
      if (!userPasswordResult || userPasswordResult.length === 0 || !userPasswordResult[0].contrasena) {
        console.log('❌ [changePassword] Usuario no tiene contraseña almacenada');
        return res.status(400).json({
          success: false,
          message: 'Error al verificar contraseña. Por favor, contacta al administrador.'
        });
      }

      // Verificar contraseña usando bcrypt directamente para mayor control
      const isValidPassword = await bcrypt.compare(currentPassword.trim(), userPasswordResult[0].contrasena);
      
      if (!isValidPassword) {
        console.log('❌ [changePassword] Contraseña actual incorrecta - DETENIENDO PROCESO');
        console.log('   Usuario ID:', userId);
        console.log('   Contraseña proporcionada (hash):', currentPassword ? '***' : 'vacia');
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta. Por favor, verifica e intenta nuevamente.'
        });
      }

      console.log('✅ [changePassword] Contraseña actual correcta, validando nueva contraseña...');

      // Si la contraseña actual es correcta, entonces validar la nueva contraseña
      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
        console.log('❌ [changePassword] Nueva contraseña no proporcionada');
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña es requerida'
        });
      }

      if (newPassword.length < 6) {
        console.log('❌ [changePassword] Nueva contraseña muy corta');
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(newPassword)) {
        console.log('❌ [changePassword] Nueva contraseña no cumple formato requerido');
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'
        });
      }

      // Verificar que la nueva contraseña sea diferente a la actual
      const isSamePassword = await user.verifyPassword(newPassword);
      if (isSamePassword) {
        console.log('❌ [changePassword] La nueva contraseña es igual a la actual');
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe ser diferente a la contraseña actual'
        });
      }

      // VERIFICACIÓN FINAL: Asegurarse de que la contraseña actual sigue siendo correcta
      // antes de cambiar la contraseña (doble verificación de seguridad)
      console.log('🔒 [changePassword] Verificación final de seguridad antes de cambiar contraseña...');
      const finalPasswordCheck = await query(userPasswordSql, [userId]);
      
      if (!finalPasswordCheck || finalPasswordCheck.length === 0 || !finalPasswordCheck[0].contrasena) {
        console.log('❌ [changePassword] Error en verificación final - DETENIENDO PROCESO');
        return res.status(500).json({
          success: false,
          message: 'Error de seguridad. Por favor, intenta nuevamente.'
        });
      }

      const finalIsValid = await bcrypt.compare(currentPassword.trim(), finalPasswordCheck[0].contrasena);
      if (!finalIsValid) {
        console.log('❌ [changePassword] Verificación final falló - DETENIENDO PROCESO');
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta. Por favor, verifica e intenta nuevamente.'
        });
      }

      // Cambiar contraseña solo si todas las validaciones pasaron (incluida la verificación final)
      console.log('✅ [changePassword] Todas las validaciones pasaron, cambiando contraseña...');
      await user.changePassword(newPassword);
      console.log('✅ [changePassword] Contraseña cambiada exitosamente');

      return res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });
    } catch (error) {
      console.error('❌ [changePassword] Error al cambiar contraseña:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

  // Solicitar cambio de email (enviar código de verificación)
  static async requestChangeEmail(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;
      const { newEmail } = req.body;

      console.log('📧 [requestChangeEmail] Solicitud de cambio de email para usuario:', userId);
      console.log('📧 [requestChangeEmail] Nuevo email:', newEmail);

      // Validar que se proporcionó el nuevo email
      if (!newEmail || typeof newEmail !== 'string' || !newEmail.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El nuevo email es requerido'
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = newEmail.trim().toLowerCase();
      
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }

      // Obtener datos del usuario (incluyendo nuevo_email si existe solicitud pendiente)
      const [users] = await connection.execute(
        'SELECT id, email, nombre_completo, nuevo_email FROM usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];

      // Verificar que el nuevo email sea diferente al actual
      if (user.email && user.email.toLowerCase() === trimmedEmail) {
        console.log('⚠️ [requestChangeEmail] Intento de cambiar a mismo email:', {
          emailActual: user.email,
          nuevoEmail: trimmedEmail
        });
        return res.status(400).json({
          success: false,
          message: 'El nuevo email debe ser diferente al email actual'
        });
      }

      // Si hay una solicitud pendiente de cambio de email, verificar si el nuevo email es diferente
      if (user.nuevo_email && user.nuevo_email.toLowerCase() === trimmedEmail) {
        console.log('ℹ️ [requestChangeEmail] Ya hay una solicitud pendiente para este email, se reenviará el código');
        // Continuar para reenviar el código
      } else if (user.nuevo_email) {
        console.log('ℹ️ [requestChangeEmail] Cancelando solicitud anterior y creando nueva', {
          emailAnterior: user.nuevo_email,
          nuevoEmail: trimmedEmail
        });
      }

      // Verificar que el nuevo email no esté en uso (verificar tanto en email como en nuevo_email pendiente)
      const [existingUsers] = await connection.execute(
        `SELECT id, email, nuevo_email 
         FROM usuarios 
         WHERE (LOWER(email) = LOWER(?) OR LOWER(nuevo_email) = LOWER(?)) 
         AND id != ?`,
        [trimmedEmail, trimmedEmail, userId]
      );

      if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        console.log('⚠️ [requestChangeEmail] Email en uso detectado:', {
          userId: existingUser.id,
          email: existingUser.email,
          nuevo_email: existingUser.nuevo_email,
          intento: trimmedEmail
        });
        
        return res.status(400).json({
          success: false,
          message: 'Este email ya está en uso por otra cuenta o tiene una solicitud de cambio pendiente'
        });
      }

      // Generar código de verificación
      const verificationCode = emailService.generateVerificationCode();
      const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      // Guardar nuevo email temporal y código de verificación
      // Usaremos el campo codigo_verificacion y agregaremos nuevo_email como campo temporal
      // Por ahora usaremos una columna temporal o la misma estructura
      await connection.execute(
        `UPDATE usuarios 
         SET nuevo_email = ?, 
             codigo_cambio_email = ?, 
             fecha_codigo_cambio_email = ?,
             fecha_actualizacion = NOW() 
         WHERE id = ?`,
        [trimmedEmail, verificationCode, expirationTime, userId]
      );

      // Enviar email de verificación al nuevo email
      const emailResult = await emailService.sendChangeEmailVerification(
        trimmedEmail,
        user.nombre_completo || 'Usuario',
        verificationCode
      );

      if (!emailResult.success) {
        console.error('❌ Error al enviar email:', emailResult);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email de verificación. Por favor, inténtalo de nuevo más tarde.'
        });
      }

      console.log('✅ [requestChangeEmail] Código de verificación enviado exitosamente');

      res.status(200).json({
        success: true,
        message: 'Código de verificación enviado al nuevo email. Por favor, revisa tu bandeja de entrada.',
        data: {
          email: trimmedEmail
        }
      });

    } catch (error) {
      console.error('❌ [requestChangeEmail] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud de cambio de email',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Verificar código y cambiar email
  static async verifyChangeEmail(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;
      const { code } = req.body;

      console.log('📧 [verifyChangeEmail] Verificando código para usuario:', userId);

      // Validar que se proporcionó el código
      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación requerido'
        });
      }

      // Limpiar el código (remover espacios)
      const cleanCode = code.trim();

      if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación inválido. Debe ser un número de 6 dígitos.'
        });
      }

      // Obtener datos del usuario
      const [users] = await connection.execute(
        `SELECT id, email, nombre_completo, nuevo_email, codigo_cambio_email, fecha_codigo_cambio_email 
         FROM usuarios WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];

      // Verificar que haya una solicitud de cambio de email pendiente
      if (!user.nuevo_email || !user.codigo_cambio_email) {
        return res.status(400).json({
          success: false,
          message: 'No hay solicitud de cambio de email pendiente. Por favor, solicita un nuevo cambio de email.'
        });
      }

      // Verificar que el código no haya expirado (30 minutos)
      const expirationDate = new Date(user.fecha_codigo_cambio_email);
      const now = new Date();
      
      if (now > expirationDate) {
        // Limpiar la solicitud expirada
        await connection.execute(
          'UPDATE usuarios SET nuevo_email = NULL, codigo_cambio_email = NULL, fecha_codigo_cambio_email = NULL WHERE id = ?',
          [userId]
        );
        
        return res.status(400).json({
          success: false,
          message: 'El código de verificación ha expirado. Por favor, solicita un nuevo código.'
        });
      }

      // Comparar códigos
      if (user.codigo_cambio_email !== cleanCode) {
        console.log('❌ [verifyChangeEmail] Código incorrecto');
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto. Por favor, verifica e intenta de nuevo.'
        });
      }

      console.log('✅ [verifyChangeEmail] Código correcto, cambiando email...');

      // Verificar nuevamente que el nuevo email no esté en uso (por si acaso cambió mientras tanto)
      const [existingUsers] = await connection.execute(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [user.nuevo_email, userId]
      );

      if (existingUsers.length > 0) {
        // Limpiar la solicitud
        await connection.execute(
          'UPDATE usuarios SET nuevo_email = NULL, codigo_cambio_email = NULL, fecha_codigo_cambio_email = NULL WHERE id = ?',
          [userId]
        );
        
        return res.status(400).json({
          success: false,
          message: 'Este email ya está en uso por otra cuenta. Por favor, elige otro email.'
        });
      }

      // Cambiar el email y limpiar los campos temporales
      await connection.execute(
        `UPDATE usuarios 
         SET email = ?, 
             nuevo_email = NULL, 
             codigo_cambio_email = NULL, 
             fecha_codigo_cambio_email = NULL,
             email_verificado = TRUE,
             fecha_actualizacion = NOW() 
         WHERE id = ?`,
        [user.nuevo_email, userId]
      );

      console.log('✅ [verifyChangeEmail] Email cambiado exitosamente de', user.email, 'a', user.nuevo_email);

      res.status(200).json({
        success: true,
        message: 'Email cambiado exitosamente',
        data: {
          oldEmail: user.email,
          newEmail: user.nuevo_email
        }
      });

    } catch (error) {
      console.error('❌ [verifyChangeEmail] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el código de cambio de email',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = ProfileController;










