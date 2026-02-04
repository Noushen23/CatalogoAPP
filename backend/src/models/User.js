const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.nombreCompleto = data.nombre_completo;
    this.nombre = data.nombre;
    this.segundoNombre = data.segundo_nombre;
    this.primerApellido = data.primer_apellido;
    this.segundoApellido = data.segundo_apellido;
    this.telefono = data.telefono;
    this.direccion = data.direccion;
    this.tipoIdentificacion = data.tipo_identificacion;
    this.numeroIdentificacion = data.numero_identificacion;
    this.activo = data.activo;
    this.rol = data.rol;
    this.emailVerificado = data.email_verificado;
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
    this.ultimoAcceso = data.ultimo_acceso;
  }

  // Crear usuario
  static async create(userData) {
    const {
      email,
      nombreCompleto,
      nombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      password,
      telefono,
      direccion,
      tipo_identificacion,
      numero_identificacion,
      rol = 'cliente'
    } = userData;

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    const sql = `
      INSERT INTO usuarios (
        id, email, nombre_completo, nombre, segundo_nombre, primer_apellido, segundo_apellido, contrasena, telefono, 
        direccion, tipo_identificacion, numero_identificacion, 
        rol, activo, email_verificado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      email,
      nombreCompleto,
      nombre || null,
      segundoNombre || null,
      primerApellido || null,
      segundoApellido || null,
      hashedPassword,
      telefono || null,
      direccion || null,
      tipo_identificacion || null,
      numero_identificacion || null,
      rol,
      true,
      false
    ]);

    return await this.findById(id);
  }

  // Buscar usuario por ID
  static async findById(id) {
    const sql = 'SELECT * FROM usuarios WHERE id = ? AND activo = true';
    const users = await query(sql, [id]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    const sql = 'SELECT * FROM usuarios WHERE email = ? AND activo = true';
    const users = await query(sql, [email]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Buscar usuario por documento (tipo y número)
  static async findByDocument(tipoIdentificacion, numeroIdentificacion) {
    if (!tipoIdentificacion || !numeroIdentificacion) {
      return null;
    }
    const sql = 'SELECT * FROM usuarios WHERE tipo_identificacion = ? AND numero_identificacion = ? AND activo = true';
    const users = await query(sql, [tipoIdentificacion, numeroIdentificacion]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Verificar contraseña
  async verifyPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        console.log('⚠️ [verifyPassword] Contraseña inválida o no proporcionada');
        return false;
      }

      const sql = 'SELECT contrasena FROM usuarios WHERE id = ?';
      const users = await query(sql, [this.id]);
      
      if (users.length === 0) {
        console.log('⚠️ [verifyPassword] Usuario no encontrado en BD');
        return false;
      }

      const hashedPassword = users[0].contrasena;
      
      if (!hashedPassword) {
        console.log('⚠️ [verifyPassword] Usuario no tiene contraseña almacenada');
        return false;
      }

      const isValid = await bcrypt.compare(password, hashedPassword);
      return isValid;
    } catch (error) {
      console.error('❌ [verifyPassword] Error al verificar contraseña:', error);
      return false;
    }
  }

  // Actualizar último acceso
  async updateLastAccess() {
    const sql = 'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?';
    await query(sql, [this.id]);
  }

  // Actualizar perfil
  async updateProfile(updateData) {
    const allowedFields = [
      'nombre_completo',
      'nombre',
      'segundo_nombre',
      'primer_apellido',
      'segundo_apellido',
      'telefono',
      'direccion',
      'tipo_identificacion',
      'numero_identificacion'
    ];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const sql = `UPDATE usuarios SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`;
    
    await query(sql, values);
    return await User.findById(this.id);
  }

  // Cambiar contraseña
  async changePassword(newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const sql = 'UPDATE usuarios SET contrasena = ?, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [hashedPassword, this.id]);
  }

  // Verificar email
  async verifyEmail() {
    const sql = 'UPDATE usuarios SET email_verificado = true, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [this.id]);
    this.emailVerificado = true;
  }

  // Desactivar usuario
  async deactivate() {
    const sql = 'UPDATE usuarios SET activo = false, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [this.id]);
    this.activo = false;
  }

  // Obtener perfil completo
  async getProfile() {
    const sql = `
      SELECT 
        u.*,
        p.avatar_url,
        p.fecha_nacimiento,
        p.genero,
        p.preferencias_notificaciones,
        p.configuracion_privacidad
      FROM usuarios u
      LEFT JOIN perfiles_usuario p ON u.id = p.usuario_id
      WHERE u.id = ?
    `;
    
    const profiles = await query(sql, [this.id]);
    return profiles.length > 0 ? profiles[0] : null;
  }

  // Crear perfil de usuario
  async createProfile(profileData) {
    const {
      avatarUrl,
      fechaNacimiento,
      genero,
      preferenciasNotificaciones = {},
      configuracionPrivacidad = {}
    } = profileData;

    const sql = `
      INSERT INTO perfiles_usuario (
        id, usuario_id, avatar_url, fecha_nacimiento, 
        genero, preferencias_notificaciones, configuracion_privacidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        avatar_url = VALUES(avatar_url),
        fecha_nacimiento = VALUES(fecha_nacimiento),
        genero = VALUES(genero),
        preferencias_notificaciones = VALUES(preferencias_notificaciones),
        configuracion_privacidad = VALUES(configuracion_privacidad),
        fecha_actualizacion = NOW()
    `;

    await query(sql, [
      uuidv4(),
      this.id,
      avatarUrl || null,
      fechaNacimiento || null,
      genero || null,
      JSON.stringify(preferenciasNotificaciones),
      JSON.stringify(configuracionPrivacidad)
    ]);
  }

  // Convertir a objeto público (sin datos sensibles)
  toPublicObject() {
    return {
      id: this.id,
      email: this.email,
      nombreCompleto: this.nombreCompleto,
      nombre: this.nombre,
      segundoNombre: this.segundoNombre,
      primerApellido: this.primerApellido,
      segundoApellido: this.segundoApellido,
      telefono: this.telefono,
      direccion: this.direccion,
      tipoIdentificacion: this.tipoIdentificacion,
      numeroIdentificacion: this.numeroIdentificacion,
      rol: this.rol,
      activo: this.activo,
      emailVerificado: this.emailVerificado,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      ultimoAcceso: this.ultimoAcceso
    };
  }
}

module.exports = User;
