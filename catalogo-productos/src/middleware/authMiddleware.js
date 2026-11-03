// src/middleware/authMiddleware.js
// -----------------------------------------------------------------------------
// Middlewares de autorización con JWT.
//   verificar  -> valida el token y anexa req.usuario (401 si falla).
//   soloAdmin  -> exige rol 'admin' (403 si el usuario no tiene permiso).
// -----------------------------------------------------------------------------

const authService = require('../services/authService');

// Verifica el header "Authorization: Bearer <token>".
function verificar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje:
          'No se proporcionó un token de autenticación. Se requiere el header Authorization.',
      });
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        ok: false,
        mensaje: 'Formato de token inválido. Use: Authorization: Bearer <token>',
      });
    }

    const resultado = authService.verificarToken(partes[1]);
    req.usuario = resultado.usuario;
    return next();
  } catch (error) {
    const codigo = error.codigo || 401;
    return res.status(codigo).json({
      ok: false,
      mensaje: error.mensaje || 'Error de autenticación.',
    });
  }
}

// Restringe una ruta a usuarios con rol 'admin'.
// Debe ejecutarse después de "verificar".
function soloAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({
      ok: false,
      mensaje: 'Acceso prohibido. Esta operación requiere rol de administrador.',
    });
  }
  return next();
}

module.exports = {
  verificar,
  soloAdmin,
};
