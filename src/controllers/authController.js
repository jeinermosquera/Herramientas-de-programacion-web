// src/controllers/authController.js
// Controlador de autenticación: maneja el login y la emisión del token JWT.
// Ruta pública: POST /api/auth/login

const authService = require('../services/authService');

// POST /api/auth/login (público)
// Autentica al usuario y devuelve un token JWT si las credenciales son correctas.
async function login(req, res, next) {
  try {
    const { usuario, contraseña } = req.body;

    const resultado = await authService.autenticar(usuario, contraseña);

    return res.status(200).json({
      ok: true,
      mensaje: resultado.mensaje,
      token: resultado.token,
      usuario: resultado.usuario,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/auth/password (protegido con JWT)
// Permite al usuario autenticado cambiar su propia contraseña.
async function cambiarContrasena(req, res, next) {
  try {
    const cuerpo = req.body || {};

    // Se aceptan las claves con y sin tilde para facilitar el uso con curl.
    const contrasenaActual =
      cuerpo['contraseñaActual'] ?? cuerpo.contrasenaActual;
    const contrasenaNueva =
      cuerpo['contraseñaNueva'] ?? cuerpo.contrasenaNueva;

    const resultado = await authService.cambiarContrasena(req.usuario.id, {
      contrasenaActual,
      contrasenaNueva,
    });

    return res.status(200).json({
      ok: true,
      mensaje: resultado.mensaje,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  cambiarContrasena,
};
