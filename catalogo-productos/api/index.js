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

module.exports = app;
