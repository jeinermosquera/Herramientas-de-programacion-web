# API REST del Catálogo de Productos

Proyecto académico completo (Módulo 3) que implementa un **CRUD funcional** de productos con arquitectura por capas, autenticación **JWT**, contraseñas cifradas con **bcrypt**, persistencia en **Turso/libSQL** (producción) o **archivo JSON** (local), **CORS** y un panel administrativo responsive con **Bootstrap 5**.

---

## 1. Descripción

La aplicación permite administrar un catálogo de productos:

- Consultar todos los productos (público).
- Consultar un producto por ID (público).
- Crear, actualizar y eliminar productos (requiere JWT + rol admin).
- Iniciar sesión para obtener el token.
- Buscar productos por nombre, descripción o categoría.
- Ver indicadores: total de productos, unidades disponibles, stock bajo y valor del inventario.

---

## 2. Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express.js |
| Base de datos | Turso/libSQL (producción) o archivo JSON local (`fs`, desarrollo) |
| Autenticación | JSON Web Token (`jsonwebtoken`) |
| Cifrado | `bcryptjs` |
| CORS | `cors` |
| Variables de entorno | `dotenv` |
| Frontend | HTML5, CSS3, JavaScript (fetch) |
| Framework CSS | Bootstrap 5.3 + Bootstrap Icons |
| Pruebas | Script de humo (`npm run smoke`) |

---

## 3. Requisitos

- Node.js 20 o superior (probado con Node.js 24).
- npm.
- En desarrollo: no se requiere servidor de base de datos; los datos se guardan en un archivo JSON local (`data/catalogo.json`).
- En producción (Vercel): se usa Turso/libSQL. Necesitas `TURSO_URL` y `TURSO_AUTH_TOKEN` como variables de entorno.

---

## 4. Instalación de dependencias

```bash
npm install
```

> En producción (Vercel + Turso), `npm install` ya incluye `@libsql/client`. Solo necesitas configurar las variables `TURSO_URL` y `TURSO_AUTH_TOKEN`.

---

## 5. Configuración del archivo `.env`

Crea un archivo `.env` en la raíz del proyecto con este contenido:

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

> **Importante:** `JWT_SECRET` y `ADMIN_PASSWORD` no deben subirse al repositorio. `.env` está incluido en `.gitignore` y nunca se sube a Vercel; allí las variables se configuran en **Settings → Environment Variables**.
>
> En producción (`NODE_ENV=production`) la aplicación exige `JWT_SECRET` (mínimo 32 caracteres) y `ADMIN_PASSWORD`. Si faltan, no arranca y muestra un error claro en los logs.

---

## 6. Configuración de los datos

La aplicación soporta dos modos de almacenamiento, detectados automáticamente:

### Modo desarrollo (JSON local)
Si no defines `TURSO_URL` ni `TURSO_AUTH_TOKEN`, la aplicación usa un archivo JSON local:

- No se requiere servidor de base de datos: al iniciar se crea automáticamente `data/catalogo.json`.
- `src/config/database.js` crea el archivo si no existe y siembra:
  - Un usuario administrador (`ADMIN_USER` / `ADMIN_PASSWORD`) con contraseña cifrada con bcrypt.
  - Tres productos de ejemplo.
- Para reiniciar: `npm run db:reset`.

### Modo producción (Turso/libSQL en Vercel)
Si defines `TURSO_URL` y `TURSO_AUTH_TOKEN`, la aplicación usa Turso en lugar del archivo JSON:

- Los datos son persistentes y sobreviven a reinicios y despliegues en Vercel.
- Se crean automáticamente las tablas `usuarios` y `productos` con los datos semilla.
- No definas `DB_PATH` en Vercel; Turso maneja su propio almacenamiento.

Estructura de los datos (ambos modos):

```json
{
  "usuarios": [
    { "id": 1, "usuario": "admin", "passwordHash": "$2a$10$...", "rol": "admin", "creadoEn": "..." }
  ],
  "productos": [
    { "id": "prod-001", "nombre": "Laptop Dell XPS 13", "precio": 1299.99, "stock": 12, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

> El script `npm run db:reset` borra todos los datos creados y vuelve al estado inicial (solo admin + 3 productos).

---

## 7. Cómo iniciar el servidor

```bash
# Desarrollo (reinicio automático con nodemon)
npm run dev

