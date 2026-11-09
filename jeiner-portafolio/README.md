# Portafolio Web Personal Interactivo

Portafolio académico de Jeiner Isaac Mosquera Rentería, estudiante de quinto semestre de
Ingeniería en Telecomunicaciones e Informática en la Universidad Tecnológica del Chocó
Diego Luis Córdoba (UTCH). El sitio presenta su perfil académico, sus áreas de interés,
un proyecto con presencia web y un formulario de contacto validado.

Actividad práctica del módulo 2: sitio web personal interactivo.

## Tecnologías utilizadas

- HTML5 semántico.
- CSS3 (hoja de estilos propia, separada del HTML).
- JavaScript vanilla, sin frameworks.
- Bootstrap 5.3.8 mediante CDN oficial.
- Bootstrap Icons 1.13.2 mediante CDN oficial.
- Google Fonts (Fraunces para titulares y IBM Plex Sans para el texto).
- JSON (`data/projects.json`) para almacenar los proyectos.
- Fetch API para cargar los proyectos de forma dinámica.

No se utilizan React, Vue, Angular, Tailwind ni otros frameworks.

## Justificación de Bootstrap

Se eligió Bootstrap porque proporciona un sistema de cuadrícula responsive, componentes
reutilizables, una barra de navegación adaptable y controles de formulario listos para
usar. El CSS propio (`css/styles.css`) complementa el framework: define la paleta, la
tipografía, el espaciado y los estados, sin reemplazar la estructura responsive de Bootstrap.

## Estructura de carpetas

```
portafolio-jeiner/
├── favicon/
│   └── favicon.ico   (icono de la pestaña)
├── README.md
├── img/
│   ├── apomat.jpg    (logo del proyecto)
│   ├── perfil.jpg    (fotografía no utilizada en el diseño actual)
│   └── favicon/      (juego completo de iconos)
├── css/
│   └── styles.css
├── js/
│   ├── main.js       (tema, navegación, año, aparición progresiva)
│   ├── projects.js   (carga y renderizado de proyectos)
│   └── contact.js    (validación del formulario)
└── data/
    └── projects.json
```

## Cómo ejecutar el sitio localmente

No abras `index.html` con `file://`, porque el navegador puede bloquear la lectura del JSON.
Usa un servidor HTTP local.

Con Python (instalado en el equipo):

```
cd portafolio-jeiner
python -m http.server 8123
```

Luego abre `http://127.0.0.1:8123/` en el navegador.

Con la extensión Live Server de Visual Studio Code: haz clic derecho sobre `index.html`
y selecciona "Open with Live Server".

## Funcionalidades implementadas

- HTML5 semántico con `header`, `nav`, `main`, `section` y `footer`.
- Secciones: inicio, sobre mí, proyectos y contacto.
- Sección de inicio con título, subtítulo, texto, dos botones de navegación y una ficha
  académica (programa, universidad, semestre y enfoque) que resume el perfil.
- Sección sobre mí con texto natural y una tarjeta lateral de áreas de interés.
- Proyectos cargados dinámicamente desde `data/projects.json` mediante Fetch API.
- La tarjeta de proyecto se centra y ocupa media fila cuando solo hay un proyecto publicado.
- Estado de carga, mensaje de error con botón de reintento y estado vacío.
- Validación básica de los datos del JSON y creación segura de nodos DOM.
- Enlaces externos con `target="_blank"` y `rel="noopener noreferrer"`.
- Formulario de contacto con validación HTML5 y JavaScript complementario:
  comprobación de formato del correo, mensajes de error en español, indicadores de
  campos válidos e inválidos.
- El formulario usa `method="POST"` y no afirma que el mensaje se envió: indica que los
  datos son válidos, pero que falta configurar un servicio de envío o un servidor.
- Menú móvil con el componente Navbar de Bootstrap, que se cierra al elegir una sección.
- Modo claro y oscuro con botón accesible, actualización de colores y del atributo
  `data-bs-theme`, guardado en `localStorage` y respeto a la preferencia del sistema.
- Navegación con enlace activo según la sección visible.
- Animaciones discretas: aparición progresiva de bloques al desplazarse
  (IntersectionObserver) y transiciones en botones y tarjetas.
- Respeto a `prefers-reduced-motion`.
- Año del pie de página calculado automáticamente.
- Enlace para saltar al contenido principal y foco visible en los controles.
- Diseño responsive para móvil, tableta y escritorio.

## Cómo funciona el cambio de tema

1. El CSS define todos los colores como variables (`--bg`, `--text`, `--surface`…) en `:root`
   para el tema claro.
2. Un bloque `@media (prefers-color-scheme: dark)` redefine esas variables cuando el sistema
   operativo está en oscuro, siempre que el usuario no haya elegido un tema en el sitio.
