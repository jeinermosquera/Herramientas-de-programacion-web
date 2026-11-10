// scripts/reset-db.js
// -----------------------------------------------------------------------------
// Elimina los datos y los vuelve a crear con los valores iniciales.
// Uso:  npm run db:reset
// AVISO: borra todos los productos y usuarios creados.
// -----------------------------------------------------------------------------

const baseDatos = require('../src/config/database');

console.log(`Archivo: ${baseDatos.DB_PATH}`);

(async () => {
  const resumen = await baseDatos.reiniciar();
  console.log('Base de datos reiniciada correctamente.');
  console.log(`  Productos iniciales: ${resumen.productos}`);
  console.log(`  Usuarios:            ${resumen.usuarios}`);
})().catch((error) => {
  console.error('Error al reiniciar la base de datos:', error.message);
  process.exit(1);
});
