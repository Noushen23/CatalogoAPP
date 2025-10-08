/**
 * API de Materiales TNS - ULTRA SIMPLE - SOLO LECTURA
 * Solo lo esencial para consultar materiales
 */

const express = require('express');
const cors = require('cors');
const { executeQuery } = require('./config/database');

const app = express();

// Configuración básica
app.use(cors());
app.use(express.json());

// Token de autenticación simple
const API_TOKEN = process.env.API_BEARER_TOKEN || 'angeldavidcapa2025';

// Middleware de autenticación básico
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token requerido' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== API_TOKEN) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token inválido' 
        });
    }
    
    next();
};

// Rutas principales
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Materiales TNS - Solo Lectura',
        endpoints: {
            materiales: '/api/materiales',
            materialById: '/api/materiales/:id',
            materialByCodigo: '/api/materiales/codigo/:codigo'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'OK',
        mode: 'READ-ONLY'
    });
});

// GET /api/materiales - Obtener todos los materiales
app.get('/api/materiales', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search, activo, conPrecios } = req.query;
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        
        let whereConditions = [];
        let params = [];
        
        if (search) {
            const searchTerm = search.trim();
            const searchConditions = [];
            
            // Para DESCRIP (VARCHAR 250) - búsqueda completa con wildcards
            if (searchTerm.length <= 248) { // 250 - 2 (para los %)
                searchConditions.push("M.DESCRIP LIKE ?");
                params.push(`%${searchTerm}%`);
            }
            
            // Para CODIGO (VARCHAR 25) - búsqueda más restrictiva
            if (searchTerm.length <= 23) { // 25 - 2 (para los %)
                searchConditions.push("M.CODIGO LIKE ?");
                params.push(`%${searchTerm}%`);
            } else if (searchTerm.length <= 25) {
                // Búsqueda exacta sin wildcards si es muy largo
                searchConditions.push("M.CODIGO = ?");
                params.push(searchTerm);
            }
            
            if (searchConditions.length > 0) {
                whereConditions.push(`(${searchConditions.join(' OR ')})`);
            }
        }
        
        if (activo && (activo === 'S' || activo === 'N')) {
            whereConditions.push("MS.INACTIVO = ?");
            params.push(activo.trim().toUpperCase());
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Contar total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM MATERIAL M
            LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
            ${whereClause}
        `;
        const totalResult = await executeQuery(countQuery, params);
        const total = totalResult[0].TOTAL;
        
        // Query principal
        let query = `
            SELECT FIRST ${limitNum} SKIP ${offset}
                M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD,
                M.GRUPMATID, M.TIPOIVAID, MS.INACTIVO, MS.OBSERV, S.NOMSUC as SUCURSAL_NOMBRE
            FROM MATERIAL M
            LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
            LEFT JOIN SUCURSAL S ON MS.SUCID = S.SUCID
            ${whereClause}
            ORDER BY M.DESCRIP ASC
        `;
        
        // Si se solicitan precios
        if (conPrecios === 'true') {
            query = `
                SELECT FIRST ${limitNum} SKIP ${offset}
                    M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD, M.GRUPMATID, 
                    M.TIPOIVAID, MS.INACTIVO, MS.OBSERV,
                    COALESCE(MS.PRECIO1, 0) as PRECIO1,
                    COALESCE(MS.PRECIO2, 0) as PRECIO2,
                    COALESCE(MS.PRECIO3, 0) as PRECIO3,
                    S.NOMSUC as SUCURSAL_NOMBRE
                FROM MATERIAL M
                LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
                LEFT JOIN SUCURSAL S ON MS.SUCID = S.SUCID
                ${whereClause}
                ORDER BY M.DESCRIP ASC
            `;
        }
        
        const materiales = await executeQuery(query, params);
        
        const totalPages = Math.ceil(total / limitNum);
        
        res.json({
            success: true,
            data: materiales,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
        
    } catch (error) {
        console.error('Error detallado:', {
            message: error.message,
            code: error.gdscode,
            query: error.query || 'No query info',
            params: error.params || 'No params info'
        });
        res.status(500).json({
            success: false,
            message: 'Error obteniendo materiales',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/materiales/:id - Obtener material por ID
app.get('/api/materiales/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { conPrecios } = req.query;
        
        const idNum = parseInt(id);
        if (!idNum || idNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID inválido'
            });
        }
        
        let query = `
            SELECT M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD, M.GRUPMATID, 
                   MS.INACTIVO, M.TIPOIVAID, MS.OBSERV
            FROM MATERIAL M
            LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
            WHERE M.MATID = ?
        `;
        
        if (conPrecios === 'true') {
            query = `
                SELECT M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD, M.GRUPMATID, 
                       MS.INACTIVO, M.TIPOIVAID, MS.OBSERV,
                       COALESCE(MS.PRECIO1, 0) as PRECIO1,
                       COALESCE(MS.PRECIO2, 0) as PRECIO2,
                       COALESCE(MS.PRECIO3, 0) as PRECIO3,
                       S.NOMSUC as SUCURSAL_NOMBRE
                FROM MATERIAL M
                LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
                LEFT JOIN SUCURSAL S ON MS.SUCID = S.SUCID
                WHERE M.MATID = ?
            `;
        }
        
        const material = await executeQuery(query, [idNum]);
        
        if (!material || material.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: conPrecios === 'true' ? material : material[0]
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo material'
        });
    }
});

// GET /api/materiales/codigo/:codigo - Obtener material por código
app.get('/api/materiales/codigo/:codigo', auth, async (req, res) => {
    try {
        const { codigo } = req.params;
        const { conPrecios } = req.query;
        
        const codigoTrim = codigo.trim();
        if (!codigoTrim || codigoTrim === '') {
            return res.status(400).json({
                success: false,
                message: 'Código inválido'
            });
        }
        
        if (codigoTrim.length > 25) {
            return res.status(400).json({
                success: false,
                message: 'Código demasiado largo (máximo 25 caracteres)'
            });
        }
        
        let query = `
            SELECT M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD, M.GRUPMATID, 
                   MS.INACTIVO, M.TIPOIVAID, MS.OBSERV
            FROM MATERIAL M
            LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
            WHERE UPPER(M.CODIGO) = UPPER(?)
        `;
        
        if (conPrecios === 'true') {
            query = `
                SELECT M.MATID, M.CODIGO, M.DESCRIP, M.UNIDAD, M.GRUPMATID, 
                       MS.INACTIVO, M.TIPOIVAID, MS.OBSERV, 
                       COALESCE(MS.PRECIO1, 0) as PRECIO1,
                       COALESCE(MS.PRECIO2, 0) as PRECIO2,
                       COALESCE(MS.PRECIO3, 0) as PRECIO3,
                       S.NOMSUC as SUCURSAL_NOMBRE
                FROM MATERIAL M
                LEFT JOIN MATERIALSUC MS ON M.MATID = MS.MATID
                LEFT JOIN SUCURSAL S ON MS.SUCID = S.SUCID
                WHERE UPPER(M.CODIGO) = UPPER(?)
            `;
        }
        
        const material = await executeQuery(query, [codigoTrim]);
        
        if (!material || material.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: conPrecios === 'true' ? material : material[0]
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo material'
        });
    }
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 51250;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║               API MATERIALES TNS - ULTRA SIMPLE           ║
╠════════════════════════════════════════════════════════════╣
║ 🚀 Servidor: http://${HOST}:${PORT}                      ║
║ 📖 Modo: SOLO LECTURA                                     ║
║                                                            ║
║ ENDPOINTS:                                                 ║
║ • GET /api/materiales           - Todos los materiales    ║
║ • GET /api/materiales/:id       - Material por ID         ║
║ • GET /api/materiales/codigo/:codigo - Material por código║
║                                                            ║
║ 💡 Token: ${API_TOKEN}                    ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;