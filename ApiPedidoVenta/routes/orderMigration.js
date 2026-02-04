/**
 * Controlador de Migración de Órdenes a TNS
 * Endpoints para orderDetail e iniciarPreparacion
 */

const express = require('express');
const router = express.Router();
const orderMigrationService = require('../services/orderMigrationService');

// Endpoint de prueba para verificar que el backend esté funcionando
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend de migración funcionando correctamente',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/orders/:id/detail',
            'POST /api/orders/:id/migrate',
            'PUT /api/orders/:id/retry-migration',
            'GET /api/orders/migration-status'
        ]
    });
});

// Middleware de validación
const validateOrderId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'INVALID_ORDER_ID',
            message: 'ID de orden es requerido y debe ser válido'
        });
    }
    
    next();
};

// GET /api/orders/:id/detail - Obtener detalles de orden y estado de migración
router.get('/:id/detail', validateOrderId, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const detalles = await orderMigrationService.getOrderMigrationDetails(id);
        
        res.json({
            success: true,
            data: detalles
        });
        
    } catch (error) {
        console.error('Error obteniendo detalles de orden:', error);
        
        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                success: false,
                error: 'ORDER_NOT_FOUND',
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/orders/:id/migrate - Solo migrar orden sin iniciar preparación
router.post('/:id/migrate', validateOrderId, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            usuario = 'MOBILE_USER',
            codprefijo = 'PA',
            codcomp = 'PV',
            sucid = 1
        } = req.body;
        
        const options = {
            usuario,
            codprefijo,
            codcomp,
            sucid,
            iniciarPreparacion: false
        };
        
        const resultado = await orderMigrationService.migrateOrderToTNS(id, options);
        
        res.json({
            success: true,
            message: 'Orden migrada exitosamente a TNS',
            data: {
                ordenId: id,
                tnsKardexId: resultado.kardexId,
                tnsNumero: resultado.numero,
                terceroId: resultado.terceroId,
                vendedorId: resultado.vendedorId,
                total: resultado.total,
                itemsCount: resultado.itemsCount,
                dekardexIds: resultado.dekardexIds,
                estado: 'MIGRADO_PENDIENTE'
            }
        });
        
    } catch (error) {
        console.error('Error migrando orden:', error);
        
        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                success: false,
                error: 'ORDER_NOT_FOUND',
                message: error.message
            });
        }
        
        if (error.message.includes('no encontrado en TNS')) {
            return res.status(400).json({
                success: false,
                error: 'TNS_ENTITY_NOT_FOUND',
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/orders/migration-status - Obtener estado de migración de múltiples órdenes
router.get('/migration-status', async (req, res, next) => {
    try {
        const { 
            estado = 'pendiente',
            limit = 50,
            page = 1,
            fechaDesde,
            fechaHasta
        } = req.query;
        
        let whereConditions = [];
        let params = [];
        
        if (estado === 'pendiente') {
            whereConditions.push('tns_sincronizado = ?');
            params.push('pendiente');
        } else if (estado === 'sincronizado') {
            whereConditions.push('tns_sincronizado = ?');
            params.push('sincronizado');
        } else if (estado === 'error') {
            whereConditions.push('tns_sincronizado = ?');
            params.push('error');
        }
        
        if (fechaDesde) {
            whereConditions.push('fecha_creacion >= ?');
            params.push(fechaDesde);
        }
        
        if (fechaHasta) {
            whereConditions.push('fecha_creacion <= ?');
            params.push(fechaHasta);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT 
                id, numero_orden, estado, total, fecha_creacion,
                tns_kardex_id, tns_numero, tns_sincronizado,
                tns_fecha_sincronizacion, tns_error_message
            FROM ordenes 
            ${whereClause}
            ORDER BY fecha_creacion DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        const { executeQuery } = require('../config/database');
        const ordenes = await executeQuery(query, params);
        
        // Contar total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM ordenes 
            ${whereClause}
        `;
        const totalResult = await executeQuery(countQuery, params);
        const total = totalResult[0].total;
        
        res.json({
            success: true,
            data: ordenes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo estado de migración:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
});

// PUT /api/orders/:id/retry-migration - Reintentar migración de orden con error
router.put('/:id/retry-migration', validateOrderId, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            usuario = 'MOBILE_RETRY',
            codprefijo = 'PA',
            codcomp = 'PV',
            sucid = 1
        } = req.body;
        
        // Verificar que la orden tiene error
        const { executeQuery } = require('../config/database');
        const ordenQuery = `
            SELECT tns_sincronizado, tns_error_message
            FROM ordenes 
            WHERE id = ?
        `;
        
        const ordenes = await executeQuery(ordenQuery, [id]);
        if (!ordenes || ordenes.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'ORDER_NOT_FOUND',
                message: 'Orden no encontrada'
            });
        }
        
        const orden = ordenes[0];
        if (orden.tns_sincronizado !== 'error') {
            return res.status(400).json({
                success: false,
                error: 'INVALID_STATE',
                message: 'La orden no tiene errores de migración'
            });
        }
        
        const options = {
            usuario,
            codprefijo,
            codcomp,
            sucid,
            iniciarPreparacion: false
        };
        
        const resultado = await orderMigrationService.migrateOrderToTNS(id, options);
        
        res.json({
            success: true,
            message: 'Migración reintentada exitosamente',
            data: {
                ordenId: id,
                tnsKardexId: resultado.kardexId,
                tnsNumero: resultado.numero,
                estado: 'MIGRADO_EXITOSO'
            }
        });
        
    } catch (error) {
        console.error('Error reintentando migración:', error);
        
        if (error.message.includes('no encontrada')) {
            return res.status(404).json({
                success: false,
                error: 'ORDER_NOT_FOUND',
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
