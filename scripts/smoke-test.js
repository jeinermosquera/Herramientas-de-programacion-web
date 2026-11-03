// scripts/smoke-test.js
// -----------------------------------------------------------------------------
// Prueba integral de la API contra un servidor en ejecución.
// Uso:  node scripts/smoke-test.js
// Requiere que el servidor esté arriba (npm start).
// -----------------------------------------------------------------------------

require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'clave_de_desarrollo_local_cambiar_en_produccion_2026';

let tokenAdmin = '';
let productoCreadoId = '';
let pruebas = 0;
let fallos = 0;

async function peticion(metodo, ruta, { cuerpo, token } = {}) {
  const headers = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });

  let datos = null;
  const texto = await respuesta.text();
  if (texto) {
    try { datos = JSON.parse(texto); } catch { datos = texto; }
  }
  return { status: respuesta.status, datos, headers: respuesta.headers };
}

function verificar(nombre, condicion, detalle = '') {
  pruebas += 1;
  if (condicion) {
    console.log(`  ✅ ${nombre}`);
  } else {
    fallos += 1;
    console.log(`  ❌ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
}

(async () => {
  console.log(`\n🔎 Prueba integral contra ${BASE}\n`);

  // 1. Salud / base de datos
  const health = await peticion('GET', '/api/health');
  verificar('GET /api/health → 200', health.status === 200);
  const esBaseDatosValida =
    health.datos?.baseDatos === 'JSON' ||
    health.datos?.baseDatos?.includes('Turso');
  verificar('Base de datos activa', esBaseDatosValida);

  // 2. Login correcto
  const login = await peticion('POST', '/api/auth/login', {
    cuerpo: { usuario: 'admin', contraseña: '123456' },
  });
  verificar('Login correcto → 200', login.status === 200);
  verificar('Devuelve token JWT', typeof login.datos?.token === 'string' && login.datos.token.length > 20);
  tokenAdmin = login.datos?.token || '';

  // 3. Login incorrecto
  const loginMal = await peticion('POST', '/api/auth/login', {
    cuerpo: { usuario: 'admin', contraseña: 'incorrecta' },
  });
  verificar('Login incorrecto → 401', loginMal.status === 401);

  // 4. Listado público
  const lista = await peticion('GET', '/api/productos');
  verificar('GET /api/productos → 200', lista.status === 200);
  verificar('Devuelve array de productos', Array.isArray(lista.datos?.data));
  verificar('CORS habilitado', Boolean(lista.headers.get('access-control-allow-origin')));

  // 5. Búsqueda
  const busqueda = await peticion('GET', '/api/productos?buscar=Laptop');
  verificar('Búsqueda ?buscar=Laptop → 200', busqueda.status === 200);
  verificar('Búsqueda devuelve array', Array.isArray(busqueda.datos?.data));

  // 6. Estadísticas
  const stats = await peticion('GET', '/api/productos/estadisticas');
  verificar('GET /api/productos/estadisticas → 200', stats.status === 200);
  verificar('Indicadores numéricos', typeof stats.datos?.data?.totalProductos === 'number');

  // 7. Consulta por ID (semilla)
  const porId = await peticion('GET', '/api/productos/prod-001');
  verificar('GET /api/productos/prod-001 → 200', porId.status === 200);

  // 8. Producto inexistente
  const noExiste = await peticion('GET', '/api/productos/no-existe');
  verificar('GET producto inexistente → 404', noExiste.status === 404);

  // 9. Sin token
  const sinToken = await peticion('POST', '/api/productos', {
    cuerpo: { nombre: 'X', precio: 1, stock: 1 },
  });
  verificar('POST sin token → 401', sinToken.status === 401);

  // 10. Token inválido
  const tokenMal = await peticion('POST', '/api/productos', {
    cuerpo: { nombre: 'X', precio: 1, stock: 1 },
    token: 'token_invalido_123',
  });
  verificar('POST con token inválido → 401', tokenMal.status === 401);

  // 11. Token válido sin rol admin
  const tokenUsuario = jwt.sign(
    { id: 99, usuario: 'invitado', rol: 'usuario' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const prohibido = await peticion('POST', '/api/productos', {
    cuerpo: { nombre: 'X', precio: 1, stock: 1 },
    token: tokenUsuario,
  });
  verificar('POST con token sin rol admin → 403', prohibido.status === 403);

  // 12. Crear producto
  const creado = await peticion('POST', '/api/productos', {
    cuerpo: {
      nombre: 'Producto de prueba E2E',
      descripcion: 'Creado por el script de humo',
      precio: 99.5,
      categoria: 'Pruebas',
      stock: 7,
    },
    token: tokenAdmin,
  });
  verificar('POST producto válido → 201', creado.status === 201);
  verificar('Producto creado con id', Boolean(creado.datos?.data?.id));
  productoCreadoId = creado.datos?.data?.id || '';

  // 13. Validación: precio negativo
  const invalido = await peticion('POST', '/api/productos', {
    cuerpo: { nombre: 'Inválido', precio: -5, stock: 1 },
    token: tokenAdmin,
  });
  verificar('POST precio negativo → 400', invalido.status === 400);

  // 14. Actualizar
  const actualizado = await peticion('PUT', `/api/productos/${productoCreadoId}`, {
    cuerpo: { nombre: 'Producto de prueba E2E (editado)', precio: 120 },
    token: tokenAdmin,
  });
  verificar('PUT producto → 200', actualizado.status === 200);
  verificar('Datos actualizados', actualizado.datos?.data?.precio === 120);

  // 15. Actualizar inexistente
  const updateNoExiste = await peticion('PUT', '/api/productos/no-existe', {
    cuerpo: { nombre: 'Nada' },
    token: tokenAdmin,
  });
  verificar('PUT inexistente → 404', updateNoExiste.status === 404);

  // 16. Eliminar
  const eliminado = await peticion('DELETE', `/api/productos/${productoCreadoId}`, {
    token: tokenAdmin,
  });
  verificar('DELETE producto → 204', eliminado.status === 204);

  // 18. Eliminar inexistente
  const deleteNoExiste = await peticion('DELETE', '/api/productos/no-existe', {
    token: tokenAdmin,
  });
  verificar('DELETE inexistente → 404', deleteNoExiste.status === 404);

  // 19. Cambio de contraseña
  const CONTRASENA_NUEVA = 'temporal_smoke_789';

  const passSinToken = await peticion('PUT', '/api/auth/password', {
    cuerpo: { contraseñaActual: '123456', contraseñaNueva: CONTRASENA_NUEVA },
  });
  verificar('PUT password sin token → 401', passSinToken.status === 401);

  const passMala = await peticion('PUT', '/api/auth/password', {
    cuerpo: { contraseñaActual: 'incorrecta', contraseñaNueva: CONTRASENA_NUEVA },
    token: tokenAdmin,
  });
  verificar('PUT password actual incorrecta → 401', passMala.status === 401);

  const passCorta = await peticion('PUT', '/api/auth/password', {
    cuerpo: { contraseñaActual: '123456', contraseñaNueva: '123' },
    token: tokenAdmin,
  });
  verificar('PUT password nueva corta → 400', passCorta.status === 400);

  const passOk = await peticion('PUT', '/api/auth/password', {
    cuerpo: { contraseñaActual: '123456', contraseñaNueva: CONTRASENA_NUEVA },
    token: tokenAdmin,
  });
  verificar('PUT password correcta → 200', passOk.status === 200);

  const loginNueva = await peticion('POST', '/api/auth/login', {
    cuerpo: { usuario: 'admin', contraseña: CONTRASENA_NUEVA },
  });
  verificar('Login con contraseña nueva → 200', loginNueva.status === 200);

  // Restaura la contraseña original para no romper ejecuciones posteriores.
  const restaurarPass = await peticion('PUT', '/api/auth/password', {
    cuerpo: { contraseñaActual: CONTRASENA_NUEVA, contraseñaNueva: '123456' },
    token: tokenAdmin,
  });
  verificar('Restaurar contraseña original → 200', restaurarPass.status === 200);

  const loginOriginal = await peticion('POST', '/api/auth/login', {
    cuerpo: { usuario: 'admin', contraseña: '123456' },
  });
  verificar('Login con contraseña original → 200', loginOriginal.status === 200);

  console.log(`\n📊 Resultado: ${pruebas - fallos}/${pruebas} verificaciones correctas.\n`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((error) => {
  console.error('\n❌ Error ejecutando la prueba:', error.message);
  process.exit(1);
});
