// src/config/jwt.js
// Configuración del token JWT.
// Aquí se definen el secreto, el algoritmo y el tiempo de expiración.
// El secreto se carga desde .env (local) o desde las variables de entorno
// de la plataforma (Render).

// Garantiza que .env esté cargado aunque este módulo se importe directamente.
require('dotenv').config();

const esProduccion = process.env.NODE_ENV === 'production';
const secreto = process.env.JWT_SECRET;

// En producción no se permite un secreto débil ni el valor por defecto:
// un JWT firmado con un secreto conocido permitiría falsificar tokens.
if (esProduccion && (!secreto || secreto.length < 32)) {
  throw new Error(
    'Configuración inválida: JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.'
  );
}

module.exports = {
  // Secreto para firmar y verificar los tokens.
  secret: secreto || 'clave_secreta_predeterminada_cambiar_en_produccion',
  // Tiempo de expiración del token (ej. 1h, 7d, 30m).
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  // Algoritmo de firma.
  algorithm: 'HS256',
};
