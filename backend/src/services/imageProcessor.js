const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor() {
    this.supportedFormats = ['jpeg', 'png', 'webp', 'gif'];
    this.maxWidth = 1200;
    this.maxHeight = 1200;
    this.quality = 85;
  }

  /**
   * Procesar una imagen con Sharp
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} outputPath - Ruta del archivo de salida
   * @param {Object} options - Opciones de procesamiento
   */
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = this.maxWidth,
        height = this.maxHeight,
        quality = this.quality,
        format = 'jpeg'
      } = options;

      // Verificar que el archivo existe
      await fs.access(inputPath);

      // Crear directorio de salida si no existe
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Procesar imagen con Sharp
      let processor = sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });

      // Aplicar formato específico
      if (format === 'webp') {
        processor = processor.webp({ quality });
      } else if (format === 'png') {
        processor = processor.png({ quality });
      } else {
        processor = processor.jpeg({ quality });
      }

      // Guardar imagen procesada
      await processor.toFile(outputPath);

      // Obtener metadatos de la imagen procesada
      const metadata = await sharp(outputPath).metadata();

      return {
        success: true,
        outputPath,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          format: metadata.format
        }
      };

    } catch (error) {
      console.error('Error procesando imagen:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear múltiples tamaños de una imagen (thumbnail, medium, large)
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} baseOutputPath - Ruta base para los archivos de salida
   */
  async createMultipleSizes(inputPath, baseOutputPath) {
    try {
      const sizes = [
        { suffix: '_thumb', width: 150, height: 150 },
        { suffix: '_medium', width: 400, height: 400 },
        { suffix: '_large', width: 800, height: 800 }
      ];

      const results = [];

      for (const size of sizes) {
        const ext = path.extname(baseOutputPath);
        const nameWithoutExt = path.basename(baseOutputPath, ext);
        const dir = path.dirname(baseOutputPath);
        const outputPath = path.join(dir, `${nameWithoutExt}${size.suffix}${ext}`);

        const result = await this.processImage(inputPath, outputPath, {
          width: size.width,
          height: size.height
        });

        results.push({
          size: size.suffix,
          ...result
        });
      }

      return results;

    } catch (error) {
      console.error('Error creando múltiples tamaños:', error);
      return [];
    }
  }

  /**
   * Validar si un archivo es una imagen válida
   * @param {string} filePath - Ruta del archivo
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        isValid: this.supportedFormats.includes(metadata.format),
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Optimizar imagen manteniendo calidad pero reduciendo tamaño
   * @param {string} inputPath - Ruta del archivo de entrada
   * @param {string} outputPath - Ruta del archivo de salida
   */
  async optimizeImage(inputPath, outputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // Determinar calidad basada en el tamaño original
      let quality = this.quality;
      if (metadata.size > 1024 * 1024) { // > 1MB
        quality = 75;
      } else if (metadata.size > 512 * 1024) { // > 512KB
        quality = 80;
      }

      return await this.processImage(inputPath, outputPath, {
        quality,
        format: metadata.format
      });

    } catch (error) {
      console.error('Error optimizando imagen:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ImageProcessor();
