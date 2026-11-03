// src/config/config.js
// Configuración general de la aplicación.
// Centraliza la lectura de variables de entorno para evitar que el resto
// de la app dependa directamente de process.env.

require('dotenv').config();

module.exports = {
  // Puerto en el que escucha el servidor (por defecto 3000)
  port: parseInt(process.env.PORT, 10) || 3000,
  // Host del servidor
  host: process.env.HOST || 'localhost',
  // Entorno de ejecución (development, production, test)
  env: process.env.NODE_ENV || 'development',
  // URL base de la API
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
};
