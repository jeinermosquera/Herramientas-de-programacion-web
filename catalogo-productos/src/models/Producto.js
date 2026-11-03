// src/models/Producto.js
// -----------------------------------------------------------------------------
// Definición del modelo Producto (documentación de la estructura JSON).
// Los productos se guardan en el array "productos" de data/catalogo.json.
//
// Propiedades:
//   id          string  (UUID)
//   nombre      string  (obligatorio, no vacío)
//   descripcion string  (opcional, por defecto '')
//   precio      number  (mayor que 0)
//   categoria   string  (opcional, por defecto '')
//   stock       number  (entero mayor o igual a 0)
//   createdAt   string  (ISO 8601)
//   updatedAt   string  (ISO 8601)
// -----------------------------------------------------------------------------

module.exports = {
  coleccion: 'productos',
  camposObligatorios: ['nombre', 'precio', 'stock'],
  camposNumericos: ['precio', 'stock'],
  reglas: {
    precio: 'Debe ser un número mayor que 0.',
    stock: 'Debe ser un entero mayor o igual a 0.',
    nombre: 'No puede estar vacío.',
  },
};
