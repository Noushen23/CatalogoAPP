const axios = require('axios');
const config = require('../config/env');

// Cliente HTTP para consultar materiales en TNS via Apimaterial
const apimaterialClient = axios.create({
  baseURL: config.apimaterial.url,
  timeout: config.apimaterial.timeout,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apimaterial.token}`,
  },
});

// Obtener material por MATID con precios incluidos
const getMaterialById = async (matid, conPrecios = true) => {
  if (!matid) return null;
  const response = await apimaterialClient.get(`/api/materiales/${matid}`, {
    params: { conPrecios: conPrecios ? 'true' : 'false' },
  });
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Error consultando material por ID');
  }
  const data = response.data?.data;
  return Array.isArray(data) ? data[0] : data;
};

// Obtener material por código (ej: DOMICILIO) con precios incluidos
const getMaterialByCodigo = async (codigo, conPrecios = true) => {
  if (!codigo) return null;
  const response = await apimaterialClient.get(`/api/materiales/codigo/${encodeURIComponent(codigo)}`, {
    params: { conPrecios: conPrecios ? 'true' : 'false' },
  });
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Error consultando material por código');
  }
  const data = response.data?.data;
  return Array.isArray(data) ? data[0] : data;
};

module.exports = {
  getMaterialById,
  getMaterialByCodigo,
};
