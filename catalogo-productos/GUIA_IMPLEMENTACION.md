# Guía paso a paso — Catálogo de productos con Node.js, Express, JWT y JSON

> **Objetivo:** implementar la misma lógica de esta aplicación, pero con tu propio diseño.
>
> **Regla de oro:** la lógica y los contratos de la API se mantienen; el HTML, el CSS y la forma de las pantallas son libres.

---

## 0. Cómo funciona la aplicación

El flujo completo es:

```
Navegador (HTML/CSS/JS)
        │  fetch()
        ▼
Express (rutas)
        │
        ▼
Middleware (JWT y rol admin)
        │
        ▼
Controlador (traduce HTTP ↔ servicio)
        │
        ▼
Servicio (reglas de negocio)
        │
        ▼
database.js (lee/escribe el archivo JSON)
        │
        ▼
data/catalogo.json
```

Responsabilidades por capa:

| Capa | Responsabilidad | NO debe hacer |
|---|---|---|
| `routes` | Definir método + ruta + middlewares | Lógica de negocio |
| `middleware` | Verificar token, rol y errores | Consultar datos |
| `controllers` | Leer `req`, llamar al servicio, responder | Reglas de negocio |
| `services` | Validar, calcular y decidir | Conocer `req`/`res` |
| `config/database.js` | Leer y escribir el JSON | Reglas del catálogo |
| `public/` | Mostrar y consumir la API | Guardar secretos |

**Ventaja:** puedes cambiar todo el diseño sin tocar el backend.

---

## 1. Requisitos

- Node.js 20 o superior.
- npm.
- Un editor de código (VS Code recomendado).
- Postman o `curl` para probar la API (opcional).

Verifica:

```bash
node -v
npm -v
```

---

## 2. Crear el proyecto e instalar dependencias

```bash
mkdir catalogo-productos
cd catalogo-productos
npm init -y
npm install express cors dotenv jsonwebtoken bcryptjs @libsql/client
npm install --save-dev nodemon
```

Para qué sirve cada una:

| Paquete | Uso |
|---|---|
| `express` | Servidor HTTP y rutas |
| `cors` | Permitir peticiones desde el frontend |
| `dotenv` | Leer variables del archivo `.env` |
| `jsonwebtoken` | Crear y verificar tokens JWT |
| `bcryptjs` | Cifrar contraseñas |
| `@libsql/client` | Cliente de Turso/libSQL para producción (Vercel) |
| `nodemon` | Reiniciar el servidor al guardar cambios |

En `package.json`, agrega los scripts:

```json
{
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "db:reset": "node scripts/reset-db.js",
    "db:inspect": "node scripts/inspect-db.js",
    "smoke": "node scripts/smoke-test.js"
  }
}
```

---

## 3. Crear la estructura de carpetas

```
catalogo-productos/
├─ src/
│  ├─ config/
│  │  ├─ config.js          # Variables generales
│  │  ├─ database.js        # Lectura/escritura del JSON
│  │  └─ jwt.js             # Secreto y expiración del token
│  ├─ models/
│  │  ├─ Producto.js        # Documentación del esquema
│  │  └─ Usuario.js
│  ├─ services/
│  │  ├─ authService.js
│  │  └─ productoService.js
│  ├─ controllers/
│  │  ├─ authController.js
│  │  └─ productoController.js
│  ├─ routes/
│  │  ├─ authRoutes.js
│  │  └─ productoRoutes.js
│  ├─ middleware/
│  │  ├─ authMiddleware.js
│  │  ├─ loginRateLimit.js   # Límite de intentos fallidos
│  │  └─ errorHandler.js
│  ├─ expressApp.js         # Configuración de Express
│  └─ server.js             # Arranque del servidor
├─ api/
│  └─ index.js              # Adaptador serverless para Vercel
├─ public/                  # Tu diseño va aquí
│  ├─ index.html            # Login
│  ├─ productos.html        # Panel
│  └─ assets/
│     ├─ css/estilos.css
│     └─ js/catalogo.js
├─ data/                    # Se crea sola al iniciar
├─ scripts/
│  ├─ reset-db.js
│  ├─ inspect-db.js
│  └─ smoke-test.js
├─ .env
├─ .gitignore
├─ package.json
└─ README.md
```