# Producción / ejecución normal
npm start
```

El servidor queda disponible en:

```
http://localhost:3000
```

Al iniciar se muestra la ruta de la base de datos y las URLs principales.

---

## 8. Credenciales iniciales de prueba

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `123456` |

Se pueden cambiar con `ADMIN_USER` y `ADMIN_PASSWORD` **antes** del primer arranque (o después de `npm run db:reset`).

También puedes cambiarla por API con `PUT /api/auth/password` (ver apartado 9) o modificando `ADMIN_PASSWORD` en `.env` y ejecutando `npm run db:reset` (esto último reinicia también los productos).

---

## 9. Endpoints disponibles

Base URL: `http://localhost:3000`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/health` | Público | Estado de la API y de la base de datos |
| GET | `/api/productos` | Público | Lista productos. Acepta `?buscar=` y `?categoria=` |
| GET | `/api/productos/estadisticas` | Público | Indicadores del inventario |
| GET | `/api/productos/:id` | Público | Obtiene un producto por ID |
| POST | `/api/productos` | JWT + admin | Crea un producto |
| PUT | `/api/productos/:id` | JWT + admin | Actualiza un producto |
| DELETE | `/api/productos/:id` | JWT + admin | Elimina un producto |
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve el token |
| PUT | `/api/auth/password` | JWT | Cambia la contraseña del usuario autenticado |

### Estructura de respuesta

Éxito:

```json
{
  "ok": true,
  "mensaje": "Producto creado exitosamente.",
  "data": { "id": "...", "nombre": "...", "precio": 10, "stock": 5 }
}
```

Error:

```json
{
  "ok": false,
  "mensaje": "El precio debe ser un número mayor que 0."
}
```

### Códigos HTTP utilizados

| Código | Uso |
|--------|-----|
| 200 | Operación exitosa (GET, PUT, login) |
| 201 | Producto creado |
| 204 | Producto eliminado (sin cuerpo) |
| 400 | Datos inválidos o incompletos |
| 401 | Token ausente, inválido o expirado / credenciales incorrectas |
| 403 | Token válido pero sin rol de administrador |
| 404 | Producto o ruta inexistente |
| 413 | Cuerpo de la petición demasiado grande |
| 429 | Demasiados intentos fallidos de login |
| 500 | Error interno del servidor |

### Ejemplo con curl

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contraseña":"123456"}'

# 2. Crear producto (reemplaza TOKEN)
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Monitor","precio":350,"stock":8,"categoria":"Computadoras"}'

# 3. Cambiar la contraseña (reemplaza TOKEN y los valores)
curl -X PUT http://localhost:3000/api/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"contraseñaActual":"123456","contraseñaNueva":"nuevaClave123"}'
```

---

## 10. Estructura del proyecto

```
crud funcional/
├─ src/
│  ├─ config/
│  │  ├─ database.js      # Lectura/escritura del JSON, seed y reinicio
│  │  ├─ config.js        # Variables generales
│  │  └─ jwt.js           # Secreto y expiración JWT
│  ├─ models/             # Documentación de esquemas (Producto, Usuario)
│  ├─ services/           # Lógica de negocio y acceso al archivo JSON
│  ├─ controllers/        # Traducción HTTP ↔ servicio
│  ├─ routes/             # Definición de endpoints
│  ├─ middleware/         # JWT, rol admin, límite de login y errores
│  ├─ expressApp.js       # Express + middlewares + rutas
│  └─ server.js           # Arranque del servidor local
├─ api/
│  └─ index.js            # Adaptador serverless para Vercel
├─ public/                # Panel administrativo (Bootstrap 5)
│  ├─ index.html          # Login
│  ├─ productos.html      # Panel con buscador e indicadores
│  └─ assets/             # CSS y JS (catalogo.js)
├─ data/                  # Archivo JSON de datos (se genera al iniciar)
├─ scripts/               # Reinicio de BD, inspección y prueba de humo
├─ vercel.json            # Rutas y configuración de la función en Vercel
├─ .vercelignore          # Archivos que no se suben a Vercel
├─ package.json
└─ README.md
```

---

## 11. Pruebas manuales y de humo

La verificación funcional se realiza con un script de humo que recorre todos los endpoints y con peticiones `curl` directas.

```bash
# Prueba integral contra el servidor en ejecución (32 verificaciones)
npm run smoke

# Resumen del archivo JSON de datos
npm run db:inspect
```

El script `smoke` comprueba:

- Login correcto, incorrecto y sin datos.
- Cambio de contraseña: sin token, contraseña actual incorrecta, nueva demasiado corta, cambio exitoso y restauración.
- Rutas protegidas sin token, con token inválido y con token sin rol admin (403).
- CRUD completo (200, 201, 204, 400, 404).
- Búsqueda y estadísticas.
- CORS y manejo de errores.

---

## 12. Cómo demostrar cada criterio de evaluación

| Criterio | Cómo demostrarlo |
|----------|------------------|
| **CRUD completo y funcional** | Inicia sesión en `http://localhost:3000`, crea un producto, edítalo, búscalo y elimínalo. También puedes ejecutar `npm run smoke`, que recorre el CRUD completo. |
| **Validación y códigos HTTP** | Ejecuta `npm run smoke`: verifica 400 (precio negativo), 404 (producto inexistente), 401 (login incorrecto), 201 (creación) y 204 (eliminación). También puedes probar los ejemplos `curl` del apartado 9. |
| **CORS y JWT** | DevTools → Network: verifica `Access-Control-Allow-Origin`. Sin token, `POST /api/productos` devuelve 401; con token válido devuelve 201. Con token de rol `usuario` devuelve 403 (lo comprueba `npm run smoke`). |
| **Estructura por capas** | Muestra `src/routes`, `controllers`, `services`, `models`, `middleware`, `config`. Explica que `expressApp.js` solo monta middlewares y rutas. |
| **Pruebas de la API** | Ejecuta `npm run smoke` y muestra las 32 verificaciones en verde. Opcionalmente repite las peticiones con `curl` o desde el panel. |
| **Base de datos** | Abre `data/catalogo.json` (local) o el panel de Turso (producción) y muestra los arrays `productos` y `usuarios`; el usuario admin tiene la contraseña en hash bcrypt. Con Turso, los datos persisten tras recargar y despliega en Vercel. |
| **Frontend Bootstrap 5** | Muestra login, panel, buscador, indicadores, modales, toasts y diseño responsive (reduce la ventana). |

