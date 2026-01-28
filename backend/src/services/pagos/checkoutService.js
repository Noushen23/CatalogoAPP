const { getConnection } = require('../../config/database');
const Order = require('../../models/Order');
const { v4: uuidv4 } = require('uuid');

class CheckoutService {

  /* =====================================================
   * CREAR INTENCIÓN DE CHECKOUT
   * ===================================================== */
  static async crearIntencion(datos) {
    const {
      referenciaPago,
      usuarioId,
      carritoId,
      direccionEnvioId,
      metodoPago,
      notas,
      datosCarrito,
      datosUsuario,
      datosEnvio
    } = datos;

    const intentId = uuidv4();
    const connection = await getConnection();

    try {
      const sql = `
        INSERT INTO checkout_intents (
          id, referencia_pago, usuario_id, carrito_id, direccion_envio_id,
          metodo_pago, notas, datos_carrito, datos_usuario, datos_envio,
          estado_transaccion, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())
      `;

      await connection.execute(sql, [
        intentId,
        referenciaPago,
        usuarioId,
        carritoId,
        direccionEnvioId || null,
        metodoPago,
        notas || null,
        JSON.stringify(datosCarrito),
        JSON.stringify(datosUsuario),
        datosEnvio ? JSON.stringify(datosEnvio) : null
      ]);

      return {
        id: intentId,
        referenciaPago,
        estado: 'PENDING'
      };

    } finally {
      connection.release();
    }
  }

  /* =====================================================
   * OBTENER INTENCIÓN POR REFERENCIA
   * ===================================================== */
  static async obtenerIntencionPorReferencia(referenciaPago) {
    const connection = await getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT * FROM checkout_intents WHERE referencia_pago = ?`,
        [referenciaPago]
      );

      return rows.length ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  /* =====================================================
   * ACTUALIZAR ESTADO DE INTENCIÓN
   * ===================================================== */
  static async actualizarEstado(intentId, estado, idTransaccionWompi = null) {
    const connection = await getConnection();

    try {
      await connection.execute(
        `
        UPDATE checkout_intents
        SET estado_transaccion = ?,
            id_transaccion_wompi = ?,
            fecha_actualizacion = NOW()
        WHERE id = ?
        `,
        [estado, idTransaccionWompi, intentId]
      );
    } finally {
      connection.release();
    }
  }

  /* =====================================================
   * CONFIRMAR CHECKOUT (IDEMPOTENTE Y SEGURO)
   * ===================================================== */
  static async confirmarCheckout(intentId) {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      /* 1️⃣ Bloquear la intención (evita doble ejecución) */
      const [intents] = await connection.execute(
        `
        SELECT id, usuario_id, carrito_id, direccion_envio_id, metodo_pago,
               notas, datos_carrito, datos_usuario, datos_envio, referencia_pago
        FROM checkout_intents
        WHERE id = ? AND estado_transaccion = 'APPROVED'
        FOR UPDATE
        `,
        [intentId]
      );

      if (!intents.length) {
        throw new Error(`Intención no encontrada o no aprobada: ${intentId}`);
      }

      const intent = intents[0];

      /* 2️⃣ Verificar si el pedido ya existe (idempotencia real) */
      const [ordenes] = await connection.execute(
        `SELECT id FROM ordenes WHERE referencia_pago = ?`,
        [intent.referencia_pago]
      );

      if (ordenes.length) {
        await connection.commit();
        return await Order.findById(ordenes[0].id);
      }

      /* 3️⃣ Parsear datos */
      const datosCarrito = JSON.parse(intent.datos_carrito);

      /* 4️⃣ Crear pedido */
      const orderData = {
        usuarioId: intent.usuario_id,
        cartId: intent.carrito_id,
        direccionEnvioId: intent.direccion_envio_id || null,
        metodoPago: intent.metodo_pago,
        referenciaPago: intent.referencia_pago,
        notas: intent.notas || null,
        items: datosCarrito.items
      };

      const pedido = await Order.createFromCart(orderData, connection);

      /* 5️⃣ Commit final */
      await connection.commit();
      return pedido;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = CheckoutService;