Crea las carpetas vacías:

```bash
mkdir src src/config src/models src/services src/controllers src/routes src/middleware public public/assets public/assets/css public/assets/js data scripts
```

---

## 4. Configurar variables de entorno

Crea `.env` en la raíz:

```env
PORT=3000
HOST=localhost
NODE_ENV=development

JWT_SECRET=cambia_este_secreto_por_uno_largo_y_aleatorio
JWT_EXPIRES_IN=1h

DB_PATH=./data/catalogo.json

ADMIN_USER=admin
ADMIN_PASSWORD=123456
```

Crea `.gitignore`:

```gitignore
node_modules/
.env
.env.local
*.log

# Datos generados
data/*.json
```

> **Nunca subas `.env` a GitHub ni a Vercel.** En Vercel las variables se configuran en el panel del proyecto.

---

## 5. Capa de datos: `src/config/database.js`

Esta capa es la única que toca los datos. Soporta **dos modos automáticos**:

| Modo | Cuándo se activa | Persistencia |
|---|---|---|
| JSON local | Sin `TURSO_URL` ni `TURSO_AUTH_TOKEN` | Archivo `data/catalogo.json` |
| Turso/libSQL | Con `TURSO_URL` y `TURSO_AUTH_TOKEN` | Base de datos en la nube (Vercel) |

Expone:

| Función | Qué hace |
|---|---|
| `leer()` | Devuelve `{ usuarios, productos }` |
| `escribir(estado)` | Guarda el estado completo |
| `estado()` | Resumen para el health check |
| `reiniciar()` | Borra y vuelve a sembrar |
| `DB_PATH` | Ruta del archivo (solo modo JSON) |
| `USAR_TURSO` | Booleano: `true` si usa Turso |

Estructura de los datos (ambos modos):

```json
{
  "usuarios": [
    {
      "id": 1,
      "usuario": "admin",
      "passwordHash": "$2a$10$...",
      "rol": "admin",
      "creadoEn": "2026-01-01T00:00:00.000Z"
    }
  ],
  "productos": [
    {
      "id": "prod-001",
      "nombre": "Laptop",
      "descripcion": "Descripción",
      "precio": 1299.99,
      "categoria": "Computadoras",
      "stock": 12,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

Puntos clave de la implementación:

1. Si no hay Turso configurado, se crea el archivo JSON con un administrador y productos de ejemplo.
2. La contraseña del admin se guarda **cifrada con bcrypt**.
3. En modo JSON, la escritura es síncrona (`fs.writeFileSync`); en Turso, es async (`await`).
4. Se usa `DB_PATH` solo en modo JSON. En Turso, no se define.
5. Todas las funciones (`leer`, `escribir`, `estado`, `reiniciar`) son **async**, por eso los servicios y controladores usan `await`.

Variables de entorno para Turso:

| Variable | Descripción |
|---|---|
| `TURSO_URL` | URL de tu base de datos Turso (`libsql://...`). También sirve `TURSO_DATABASE_URL`. |
| `TURSO_AUTH_TOKEN` | Token de autenticación de Turso |

---

## 6. Configuración general y JWT

`src/config/config.js`:

```js
require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  env: process.env.NODE_ENV || 'development',
};
```

`src/config/jwt.js`:

```js
require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'cambiar_en_produccion',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  algorithm: 'HS256',
};
```

> Todos los módulos que lean `process.env` deben cargar `dotenv` antes.

---

## 7. Modelos (documentación de la estructura)

No son clases obligatorias: sirven para documentar los campos.

`src/models/Producto.js`:

```js
module.exports = {
  coleccion: 'productos',
  camposObligatorios: ['nombre', 'precio', 'stock'],
  reglas: {
    nombre: 'No puede estar vacío.',
    precio: 'Debe ser un número mayor que 0.',
    stock: 'Debe ser un entero mayor o igual a 0.',
  },
};
```

`src/models/Usuario.js`:

```js
module.exports = {
  coleccion: 'usuarios',
  roles: ['admin', 'usuario'],
};
```

---

## 8. Servicio de autenticación

