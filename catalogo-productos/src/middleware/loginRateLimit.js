// src/middleware/loginRateLimit.js
// -----------------------------------------------------------------------------
// Límite simple de intentos fallidos de inicio de sesión por IP.
//
// Objetivo: frenar ataques de fuerza bruta contra POST /api/auth/login.
// Solo cuentan los intentos fallidos (400/401); un login correcto no consume
// cupo, así que las pruebas manuales no bloquean al usuario.
//
// Nota: el contador vive en memoria de cada instancia. En Vercel (serverless)
// cada instancia tiene su propio contador, por lo que es una protección
// "best effort". Para una solución distribuida se usaría Redis/Upstash.
// -----------------------------------------------------------------------------

const VENTANA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FALLOS = 10; // intentos fallidos permitidos por ventana

const intentos = new Map();

function loginRateLimit(req, res, next) {
  const ahora = Date.now();
  const clave = req.ip || req.socket?.remoteAddress || 'desconocido';

  // Limpieza oportunista para que el Map no crezca indefinidamente.
  if (intentos.size > 1000) {
    for (const [ip, registro] of intentos) {
      if (ahora - registro.inicio > VENTANA_MS) intentos.delete(ip);
    }
  }

  let registro = intentos.get(clave);

  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    registro = { inicio: ahora, fallos: 0 };
    intentos.set(clave, registro);
  }

  if (registro.fallos >= MAX_FALLOS) {
    const espera = Math.ceil(
      (VENTANA_MS - (ahora - registro.inicio)) / 1000
    );
    res.setHeader('Retry-After', String(espera));
    return res.status(429).json({
      ok: false,
      mensaje:
        'Demasiados intentos fallidos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.',
    });
  }

  // Solo se contabilizan las respuestas de credenciales inválidas.
  res.on('finish', () => {
    if (res.statusCode === 400 || res.statusCode === 401) {
      registro.fallos += 1;
    }
  });

  return next();
}

module.exports = {
  loginRateLimit,
};
