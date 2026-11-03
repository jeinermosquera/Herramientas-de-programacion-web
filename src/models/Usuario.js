// src/models/Usuario.js
// -----------------------------------------------------------------------------
// Definición del modelo Usuario (documentación de la estructura JSON).
// Los usuarios se guardan en el array "usuarios" de data/catalogo.json.
//
// Propiedades:
//   id           number  (identificador incremental)
//   usuario      string  (único)
//   passwordHash string  (bcrypt; nunca se guarda la contraseña en texto plano)
//   rol          string  ('admin' | 'usuario')
//   creadoEn     string  (ISO 8601)
// -----------------------------------------------------------------------------

module.exports = {
  coleccion: 'usuarios',
  roles: ['admin', 'usuario'],
  nota: 'Las contraseñas se cifran con bcrypt en src/config/database.js.',
};