`src/services/authService.js` debe exponer:

- `autenticar(usuario, contrasena)`
- `cambiarContrasena(id, { contrasenaActual, contrasenaNueva })`
- `verificarToken(token)`

### Login

1. Validar que usuario y contraseña lleguen.
2. Llamar `await leer()` y buscar el usuario en `datos.usuarios`.
3. Comparar con `bcrypt.compare`.
4. Si coincide, firmar el JWT con `{ id, usuario, rol }`.
5. Devolver `{ token, usuario }`.

```js
const datos = await leer();
const encontrado = datos.usuarios.find(
  (u) => u.usuario === String(usuario).trim()
);

if (!encontrado) {
  throw { codigo: 401, mensaje: 'Credenciales incorrectas.' };
}

const coincide = await bcrypt.compare(contrasena, encontrado.passwordHash);
if (!coincide) {
  throw { codigo: 401, mensaje: 'Credenciales incorrectas.' };
}
```

> Usa el **mismo mensaje** para usuario inexistente y contraseña incorrecta: no reveles cuál falló.

### Verificación del token

```js
const decoded = jwt.verify(token, jwtConfig.secret, {
  algorithms: [jwtConfig.algorithm],
});
return { valido: true, usuario: decoded };
```

Maneja `TokenExpiredError` y `JsonWebTokenError` con código **401**.

### Cambio de contraseña (opcional)

- Exige la contraseña actual.
- La nueva debe tener mínimo 6 caracteres y ser distinta.
- Guarda solo el nuevo `passwordHash`.
- Si no vas a mostrar esta opción en el panel, puedes omitirla.

---

## 9. Servicio de productos

`src/services/productoService.js` debe exponer:

| Función | Qué hace |
|---|---|
| `listarProductos({ buscar, categoria })` | Filtra y ordena |
| `obtenerProductoPorId(id)` | Busca uno o devuelve `null` |
| `crearProducto(datos)` | Valida y agrega |
| `actualizarProducto(id, datos)` | Actualiza campos enviados |
| `eliminarProducto(id)` | Quita el producto |
| `obtenerEstadisticas()` | Calcula indicadores |

### Validaciones

- `nombre`: texto no vacío.
- `precio`: número mayor que 0.
- `stock`: entero mayor o igual a 0.
- En actualización: al menos un campo.

### Crear producto

```js
const { randomUUID } = require('crypto');

const nuevo = {
  id: randomUUID(),
  nombre: datos.nombre.trim(),
  descripcion: datos.descripcion ? String(datos.descripcion).trim() : '',
  precio: Number(datos.precio),
  categoria: datos.categoria ? String(datos.categoria).trim() : '',
  stock: Number(datos.stock),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const estado = await leer();
estado.productos.push(nuevo);
await escribir(estado);
return nuevo;
```

> Usa `Number()` en lugar de `parseFloat()`/`parseInt()`: así `'12abc'` y los decimales en `stock` se rechazan con 400.

### Búsqueda sin tildes ni mayúsculas

```js
function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
```

### Estadísticas

```js
{
  totalProductos,
  unidadesDisponibles,
  valorInventario, // suma de precio × stock
  stockBajo        // productos con stock <= 5
}
```

---

## 10. Middleware

`src/middleware/authMiddleware.js`:

- `verificar`: lee `Authorization: Bearer <token>`, valida y guarda `req.usuario`.
- `soloAdmin`: exige `req.usuario.rol === 'admin'`.

Respuestas:

| Caso | Código |
|---|---|
| Sin header o formato inválido | 401 |
| Token inválido o expirado | 401 |
| Token válido sin rol admin | 403 |

```js
const partes = authHeader.split(' ');
if (partes.length !== 2 || partes[0] !== 'Bearer') {
  return res.status(401).json({ ok: false, mensaje: 'Formato de token inválido.' });
}

const resultado = authService.verificarToken(partes[1]);
req.usuario = resultado.usuario;
next();
```

`src/middleware/errorHandler.js`:

- Convierte cualquier error en `{ ok: false, mensaje }`.
- Usa `err.codigo` o `err.status`; si no, 500.
- Detecta JSON mal formado (`entity.parse.failed`) y responde 400.

