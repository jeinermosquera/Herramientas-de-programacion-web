// src/routes/productoRoutes.js
// -----------------------------------------------------------------------------
// Definición de las rutas de productos.
//   GET    /api/productos             público
//   GET    /api/productos/estadisticas público
//   GET    /api/productos/:id         público
//   POST   /api/productos             JWT + admin
//   PUT    /api/productos/:id         JWT + admin
//   DELETE /api/productos/:id         JWT + admin
// -----------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { verificar, soloAdmin } = require('../middleware/authMiddleware');

// --- Rutas públicas ---
router.get('/', productoController.listarProductos);

// Debe declararse antes de '/:id' para que "estadisticas" no se interprete como ID.
router.get('/estadisticas', productoController.obtenerEstadisticas);

router.get('/:id', productoController.obtenerProducto);

// --- Rutas protegidas (JWT + rol admin) ---
router.post('/', verificar, soloAdmin, productoController.crearProducto);
router.put('/:id', verificar, soloAdmin, productoController.actualizarProducto);
router.delete(
  '/:id',
  verificar,
  soloAdmin,
  productoController.eliminarProducto
);

module.exports = router;
