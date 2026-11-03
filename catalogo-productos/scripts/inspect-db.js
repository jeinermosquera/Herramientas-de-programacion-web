// scripts/inspect-db.js
// -----------------------------------------------------------------------------
// Muestra un resumen de la base de datos (JSON local o Turso).
// Uso: node scripts/inspect-db.js
// -----------------------------------------------------------------------------

const baseDatos = require('../src/config/database');

(async () => {
  const { usuarios, productos } = await baseDatos.leer();

  console.log('Modo:', baseDatos.USAR_TURSO ? 'Turso (libSQL)' : 'JSON');
  console.log('Ruta/base:', baseDatos.DB_PATH);
  console.log('Formato:', baseDatos.USAR_TURSO ? 'Turso (libSQL)' : 'JSON');
  console.log('Productos:', productos.length);
  console.log(
    'Usuarios:',
    JSON.stringify(
      usuarios.map((usuario) => ({
        usuario: usuario.usuario,
        rol: usuario.rol,
        hash: String(usuario.passwordHash || '').slice(0, 7),
      }))
    )
  );
})().catch((error) => {
  console.error('Error al inspeccionar la base de datos:', error.message);
  process.exit(1);
});
