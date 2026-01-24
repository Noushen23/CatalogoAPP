const { query, getConnection } = require('../config/database');
const Order = require('../models/Order');
const notificationService = require('./notifications/notificationService');




class OrderService {

 
    

    static async confirmCheckout(checkoutIntentId) {
        const connection = await getConnection ()


        try {

            await connection.beginTransaction();


            // obtener Datos De la intecion de checkout

            const intentSql = `SELECT id, usuario_id, carrito_id, direccion_envio_id, metodo_pago, notas, datos_carrito, datos_usuario, datos_envio, referencia_pago
            from checkout_intents WHERE id = ? AND estado_transaccion = 'APPROVED'
            `;

            const intents = await query(intentSql, [checkoutIntentId]);

            if (intents.length === 0) {
                throw new Error(`Intencion de checkout no encontrada o no aprobada: ${checkoutIntentId}`);
            }

            const intent = intents[0];

            //2. verificar que el pedido no haya sido creado ya

            const pedidoExistenteSql = `SELECT id FROM ordenes WHERE referencia_pago = ?
            `;
            const pedidoExistentes = await query(pedidoExistenteSql, [intent.referencia_pago]);

            if (pedidoExistentes.length > 0) {
                console.log('⚠️ [OrderService] Pedido ya existe para esta referencia:', intent.referencia_pago);
                await connection.rollback();
                return 
            }
        }

    }
}