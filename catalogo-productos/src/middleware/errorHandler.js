// src/middleware/errorHandler.js
// -----------------------------------------------------------------------------
// Manejador centralizado de errores.
// Convierte cualquier error en una respuesta JSON consistente:
//   { ok: false, mensaje: "..." }
// Respeta el código HTTP del error (err.codigo / err.status) o usa 500.
// -----------------------------------------------------------------------------

function errorHandler(err, req, res, next) {
  // Errores de parseo de JSON lanzados por express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      mensaje: 'El cuerpo de la petición no contiene un JSON válido.',
    });
  }

  // Cuerpo demasiado grande (límite de express.json/urlencoded)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      mensaje: 'El cuerpo de la petición es demasiado grande.',
    });
  }

  const statusCode = err.codigo || err.status || 500;

  const mensaje =
    err.mensaje ||
    (statusCode === 500
      ? 'Error interno del servidor. Por favor, inténtelo de nuevo más tarde.'
      : err.message || 'Solicitud incorrecta.');

  const respuesta = { ok: false, mensaje };

  // En desarrollo se incluye el detalle para depuración (nunca en producción).
  if (
    err.codigo === undefined &&
    statusCode >= 500 &&
    process.env.NODE_ENV !== 'production'
  ) {
    respuesta.detalle = err.message;
  }

  return res.status(statusCode).json(respuesta);
}

module.exports = {
  errorHandler,
};
