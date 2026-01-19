const config = require('../config/env');

/**
 * Helper para manejar URLs de imágenes de manera consistente
 */
class ImageHelper {
  /**
   * Valida y limpia una ruta de imagen del servidor
   * @param {string} imagePath - Ruta relativa de la imagen
   * @returns {string|null} Ruta válida o null si es inválida
   */
  static validateAndCleanImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
      return null;
    }

    const cleanedPath = imagePath.trim();
    
    if (!cleanedPath) {
      return null;
    }

    // Normalizar ruta: asegurar que comience con /
    return cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
  }

  /**
   * Construye la URL completa de una imagen desde ruta relativa del servidor
   * @param {string} imagePath - Ruta relativa de la imagen (ej: /uploads/products/123/imagen.jpg)
   * @returns {string|null} URL completa de la imagen o null si es inválida
   */
  static buildImageUrl(imagePath) {
    console.log('🔗 [ImageHelper.buildImageUrl] Iniciando construcción de URL:', { imagePath });
    
    if (!imagePath || typeof imagePath !== 'string') {
      console.warn('⚠️ [ImageHelper.buildImageUrl] Ruta inválida:', { imagePath, type: typeof imagePath });
      return null;
    }

    // Limpiar espacios
    const cleanPath = imagePath.trim();
    
    if (!cleanPath) {
      console.warn('⚠️ [ImageHelper.buildImageUrl] Ruta vacía después de trim');
      return null;
    }

    // Asegurar que la ruta comience con /
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    // Obtener base URL del servidor (SIEMPRE IP pública)
    const baseUrl = config.apiBaseUrl || 'http://192.168.3.104:3001';
    
    // Validar que estamos usando IP pública (no local)
    if (baseUrl.includes('192.168.') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.warn('⚠️ [ImageHelper.buildImageUrl] ADVERTENCIA: Se está usando IP local en lugar de pública:', baseUrl);
      console.warn('⚠️ [ImageHelper.buildImageUrl] Forzando uso de IP pública: http://192.168.3.104:3001');
      // Forzar IP pública si detectamos IP local:
      const puerto = baseUrl.split(':').pop() || '3001';
      return `http://192.168.3.104:${puerto}${normalizedPath}`;
    }
    
    // Construir URL final: baseUrl + ruta normalizada
    const finalUrl = `${baseUrl}${normalizedPath}`;
    
    console.log('✅ [ImageHelper.buildImageUrl] URL construida:', { 
      rutaOriginal: imagePath, 
      rutaNormalizada: normalizedPath, 
      baseUrl, 
      urlFinal: finalUrl,
      usandoIPPublica: baseUrl.includes('192.168.3.104')
    });
    
    return finalUrl;
  }

  /**
   * Formatea un array de imágenes con URLs completas
   * @param {Array} images - Array de objetos imagen
   * @returns {Array} Array de imágenes con URLs formateadas
   */
  static formatImages(images) {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.map(img => ({
      ...img,
      url: this.buildImageUrl(img.url || img.url_imagen)
    }));
  }

  /**
   * Formatea una imagen única con URL completa
   * @param {Object} image - Objeto imagen
   * @returns {Object|null} Imagen formateada o null
   */
  static formatSingleImage(image) {
    if (!image) {
      return null;
    }

    return {
      ...image,
      url: this.buildImageUrl(image.url || image.url_imagen)
    };
  }

  /**
   * Obtiene la primera imagen de un producto
   * @param {Array} images - Array de imágenes
   * @returns {Object|null} Primera imagen o null
   */
  static getFirstImage(images) {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }

    return this.formatSingleImage(images[0]);
  }

  /**
   * Obtiene la imagen principal de un producto
   * @param {Array} images - Array de imágenes
   * @returns {Object|null} Imagen principal o null
   */
  static getMainImage(images) {
    if (!Array.isArray(images)) {
      return null;
    }

    const mainImage = images.find(img => img.es_principal === true || img.es_principal === 1);
    
    if (mainImage) {
      return this.formatSingleImage(mainImage);
    }

    // Si no hay imagen principal, devolver la primera
    return this.getFirstImage(images);
  }

  /**
   * Valida si una URL de imagen es válida
   * @param {string} url - URL a validar
   * @returns {boolean} True si es válida
   */
  static isValidImageUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Verificar que sea una URL válida
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la URL base de la API (IP pública)
   * @returns {string} URL base
   */
  static getBaseUrl() {
    return config.apiBaseUrl || config.app.url || 'http://192.168.3.104:3001';
  }

  /**
   * Convierte una ruta de archivo en URL accesible
   * @param {string} filePath - Ruta del archivo
   * @returns {string} URL del archivo
   */
  static filePathToUrl(filePath) {
    if (!filePath) {
      return null;
    }

    // Convertir ruta de archivo a URL
    // Ejemplo: ./uploads/products/image.jpg -> /uploads/products/image.jpg
    const urlPath = filePath.replace(/^\./, '').replace(/\\/g, '/');
    
    return this.buildImageUrl(urlPath);
  }

  /**
   * Formatea una imagen de producto: convierte ruta relativa en URL completa del servidor
   * @param {Object} img - Objeto imagen de la BD con id, url_imagen, orden, es_principal
   * @returns {Object|null} Imagen formateada o null si es inválida
   */
  static formatProductImage(img) {
    console.log('🖼️ [ImageHelper.formatProductImage] Procesando imagen:', { 
      id: img?.id, 
      url_imagen: img?.url_imagen,
      orden: img?.orden,
      es_principal: img?.es_principal
    });
    
    if (!img || !img.url_imagen) {
      console.warn('⚠️ [ImageHelper.formatProductImage] Imagen o url_imagen faltante:', { img: !!img, url_imagen: !!img?.url_imagen });
      return null;
    }

    // Validar que url_imagen sea string válido
    if (typeof img.url_imagen !== 'string') {
      console.warn('⚠️ [ImageHelper.formatProductImage] url_imagen no es string:', { 
        type: typeof img.url_imagen, 
        value: img.url_imagen 
      });
      return null;
    }

    // Limpiar ruta
    const imagePath = img.url_imagen.trim();
    
    if (!imagePath) {
      console.warn('⚠️ [ImageHelper.formatProductImage] Ruta vacía después de trim');
      return null;
    }

    // Construir URL completa desde ruta relativa del servidor
    const fullUrl = this.buildImageUrl(imagePath);

    if (!fullUrl) {
      console.error('❌ [ImageHelper.formatProductImage] No se pudo construir URL completa');
      return null;
    }

    const formattedImage = {
      id: img.id,
      urlImagen: fullUrl,
      url: fullUrl,
      url_imagen: fullUrl,
      orden: img.orden || 0,
      es_principal: Boolean(img.es_principal),
      esPrincipal: Boolean(img.es_principal)
    };
    
    console.log('✅ [ImageHelper.formatProductImage] Imagen formateada exitosamente:', {
      id: formattedImage.id,
      urlFinal: formattedImage.urlImagen,
      orden: formattedImage.orden,
      esPrincipal: formattedImage.es_principal
    });

    return formattedImage;
  }

  /**
   * Formatea un array de imágenes de producto con URLs completas
   * @param {Array} images - Array de objetos imagen de la BD
   * @returns {Array} Array de imágenes formateadas (sin nulls)
   */
  static formatProductImages(images) {
    console.log('📸 [ImageHelper.formatProductImages] Iniciando formateo de imágenes:', {
      totalImagenes: Array.isArray(images) ? images.length : 0,
      esArray: Array.isArray(images)
    });
    
    if (!Array.isArray(images)) {
      console.warn('⚠️ [ImageHelper.formatProductImages] No es un array:', typeof images);
      return [];
    }

    if (images.length === 0) {
      console.log('📭 [ImageHelper.formatProductImages] Array vacío, retornando []');
      return [];
    }

    const formattedImages = images
      .map((img, index) => {
        console.log(`🔄 [ImageHelper.formatProductImages] Procesando imagen ${index + 1}/${images.length}`);
        return this.formatProductImage(img);
      })
      .filter(img => img !== null);
    
    console.log('✅ [ImageHelper.formatProductImages] Formateo completado:', {
      totalRecibidas: images.length,
      totalFormateadas: formattedImages.length,
      totalFiltradas: images.length - formattedImages.length
    });

    return formattedImages;
  }
}

module.exports = ImageHelper;
