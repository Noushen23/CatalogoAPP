const nodemailer = require('nodemailer');
const config = require('../config/env');

/**
 * Servicio de envío de emails usando Nodemailer
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializar transporter de nodemailer
   */
  initializeTransporter() {
    try {
      // Configuración para desarrollo (ethereal.email - emails de prueba)
      if (config.nodeEnv === 'development' && (!config.email.host || !config.email.user)) {
        console.log('⚠️  No hay configuración SMTP. Usando modo de prueba (no se enviarán emails reales)');
        this.transporter = null;
        return;
      }

      // Configuración real para producción
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true para 465, false para otros puertos
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });

      console.log('✅ Servicio de email inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar servicio de email:', error);
      this.transporter = null;
    }
  }

  /**
   * Verificar conexión con el servidor SMTP
   */
  async verifyConnection() {
    if (!this.transporter) {
      return { success: false, message: 'Transporter no configurado' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Conexión SMTP verificada' };
    } catch (error) {
      console.error('❌ Error al verificar conexión SMTP:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Generar código de verificación de 6 dígitos
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Crear template HTML para email de verificación
   */
  createVerificationEmailTemplate(nombre, codigo) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Email</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .code-container {
            background-color: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning p {
            font-size: 14px;
            color: #856404;
            margin: 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          .footer p {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .social-links {
            margin-top: 20px;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 30px 20px;
            }
            .code {
              font-size: 28px;
              letter-spacing: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ ${config.app.name}</h1>
            <p>Verificación de Cuenta</p>
          </div>
          
          <div class="content">
            <p class="greeting">¡Hola ${nombre}!</p>
            
            <p class="message">
              Gracias por registrarte en <strong>${config.app.name}</strong>. 
              Estamos emocionados de tenerte con nosotros. 🎉
            </p>
            
            <p class="message">
              Para completar tu registro y empezar a disfrutar de todas nuestras funcionalidades, 
              necesitamos verificar tu correo electrónico.
            </p>
            
            <div class="code-container">
              <p class="code-label">Tu código de verificación</p>
              <p class="code">${codigo}</p>
            </div>
            
            <p class="message">
              Simplemente ingresa este código en la aplicación para verificar tu cuenta.
              El código es válido por <strong>24 horas</strong>.
            </p>
            
            <div class="warning">
              <p>
                <strong>⚠️ Importante:</strong> Si no solicitaste este código, 
                puedes ignorar este correo de forma segura. Tu cuenta permanecerá protegida.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
            <p>
              Si tienes alguna pregunta, contáctanos en 
              <a href="mailto:${config.email.supportEmail}">
                ${config.email.supportEmail}
              </a>
            </p>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} ${config.app.name}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar email de verificación
   */
  async sendVerificationEmail(email, nombre, codigo) {
    try {
      // En modo desarrollo sin configuración SMTP, simular envío
      if (!this.transporter) {
        console.log('📧 [SIMULACIÓN] Email de verificación para:', email);
        console.log('📧 [SIMULACIÓN] Código:', codigo);
        console.log('📧 [SIMULACIÓN] Nombre:', nombre);
        return {
          success: true,
          message: 'Email simulado (modo desarrollo)',
          messageId: 'simulated-' + Date.now(),
        };
      }

      const mailOptions = {
        from: `"${config.app.name}" <${config.email.from}>`,
        to: email,
        subject: `Verifica tu cuenta en ${config.app.name}`,
        html: this.createVerificationEmailTemplate(nombre, codigo),
        text: `Hola ${nombre},\n\nGracias por registrarte en ${config.app.name}.\n\nTu código de verificación es: ${codigo}\n\nEste código es válido por 24 horas.\n\nSi no solicitaste este código, puedes ignorar este correo.\n\nSaludos,\nEl equipo de ${config.app.name}`,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de verificación enviado:', info.messageId);

      return {
        success: true,
        message: 'Email enviado correctamente',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Error al enviar email de verificación:', error);
      return {
        success: false,
        message: 'Error al enviar el email',
        error: error.message,
      };
    }
  }

  /**
   * Enviar email de cambio de email con código de verificación
   */
  async sendChangeEmailVerification(email, nombre, codigo) {
    try {
      // En modo desarrollo sin configuración SMTP, simular envío
      if (!this.transporter) {
        console.log('📧 [SIMULACIÓN] Email de cambio de email para:', email);
        console.log('📧 [SIMULACIÓN] Código:', codigo);
        console.log('📧 [SIMULACIÓN] Nombre:', nombre);
        return {
          success: true,
          message: 'Email simulado (modo desarrollo)',
          messageId: 'simulated-' + Date.now(),
        };
      }

      const changeEmailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .code { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .code-number { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Cambio de Email</h1>
            </div>
            <div class="content">
              <p>¡Hola ${nombre}!</p>
              <p>Has solicitado cambiar tu dirección de email. Para completar el cambio, ingresa el siguiente código de verificación:</p>
              <div class="code">
                <div class="code-number">${codigo}</div>
              </div>
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este código es válido por 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo.
              </div>
              <p>Si no solicitaste este cambio, contacta con nuestro equipo de soporte inmediatamente.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${config.app.name}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${config.app.name}" <${config.email.from}>`,
        to: email,
        subject: `Código de verificación para cambio de email - ${config.app.name}`,
        html: changeEmailHtml,
        text: `Hola ${nombre},\n\nHas solicitado cambiar tu dirección de email en ${config.app.name}.\n\nTu código de verificación es: ${codigo}\n\nEste código es válido por 30 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nSaludos,\nEl equipo de ${config.app.name}`,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de cambio de email enviado:', info.messageId);

      return {
        success: true,
        message: 'Email enviado correctamente',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Error al enviar email de cambio de email:', error);
      return {
        success: false,
        message: 'Error al enviar el email',
        error: error.message,
      };
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async sendPasswordRecoveryEmail(email, nombre, codigo) {
    try {
      // En modo desarrollo sin configuración SMTP, simular envío
      if (!this.transporter) {
        console.log('📧 [SIMULACIÓN] Email de recuperación de contraseña para:', email);
        console.log('📧 [SIMULACIÓN] Código:', codigo);
        console.log('📧 [SIMULACIÓN] Nombre:', nombre);
        return {
          success: true,
          message: 'Email simulado (modo desarrollo)',
          messageId: 'simulated-' + Date.now(),
        };
      }

      const recoveryHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .code { background: #f8f9fa; border: 2px dashed #f44336; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
            .code-number { font-size: 36px; font-weight: bold; color: #f44336; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <p>¡Hola ${nombre}!</p>
              <p>Has solicitado recuperar tu contraseña. Para crear una nueva contraseña, ingresa el siguiente código de verificación:</p>
              <div class="code">
                <div class="code-number">${codigo}</div>
              </div>
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este código es válido por 30 minutos. Si no solicitaste recuperar tu contraseña, puedes ignorar este correo de forma segura.
              </div>
              <p>Si no solicitaste este cambio, te recomendamos verificar la seguridad de tu cuenta.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${config.app.name}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${config.app.name}" <${config.email.from}>`,
        to: email,
        subject: `Recuperación de contraseña - ${config.app.name}`,
        html: recoveryHtml,
        text: `Hola ${nombre},\n\nHas solicitado recuperar tu contraseña en ${config.app.name}.\n\nTu código de verificación es: ${codigo}\n\nEste código es válido por 30 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nSaludos,\nEl equipo de ${config.app.name}`,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de recuperación de contraseña enviado:', info.messageId);

      return {
        success: true,
        message: 'Email enviado correctamente',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Error al enviar email de recuperación de contraseña:', error);
      return {
        success: false,
        message: 'Error al enviar el email',
        error: error.message,
      };
    }
  }

  /**
   * Enviar email de bienvenida después de verificación exitosa
   */
  async sendWelcomeEmail(email, nombre) {
    try {
      if (!this.transporter) {
        console.log('📧 [SIMULACIÓN] Email de bienvenida para:', email);
        return { success: true, message: 'Email simulado' };
      }

      const welcomeHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Bienvenido a ${config.app.name}!</h1>
            </div>
            <div class="content">
              <p>¡Hola ${nombre}!</p>
              <p>Tu cuenta ha sido verificada exitosamente. ¡Ya puedes disfrutar de todas las funcionalidades de nuestra tienda!</p>
              <p>Explora nuestro catálogo de productos y encuentra las mejores ofertas.</p>
              <center>
                <a href="${config.app.url}" class="button">Comenzar a Comprar</a>
              </center>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${config.app.name}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${config.app.name}" <${config.email.from}>`,
        to: email,
        subject: `¡Bienvenido a ${config.app.name}!`,
        html: welcomeHtml,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error al enviar email de bienvenida:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear template HTML para email de actualización de estado de pedido
   */
  createOrderStatusUpdateEmailTemplate(nombre, numeroOrden, estado, estadoAnterior, total, fechaCreacion) {
    const statusMessages = {
      'pendiente': {
        title: '⏳ Pedido pendiente de pago',
        message: 'Tu pedido está pendiente de pago. Completa el pago para continuar con el proceso.',
        color: '#ff9800'
      },
      'confirmada': {
        title: '✅ Pedido Confirmado',
        message: 'Tu pedido ha sido confirmado y está siendo preparado.',
        color: '#4caf50'
      },
      'en_proceso': {
        title: '🔄 Pedido en Preparación',
        message: 'Tu pedido está siendo preparado para su envío.',
        color: '#2196f3'
      },
      'enviada': {
        title: '📦 Pedido Enviado',
        message: '¡Tu pedido ha sido enviado! Está en camino a la dirección de entrega.',
        color: '#9c27b0'
      },
      'entregada': {
        title: '🎉 Pedido Entregado',
        message: '¡Tu pedido ha sido entregado exitosamente! Esperamos que disfrutes tus productos.',
        color: '#4caf50'
      },
      'cancelada': {
        title: '❌ Pedido Cancelado',
        message: 'Tu pedido ha sido cancelado. Si tienes alguna pregunta, contáctanos.',
        color: '#f44336'
      },
      'reembolsada': {
        title: '💰 Pedido Reembolsado',
        message: 'Tu pedido ha sido reembolsado. El reembolso se procesará según tus datos de pago.',
        color: '#2196f3'
      }
    };

    const statusInfo = statusMessages[estado] || {
      title: '📋 Estado Actualizado',
      message: 'El estado de tu pedido ha sido actualizado.',
      color: '#667eea'
    };

    const statusLabels = {
      'pendiente': 'Pendiente de pago',
      'confirmada': 'Confirmada',
      'en_proceso': 'En Proceso',
      'enviada': 'Enviada',
      'entregada': 'Entregada',
      'cancelada': 'Cancelada',
      'reembolsada': 'Reembolsada'
    };

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Actualización de Pedido</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
          }
          .order-info {
            background-color: #f8f9fa;
            border-left: 4px solid ${statusInfo.color};
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .order-info h2 {
            color: ${statusInfo.color};
            margin-bottom: 10px;
            font-size: 20px;
          }
          .order-details {
            margin-top: 15px;
          }
          .order-details p {
            margin: 8px 0;
            color: #666;
          }
          .order-details strong {
            color: #333;
          }
          .status-badge {
            display: inline-block;
            background-color: ${statusInfo.color};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
          }
          .message {
            font-size: 16px;
            color: #666;
            margin: 25px 0;
            line-height: 1.8;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          .footer p {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
            <p>Actualización de Pedido #${numeroOrden}</p>
          </div>
          
          <div class="content">
            <p class="greeting">¡Hola ${nombre}!</p>
            
            <p class="message">
              ${statusInfo.message}
            </p>

            <div class="order-info">
              <h2>📦 Detalles del Pedido</h2>
              <div class="order-details">
                <p><strong>Número de Pedido:</strong> #${numeroOrden}</p>
                <p><strong>Estado Anterior:</strong> ${statusLabels[estadoAnterior] || estadoAnterior}</p>
                <p><strong>Nuevo Estado:</strong> <span class="status-badge">${statusLabels[estado] || estado}</span></p>
                <p><strong>Total:</strong> $${total ? total.toLocaleString('es-CO') : 'N/A'}</p>
                <p><strong>Fecha de Creación:</strong> ${fechaCreacion ? new Date(fechaCreacion).toLocaleString('es-CO') : 'N/A'}</p>
              </div>
            </div>
            
            <p class="message">
              Puedes consultar el estado de tu pedido en cualquier momento desde tu cuenta en la aplicación.
            </p>
          </div>
          
          <div class="footer">
            <p>
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
            <p>
              Si tienes alguna pregunta sobre tu pedido, contáctanos en 
              <a href="mailto:${config.email.supportEmail}">
                ${config.email.supportEmail}
              </a>
            </p>
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} ${config.app.name}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar email de actualización de estado de pedido
   */
  async sendOrderStatusUpdateEmail(email, nombre, numeroOrden, estado, estadoAnterior, total, fechaCreacion) {
    try {
      // En modo desarrollo sin configuración SMTP, simular envío
      if (!this.transporter) {
        console.log('📧 [SIMULACIÓN] Email de actualización de estado de pedido para:', email);
        console.log('📧 [SIMULACIÓN] Pedido:', numeroOrden);
        console.log('📧 [SIMULACIÓN] Estado:', estadoAnterior, '→', estado);
        return {
          success: true,
          message: 'Email simulado (modo desarrollo)',
          messageId: 'simulated-' + Date.now(),
        };
      }

      const mailOptions = {
        from: `"${config.app.name}" <${config.email.from}>`,
        to: email,
        subject: `Actualización de Pedido #${numeroOrden} - ${config.app.name}`,
        html: this.createOrderStatusUpdateEmailTemplate(
          nombre,
          numeroOrden,
          estado,
          estadoAnterior,
          total,
          fechaCreacion
        ),
        text: `Hola ${nombre},\n\nEl estado de tu pedido #${numeroOrden} ha sido actualizado.\n\nEstado anterior: ${estadoAnterior}\nNuevo estado: ${estado}\n\nTotal: $${total ? total.toLocaleString('es-CO') : 'N/A'}\n\nPuedes consultar el estado de tu pedido en cualquier momento desde tu cuenta.\n\nSaludos,\nEl equipo de ${config.app.name}`,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email de actualización de estado de pedido enviado:', info.messageId);

      return {
        success: true,
        message: 'Email enviado correctamente',
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Error al enviar email de actualización de estado de pedido:', error);
      return {
        success: false,
        message: 'Error al enviar el email',
        error: error.message,
      };
    }
  }
}

// Exportar instancia única del servicio
module.exports = new EmailService();

































