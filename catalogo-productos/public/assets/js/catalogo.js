// ============================================================================
// Catálogo de Productos — Frontend
// Consume la API REST (Express + JSON + JWT) mediante fetch.
// ============================================================================

const API_BASE = ''; // misma origen que el servidor
const TOKEN_KEY = 'token_crud_productos';
const USUARIO_KEY = 'usuario_crud_productos';

// --- Login ---
const formLogin = document.getElementById('formLogin');
const btnLogin = document.getElementById('btnLogin');
const spinLogin = document.getElementById('spinLogin');
const textoBtnLogin = document.getElementById('textoBtnLogin');
const errorLogin = document.getElementById('errorLogin');
const textoError = document.getElementById('textoError');

// --- Panel de productos ---
const tablaProductos = document.getElementById('cuerpoTabla');
const spanUsuario = document.getElementById('textoUsuario');
const buscador = document.getElementById('buscador');
const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
const contadorResultados = document.getElementById('contadorResultados');

const elTotal = document.getElementById('totalProductos');
const elUnidades = document.getElementById('unidadesDisponibles');
const elStockBajo = document.getElementById('stockBajo');
const elValor = document.getElementById('valorInventario');

const formProducto = document.getElementById('formProducto');
const btnGuardarProducto = document.getElementById('btnGuardarProducto');
const spinGuardar = document.getElementById('spinGuardar');
const textoBtnGuardar = document.getElementById('textoBtnGuardar');
const productoIdInput = document.getElementById('productoId');
const tituloModal = document.getElementById('tituloModal');

// --- Notificaciones ---
const contenedorToasts = document.getElementById('contenedorToasts');

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

