/**
 * API de Materiales TNS - VERSIÓN SIMPLIFICADA PARA DEMOSTRACIÓN
 * Funciona sin base de datos Firebird para propósitos de integración
 */

const express = require('express');
const cors = require('cors');

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

// Datos de ejemplo para demostración
const materialesEjemplo = [
    {
        MATID: 1,
        CODIGO: 'MAT001',
        DESCRIP: 'Material de ejemplo 1',
        UNIDAD: 'UN',
        GRUPMATID: 1,
        TIPOIVAID: 1,
        INACTIVO: 'N',
        OBSERV: 'Material de prueba',
        SUCURSAL_NOMBRE: 'Sucursal Principal',
        PRECIO1: 10000,
        PRECIO2: 9000,
        PRECIO3: 8000
    },
    {
        MATID: 2,
        CODIGO: 'MAT002',
        DESCRIP: 'Material de ejemplo 2',
        UNIDAD: 'KG',
        GRUPMATID: 2,
        TIPOIVAID: 1,
        INACTIVO: 'N',
        OBSERV: 'Material de prueba 2',
        SUCURSAL_NOMBRE: 'Sucursal Principal',
        PRECIO1: 25000,
        PRECIO2: 22000,
        PRECIO3: 20000
    },
    {
        MATID: 3,
        CODIGO: 'MAT003',
        DESCRIP: 'Material de ejemplo 3',
        UNIDAD: 'M',
        GRUPMATID: 1,
        TIPOIVAID: 1,
        INACTIVO: 'S',
        OBSERV: 'Material inactivo',
        SUCURSAL_NOMBRE: 'Sucursal Principal',
        PRECIO1: 5000,
        PRECIO2: 4500,
        PRECIO3: 4000
    },
    {
        MATID: 4,
        CODIGO: 'MAT004',
        DESCRIP: 'Material de construcción',
        UNIDAD: 'UN',
        GRUPMATID: 3,
        TIPOIVAID: 1,
        INACTIVO: 'N',
        OBSERV: 'Material para construcción',
        SUCURSAL_NOMBRE: 'Sucursal Principal',
        PRECIO1: 15000,
        PRECIO2: 13500,
        PRECIO3: 12000
    },
    {
        MATID: 5,
        CODIGO: 'MAT005',
        DESCRIP: 'Material eléctrico',
        UNIDAD: 'UN',
        GRUPMATID: 4,
        TIPOIVAID: 1,
        INACTIVO: 'N',
        OBSERV: 'Material eléctrico',
        SUCURSAL_NOMBRE: 'Sucursal Principal',
        PRECIO1: 30000,
        PRECIO2: 27000,
        PRECIO3: 25000
    }
];

// Función para filtrar materiales
const filtrarMateriales = (materiales, filtros) => {
    let resultado = [...materiales];
    
    // Filtro por búsqueda
    if (filtros.search) {
        const searchTerm = filtros.search.toLowerCase();
        resultado = resultado.filter(m => 
            m.CODIGO.toLowerCase().includes(searchTerm) ||
            m.DESCRIP.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtro por estado
    if (filtros.activo) {
        resultado = resultado.filter(m => m.INACTIVO === filtros.activo);
    }
    
    return resultado;
};

// Función para paginar resultados
const paginarResultados = (materiales, page, limit) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = materiales.slice(startIndex, endIndex);
    
    return {
        data: paginatedData,
        pagination: {
            page,
            limit,
            total: materiales.length,
            totalPages: Math.ceil(materiales.length / limit),
            hasNext: endIndex < materiales.length,
            hasPrev: page > 1
        }
    };
};

// Rutas principales
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Materiales TNS - Versión Simplificada',
        endpoints: {
            materiales: '/api/materiales',
            materialById: '/api/materiales/:id',
            materialByCodigo: '/api/materiales/codigo/:codigo'
        },
        note: 'Esta es una versión de demostración con datos de ejemplo'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'OK',
        mode: 'DEMO-MODE',
        message: 'API funcionando correctamente (modo demostración)'
    });
});

// GET /api/materiales - Obtener todos los materiales
app.get('/api/materiales', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search, activo, conPrecios } = req.query;
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
        
        // Filtrar materiales
        const materialesFiltrados = filtrarMateriales(materialesEjemplo, {
            search,
            activo
        });
        
        // Paginar resultados
        const resultado = paginarResultados(materialesFiltrados, pageNum, limitNum);
        
        // Si no se solicitan precios, remover campos de precio
        if (conPrecios !== 'true') {
            resultado.data = resultado.data.map(m => {
                const { PRECIO1, PRECIO2, PRECIO3, ...sinPrecios } = m;
                return sinPrecios;
            });
        }
        
        res.json({
            success: true,
            data: resultado.data,
            pagination: resultado.pagination,
            message: `Se encontraron ${resultado.data.length} materiales`
        });
        
    } catch (error) {
        console.error('Error:', error);
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
        
        const material = materialesEjemplo.find(m => m.MATID === idNum);
        
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material no encontrado'
            });
        }
        
        let resultado = material;
        if (conPrecios !== 'true') {
            const { PRECIO1, PRECIO2, PRECIO3, ...sinPrecios } = material;
            resultado = sinPrecios;
        }
        
        res.json({
            success: true,
            data: resultado
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
        
        const material = materialesEjemplo.find(m => 
            m.CODIGO.toLowerCase() === codigoTrim.toLowerCase()
        );
        
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material no encontrado'
            });
        }
        
        let resultado = material;
        if (conPrecios !== 'true') {
            const { PRECIO1, PRECIO2, PRECIO3, ...sinPrecios } = material;
            resultado = sinPrecios;
        }
        
        res.json({
            success: true,
            data: resultado
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
║               API MATERIALES TNS - DEMO MODE             ║
╠════════════════════════════════════════════════════════════╣
║ 🚀 Servidor: http://${HOST}:${PORT}                      ║
║ 📖 Modo: DEMOSTRACIÓN (datos de ejemplo)                 ║
║                                                            ║
║ ENDPOINTS:                                                 ║
║ • GET /api/materiales           - Todos los materiales    ║
║ • GET /api/materiales/:id       - Material por ID         ║
║ • GET /api/materiales/codigo/:codigo - Material por código║
║                                                            ║
║ 💡 Token: ${API_TOKEN}                    ║
║ 📊 Materiales de ejemplo: ${materialesEjemplo.length}                    ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;