---

## 11. Controladores

Los controladores solo traducen HTTP ↔ servicio.

`src/controllers/productoController.js`:

| Función | Respuesta |
|---|---|
| `listarProductos` | 200 + `{ ok, mensaje, total, data }` |
| `obtenerEstadisticas` | 200 + `{ ok, mensaje, data }` |
| `obtenerProducto` | 200 o 404 |
| `crearProducto` | 201 + `{ ok, mensaje, data }` |
| `actualizarProducto` | 200 + `{ ok, mensaje, data }` |
| `eliminarProducto` | 204 sin cuerpo |

`src/controllers/authController.js`:

- `login`: 200 + `{ ok, mensaje, token, usuario }`.
- `cambiarContrasena`: 200 + `{ ok, mensaje }`.

Todos usan `try/catch` y `next(error)`.

---

## 12. Rutas

`src/routes/productoRoutes.js`:

```js
router.get('/', productoController.listarProductos);
router.get('/estadisticas', productoController.obtenerEstadisticas);
router.get('/:id', productoController.obtenerProducto);

router.post('/', verificar, soloAdmin, productoController.crearProducto);
router.put('/:id', verificar, soloAdmin, productoController.actualizarProducto);
router.delete('/:id', verificar, soloAdmin, productoController.eliminarProducto);
```

> Declara `/estadisticas` **antes** de `/:id`, o se interpretará como un ID.

`src/routes/authRoutes.js`:

```js
router.post('/login', authController.login);
router.put('/password', verificar, authController.cambiarContrasena);
```

### Contrato de la API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Estado de la API |
| POST | `/api/auth/login` | Público | Login y token |
| PUT | `/api/auth/password` | JWT | Cambiar contraseña |
| GET | `/api/productos` | Público | Listar y buscar |
| GET | `/api/productos/estadisticas` | Público | Indicadores |
| GET | `/api/productos/:id` | Público | Detalle |
| POST | `/api/productos` | JWT + admin | Crear |
| PUT | `/api/productos/:id` | JWT + admin | Actualizar |
| DELETE | `/api/productos/:id` | JWT + admin | Eliminar |

Códigos: **200**, **201**, **204**, **400**, **401**, **403**, **404**, **500**.

---

## 13. Express y arranque

`src/expressApp.js`:

```js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' });
});

app.use(errorHandler);

module.exports = app;
```

`src/server.js`:

```js
const app = require('./expressApp');
const config = require('./config/config');

app.listen(config.port, () => {
  console.log(`Servidor en http://localhost:${config.port}`);
});
```

**Checkpoint:** ejecuta `npm run dev` y abre `http://localhost:3000/api/health`. Debe responder 200 con `baseDatos: "JSON"`.

---

## 14. Scripts de apoyo

### `scripts/reset-db.js`

- Borra el archivo JSON.
- Vuelve a crear admin + productos de ejemplo.
- Úsalo cuando quieras empezar de cero.

### `scripts/inspect-db.js`

- Muestra cuántos productos y usuarios hay.
- Muestra solo los primeros caracteres del hash (nunca la contraseña).

### `scripts/smoke-test.js`

Prueba automática contra el servidor encendido. Verifica:

- Health check.
- Login correcto e incorrecto.
- Listado, búsqueda y estadísticas.
- 401 sin token, 401 con token inválido, 403 sin rol admin.
- CRUD completo (201, 200, 204, 400, 404).
- Cambio de contraseña y restauración.

**Checkpoint:** con el servidor arriba, `npm run smoke` debe dar todo en verde.

---

## 15. Frontend: lógica que debes conservar

Aquí es donde entra **tu diseño**. Puedes usar Bootstrap, Tailwind, CSS puro, React, etc. Lo único que no debe cambiar es **cómo se habla con la API**.

### 15.1 Login

1. Formulario con usuario y contraseña.
2. `POST /api/auth/login` con:

```json
{ "usuario": "admin", "contraseña": "123456" }
```

3. Si responde 200, guarda:

```js
localStorage.setItem('token_crud_productos', datos.token);
localStorage.setItem('usuario_crud_productos', JSON.stringify(datos.usuario));
```

