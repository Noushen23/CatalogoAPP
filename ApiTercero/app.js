/**
 * API de Terceros TNS - Solo Lectura
 * Consulta de terceros, ciudades y zonas del sistema TNS
 */

const express = require('express');
const cors = require('cors');
const { executeQuery } = require('./config/database');
const { authenticate, API_TOKEN } = require('./middleware/auth');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const { buildPaginationParams, buildPaginationResponse } = require('./utils/dataUtils');

const app = express();

// Configuración básica
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Importar rutas
const ciudadesRouter = require('./Ciudades/ciudades');
const zonasRouter = require('./Zonas/Zonas');
const tercerosController = require('./controllers/terceroController');
const terceroSelfController = require('./controllers/terceroSelfController');
const syncController = require('./controllers/syncController');
const mobileRouter = require('./routes/mobile');

// Configurar rutas
app.use('/api/ciudades', ciudadesRouter);
app.use('/api/zonas', zonasRouter);
app.use('/api/terceros', tercerosController);
app.use('/api/terceros-self', terceroSelfController);
app.use('/api/sync', syncController);
app.use('/api/mobile', mobileRouter);

// Rutas principales
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Terceros TNS - Solo Lectura',
        endpoints: {
            // Terceros
            terceros: '/api/terceros',
            terceroById: '/api/terceros/:id',
            vendedores: '/api/terceros/vendedores',
            // Terceros Self
            tercerosSelf: '/api/terceros-self',
            terceroSelfById: '/api/terceros-self/:terid',
            // Ciudades
            ciudades: '/api/ciudades',
            ciudadById: '/api/ciudades/:id',
            ciudadByCodigo: '/api/ciudades/codigo/:codigo',
            departamentos: '/api/ciudades/departamentos/lista',
            // Zonas
            zonas: '/api/zonas',
            zonaById: '/api/zonas/:id',
            zonaByCodigo: '/api/zonas/codigo/:codigo',
            // Sincronización MySQL -> TNS
            syncUsuarios: '/api/sync/usuarios',
            syncCiudades: '/api/sync/ciudades',
            syncStatus: '/api/sync/usuarios/status',
            syncSingle: '/api/sync/usuarios/single'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'OK',
        mode: 'CRUD-TERCEROS'
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);


// Importar configuración
const config = require('./config/app.config');

// Iniciar servidor
const PORT = process.env.PORT || config.server.port;
const HOST = process.env.HOST || config.server.host;



app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║               API TERCEROS TNS - SOLO LECTURA             ║
╠════════════════════════════════════════════════════════════╣
║ 🚀 Servidor: http://${HOST}:${PORT}                      ║
║ 🔧 Modo: CRUD TERCEROS + SINCRONIZACIÓN                   ║
║                                                           ║
║                                                            ║
║ ENDPOINTS TERCEROS:                                        ║
║ • GET    /api/terceros          - Todos los terceros      ║
║ • GET    /api/terceros/:id      - Tercero por ID          ║
║ • GET    /api/terceros/vendedores - Solo vendedores       ║
║ • POST   /api/terceros          - Crear tercero           ║
║                                                            ║
║ ENDPOINTS TERCEROS-SELF:                                   ║
║ • GET    /api/terceros-self/:terid - TerceroSelf por ID   ║
║ • POST   /api/terceros-self     - Crear/actualizar self   ║
║                                                            ║
║ ENDPOINTS CIUDADES (CIUDANE):                              ║
║ • GET    /api/ciudades          - Todas las ciudades      ║
║ • GET    /api/ciudades/:id      - Ciudad por ID           ║
║ • GET    /api/ciudades/codigo/:codigo - Ciudad por código ║
║ • POST   /api/ciudades          - Crear ciudad            ║
║ • PUT    /api/ciudades/:id      - Actualizar ciudad       ║
║ • DELETE /api/ciudades/:id      - Eliminar ciudad         ║
║ • GET    /api/ciudades/departamentos/lista - Departamentos║
║                                                            ║
║ ENDPOINTS ZONAS (ZONAS):                                   ║
║ • GET    /api/zonas             - Todas las zonas         ║
║ • GET    /api/zonas/:id         - Zona por ID             ║
║ • GET    /api/zonas/codigo/:codigo - Zona por código      ║
║ • POST   /api/zonas             - Crear zona              ║
║ • PUT    /api/zonas/:id         - Actualizar zona         ║
║ • DELETE /api/zonas/:id         - Eliminar zona           ║
║                                                            ║
║ ENDPOINTS SINCRONIZACIÓN:                                 ║
║ • POST   /api/sync/usuarios     - Sincronizar usuarios    ║
║ • GET    /api/sync/usuarios/status - Estado sincronización║
║ • POST   /api/sync/usuarios/single - Sincronizar uno      ║
║                                                            ║
║ 💡 Token: ${API_TOKEN}                    ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
