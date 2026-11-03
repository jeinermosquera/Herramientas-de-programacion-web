// src/routes/authRoutes.js
// Definición de las rutas de autenticación.
//   POST /api/auth/login     pública (no requiere token)
//   PUT  /api/auth/password  protegida (JWT): cambia la contraseña propia

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificar } = require('../middleware/authMiddleware');
const { loginRateLimit } = require('../middleware/loginRateLimit');

// POST /api/auth/login -> login y emisión de token JWT (público)
// Incluye límite de intentos fallidos por IP.
router.post('/login', loginRateLimit, authController.login);

// PUT /api/auth/password -> cambio de contraseña del usuario autenticado
router.put('/password', verificar, authController.cambiarContrasena);

module.exports = router;
