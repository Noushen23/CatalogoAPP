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

      const { email, nombreCompleto, password, telefono, direccion } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Crear nuevo usuario
      const user = await User.create({
        email,
        nombreCompleto,
        password,
        telefono,
        direccion,
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

      // Generar tokens para autenticar automáticamente
      const token = AuthController.generateToken(user);
      const refreshToken = AuthController.generateRefreshToken(user);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente. Hemos enviado un código de verificación a tu email. Por favor verifica tu cuenta antes de realizar compras.',
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
}

module.exports = AuthController;
