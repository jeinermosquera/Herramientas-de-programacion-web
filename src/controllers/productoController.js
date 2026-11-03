// src/controllers/productoController.js
// -----------------------------------------------------------------------------
// Controladores de productos: traducen HTTP -> servicio -> HTTP.
// No contienen lógica de negocio; solo leen la petición y responden con el
// código de estado adecuado.
// -----------------------------------------------------------------------------

const productoService = require('../services/productoService');

// GET /api/productos?buscar=texto&categoria=Nombre (público)
async function listarProductos(req, res, next) {
  try {
    const { buscar = '', categoria = '' } = req.query;
    const productos = await productoService.listarProductos({ buscar, categoria });

    return res.status(200).json({
      ok: true,
      mensaje: 'Productos obtenidos correctamente.',
      total: productos.length,
      data: productos,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/productos/estadisticas (público)
// Indicadores para el panel administrativo.
async function obtenerEstadisticas(req, res, next) {
  try {
    const estadisticas = await productoService.obtenerEstadisticas();
    return res.status(200).json({
      ok: true,
      mensaje: 'Estadísticas obtenidas correctamente.',
      data: estadisticas,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/productos/:id (público)
async function obtenerProducto(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El id del producto es requerido.',
      });
    }

    const producto = await productoService.obtenerProductoPorId(id);
    if (!producto) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró un producto con el id '${id}'.`,
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: 'Producto encontrado.',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/productos (JWT + admin)
async function crearProducto(req, res, next) {
  try {
    const productoCreado = await productoService.crearProducto(req.body);
    return res.status(201).json({
      ok: true,
      mensaje: 'Producto creado exitosamente.',
      data: productoCreado,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/productos/:id (JWT + admin)
async function actualizarProducto(req, res, next) {
  try {
    const { id } = req.params;
    const productoActualizado = await productoService.actualizarProducto(
      id,
      req.body
    );
    return res.status(200).json({
      ok: true,
      mensaje: 'Producto actualizado exitosamente.',
      data: productoActualizado,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/productos/:id (JWT + admin)
async function eliminarProducto(req, res, next) {
  try {
    const { id } = req.params;
    await productoService.eliminarProducto(id);
    // 204 No Content: operación exitosa sin cuerpo de respuesta.
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarProductos,
  obtenerEstadisticas,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
