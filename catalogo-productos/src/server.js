// src/server.js
// -----------------------------------------------------------------------------
// Punto de entrada: inicia el servidor HTTP y muestra la configuración activa.
// -----------------------------------------------------------------------------

const app = require('./expressApp');
const config = require('./config/config');
const { DB_PATH } = require('./config/database');

const PORT = config.port;
const HOST = config.host;

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  API REST - Catálogo de Productos');
  console.log('========================================');
  console.log(`  Entorno:     ${config.env}`);
  console.log(`  Servidor:    http://${HOST}:${PORT}`);
  console.log(`  Base datos:  JSON (${DB_PATH})`);
  console.log(`  Salud:       http://${HOST}:${PORT}/api/health`);
  console.log(`  Productos:   http://${HOST}:${PORT}/api/productos`);
  console.log(`  Login:       http://${HOST}:${PORT}/api/auth/login`);
  console.log('========================================');
  console.log('  Presiona CTRL+C para detener el servidor');
  console.log('========================================');
});

// Cierre limpio de procesos ante errores no controlados.
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada no manejada:', reason);
});
