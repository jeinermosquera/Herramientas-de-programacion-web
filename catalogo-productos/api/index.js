// api/index.js
// -----------------------------------------------------------------------------
// Adaptador serverless para Vercel.
// Vercel ejecuta este archivo como función y el runtime de Node acepta
// directamente una app de Express como handler.
//
// La app es exactamente la misma que se usa en local (src/expressApp.js),
// por lo que las rutas, middlewares y reglas de negocio no se duplican.
// -----------------------------------------------------------------------------

const app = require('../src/expressApp');

// Vercel a veces reescribe la URL pasando el path como query string
// (ej. /api/index.js?path=health). Este middleware lo recupera y lo deja
// como req.url normal para que Express enruté correctamente.
app.use((req, res, next) => {
  if (req.url.includes('/api/index.js')) {
    try {
      const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
      const path = url.searchParams.get('path') || url.pathname.replace('/api/index.js', '') || '/';
      req.url = path;
    } catch (e) {
      // Si falla el parsing, eliminar /api/index.js del inicio
      req.url = req.url.replace('/api/index.js', '') || '/';
    }
  }
  next();
});

module.exports = app;
