// Lista de precio por defecto (última lista definida)
const DEFAULT_PRICE_LIST = 5;

// Normalizar ciudad para comparaciones consistentes
const normalizeCity = (city) => {
  if (!city) return '';
  return String(city)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Resolver lista de precio según la ciudad de entrega
const getPriceListByCity = (city) => {
  const normalized = normalizeCity(city);
  if (!normalized) return DEFAULT_PRICE_LIST;

  // Reglas directas por ciudad (ajustar aquí el mapa completo)
  if (normalized.includes('CUCUTA')) return 1;
  if (normalized.includes('VILLA DEL ROSARIO')) return 2;
  if (normalized.includes('LOS PATIOS')) return 3;
  if (normalized.includes('EL ZULIA')) return 4;
  if (normalized.includes('FUERA DE CUCUTA')) return 5;

  return DEFAULT_PRICE_LIST;
};

module.exports = {
  DEFAULT_PRICE_LIST,
  normalizeCity,
  getPriceListByCity,
};