3. `main.js` escribe `data-bs-theme="light"` o `data-bs-theme="dark"` en la etiqueta `<html>`.
   El selector `[data-bs-theme="dark"]` del CSS cambia las variables y Bootstrap adapta sus
   propios componentes al mismo valor.
4. La elección se guarda en `localStorage` con la clave `portafolio-tema`.
5. Al cargar, el orden de decisión es: preferencia guardada → preferencia del sistema.
6. El botón actualiza `aria-pressed`, `aria-label`, el texto y el icono para que el cambio
   también sea perceptible con lector de pantalla.

## Enlaces y recursos del HTML

| Elemento | Para qué sirve |
| --- | --- |
| `img/favicon/favicon.svg` | Icono vectorial de la pestaña. |
| `img/favicon/favicon-32x32.png` | Icono PNG para navegadores antiguos. |
| `img/favicon/favicon.ico` | Respaldo ICO para Windows y navegadores viejos. |
| `img/favicon/apple-touch-icon.png` | Icono al añadir el sitio a la pantalla de inicio en iOS. |
| `fonts.googleapis.com` | Fuentes Fraunces e IBM Plex Sans. |
| `cdn.jsdelivr.net/.../bootstrap.min.css` | Rejilla y componentes de Bootstrap 5. |
| `cdn.jsdelivr.net/.../bootstrap-icons.min.css` | Iconos (luna, sol, flechas, menú). |
| `css/styles.css?v=25` | Hoja de estilos propia. |
| `#inicio`, `#sobre-mi`, `#proyectos`, `#contacto` | Enlaces internos del menú y los botones. |
| `data/projects.json` | Datos de los proyectos (se leen con Fetch API). |
| `js/main.js`, `js/projects.js`, `js/contact.js` | Interacciones, proyectos y formulario. |

El sufijo `?v=25` es control de caché: al modificar el CSS o el JS se sube el número para que
el navegador descargue la versión nueva.

## Cómo agregar un nuevo proyecto

Edita `data/projects.json` y añade un objeto al arreglo. La estructura es la siguiente:

```json
{
  "id": "identificador-unico",
  "nombre": "Nombre del proyecto",
  "descripcion": "Descripción breve del proyecto.",
  "categoria": "Categoría",
  "url": "https://ejemplo.com/",
  "imagen": "img/nombre.jpg",
  "imagenAlt": "Texto alternativo opcional"
}
```

Los campos obligatorios son `nombre`, `descripcion`, `categoria` y `url`. La propiedad
`imagen` es opcional; si el archivo no existe o no se incluye, se muestra un monograma
alternativo. No es necesario modificar la lógica de renderizado.

## Limitación actual del formulario de contacto

No existe un servicio backend de contacto configurado. El formulario valida los datos en el
navegador y muestra un mensaje claro, pero no afirma que el mensaje fue enviado. Para
enviar mensajes reales es necesario conectar un servidor o un servicio de envío (por
ejemplo Formspree o un endpoint propio). El punto de integración está marcado en
`js/contact.js` y el formulario ya usa `method="POST"`.

## Pruebas realizadas

1. Verificación de archivos requeridos: todos los archivos de la estructura inicial existen.
2. Apertura del sitio mediante servidor HTTP local (Python, puerto 8123).
3. Carga correcta de `data/projects.json` (respuesta HTTP 200).
4. Aparición de Apomat en la cuadrícula y enlace externo con `target="_blank"` y
   `rel="noopener noreferrer"`.
5. Menú móvil: se abre, se cierra y se oculta al elegir una sección.
6. Cambio entre modo claro y oscuro: colores, texto del botón, atributo `data-bs-theme`,
   preferencia guardada en `localStorage` y persistencia tras recargar.
7. Validación del formulario: campos vacíos, correo con formato incorrecto y envío
   con datos válidos, con los mensajes correspondientes.
8. Estados de proyectos: carga, error con botón de reintento y lista vacía.
9. Diseño en anchuras de 320 px, 375 px, 768 px y 1280 px sin desplazamiento horizontal.
10. Ausencia de errores de JavaScript y de recursos inexistentes en la consola.
11. Auditoría de estructura: sin identificadores duplicados, sin enlaces vacíos, sin
    imágenes sin texto alternativo, sin controles sin etiqueta.
12. Contraste de color verificado en modo claro y oscuro para todos los textos principales
    (valores por encima de 4.5:1).

## Recursos

El logo `img/apomat.jpg` se usa en la tarjeta del proyecto. La fotografía `img/perfil.jpg`
ya no se muestra en el diseño actual; se conserva en la carpeta por si se desea reutilizar.
Los iconos del sitio están en `img/favicon/`.