// src/services/productoService.js
// -----------------------------------------------------------------------------
// Capa de servicios: lógica de negocio y acceso a datos de productos.
// Los datos se leen y escriben mediante src/config/database.js (archivo JSON).
// -----------------------------------------------------------------------------

const { randomUUID } = require('crypto');
const { leer, escribir } = require('../config/database');

// Normaliza texto para búsquedas sin distinguir mayúsculas ni tildes.
function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Convierte un valor a número rechazando textos no numéricos, booleanos,
// null, arreglos u objetos. Evita que parseFloat('12abc') se acepte como 12.
function aNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number(valor.trim());
  }
  return NaN;
}

// Valida los campos obligatorios y los rangos permitidos al crear un producto.
function validarProductoNuevo(datos) {
  const obligatorios = ['nombre', 'precio', 'stock'];
  for (const campo of obligatorios) {
    if (
      datos[campo] === undefined ||
      datos[campo] === null ||
      datos[campo] === ''
    ) {
      throw { codigo: 400, mensaje: `El campo '${campo}' es obligatorio.` };
    }
  }

  if (typeof datos.nombre !== 'string' || datos.nombre.trim().length === 0) {
    throw {
      codigo: 400,
      mensaje: 'El nombre debe ser una cadena de texto no vacía.',
    };
  }

  const precio = aNumero(datos.precio);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw { codigo: 400, mensaje: 'El precio debe ser un número mayor que 0.' };
  }

  const stock = aNumero(datos.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    throw {
      codigo: 400,
      mensaje: 'El stock debe ser un número entero mayor o igual a 0.',
    };
  }

  return { precio, stock };
}

// Lista productos con búsqueda opcional por texto y filtro por categoría.
async function listarProductos({ buscar = '', categoria = '' } = {}) {
  const datos = await leer();
  let productos = datos.productos;

  const texto = normalizarTexto(buscar);
  if (texto) {
    productos = productos.filter((producto) =>
      normalizarTexto(
        `${producto.nombre} ${producto.descripcion} ${producto.categoria}`
      ).includes(texto)
    );
  }

  const categoriaBuscada = normalizarTexto(categoria);
  if (categoriaBuscada) {
    productos = productos.filter(
      (producto) => normalizarTexto(producto.categoria) === categoriaBuscada
    );
  }

  return [...productos]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((producto) => ({ ...producto }));
}

// Obtiene un producto por su ID (o null si no existe).
async function obtenerProductoPorId(id) {
  const datos = await leer();
  const producto = datos.productos.find((p) => p.id === id);
  return producto ? { ...producto } : null;
}

// Crea un producto.
async function crearProducto(datos) {
  const { precio, stock } = validarProductoNuevo(datos);
  const ahora = new Date().toISOString();

  const nuevo = {
    id: randomUUID(),
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion ? String(datos.descripcion).trim() : '',
    precio,
    categoria: datos.categoria ? String(datos.categoria).trim() : '',
    stock,
    createdAt: ahora,
    updatedAt: ahora,
  };

  const estado = await leer();
  estado.productos.push(nuevo);
  await escribir(estado);

  return { ...nuevo };
}

// Actualiza un producto existente. Solo valida los campos enviados.
async function actualizarProducto(id, datos) {
  const estado = await leer();
  const indice = estado.productos.findIndex((p) => p.id === id);

  if (indice === -1) {
    throw { codigo: 404, mensaje: `No existe un producto con el id '${id}'.` };
  }

  const cambios = {};

  if (datos.nombre !== undefined) {
    if (typeof datos.nombre !== 'string' || datos.nombre.trim().length === 0) {
      throw {
        codigo: 400,
        mensaje: 'El nombre debe ser una cadena de texto no vacía.',
      };
    }
    cambios.nombre = datos.nombre.trim();
  }

  if (datos.descripcion !== undefined) {
    cambios.descripcion = String(datos.descripcion).trim();
  }

  if (datos.precio !== undefined) {
    const precio = aNumero(datos.precio);
    if (!Number.isFinite(precio) || precio <= 0) {
      throw { codigo: 400, mensaje: 'El precio debe ser un número mayor que 0.' };
    }
    cambios.precio = precio;
  }

  if (datos.categoria !== undefined) {
    cambios.categoria = String(datos.categoria).trim();
  }

  if (datos.stock !== undefined) {
    const stock = aNumero(datos.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      throw {
        codigo: 400,
        mensaje: 'El stock debe ser un número entero mayor o igual a 0.',
      };
    }
    cambios.stock = stock;
  }

  if (Object.keys(cambios).length === 0) {
    throw {
      codigo: 400,
      mensaje: 'Debes enviar al menos un campo para actualizar.',
    };
  }

  const actualizado = {
    ...estado.productos[indice],
    ...cambios,
    updatedAt: new Date().toISOString(),
  };

  estado.productos[indice] = actualizado;
  await escribir(estado);

  return { ...actualizado };
}

// Elimina un producto por su ID y devuelve el producto eliminado.
async function eliminarProducto(id) {
  const estado = await leer();
  const indice = estado.productos.findIndex((p) => p.id === id);

  if (indice === -1) {
    throw { codigo: 404, mensaje: `No existe un producto con el id '${id}'.` };
  }

  const [eliminado] = estado.productos.splice(indice, 1);
  await escribir(estado);

  return { ...eliminado };
}

// Estadísticas para el panel administrativo.
async function obtenerEstadisticas() {
  const datos = await leer();
  const productos = datos.productos;

  const resumen = productos.reduce(
    (acumulado, producto) => {
      const stock = Number(producto.stock) || 0;
      const precio = Number(producto.precio) || 0;

      acumulado.unidadesDisponibles += stock;
      acumulado.valorInventario += precio * stock;
      if (stock <= 5) acumulado.stockBajo += 1;

      return acumulado;
    },
    { unidadesDisponibles: 0, valorInventario: 0, stockBajo: 0 }
  );

  return {
    totalProductos: productos.length,
    unidadesDisponibles: resumen.unidadesDisponibles,
    valorInventario: Number(resumen.valorInventario.toFixed(2)),
    stockBajo: resumen.stockBajo,
  };
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerEstadisticas,
};
