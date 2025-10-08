const db = require('../config/database');
const emailService = require('../services/emailService');

/**
 * Controlador para verificación de email
 */
const emailVerificationController = {
  /**
   * Reenviar código de verificación
   * POST /api/v1/auth/resend-verification
   */
  async resendVerificationEmail(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id; // Del middleware de autenticación

      // Obtener datos del usuario
      const [users] = await connection.execute(
        'SELECT id, email, nombre_completo, email_verificado, codigo_verificacion FROM usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];

      // Verificar si ya está verificado
      if (user.email_verificado) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está verificado'
        });
      }

      // Generar nuevo código de verificación
      const verificationCode = emailService.generateVerificationCode();

      // Actualizar código en la base de datos
      await connection.execute(
        'UPDATE usuarios SET codigo_verificacion = ?, fecha_actualizacion = NOW() WHERE id = ?',
        [verificationCode, userId]
      );

      // Enviar email
      const emailResult = await emailService.sendVerificationEmail(
        user.email,
        user.nombre_completo,
        verificationCode
      );

      if (!emailResult.success) {
        console.error('Error al enviar email:', emailResult);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email de verificación. Por favor, inténtalo de nuevo más tarde.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Código de verificación enviado correctamente. Revisa tu bandeja de entrada.',
        data: {
          email: user.email,
          messageId: emailResult.messageId
        }
      });

    } catch (error) {
      console.error('Error en resendVerificationEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reenviar código de verificación',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  /**
   * Verificar código de email
   * POST /api/v1/auth/verify-email
   * Body: { code: string }
   */
  async verifyEmail(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;
      const { code } = req.body;

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

      // Obtener usuario y verificar código
      const [users] = await connection.execute(
        'SELECT id, email, nombre_completo, email_verificado, codigo_verificacion FROM usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];

      console.log('🔍 DEBUG - Verificación de código:');
      console.log('  👤 Usuario:', user.email);
      console.log('  📥 Código recibido:', `"${cleanCode}"`);
      console.log('  📦 Código en BD:', `"${user.codigo_verificacion}"`);
      console.log('  ✅ Email verificado:', user.email_verificado);
      console.log('  🔢 Tipo código recibido:', typeof cleanCode);
      console.log('  🔢 Tipo código BD:', typeof user.codigo_verificacion);
      console.log('  ⚖️  Comparación estricta:', user.codigo_verificacion === cleanCode);

      // Verificar si ya está verificado
      if (user.email_verificado) {
        console.log('⚠️  Email ya está verificado');
        return res.status(400).json({
          success: false,
          message: 'El email ya está verificado'
        });
      }

      // Verificar si tiene código de verificación
      if (!user.codigo_verificacion) {
        console.log('⚠️  No hay código de verificación en BD');
        return res.status(400).json({
          success: false,
          message: 'No hay código de verificación. Por favor, solicita uno nuevo.'
        });
      }

      // Comparar códigos
      if (user.codigo_verificacion !== cleanCode) {
        console.log('❌ Código incorrecto!');
        console.log('   Esperado:', user.codigo_verificacion);
        console.log('   Recibido:', cleanCode);
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto. Por favor, verifica e intenta de nuevo.'
        });
      }

      console.log('✅ Código correcto! Verificando email...');

      // Actualizar usuario como verificado
      await connection.execute(
        `UPDATE usuarios 
         SET email_verificado = TRUE, 
             codigo_verificacion = NULL, 
             fecha_actualizacion = NOW() 
         WHERE id = ?`,
        [userId]
      );

      // Enviar email de bienvenida (opcional, no bloquea la respuesta)
      emailService.sendWelcomeEmail(user.email, user.nombre_completo)
        .catch(error => console.error('Error al enviar email de bienvenida:', error));

      res.status(200).json({
        success: true,
        message: '¡Email verificado exitosamente! Ya puedes realizar compras.',
        data: {
          emailVerificado: true
        }
      });

    } catch (error) {
      console.error('Error en verifyEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar email',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  /**
   * Obtener estado de verificación del usuario
   * GET /api/v1/auth/verification-status
   */
  async getVerificationStatus(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;

      const [users] = await connection.execute(
        'SELECT email_verificado, codigo_verificacion FROM usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];

      res.status(200).json({
        success: true,
        data: {
          emailVerificado: user.email_verificado,
          codigoEnviado: !!user.codigo_verificacion
        }
      });

    } catch (error) {
      console.error('Error en getVerificationStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado de verificación',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  /**
   * Enviar código de verificación después del registro (uso interno)
   */
  async sendVerificationCodeAfterRegistration(userId, email, nombreCompleto, connection) {
    try {
      // Generar código de verificación
      const verificationCode = emailService.generateVerificationCode();

      // Guardar código en la base de datos
      await connection.execute(
        'UPDATE usuarios SET codigo_verificacion = ? WHERE id = ?',
        [verificationCode, userId]
      );

      // Enviar email de verificación
      const emailResult = await emailService.sendVerificationEmail(
        email,
        nombreCompleto,
        verificationCode
      );

      return {
        success: emailResult.success,
        code: verificationCode,
        messageId: emailResult.messageId
      };

    } catch (error) {
      console.error('Error al enviar código de verificación después del registro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = emailVerificationController;

