const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/categories';
    
    // Crear directorio si no existe
    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch (error) {
      // El directorio ya existe o error de permisos
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `category-${uniqueSuffix}${extension}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Solo permitir imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: fileFilter
});

// Middleware para subir una imagen
const uploadSingle = upload.single('image');

// Middleware wrapper para manejar errores
const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Máximo 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error al subir el archivo: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Función para guardar imagen desde base64
const saveBase64Image = async (base64Data, categoryName) => {
  try {
    // Crear directorio si no existe
    const uploadPath = 'uploads/categories';
    await fs.mkdir(uploadPath, { recursive: true });

    // Extraer datos de la imagen base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato de imagen base64 inválido');
    }

    const imageType = matches[1];
    const imageData = matches[2];
    
    // Determinar extensión del archivo
    const extension = imageType.includes('jpeg') ? '.jpg' : 
                     imageType.includes('png') ? '.png' : 
                     imageType.includes('gif') ? '.gif' : '.jpg';

    // Generar nombre único para el archivo
    const filename = `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}${extension}`;
    const filepath = path.join(uploadPath, filename);

    // Guardar archivo
    await fs.writeFile(filepath, imageData, 'base64');

    // Retornar la URL relativa
    return `/uploads/categories/${filename}`;
  } catch (error) {
    console.error('Error al guardar imagen base64:', error);
    throw new Error('Error al procesar la imagen');
  }
};

module.exports = {
  uploadMiddleware,
  upload,
  saveBase64Image
};
