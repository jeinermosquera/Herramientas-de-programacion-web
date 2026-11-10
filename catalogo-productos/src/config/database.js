// src/config/database.js
// -----------------------------------------------------------------------------
// Persistencia en archivo JSON: data/catalogo.json
//
// Se usa tanto en local como en producción (Render). La ruta puede cambiarse
// con la variable de entorno DB_PATH:
//   DB_PATH=data/catalogo.json   -> relativa a la raíz del proyecto
//   DB_PATH=/ruta/absoluta.json  -> absoluta
//   DB_PATH=:memory:             -> en memoria (útil para pruebas)
//
// La API exportada es async para que los servicios usen siempre "await",
// aunque la lectura/escritura en disco sea síncrona.
// -----------------------------------------------------------------------------

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const RAIZ_PROYECTO = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Ruta del archivo JSON
// ---------------------------------------------------------------------------

const DB_PATH = !process.env.DB_PATH
  ? path.join(RAIZ_PROYECTO, 'data', 'catalogo.json')
  : process.env.DB_PATH === ':memory:'
    ? ':memory:'
    : path.isAbsolute(process.env.DB_PATH)
      ? process.env.DB_PATH
      : path.resolve(RAIZ_PROYECTO, process.env.DB_PATH);

// Estado en memoria para el modo ':memory:' (útil para pruebas).
let memoria = null;

// ---------------------------------------------------------------------------
// Datos semilla
// ---------------------------------------------------------------------------

const PRODUCTOS_SEED = [
  {
    id: 'prod-001',
    nombre: 'Laptop Dell XPS 13',
    descripcion: 'Laptop ultraligera con pantalla 4K y 16 GB de RAM.',
    precio: 1299.99,
    categoria: 'Computadoras',
    stock: 12,
  },
  {
    id: 'prod-002',
    nombre: 'Mouse Inalámbrico Logitech',
    descripcion: 'Mouse ergonómico inalámbrico con batería de larga duración.',
    precio: 45.5,
    categoria: 'Accesorios',
    stock: 50,
  },
  {
    id: 'prod-003',
    nombre: 'Teclado Mecánico RGB',
    descripcion: 'Teclado mecánico con switches azules y iluminación RGB.',
    precio: 89.9,
    categoria: 'Accesorios',
    stock: 25,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AHORA = () => new Date().toISOString();

// Crea el usuario administrador inicial (contraseña siempre cifrada).
function crearAdmin(ahora = AHORA()) {
  const usuario = process.env.ADMIN_USER || 'admin';
  let passwordPlano = process.env.ADMIN_PASSWORD;

  if (!passwordPlano) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Configuración inválida: ADMIN_PASSWORD es obligatorio en producción.'
      );
    }
    passwordPlano = '123456';
  }

  return {
    id: 1,
    usuario,
    passwordHash: bcrypt.hashSync(passwordPlano, 10),
    rol: 'admin',
    creadoEn: ahora,
  };
}

// Estado inicial completo: un admin y los productos de ejemplo.
function crearEstadoInicial() {
  const ahora = AHORA();

  return {
    usuarios: [crearAdmin(ahora)],
    productos: PRODUCTOS_SEED.map((producto) => ({
      ...producto,
      createdAt: ahora,
      updatedAt: ahora,
    })),
  };
}

// Garantiza que el contenido leído tenga la forma esperada.
function normalizarEstado(contenido) {
  let datos = contenido;

  if (Array.isArray(datos)) {
    datos = { productos: datos, usuarios: [] };
  }

  if (!datos || typeof datos !== 'object') {
    return { usuarios: [], productos: [] };
  }

  return {
    usuarios: Array.isArray(datos.usuarios) ? datos.usuarios : [],
    productos: Array.isArray(datos.productos) ? datos.productos : [],
  };
}

// ---------------------------------------------------------------------------
// Lectura / escritura del archivo JSON
// ---------------------------------------------------------------------------

function leerJson() {
  if (DB_PATH === ':memory:') {
    if (!memoria) memoria = crearEstadoInicial();
    return memoria;
  }

  if (!fs.existsSync(DB_PATH)) {
    const inicial = crearEstadoInicial();
    escribirJson(inicial);
    return inicial;
  }

  const texto = fs.readFileSync(DB_PATH, 'utf8').trim();

  if (!texto) {
    const inicial = crearEstadoInicial();
    escribirJson(inicial);
    return inicial;
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    const fallo = new Error(
      `El archivo de datos '${DB_PATH}' no contiene un JSON válido: ${error.message}`
    );
    fallo.codigo = 500;
    throw fallo;
  }

  const estado = normalizarEstado(datos);

  if (estado.usuarios.length === 0) {
    estado.usuarios.push(crearAdmin());
    escribirJson(estado);
  }

  return estado;
}

function escribirJson(estado) {
  const contenido = {
    usuarios: Array.isArray(estado.usuarios) ? estado.usuarios : [],
    productos: Array.isArray(estado.productos) ? estado.productos : [],
  };

  if (DB_PATH === ':memory:') {
    memoria = contenido;
    return;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(
    DB_PATH,
    `${JSON.stringify(contenido, null, 2)}\n`,
    'utf8'
  );
}

function reiniciarJson() {
  if (DB_PATH !== ':memory:' && fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  escribirJson(crearEstadoInicial());
  return leerJson();
}

// ---------------------------------------------------------------------------
// API pública (async para mantener una interfaz uniforme)
// ---------------------------------------------------------------------------

async function leer() {
  return leerJson();
}

async function escribir(estado) {
  escribirJson(estado);
}

async function reiniciar() {
  return reiniciarJson();
}

// Resumen para el health check y los scripts.
async function estado() {
  const datos = await leer();
  return {
    archivo: DB_PATH,
    formato: 'JSON',
    productos: datos.productos.length,
    usuarios: datos.usuarios.length,
  };
}

module.exports = {
  leer,
  escribir,
  estado,
  reiniciar,
  DB_PATH,
  PRODUCTOS_SEED,
  crearAdmin,
  crearEstadoInicial,
};
