const { query, getConnection } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Profile {
  constructor(data) {
    this.id = data.id;
    this.usuarioId = data.usuario_id;
    this.avatarUrl = data.avatar_url;
    this.fechaNacimiento = data.fecha_nacimiento;
    this.genero = data.genero;
    this.preferenciasNotificaciones = data.preferencias_notificaciones ? 
      JSON.parse(data.preferencias_notificaciones) : {};
    this.configuracionPrivacidad = data.configuracion_privacidad ? 
      JSON.parse(data.configuracion_privacidad) : {};
    this.fechaCreacion = data.fecha_creacion;
    this.fechaActualizacion = data.fecha_actualizacion;
    
    // Datos del usuario asociado
    this.usuario = data.usuario || null;
  }

  // Crear o actualizar perfil de usuario
  static async createOrUpdate(userId, profileData) {
    const {
      avatarUrl,
      fechaNacimiento,
      genero,
      preferenciasNotificaciones = {},
      configuracionPrivacidad = {}
    } = profileData;

    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar si ya existe un perfil
      const existingProfileSql = 'SELECT id FROM perfiles_usuario WHERE usuario_id = ?';
      const existingProfiles = await connection.execute(existingProfileSql, [userId]);

      let profileId;
      if (existingProfiles[0].length > 0) {
        // Actualizar perfil existente
        profileId = existingProfiles[0][0].id;
        const updateSql = `
          UPDATE perfiles_usuario 
          SET avatar_url = ?, fecha_nacimiento = ?, genero = ?, 
              preferencias_notificaciones = ?, configuracion_privacidad = ?,
              fecha_actualizacion = NOW()
          WHERE id = ?
        `;
        await connection.execute(updateSql, [
          avatarUrl || null,
          fechaNacimiento || null,
          genero || null,
          JSON.stringify(preferenciasNotificaciones),
          JSON.stringify(configuracionPrivacidad),
          profileId
        ]);
      } else {
        // Crear nuevo perfil
        profileId = uuidv4();
        const insertSql = `
          INSERT INTO perfiles_usuario (
            id, usuario_id, avatar_url, fecha_nacimiento, 
            genero, preferencias_notificaciones, configuracion_privacidad
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(insertSql, [
          profileId,
          userId,
          avatarUrl || null,
          fechaNacimiento || null,
          genero || null,
          JSON.stringify(preferenciasNotificaciones),
          JSON.stringify(configuracionPrivacidad)
        ]);
      }

      await connection.commit();
      
      return await this.findById(profileId);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Buscar perfil por ID
  static async findById(id) {
    const sql = `
      SELECT p.*, 
             u.email, u.nombre_completo, u.telefono, u.direccion,
             u.rol, u.email_verificado, u.fecha_creacion as usuario_fecha_creacion
      FROM perfiles_usuario p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `;
    
    const profiles = await query(sql, [id]);
    if (profiles.length === 0) return null;

    const profile = new Profile(profiles[0]);
    profile.usuario = {
      email: profiles[0].email,
      nombreCompleto: profiles[0].nombre_completo,
      telefono: profiles[0].telefono,
      direccion: profiles[0].direccion,
      rol: profiles[0].rol,
      emailVerificado: profiles[0].email_verificado,
      fechaCreacion: profiles[0].usuario_fecha_creacion
    };
    
    return profile;
  }

  // Buscar perfil por usuario ID
  static async findByUserId(userId) {
    const sql = `
      SELECT p.*, 
             u.email, u.nombre_completo, u.telefono, u.direccion,
             u.rol, u.email_verificado, u.fecha_creacion as usuario_fecha_creacion
      FROM perfiles_usuario p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.usuario_id = ?
    `;
    
    const profiles = await query(sql, [userId]);
    if (profiles.length === 0) return null;

    const profile = new Profile(profiles[0]);
    profile.usuario = {
      email: profiles[0].email,
      nombreCompleto: profiles[0].nombre_completo,
      telefono: profiles[0].telefono,
      direccion: profiles[0].direccion,
      rol: profiles[0].rol,
      emailVerificado: profiles[0].email_verificado,
      fechaCreacion: profiles[0].usuario_fecha_creacion
    };
    
    return profile;
  }

  // Actualizar avatar
  async updateAvatar(avatarUrl) {
    const sql = 'UPDATE perfiles_usuario SET avatar_url = ?, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [avatarUrl, this.id]);
    this.avatarUrl = avatarUrl;
    return this;
  }

  // Actualizar información personal
  async updatePersonalInfo(updateData) {
    const allowedFields = ['fecha_nacimiento', 'genero'];
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
    const sql = `UPDATE perfiles_usuario SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`;
    
    await query(sql, values);
    
    // Actualizar propiedades locales
    if (updateData.fecha_nacimiento !== undefined) {
      this.fechaNacimiento = updateData.fecha_nacimiento;
    }
    if (updateData.genero !== undefined) {
      this.genero = updateData.genero;
    }
    
    return this;
  }

  // Actualizar preferencias de notificaciones
  async updateNotificationPreferences(preferences) {
    const sql = 'UPDATE perfiles_usuario SET preferencias_notificaciones = ?, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [JSON.stringify(preferences), this.id]);
    this.preferenciasNotificaciones = preferences;
    return this;
  }

  // Actualizar configuración de privacidad
  async updatePrivacySettings(settings) {
    const sql = 'UPDATE perfiles_usuario SET configuracion_privacidad = ?, fecha_actualizacion = NOW() WHERE id = ?';
    await query(sql, [JSON.stringify(settings), this.id]);
    this.configuracionPrivacidad = settings;
    return this;
  }

  // Eliminar perfil
  async delete() {
    const sql = 'DELETE FROM perfiles_usuario WHERE id = ?';
    await query(sql, [this.id]);
  }

  // Obtener estadísticas del perfil
  async getStats() {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM pedidos WHERE user_id = ?) as total_orders,
        (SELECT COUNT(*) FROM carritos WHERE usuario_id = ? AND activo = true) as active_carts,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE user_id = ? AND status = 'COMPLETED') as total_spent
    `;
    
    const stats = await query(sql, [this.usuarioId, this.usuarioId, this.usuarioId]);
    return stats[0];
  }

  // Validar datos del perfil
  static validateProfileData(data) {
    const errors = [];

    // Validar género
    if (data.genero && !['masculino', 'femenino', 'otro', 'no_especificar'].includes(data.genero)) {
      errors.push('Género inválido');
    }

    // Validar fecha de nacimiento
    if (data.fechaNacimiento) {
      const birthDate = new Date(data.fechaNacimiento);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13 || age > 120) {
        errors.push('Fecha de nacimiento inválida');
      }
    }

    // Validar URL del avatar
    if (data.avatarUrl && !this.isValidUrl(data.avatarUrl)) {
      errors.push('URL del avatar inválida');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar URL
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Convertir a objeto público
  toPublicObject() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      avatarUrl: this.avatarUrl,
      fechaNacimiento: this.fechaNacimiento,
      genero: this.genero,
      preferenciasNotificaciones: this.preferenciasNotificaciones,
      configuracionPrivacidad: this.configuracionPrivacidad,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      usuario: this.usuario
    };
  }

  // Convertir a objeto público sin datos sensibles
  toPublicObjectSafe() {
    return {
      id: this.id,
      avatarUrl: this.avatarUrl,
      fechaNacimiento: this.fechaNacimiento,
      genero: this.genero,
      fechaCreacion: this.fechaCreacion,
      usuario: this.usuario ? {
        nombreCompleto: this.usuario.nombreCompleto,
        rol: this.usuario.rol,
        emailVerificado: this.usuario.emailVerificado
      } : null
    };
  }
}

module.exports = Profile;




























