// src/services/authService.js
// -----------------------------------------------------------------------------
// Servicio de autenticación: valida credenciales contra los usuarios guardados
// (contraseña cifrada con bcrypt) y genera/verifica tokens.
// Los datos se leen y escriben mediante src/config/database.js (archivo JSON).
// -----------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { leer, escribir } = require('../config/database');
const jwtConfig = require('../config/jwt');

// Autentica un usuario. Devuelve { token, usuario } o lanza un error HTTP.
async function autenticar(usuario, contrasena) {
  if (!usuario || !contrasena) {
    throw {
      codigo: 400,
      mensaje: 'Usuario y contraseña son obligatorios.',
    };
  }

  const datos = await leer();
  const encontrado = datos.usuarios.find(
    (u) => u.usuario === String(usuario).trim()
  );

  // Mismo mensaje para usuario inexistente y contraseña incorrecta:
  // evita revelar qué dato falló.
  if (!encontrado || !encontrado.passwordHash) {
    throw { codigo: 401, mensaje: 'Credenciales incorrectas.' };
  }

  const coincide = await bcrypt.compare(contrasena, encontrado.passwordHash);
  if (!coincide) {
    throw { codigo: 401, mensaje: 'Credenciales incorrectas.' };
  }

  const token = jwt.sign(
    {
      id: encontrado.id,
      usuario: encontrado.usuario,
      rol: encontrado.rol,
    },
    jwtConfig.secret,
    { algorithm: jwtConfig.algorithm, expiresIn: jwtConfig.expiresIn }
  );

  return {
    token,
    usuario: {
      id: encontrado.id,
      usuario: encontrado.usuario,
      rol: encontrado.rol,
    },
    mensaje: 'Autenticación exitosa.',
  };
}

// Cambia la contraseña del usuario autenticado.
// Verifica la contraseña actual, valida la nueva y guarda solo su hash bcrypt.
async function cambiarContrasena(id, { contrasenaActual, contrasenaNueva }) {
  if (!contrasenaActual || !contrasenaNueva) {
    throw {
      codigo: 400,
      mensaje: 'La contraseña actual y la nueva son obligatorias.',
    };
  }

  if (String(contrasenaNueva).length < 6) {
    throw {
      codigo: 400,
      mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.',
    };
  }

  const datos = await leer();
  const indice = datos.usuarios.findIndex(
    (usuario) => String(usuario.id) === String(id)
  );

  if (indice === -1) {
    throw { codigo: 404, mensaje: 'Usuario no encontrado.' };
  }

  const usuario = datos.usuarios[indice];

  const coincide = await bcrypt.compare(contrasenaActual, usuario.passwordHash);
  if (!coincide) {
    throw { codigo: 401, mensaje: 'La contraseña actual no es correcta.' };
  }

  const esLaMisma = await bcrypt.compare(contrasenaNueva, usuario.passwordHash);
  if (esLaMisma) {
    throw {
      codigo: 400,
      mensaje: 'La nueva contraseña debe ser diferente a la actual.',
    };
  }

  datos.usuarios[indice] = {
    ...usuario,
    passwordHash: await bcrypt.hash(contrasenaNueva, 10),
    actualizadoEn: new Date().toISOString(),
  };
  await escribir(datos);

  return { mensaje: 'Contraseña actualizada correctamente.' };
}

// Verifica un token JWT y devuelve el payload si es válido.
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
    });
    return { valido: true, usuario: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw { codigo: 401, mensaje: 'El token ha expirado.' };
    }
    if (error.name === 'JsonWebTokenError') {
      throw { codigo: 401, mensaje: 'Token inválido.' };
    }
    throw { codigo: 401, mensaje: 'Error al verificar el token.' };
  }
}

module.exports = {
  autenticar,
  cambiarContrasena,
  verificarToken,
};
