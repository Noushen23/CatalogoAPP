const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config/env');
const emailService = require('../services/emailService');
const db = require('../config/database');

class AuthController {
  // Generar token JWT
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  // Generar refresh token
  static generateRefreshToken(user) {
    const payload = {
      id: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn
    });
  }

  // Registro de usuario
  static async register(req, res) {
    try {
      // Validar datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { 
        email, 
        nombreCompleto,
        nombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        password, 
        telefono, 
        direccion,
        tipo_identificacion,
        numero_identificacion
      } = req.body;

      const tipoIdentificacionNormalizado = String(tipo_identificacion || '').trim().toUpperCase();
      const numeroIdentificacionNormalizado = String(numero_identificacion || '').trim();

      const nombreCompletoFinal = [primerApellido, segundoApellido, nombre, segundoNombre]
        .map((value) => (value || '').trim())
        .filter((value) => value.length > 0)
        .join(' ') || (nombreCompleto || '').trim();

      // Verificar si el usuario ya existe por email
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Verificar si el documento ya existe (si se proporciona)
      if (tipoIdentificacionNormalizado && numeroIdentificacionNormalizado) {
        const existingUserByDocument = await User.findByDocument(
          tipoIdentificacionNormalizado,
          numeroIdentificacionNormalizado
        );
        if (existingUserByDocument) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe un usuario registrado con este número de documento'
          });
        }
      }

      // Crear nuevo usuario
      const user = await User.create({
        email,
        nombreCompleto: nombreCompletoFinal,
        nombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        password,
        telefono,
        direccion,
        tipo_identificacion: tipoIdentificacionNormalizado || undefined,
        numero_identificacion: numeroIdentificacionNormalizado || undefined,
        rol: 'cliente'
      });

      // Enviar código de verificación por email
      try {
        const verificationCode = emailService.generateVerificationCode();
        
        // Guardar código en la base de datos
        const connection = await db.getConnection();
        try {
          await connection.execute(
            'UPDATE usuarios SET codigo_verificacion = ? WHERE id = ?',
            [verificationCode, user.id]
          );
        } finally {
          connection.release();
        }

        // Enviar email
        await emailService.sendVerificationEmail(
          email,
          nombreCompleto,
          verificationCode
        );

        console.log('✅ Código de verificación enviado a:', email);
      } catch (emailError) {
        // No fallar el registro si falla el envío de email
        console.error('⚠️ Error al enviar email de verificación:', emailError);
      }

      // Intentar crear tercero en ApiTercero (no crítico para el registro)
      let warningMessage = null;
      try {
        const terceroService = require ('../services/terceroService');
        const terceroResult = await terceroService.createTercero({
          id: user.id,
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          telefono: user.telefono,
          direccion: user.direccion,
          tipoIdentificacion: user.tipoIdentificacion,
          numeroIdentificacion: user.numeroIdentificacion
        });

        //Si hay advertencia de duplicado, capturarla para mostrar al usuario
        if (terceroResult?.warning) {
          warningMessage = terceroResult.warning;
        }
      } catch (terceroError){
        // No fallar el registro si falla la creacion del tercero
        console.error('⚠️ Error al crear tercero en ApiTercero:', terceroError.message);
      }

      // Generar tokens para autenticar automáticamente
      const token = AuthController.generateToken(user);
      const refreshToken = AuthController.generateRefreshToken(user);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente. Hemos enviado un código de verificación a tu email. Por favor verifica tu cuenta antes de realizar compras.',
        warning: warningMessage || undefined, // Incluir advertencia si existe
        data: {
          user: user.toPublicObject(),
          token,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Login de usuario
  static async login(req, res) {
    try {
      // Validar datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Buscar usuario
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      if (!user.activo) {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada'
        });
      }

      // Generar tokens
      const token = AuthController.generateToken(user);
      const refreshToken = AuthController.generateRefreshToken(user);

      // Actualizar último acceso
      await user.updateLastAccess();

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: user.toPublicObject(),
          token,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Verificar estado de autenticación
  static async getStatus(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuario autenticado',
        data: user.toPublicObject()
      });

    } catch (error) {
      console.error('Error en verificación de estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Renovar token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }

      // Buscar usuario
      const user = await User.findById(decoded.id);
      if (!user || !user.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Generar nuevo token
      const newToken = AuthController.generateToken(user);
      const newRefreshToken = AuthController.generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      console.error('Error en renovación de token:', error);
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      // En una implementación más robusta, aquí podrías invalidar el token
      // agregándolo a una lista negra en la base de datos
      
      res.json({
        success: true,
        message: 'Logout exitoso'
      });

    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Cambiar contraseña
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      // Verificar contraseña actual
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Cambiar contraseña
      await user.changePassword(newPassword);

      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Solicitar recuperación de contraseña (verificar documento y enviar código)
  static async forgotPassword(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { tipoIdentificacion, numeroIdentificacion } = req.body;

      // Validar que se proporcionaron los datos
      if (!tipoIdentificacion || !numeroIdentificacion) {
        return res.status(400).json({
          success: false,
          message: 'Tipo y número de identificación son requeridos'
        });
      }

      // Validar tipo de identificación
      if (!['CC', 'NIT', 'CE', 'TR'].includes(tipoIdentificacion)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de identificación inválido'
        });
      }

      // Buscar usuario por documento
      const user = await User.findByDocument(tipoIdentificacion, numeroIdentificacion);
      
      if (!user) {
        // Por seguridad, no revelar si el documento existe o no
        return res.status(200).json({
          success: true,
          message: 'Si el documento existe en nuestro sistema, recibirás un código de recuperación en tu email'
        });
      }

      // Verificar que el usuario tenga email
      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: 'El usuario no tiene un email registrado'
        });
      }

      // Generar código de recuperación
      const recoveryCode = emailService.generateVerificationCode();
      const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      // Guardar código en la base de datos
      await connection.execute(
        `UPDATE usuarios 
         SET codigo_recuperacion_password = ?, 
             fecha_codigo_recuperacion_password = ?,
             fecha_actualizacion = NOW() 
         WHERE id = ?`,
        [recoveryCode, expirationTime, user.id]
      );

      // Enviar email con el código
      const emailResult = await emailService.sendPasswordRecoveryEmail(
        user.email,
        user.nombreCompleto || 'Usuario',
        recoveryCode
      );

      if (!emailResult.success) {
        console.error('Error al enviar email de recuperación:', emailResult);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email de recuperación. Por favor, inténtalo de nuevo más tarde.'
        });
      }

      console.log('✅ Código de recuperación enviado a:', user.email);

      res.status(200).json({
        success: true,
        message: 'Si el documento existe en nuestro sistema, recibirás un código de recuperación en tu email'
      });

    } catch (error) {
      console.error('❌ Error en forgotPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    } finally {
      connection.release();
    }
  }

  // Resetear contraseña con código de verificación
  static async resetPassword(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { tipoIdentificacion, numeroIdentificacion, code, newPassword } = req.body;

      // Validar datos de entrada
      if (!tipoIdentificacion || !numeroIdentificacion || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: tipoIdentificacion, numeroIdentificacion, code y newPassword'
        });
      }

      // Validar formato de código (6 dígitos)
      const cleanCode = code.trim();
      if (!/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({
          success: false,
          message: 'El código debe tener 6 dígitos'
        });
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
        });
      }

      // Buscar usuario por documento
      const user = await User.findByDocument(tipoIdentificacion, numeroIdentificacion);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener datos del usuario con código de recuperación
      const [users] = await connection.execute(
        `SELECT id, email, codigo_recuperacion_password, fecha_codigo_recuperacion_password 
         FROM usuarios WHERE id = ?`,
        [user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const userData = users[0];

      // Verificar que existe un código de recuperación
      if (!userData.codigo_recuperacion_password) {
        return res.status(400).json({
          success: false,
          message: 'No hay una solicitud de recuperación de contraseña pendiente. Por favor, solicita un nuevo código.'
        });
      }

      // Verificar que el código no haya expirado
      const expirationDate = new Date(userData.fecha_codigo_recuperacion_password);
      const now = new Date();
      
      if (now > expirationDate) {
        // Limpiar código expirado
        await connection.execute(
          'UPDATE usuarios SET codigo_recuperacion_password = NULL, fecha_codigo_recuperacion_password = NULL WHERE id = ?',
          [user.id]
        );
        
        return res.status(400).json({
          success: false,
          message: 'El código de recuperación ha expirado. Por favor, solicita un nuevo código.'
        });
      }

      // Comparar códigos - Normalizar ambos códigos antes de comparar
      const storedCode = String(userData.codigo_recuperacion_password || '').trim();
      const receivedCode = String(cleanCode || '').trim();
      
      console.log('🔍 [resetPassword] Comparando códigos:', {
        storedCode: storedCode,
        receivedCode: receivedCode,
        storedCodeLength: storedCode.length,
        receivedCodeLength: receivedCode.length,
        codesMatch: storedCode === receivedCode
      });
      
      if (storedCode !== receivedCode) {
        console.log('❌ [resetPassword] Código incorrecto');
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto. Por favor, verifica e intenta de nuevo.'
        });
      }

      console.log('✅ [resetPassword] Código correcto, cambiando contraseña...');

      // Cambiar contraseña y limpiar código de recuperación
      const userInstance = await User.findById(user.id);
      await userInstance.changePassword(newPassword);

      // Limpiar código de recuperación
      await connection.execute(
        'UPDATE usuarios SET codigo_recuperacion_password = NULL, fecha_codigo_recuperacion_password = NULL WHERE id = ?',
        [user.id]
      );

      console.log('✅ [resetPassword] Contraseña cambiada exitosamente');

      res.status(200).json({
        success: true,
        message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
      });

    } catch (error) {
      console.error('❌ Error en resetPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = AuthController;