function mostrarToast(titulo, cuerpo, tipo = 'exito') {
  if (!contenedorToasts) return;

  const iconos = {
    exito: 'bi-check-circle',
    error: 'bi-x-circle',
    advertencia: 'bi-exclamation-triangle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <div class="toast-icono"><i class="bi ${iconos[tipo] || iconos.exito}"></i></div>
    <div class="toast-cuerpo">
      <div class="toast-titulo">${escapeHtml(titulo)}</div>
      <div class="toast-mensaje">${escapeHtml(cuerpo)}</div>
    </div>
    <button type="button" class="btn-cerrar-toast" aria-label="Cerrar">
      <i class="bi bi-x"></i>
    </button>
  `;

  toast.querySelector('.btn-cerrar-toast').addEventListener('click', () => toast.remove());
  contenedorToasts.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ---------------------------------------------------------------- Sesión ----

function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function obtenerUsuario() {
  const u = localStorage.getItem(USUARIO_KEY);
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

function limpiarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

function headersConToken() {
  const headers = { 'Content-Type': 'application/json' };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// Un JWT vencido no sirve aunque siga guardado en localStorage.
function tokenExpirado(token) {
  try {
    const partes = String(token).split('.');
    if (partes.length !== 3) return true;

    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(relleno));

    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function tieneSesion() {
  const token = obtenerToken();
  if (!token) return false;

  if (tokenExpirado(token)) {
    limpiarSesion();
    return false;
  }
  return true;
}

function redirigirALogin(motivo = 'requerida') {
  window.location.replace(`index.html?sesion=${encodeURIComponent(motivo)}`);
}

// Si la API responde 401, la sesión ya no es válida: se cierra y se sale.
function sesionExpirada(respuesta) {
  if (!respuesta || respuesta.status !== 401) return false;
  limpiarSesion();
  redirigirALogin('expirada');
  return true;
}

function requerirSesion(mensaje) {
  if (tieneSesion()) return true;
  mostrarToast(
    'Sesión requerida',
    mensaje || 'Inicia sesión para realizar esta operación.',
    'advertencia'
  );
  return false;
}

function actualizarUIUsuario() {
  const usuario = obtenerUsuario();
  const haySesion = tieneSesion();

  if (spanUsuario) {
    spanUsuario.textContent = haySesion && usuario ? usuario.usuario : 'Sesión activa';
  }
}

function cerrarSesion() {
  limpiarSesion();
  window.location.href = 'index.html';
}

// ------------------------------------------------------------- Validación ----

function validarCampo(input, validador, mensajeError) {
  if (!input) return true;
  const valor = input.value.trim();
  const esValido = validador(valor);

  input.classList.toggle('error', !esValido);
  const grupo = input.closest('.campo-formulario');
  if (!grupo) return esValido;

  let msg = grupo.querySelector('.mensaje-error');
  if (!esValido) {
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'mensaje-error';
      msg.innerHTML = '<i class="bi bi-exclamation-circle"></i><span></span>';
      grupo.appendChild(msg);
    }
    msg.querySelector('span').textContent = mensajeError;
  } else if (msg) {
    msg.remove();
  }
  return esValido;
}

const validaNoVacio = (v) => v.length > 0;
const validaPrecio = (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0;
const validaStock = (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0;

// ---------------------------------------------------------------- Login ----

async function manejarLogin(e) {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const contrasena = document.getElementById('contrasena').value.trim();
  const inpUsuario = document.getElementById('usuario');
  const inpContrasena = document.getElementById('contrasena');

  const valido =
    validarCampo(inpUsuario, validaNoVacio, 'El usuario es obligatorio.') &&
    validarCampo(inpContrasena, validaNoVacio, 'La contraseña es obligatoria.');

  if (!valido) return;

  btnLogin.disabled = true;
  spinLogin.classList.remove('d-none');
  textoBtnLogin.textContent = 'Ingresando...';
  errorLogin.classList.add('d-none');

  try {
    const respuesta = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contraseña: contrasena }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      // 400 o 401: mensaje devuelto por la API
      throw new Error(datos.mensaje || 'No fue posible iniciar sesión.');
    }

    guardarSesion(datos.token, datos.usuario);
    mostrarToast('Bienvenido', `Sesión iniciada como ${datos.usuario.usuario}.`, 'exito');

    setTimeout(() => {
      window.location.href = 'productos.html';
    }, 500);
  } catch (error) {
    textoError.textContent = error.message;
    errorLogin.classList.remove('d-none');
    mostrarToast('Error de autenticación', error.message, 'error');
  } finally {
    btnLogin.disabled = false;
    spinLogin.classList.add('d-none');
    textoBtnLogin.textContent = 'Iniciar sesión';
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('contrasena');
  const icono = document.getElementById('iconoOjo');
  if (!input || !icono) return;

  const esPassword = input.type === 'password';
  input.type = esPassword ? 'text' : 'password';
  icono.className = esPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
}

if (formLogin) {
  formLogin.addEventListener('submit', manejarLogin);

  const inpUsuario = document.getElementById('usuario');
  const inpContrasena = document.getElementById('contrasena');
  const capsHint = document.getElementById('capsHint');

  // Limpia el estado de error mientras el usuario escribe.
  [inpUsuario, inpContrasena].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      input.classList.remove('error');
      input.closest('.campo-formulario')?.querySelector('.mensaje-error')?.remove();
      if (errorLogin) errorLogin.classList.add('d-none');
    });
  });

  // Aviso visual cuando Bloq Mayús está activado en la contraseña.
  if (inpContrasena && capsHint) {
    const actualizarCaps = (evento) => {
      const activo =
        typeof evento.getModifierState === 'function' &&
        evento.getModifierState('CapsLock');
      capsHint.classList.toggle('d-none', !activo);
    };
    inpContrasena.addEventListener('keydown', actualizarCaps);
    inpContrasena.addEventListener('keyup', actualizarCaps);
    inpContrasena.addEventListener('blur', () => capsHint.classList.add('d-none'));
  }

  if (tieneSesion()) {
    window.location.href = 'productos.html';
  }
}

// --------------------------------------------------------------- Productos ----

let temporizadorBusqueda = null;

async function cargarProductos() {
  if (!tablaProductos) return;

  const texto = buscador ? buscador.value.trim() : '';

  try {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6">
          <div class="spinner-border text-primary" role="status" style="width:2.5rem;height:2.5rem;"></div>
          <div class="mt-2 text-suave">Cargando productos...</div>
        </td>
      </tr>`;

    const url = texto
      ? `${API_BASE}/api/productos?buscar=${encodeURIComponent(texto)}`
      : `${API_BASE}/api/productos`;

    const respuesta = await fetch(url, {
      method: 'GET',
      headers: headersConToken(),
    });

    if (sesionExpirada(respuesta)) return;

    if (!respuesta.ok) {
      throw new Error('No fue posible cargar los productos.');
    }

    const datos = await respuesta.json();
    renderizarTabla(datos.data || [], texto);
  } catch (error) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6">
          <div class="estado-vacío">
            <div class="icono-vacío">⚠️</div>
            <h2>Error al cargar</h2>
            <p>${escapeHtml(error.message)}</p>
          </div>
        </td>
      </tr>`;
    mostrarToast('Error', error.message, 'error');
  }

  cargarEstadisticas();
}

async function cargarEstadisticas() {
  if (!elTotal) return;

  try {
    const respuesta = await fetch(`${API_BASE}/api/productos/estadisticas`);
    if (!respuesta.ok) return;

    const { data } = await respuesta.json();

    elTotal.textContent = data.totalProductos;
    elUnidades.textContent = data.unidadesDisponibles;
    elStockBajo.textContent = data.stockBajo;
    elValor.textContent = formatoMoneda(data.valorInventario);
  } catch {
    // Silencioso: los indicadores no bloquean el CRUD.
  }
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

function renderizarTabla(productos, textoBusqueda = '') {
  if (!tablaProductos) return;

  tablaProductos.innerHTML = '';

  if (contadorResultados) {
    contadorResultados.textContent = `${productos.length} ${
      productos.length === 1 ? 'producto' : 'productos'
    }`;
  }

  if (productos.length === 0) {
    const esBusqueda = textoBusqueda.length > 0;
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="estado-vacío">
            <div class="icono-vacío">${esBusqueda ? '🔍' : '📦'}</div>
            <h2>${esBusqueda ? 'Sin resultados' : 'No hay productos aún'}</h2>
            <p>${
              esBusqueda
                ? `No se encontraron productos para "${escapeHtml(textoBusqueda)}".`
                : 'Crea tu primer producto para comenzar.'
            }</p>
            ${
              esBusqueda
                ? ''
                : '<button class="btn-primario" onclick="nuevoProducto()"><i class="bi bi-plus-lg"></i> Agregar producto</button>'
            }
          </div>
        </td>
      </tr>`;
    return;
  }

  productos.forEach((p) => {
    const stockBajo = Number(p.stock) <= 5;
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td data-label="ID"><code class="codigo-id">${escapeHtml(p.id)}</code></td>
      <td data-label="Producto">
        <strong>${escapeHtml(p.nombre)}</strong>
        ${p.descripcion ? `<div class="descripcion-corta">${escapeHtml(p.descripcion)}</div>` : ''}
      </td>
      <td data-label="Categoría">${escapeHtml(p.categoria || '—')}</td>
      <td data-label="Precio"><span class="precio">${formatoMoneda(p.precio)}</span></td>
      <td data-label="Stock">
        <span class="badge-stock ${stockBajo ? 'bajo-stock' : 'normal-stock'}">
          ${p.stock}${stockBajo ? ' <i class="bi bi-exclamation-triangle" style="font-size:.7rem;"></i>' : ''}
        </span>
      </td>
      <td data-label="Acciones">
        <div class="acciones-tabla">
          <button type="button" class="btn-icono" onclick="abrirDetalle('${escapeHtml(p.id)}')" title="Ver detalle">
            <i class="bi bi-eye"></i>
          </button>
          <button type="button" class="btn-icono" onclick="editarProducto('${escapeHtml(p.id)}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn-icono btn-eliminar" onclick="eliminarProducto('${escapeHtml(p.id)}')" title="Eliminar">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    `;
    tablaProductos.appendChild(fila);
  });
}

// Buscador con debounce (300 ms) para no saturar la API.
if (buscador) {
  buscador.addEventListener('input', () => {
    if (btnLimpiarBusqueda) {
      btnLimpiarBusqueda.classList.toggle('d-none', buscador.value.trim() === '');
    }
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarProductos, 300);
  });
}

if (btnLimpiarBusqueda) {
  btnLimpiarBusqueda.addEventListener('click', () => {
    buscador.value = '';
    btnLimpiarBusqueda.classList.add('d-none');
    cargarProductos();
    buscador.focus();
  });
}

// --------------------------------------------------------------- Detalle ----

async function abrirDetalle(id) {
  try {
    const respuesta = await fetch(`${API_BASE}/api/productos/${id}`, {
      method: 'GET',
      headers: headersConToken(),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'Producto no encontrado.');
    }

    const p = datos.data;
    const detalle = `
      ID: ${p.id}
      Nombre: ${p.nombre}
      Descripción: ${p.descripcion || '—'}
      Categoría: ${p.categoria || '—'}
      Precio: ${formatoMoneda(p.precio)}
      Stock: ${p.stock}
      Creado: ${new Date(p.createdAt).toLocaleString('es-CO')}
      Actualizado: ${new Date(p.updatedAt).toLocaleString('es-CO')}
    `;

    mostrarToast(`Detalle de ${p.nombre}`, detalle, 'exito');
  } catch (error) {
    mostrarToast('Error', error.message, 'error');
  }
}

// ------------------------------------------------------- Crear / Editar ----

function limpiarErroresFormulario() {
  formProducto.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
  formProducto.querySelectorAll('.mensaje-error').forEach((el) => el.remove());
}

function nuevoProducto() {
  if (!requerirSesion('Inicia sesión para crear productos.')) return;

  productoIdInput.value = '';
  tituloModal.innerHTML = '<i class="bi bi-plus-circle"></i> Nuevo Producto';
  formProducto.reset();
  limpiarErroresFormulario();
  abrirModal();
}

async function editarProducto(id) {
  if (!requerirSesion('Inicia sesión para editar productos.')) return;

  try {
    const respuesta = await fetch(`${API_BASE}/api/productos/${id}`, {
      method: 'GET',
      headers: headersConToken(),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No fue posible cargar el producto.');
    }

    const p = datos.data;
    productoIdInput.value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('descripcion').value = p.descripcion;
    document.getElementById('precio').value = p.precio;
    document.getElementById('categoria').value = p.categoria;
    document.getElementById('stock').value = p.stock;

    tituloModal.innerHTML = '<i class="bi bi-pencil-square"></i> Editar Producto';
    limpiarErroresFormulario();
    abrirModal();
  } catch (error) {
    mostrarToast('Error', error.message, 'error');
  }
}

function abrirModal() {
  const overlay = document.getElementById('modalProducto');
  overlay.classList.add('activo');
  // Enfocar el primer campo después de la animación.
  setTimeout(() => document.getElementById('nombre').focus(), 150);
}

function cerrarModal() {
  const overlay = document.getElementById('modalProducto');
  overlay.classList.remove('activo');
  formProducto.reset();
  productoIdInput.value = '';
  limpiarErroresFormulario();
}

// Cerrar al hacer clic en el fondo del modal.
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('modalProducto');
  if (overlay && overlay.classList.contains('activo') && e.target === overlay) {
    cerrarModal();
  }
});

async function manejarGuardarProducto(e) {
  e.preventDefault();
  if (!requerirSesion('Inicia sesión para guardar productos.')) return;

  const id = productoIdInput.value;
  const esEdicion = Boolean(id);

  const datos = {
    nombre: document.getElementById('nombre').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    precio: parseFloat(document.getElementById('precio').value),
    categoria: document.getElementById('categoria').value.trim(),
    stock: parseInt(document.getElementById('stock').value, 10),
  };

  const valido =
    validarCampo(document.getElementById('nombre'), validaNoVacio, 'El nombre es obligatorio.') &&
    validarCampo(document.getElementById('precio'), validaPrecio, 'El precio debe ser mayor a 0.') &&
    validarCampo(document.getElementById('stock'), validaStock, 'El stock debe ser mayor o igual a 0.');

  if (!valido) return;

  btnGuardarProducto.disabled = true;
  spinGuardar.classList.remove('d-none');
  textoBtnGuardar.textContent = esEdicion ? 'Actualizando...' : 'Guardando...';

  try {
    const respuesta = await fetch(
      esEdicion ? `${API_BASE}/api/productos/${id}` : `${API_BASE}/api/productos`,
      {
        method: esEdicion ? 'PUT' : 'POST',
        headers: headersConToken(),
        body: JSON.stringify(datos),
      }
    );

    const datosRespuesta = await respuesta.json();

    if (sesionExpirada(respuesta)) return;

    if (!respuesta.ok) {
      throw new Error(datosRespuesta.mensaje || 'No fue posible guardar el producto.');
    }

    cerrarModal();
    mostrarToast(
      esEdicion ? 'Producto actualizado' : 'Producto creado',
      datosRespuesta.mensaje,
      'exito'
    );
    cargarProductos();
  } catch (error) {
    mostrarToast('Error', error.message, 'error');
  } finally {
    btnGuardarProducto.disabled = false;
    spinGuardar.classList.add('d-none');
    textoBtnGuardar.textContent = esEdicion ? 'Actualizar producto' : 'Guardar producto';
  }
}

if (formProducto) {
  formProducto.addEventListener('submit', manejarGuardarProducto);
}

// -------------------------------------------------------------- Eliminar ----

async function eliminarProducto(id) {
  if (!requerirSesion('Inicia sesión para eliminar productos.')) return;

  if (!window.confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const respuesta = await fetch(`${API_BASE}/api/productos/${id}`, {
      method: 'DELETE',
      headers: headersConToken(),
    });

    if (sesionExpirada(respuesta)) return;

    if (!respuesta.ok) {
      // El DELETE exitoso devuelve 204 (sin cuerpo).
      const datos = await respuesta.json();
      throw new Error(datos.mensaje || 'No fue posible eliminar el producto.');
    }

    mostrarToast('Producto eliminado', 'El producto se eliminó correctamente.', 'exito');
    cargarProductos();
  } catch (error) {
    mostrarToast('Error', error.message, 'error');
  }
}

// --------------------------------------------------------------- Arranque ----

document.addEventListener('DOMContentLoaded', () => {
  // El panel solo se muestra con una sesión válida.
  if (tablaProductos) {
    if (!tieneSesion()) {
      redirigirALogin('requerida');
      return;
    }

    document.body.classList.remove('panel-cargando');
    actualizarUIUsuario();
    cargarProductos();
    return;
  }

  // Login: si ya hay sesión válida, va directo al panel.
  if (formLogin) {
    if (tieneSesion()) {
      window.location.replace('productos.html');
      return;
    }

    if (new URLSearchParams(window.location.search).has('sesion')) {
      mostrarToast('Sesión requerida', 'Inicia sesión para acceder al panel.', 'advertencia');
    }
  }

  actualizarUIUsuario();
});

// Funciones usadas por atributos onclick del HTML.
window.nuevoProducto = nuevoProducto;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.abrirDetalle = abrirDetalle;
window.cerrarSesion = cerrarSesion;
window.cerrarModal = cerrarModal;
window.togglePasswordVisibility = togglePasswordVisibility;
