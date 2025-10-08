/**
 * Test simple para validar la API ultra simplificada
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:51250';
const API_TOKEN = 'angeldavidcapa2025';

// Función para hacer requests
async function testAPI(endpoint, description) {
    try {
        console.log(`🧪 Probando: ${description}`);
        
        const config = {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        };
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, config);
        
        if (response.status === 200) {
            console.log(`✅ OK: ${description}`);
            if (response.data.data) {
                if (Array.isArray(response.data.data)) {
                    console.log(`   📊 Encontrados: ${response.data.data.length} items`);
                } else {
                    console.log(`   📦 Item: ${response.data.data.CODIGO || 'N/A'}`);
                }
            }
        } else {
            console.log(`❌ Error: ${description} - Status: ${response.status}`);
        }
        
        return response.status === 200;
    } catch (error) {
        if (error.response) {
            console.log(`❌ Error: ${description} - ${error.response.status}: ${error.response.data?.message || error.message}`);
        } else {
            console.log(`❌ Error de conexión: ${description} - ${error.message}`);
        }
        return false;
    }
}

// Función principal de pruebas
async function runTests() {
    console.log('\n🔍 VALIDANDO API ULTRA SIMPLE\n');
    console.log('='.repeat(50));
    
    const tests = [
        { endpoint: '/health', desc: 'Health Check (sin auth)' },
        { endpoint: '/api/materiales?limit=5', desc: 'Listar materiales (5 items)' },
        { endpoint: '/api/materiales?page=1&limit=3', desc: 'Paginación básica' },
        { endpoint: '/api/materiales?search=BROCHA SECURITY 1.1/2 PULG', desc: 'Búsqueda por texto' },
        { endpoint: '/api/materiales?activo=S', desc: 'Filtrar solo activos' },
        { endpoint: '/api/materiales?conPrecios=true&limit=2', desc: 'Con precios incluidos' },
        { endpoint: '/api/materiales/21', desc: 'Material por ID=21' },
        { endpoint: '/api/materiales/codigo/13010104', desc: 'Material por código' }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
        const result = await testAPI(test.endpoint, test.desc);
        if (result) passed++;
        console.log(''); // Línea en blanco
    }
    
    console.log('='.repeat(50));
    console.log(`📊 Resultados: ${passed}/${tests.length} pruebas exitosas`);
    
    if (passed === tests.length) {
        console.log('🎉 ¡API funcionando perfectamente!');
    } else if (passed > 0) {
        console.log('⚠️ API funcionando parcialmente');
    } else {
        console.log('❌ API no responde - verificar configuración');
    }
    
    return passed;
}

// Función para verificar servidor
async function checkServer() {
    try {
        const response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
        console.log('✅ Servidor disponible');
        return true;
    } catch (error) {
        console.log('❌ Servidor no disponible');
        console.log('💡 Para iniciar: npm start');
        return false;
    }
}

// Ejecutar
async function main() {
    console.log('🚀 Verificando disponibilidad del servidor...');
    
    const serverOK = await checkServer();
    if (!serverOK) {
        process.exit(1);
    }
    
    const results = await runTests();
    process.exit(results > 0 ? 0 : 1);
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runTests, checkServer };

