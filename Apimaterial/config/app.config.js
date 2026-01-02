/**
 * Configuración centralizada de la aplicación
 * Plataforma Web de Pedidos de Venta - TNS
 */

module.exports = {
    // Configuración del servidor
    server: {
        port: process.env.PORT || 51250,
        host: process.env.HOST || '192.168.3.6',
        environment: process.env.NODE_ENV || 'development'
    },

    // Configuración de la base de datos
    database: {
        firebird: {
            host: process.env.FIREBIRD_HOST || '192.168.3.104',
            port: process.env.FIREBIRD_PORT || 3050,
            database: process.env.FIREBIRD_DATABASE || 'C:/Datos_TNS/PRUEBA.GDB',
            user: process.env.FIREBIRD_USER || 'SYSDBA',
            password: process.env.FIREBIRD_PASSWORD || 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096,
            retryConnectionInterval: 1000,
            blobAsText: false,
            encoding: 'UTF-8'
        }
    },

    // Configuración de seguridad
    security: {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        },
        api: {
            // Token para autenticación simple vía Bearer; preferir JWT en producción
            bearerToken: process.env.API_BEARER_TOKEN || null
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'self'"]
                }
            }
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por ventana
            message: {
                error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
            }
        }
    },


    // Configuración de logs
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
    },

    // Configuración de endpoints
    endpoints: {
        api: {
            base: '/api',
            pedidoVenta: '/pedido-venta',
            terceros: '/terceros'
        }
    },

    // Configuración de validaciones
    validation: {
        pedido: {
            maxLineas: 100,
            maxObservaciones: 500,
            monedasPermitidas: ['COP', 'USD', 'EUR'],
            formasPago: ['CO', 'CR', 'TR']
        }
    }
};


