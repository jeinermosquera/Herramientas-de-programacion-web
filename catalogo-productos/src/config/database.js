// src/config/database.js
// -----------------------------------------------------------------------------
// Persistencia con doble soporte:
//   - Desarrollo/local: archivo JSON (data/catalogo.json), síncrono.
//   - Producción/Vercel: Turso (libSQL), persistente y async.
//
// Detecta automáticamente el modo según las variables de entorno:
//   TURSO_URL (o TURSO_DATABASE_URL) + TURSO_AUTH_TOKEN -> Turso
//   lo contrario                                          -> JSON local
// -----------------------------------------------------------------------------

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const RAIZ_PROYECTO = path.join(__dirname, '..', '..');
const ES_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const ES_PRODUCCION = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Configuración de Turso (libSQL)
// ---------------------------------------------------------------------------

// Acepta los nombres de variable que usan tanto la CLI de Turso como la
// integración de Turso en Vercel (TURSO_URL / TURSO_DATABASE_URL).
const TURSO_URL =
  process.env.TURSO_URL ||
  process.env.TURSO_DATABASE_URL ||
  process.env.TURSO_CONNECTION_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USAR_TURSO = Boolean(TURSO_URL && TURSO_AUTH_TOKEN);

// En Vercel sin Turso, advertir que los datos son efímeros.
if (ES_VERCEL && !USAR_TURSO) {
  console.warn(
    '[database] OJO: no se configuraron TURSO_URL/TURSO_DATABASE_URL ni ' +
    'TURSO_AUTH_TOKEN. En Vercel los datos se guardan en /tmp y se perderán ' +
    'al reiniciar la función.'
  );
}

// Cliente de Turso (se crea perezosamente solo si se configuran las credenciales).
let turso = null;
function obtenerTurso() {
  if (!turso && USAR_TURSO) {
    turso = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return turso;
}

// ---------------------------------------------------------------------------
// Ruta del archivo JSON (solo para modo local)
// ---------------------------------------------------------------------------

const DB_PATH = !process.env.DB_PATH
  ? ES_VERCEL
    ? '/tmp/catalogo.json'
    : path.join(RAIZ_PROYECTO, 'data', 'catalogo.json')
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
    if (ES_PRODUCCION) {
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
// Modo JSON local (síncrono, envuelto en promesa para interfaz consistente)
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
// Modo Turso (libSQL, async)
// ---------------------------------------------------------------------------

async function inicializarTurso() {
  const db = obtenerTurso();
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'admin',
      creado_en TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      categoria TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

async function sembrarTurso() {
  const db = obtenerTurso();
  if (!db) return;

  const admin = crearAdmin();
  await db.execute(
    `INSERT OR IGNORE INTO usuarios (id, usuario, password_hash, rol, creado_en)
     VALUES (?, ?, ?, ?, ?)`,
    [admin.id, admin.usuario, admin.passwordHash, admin.rol, admin.creadoEn]
  );

  const ahora = AHORA();
  for (const p of PRODUCTOS_SEED) {
    await db.execute(
      `INSERT OR IGNORE INTO productos
       (id, nombre, descripcion, precio, categoria, stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.nombre, p.descripcion, p.precio, p.categoria, p.stock, ahora, ahora]
    );
  }
}

async function leerTurso() {
  const db = obtenerTurso();
  if (!db) throw new Error('Turso no está configurado.');

  await inicializarTurso();

  const [rowsUsuarios] = await db.execute('SELECT * FROM usuarios');
  const [rowsProductos] = await db.execute('SELECT * FROM productos');

  const usuarios = rowsUsuarios.rows.map((r) => ({
    id: r.id,
    usuario: r.usuario,
    passwordHash: r.password_hash,
    rol: r.rol,
    creadoEn: r.creado_en,
  }));

  const productos = rowsProductos.rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    precio: r.precio,
    categoria: r.categoria,
    stock: r.stock,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  // Garantizar que exista al menos un admin.
  if (usuarios.length === 0) {
    const admin = crearAdmin();
    await db.execute(
      `INSERT INTO usuarios (id, usuario, password_hash, rol, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [admin.id, admin.usuario, admin.passwordHash, admin.rol, admin.creadoEn]
    );
    usuarios.push(admin);
  }

  return { usuarios, productos };
}

async function escribirTurso(estado) {
  const db = obtenerTurso();
  if (!db) throw new Error('Turso no está configurado.');

  await inicializarTurso();

  // Reemplazo completo: borrar y volver a insertar (volumen pequeño).
  await db.execute('DELETE FROM productos');
  await db.execute('DELETE FROM usuarios');

  const ahora = AHORA();
  for (const u of estado.usuarios || []) {
    await db.execute(
      `INSERT INTO usuarios (id, usuario, password_hash, rol, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [u.id, u.usuario, u.passwordHash, u.rol, u.creadoEn || ahora]
    );
  }

  for (const p of estado.productos || []) {
    await db.execute(
      `INSERT INTO productos
       (id, nombre, descripcion, precio, categoria, stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.categoria,
        p.stock,
        p.createdAt || ahora,
        p.updatedAt || ahora,
      ]
    );
  }
}

async function reiniciarTurso() {
  const db = obtenerTurso();
  if (!db) throw new Error('Turso no está configurado.');

  await db.execute('DELETE FROM productos');
  await db.execute('DELETE FROM usuarios');
  await sembrarTurso();
  return leerTurso();
}

// ---------------------------------------------------------------------------
// API unificada (async en ambos modos)
// ---------------------------------------------------------------------------

async function leer() {
  if (USAR_TURSO) return leerTurso();
  return leerJson();
}

async function escribir(estado) {
  if (USAR_TURSO) return escribirTurso(estado);
  escribirJson(estado);
}

async function reiniciar() {
  if (USAR_TURSO) return reiniciarTurso();
  return reiniciarJson();
}

// Resumen para el health check y los scripts.
async function estado() {
  const datos = await leer();
  return {
    archivo: USAR_TURSO ? 'turso (libSQL)' : DB_PATH,
    formato: USAR_TURSO ? 'Turso (libSQL)' : 'JSON',
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
  USAR_TURSO,
  crearAdmin,
  crearEstadoInicial,
};
