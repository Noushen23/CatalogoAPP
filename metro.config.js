const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configurar alias para rutas
config.resolver.alias = {
  '@': './',
};

module.exports = config;