4. Redirige al panel.
5. Si responde 400/401, muestra el mensaje de error.

> No muestres las credenciales demo en la pantalla de login.

### 15.2 Proteger el panel

Al cargar el panel:

- Si no hay token en `localStorage`, muestra un aviso o redirige al login.
- Si hay token, úsalo en las peticiones protegidas.

```js
const token = localStorage.getItem('token_crud_productos');

fetch('/api/productos', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### 15.3 Listar productos

`GET /api/productos` devuelve:

```json
{
  "ok": true,
  "total": 3,
  "data": [
    {
      "id": "prod-001",
      "nombre": "Laptop",
      "descripcion": "...",
      "precio": 1299.99,
      "categoria": "Computadoras",
      "stock": 12,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

Renderiza `datos.data` como tú quieras: tarjetas, tabla, lista, etc.

### 15.4 Buscar

Envía el texto como query:

```js
fetch(`/api/productos?buscar=${encodeURIComponent(texto)}`);
```

Usa un pequeño retraso (debounce) para no hacer una petición por cada tecla.

### 15.5 Crear y editar

Mismo formulario para ambos:

- Sin ID → `POST /api/productos`.
- Con ID → `PUT /api/productos/:id`.

Cuerpo:

```json
{
  "nombre": "Monitor",
  "descripcion": "27 pulgadas",
  "precio": 350,
  "categoria": "Computadoras",
  "stock": 8
}
```

Siempre envía el token:

```js
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
}
```

### 15.6 Eliminar

```js
fetch(`/api/productos/${id}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

Si responde **204**, se eliminó (no trae cuerpo).

### 15.7 Estadísticas

`GET /api/productos/estadisticas`:

```json
{
  "ok": true,
  "data": {
    "totalProductos": 3,
    "unidadesDisponibles": 87,
    "valorInventario": 20121.88,
    "stockBajo": 0
  }
}
```

Muéstralas como tarjetas o indicadores con tu diseño.

### 15.8 Seguridad en el frontend

- Escapa el texto antes de insertarlo con `innerHTML`:

```js
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto ?? '');
  return div.innerHTML;
}
```

- Nunca guardes la contraseña en `localStorage`.
- El token sí puede guardarse, pero ten en cuenta que expira.

---

## 16. Cómo adaptar tu diseño sin romper la lógica

1. **Conserva los IDs y nombres de funciones** o ajusta el JS si los cambias.
2. Mantén los mismos endpoints y claves JSON.
3. Mantén el header `Authorization: Bearer <token>`.
4. Mantén el formato de respuesta `{ ok, mensaje, data }`.
5. Cambia libremente colores, tipografías, tarjetas, tablas, modales y animaciones.
6. Si usas otro framework, solo replica las llamadas `fetch`.

Checklist de diseño:

- [ ] Pantalla de login propia.
- [ ] Panel con listado.
- [ ] Buscador.
- [ ] Formulario de crear/editar.
- [ ] Confirmación de eliminar.
- [ ] Mensajes de éxito/error.
- [ ] Diseño responsive.

---

## 17. Pruebas paso a paso

### Prueba 1: salud

```bash
curl http://localhost:3000/api/health
```

### Prueba 2: login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contraseña":"123456"}'
```

Guarda el `token`.

### Prueba 3: listar

```bash
curl http://localhost:3000/api/productos
```

### Prueba 4: crear sin token (debe dar 401)

```bash
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Monitor","precio":350,"stock":8}'
```

### Prueba 5: crear con token (debe dar 201)

```bash
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Monitor","precio":350,"stock":8,"categoria":"Computadoras"}'
```

### Prueba 6: actualizar y eliminar

```bash
curl -X PUT http://localhost:3000/api/productos/ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"precio":400}'

curl -X DELETE http://localhost:3000/api/productos/ID \
  -H "Authorization: Bearer TOKEN"
```

### Prueba 7: validaciones

- Precio negativo → **400**.
- Producto inexistente → **404**.
- Token inválido → **401**.
- Token de usuario sin rol admin → **403**.

---

## 18. Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `401` siempre | No se envía el header o el token expiró | Revisa `Authorization: Bearer ...` |
| `403` | El token no tiene `rol: admin` | Inicia sesión con el admin |
| `Cannot find module` | Ruta mal escrita | Revisa mayúsculas y carpetas |
| `EADDRINUSE` | El puerto 3000 está ocupado | Cambia `PORT` o cierra el otro proceso |
| JSON inválido | Archivo dañado | `npm run db:reset` |
| No aparece el admin | JSON sin usuarios | La app lo recrea al leer, o usa `db:reset` |
| CORS | Falta `app.use(cors())` | Agrégalo antes de las rutas |
| `dotenv` no carga | Se importó después de leer `process.env` | Carga `dotenv` al inicio |

---

## 19. Publicación (opcional)

### Local

```bash
npm start
```

### Vercel + Turso (plan gratuito, recomendado)

El proyecto ya incluye lo necesario para Vercel:

- `api/index.js`: exporta la app de Express como función serverless.
- `vercel.json`: envía todas las peticiones a la función e incluye `public/`.
- `.vercelignore`: excluye `.env`, `data/` y scripts.

```js
// api/index.js
const app = require('../src/expressApp');
module.exports = app;
```

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }],
  "functions": {
    "api/index.js": { "includeFiles": ["public/**"] }
  }
}
```

Pasos:

1. Sube el proyecto a GitHub **sin** `.env`.
2. Crea una base de datos gratuita en [turso.tech](https://turso.tech) y copia `TURSO_URL` y `TURSO_AUTH_TOKEN`.
3. En Vercel: **Add New → Project** e importa el repositorio.
4. En **Root Directory** selecciona la carpeta **`catalogo-productos`** (ahí vive el proyecto dentro del repositorio).
5. Framework Preset: **Other**. Build Command y Output Directory vacíos.
6. Agrega las variables de entorno:
   - `JWT_SECRET` (mínimo 32 caracteres)
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `JWT_EXPIRES_IN=1h`
   - `NODE_ENV=production`
   - `TURSO_URL` (URL de tu base Turso)
   - `TURSO_AUTH_TOKEN` (token de Turso)
7. **No definas `DB_PATH`**: Turso maneja su propio almacenamiento.
8. Deploy y verifica `https://tu-proyecto.vercel.app/api/health`.

Limitaciones del plan gratuito:

- Vercel Hobby: invocaciones de funciones limitadas, cold start tras inactividad.
- Turso Free: 5 GB de almacenamiento, 500 M lecturas y 10 M escrituras al mes, hasta 100 bases de datos. Suficiente para una entrega académica.
- No requieres tarjeta de crédito en ninguna de las dos plataformas.

---

## 20. Orden recomendado de trabajo

1. Crear proyecto e instalar dependencias.
2. Crear carpetas y `.env`.
3. Implementar `database.js` y comprobar que crea el JSON.
4. Implementar `authService` + login.
5. Implementar `authMiddleware`.
6. Implementar `productoService`.
7. Implementar controladores y rutas.
8. Montar Express y probar con `curl`/Postman.
9. Crear los scripts de reset e inspección.
10. Hacer el login del frontend.
11. Hacer el listado, buscador y estadísticas.
12. Hacer crear/editar/eliminar.
13. Probar todo el flujo.
14. Cambiar el diseño a tu gusto.
15. Documentar en el README.

---

## 21. Checklist final

- [ ] `npm start` levanta el servidor.
- [ ] `/api/health` responde 200 y `baseDatos: "JSON"`.
- [ ] Login correcto devuelve token.
- [ ] Login incorrecto devuelve 401.
- [ ] Listado público funciona.
- [ ] Búsqueda y estadísticas funcionan.
- [ ] Crear sin token devuelve 401.
- [ ] Crear con token devuelve 201.
- [ ] Actualizar devuelve 200.
- [ ] Eliminar devuelve 204.
- [ ] Precio negativo devuelve 400.
- [ ] Producto inexistente devuelve 404.
- [ ] El frontend guarda el token.
- [ ] El CRUD funciona desde el panel.
- [ ] No hay errores en la consola.
- [ ] El diseño es propio y responsive.
- [ ] En producción (Vercel), `baseDatos` responde `"Turso (libSQL)"` y los datos persisten tras recargar.
