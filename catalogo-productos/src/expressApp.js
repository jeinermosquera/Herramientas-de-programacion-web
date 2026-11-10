// src/expressApp.js
// -----------------------------------------------------------------------------
// Configuración de Express: middlewares globales, rutas y manejo de errores.
// El servidor se inicia en server.js; este archivo solo construye la app
// (lo que facilita las pruebas con Supertest).
// -----------------------------------------------------------------------------

// Cargar variables de entorno ANTES de importar módulos que las leen
// (por ejemplo config/jwt.js y config/database.js).
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { estado } = require('./config/database');

const app = express();

// --- Configuración general ---

// Directorio del frontend. Se prueba primero la raíz del proceso y luego la
// ruta relativa al archivo, para funcionar tanto en local como en Render.
const candidatosPublic = [
  path.join(process.cwd(), 'public'),
  path.join(__dirname, '..', 'public'),
];
const PUBLIC_DIR =
  candidatosPublic.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html'))
  ) || candidatosPublic[0];

// Detrás de un proxy (Render, Nginx) se necesita confiar en el primer proxy
// para obtener la IP real del cliente (usada por el límite de intentos).
app.set('trust proxy', 1);

// No revelar el framework en la cabecera X-Powered-By.
app.disable('x-powered-by');

// --- Cabeceras de seguridad ---
// Se aplican a todas las respuestas. No se usa CSP porque el frontend emplea
// manejadores inline (onclick) y CDNs de Bootstrap; una CSP estricta los
// bloquearía sin una configuración adicional.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
});

// --- Middlewares globales ---

// CORS: por defecto permite cualquier origen (útil para probar la API).
// En producción puede restringirse con CORS_ORIGIN (separando varios por comas).
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((origen) => origen.trim()) }
      : undefined
  )
);

// Parseo de cuerpos JSON y formularios, con un límite razonable.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Frontend estático (Bootstrap, CSS y JS).
app.use(express.static(PUBLIC_DIR));

// --- Rutas de la API ---

// Health check: verifica que la API y el archivo de datos estén disponibles.
app.get('/api/health', async (req, res, next) => {
  try {
    const info = await estado();
    res.status(200).json({
      ok: true,
      mensaje: 'API del catálogo de productos está en línea.',
      baseDatos: info.formato,
      archivo: info.archivo,
      productos: info.productos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);

// --- 404 para rutas de API no encontradas ---
app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: `La ruta '${req.originalUrl}' no existe en esta API.`,
  });
});

// Cualquier otra ruta devuelve el frontend (SPA simple).
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// --- Manejador centralizado de errores (siempre al final) ---
app.use(errorHandler);

module.exports = app;
