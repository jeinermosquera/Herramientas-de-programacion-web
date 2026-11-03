// scripts/reset-db.js
// -----------------------------------------------------------------------------
// Elimina los datos y los vuelve a crear con los valores iniciales.
// Funciona tanto con JSON local como con Turso (según TURSO_URL/TURSO_AUTH_TOKEN).
// Uso:  npm run db:reset
// AVISO: borra todos los productos y usuarios creados.
// -----------------------------------------------------------------------------

const baseDatos = require('../src/config/database');

console.log(`Modo de almacenamiento: ${baseDatos.USAR_TURSO ? 'Turso (libSQL)' : 'JSON'}`);
console.log(`Ruta/base: ${baseDatos.DB_PATH}`);

(async () => {
  const resumen = await baseDatos.reiniciar();
  console.log('Base de datos reiniciada correctamente.');
  console.log(`  Productos iniciales: ${resumen.productos}`);
  console.log(`  Usuarios:            ${resumen.usuarios}`);
})().catch((error) => {
  console.error('Error al reiniciar la base de datos:', error.message);
  process.exit(1);
});