---

## 13. Seguridad implementada

- Contraseñas cifradas con bcrypt (nunca en texto plano).
- Cambio de contraseña protegido: exige la contraseña actual y guarda solo el nuevo hash.
- Secretos en `.env` (no en el código) y obligatorios en producción.
- Acceso a datos centralizado y validación antes de escribir en el JSON.
- Token JWT con expiración (`JWT_EXPIRES_IN`) y algoritmo fijado (`HS256`).
- Middleware de rol: las operaciones de escritura exigen `rol = admin` (403 en caso contrario).
- Límite de 10 intentos fallidos de login por IP cada 10 minutos (429).
- Cabeceras de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS en producción.
- Límite de 100 KB en el cuerpo de las peticiones.
- Validación estricta de tipos y rangos antes de llegar a la base de datos.
- Escape de HTML en el frontend para evitar XSS.

---

## 14. Despliegue en Vercel (plan gratuito)

El proyecto ya está preparado para Vercel: no hay que crear adaptadores ni cambiar rutas.

| Archivo | Función |
|---|---|
| `api/index.js` | Exporta la app de Express como función serverless. |
| `vercel.json` | Envía todas las peticiones a la función e incluye `public/` en el bundle. |
| `.vercelignore` | Evita subir `.env`, `data/`, `scripts/` y documentación. |

### 14.1 Variables de entorno

En Vercel: **Project → Settings → Environment Variables**. Agrega:

| Variable | Valor | Obligatorio |
|---|---|---|
| `JWT_SECRET` | Cadena aleatoria de **mínimo 32 caracteres**. | Sí |
| `ADMIN_USER` | `admin` (o el usuario que prefieras). | Sí |
| `ADMIN_PASSWORD` | Tu contraseña del panel. | Sí |
| `JWT_EXPIRES_IN` | `1h` | No |
| `NODE_ENV` | `production` | Sí |
| `TURSO_URL` | URL de tu base de datos Turso (ej. `libsql://tu-db.turso.io`). | Sí (para persistencia) |
| `TURSO_AUTH_TOKEN` | Token de autenticación de Turso. | Sí (para persistencia) |

Para generar un secreto seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 14.2 Pasos

1. Sube el proyecto a GitHub (sin `.env`; ya está en `.gitignore`).
2. Crea una base de datos gratuita en [turso.tech](https://turso.tech) y copia `TURSO_URL` y `TURSO_AUTH_TOKEN`.
3. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
4. Importa el repositorio.
5. Framework Preset: **Other**. Deja **Build Command** y **Output Directory** vacíos.
6. Agrega las variables de entorno del apartado 14.1 (incluyendo `TURSO_URL` y `TURSO_AUTH_TOKEN`).
7. Pulsa **Deploy**.
8. Abre la URL `https://tu-proyecto.vercel.app`.

### 14.3 Verificación posterior al despliegue

- `GET https://tu-proyecto.vercel.app/api/health` → 200 con `baseDatos: "Turso (libSQL)"`.
- Inicia sesión con `ADMIN_USER` / `ADMIN_PASSWORD`.
- Crea, edita, busca y elimina un producto. Los datos persisten tras recargar la página.
- Revisa **Deployments → Functions → Logs** si algo falla.

Si aparece `FUNCTION_INVOCATION_FAILED`, casi siempre falta `JWT_SECRET`, `ADMIN_PASSWORD`, `TURSO_URL` o `TURSO_AUTH_TOKEN`.

### 14.4 Limitaciones del plan gratuito

- Vercel Hobby: invocaciones de funciones limitadas, cold start tras inactividad.
- Turso Free: 5 GB de almacenamiento, 500 M lecturas y 10 M escrituras al mes, hasta 100 bases de datos. Suficiente para una entrega académica.
- No requieres tarjeta de crédito en ninguna de las dos plataformas.

