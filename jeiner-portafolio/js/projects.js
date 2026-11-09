/**
 * projects.js
 * Carga los proyectos desde data/projects.json, valida los datos y crea las
 * tarjetas. El texto del JSON se inserta como texto (textContent), nunca como
 * HTML, para evitar inyecciones.
 */
(function () {
  'use strict';

  const DATA_URL = 'data/projects.json';
  const grid = document.getElementById('projectsGrid');
  const status = document.getElementById('projectsStatus');

  if (!grid || !status) {
    return;
  }

  let requestId = 0;

  /* Proyectos por defecto embebidos (se muestran si falla la carga del JSON) */
  const DEFAULT_PROJECTS = [
    {
      nombre: 'Apomat',
      descripcion: 'Proyecto de aromatizantes para el hogar y la oficina, iniciativa de emprendimiento con presencia web.',
      categoria: 'Emprendimiento y desarrollo web',
      url: 'https://jeinermosquera.pythonanywhere.com/',
      imagen: 'img/apomat.jpg',
      imagenAlt: 'Logo del proyecto Apomat'
    }
  ];

  /* Estados de la lista: cargando, vacía y error -------------------------- */
  function setStatus(className) {
    status.className = className;
    status.replaceChildren();
  }

  function showLoading() {
    setStatus('projects-status');

    const line = document.createElement('span');
    line.className = 'loading-line';
    line.appendChild(document.createTextNode('Cargando proyectos'));

    const dots = document.createElement('span');
    dots.className = 'loading-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i += 1) {
      dots.appendChild(document.createElement('span'));
    }

    line.appendChild(dots);
    status.appendChild(line);
  }

  function showEmpty() {
    setStatus('projects-status');
    status.textContent = 'Todavía no hay proyectos publicados.';
  }

  function showError() {
    setStatus('projects-status is-error');

    const message = document.createElement('span');
    message.textContent =
      'No fue posible cargar la lista de proyectos. Verifica que data/projects.json exista y que el sitio se abra desde un servidor local. ';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'status-retry';
    retry.textContent = 'Reintentar carga';
    retry.addEventListener('click', loadProjects);

    status.appendChild(message);
    status.appendChild(retry);
  }

  function clearStatus() {
    setStatus('projects-status');
  }

  /* Validación de datos ---------------------------------------------------
     Solo se aceptan URL http/https y proyectos con los campos de texto
     obligatorios; los incompletos se descartan. */
  function isSafeUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function isValidProject(item) {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const textFields = ['nombre', 'descripcion', 'categoria', 'url'];
    const hasText = textFields.every(function (field) {
      return typeof item[field] === 'string' && item[field].trim() !== '';
    });

    if (!hasText || !isSafeUrl(item.url)) {
      return false;
    }

    return item.imagen === undefined ||
      (typeof item.imagen === 'string' && item.imagen.trim() !== '');
  }

  // Acepta una lista directa o un objeto con la propiedad "proyectos".
  function extractProjects(data) {
    let list = null;

    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data && data.proyectos)) {
      list = data.proyectos;
    }

    if (!list) {
      throw new Error('La estructura del JSON no es válida.');
    }

    return list.filter(isValidProject);
  }

  /* Construcción de tarjetas ----------------------------------------------
     Cada helper crea nodos con createElement: si falta la imagen se usa la
     inicial del proyecto como respaldo. */
  function buildLogo(project) {
    const wrap = document.createElement('div');
    wrap.className = 'project-logo-wrap';

    if (project.imagen) {
      const image = document.createElement('img');
      image.className = 'project-logo';
      image.alt = project.imagenAlt && typeof project.imagenAlt === 'string'
        ? project.imagenAlt
        : 'Logo del proyecto ' + project.nombre;
      image.decoding = 'async';

      image.addEventListener('load', function () {
        image.classList.add('is-loaded');
      });

      image.addEventListener('error', function () {
        image.remove();
        const fallback = document.createElement('span');
        fallback.className = 'project-logo-fallback';
        fallback.textContent = project.nombre.trim().charAt(0).toUpperCase();
        wrap.appendChild(fallback);
      });

      image.src = project.imagen;
      wrap.appendChild(image);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'project-logo-fallback';
      fallback.textContent = project.nombre.trim().charAt(0).toUpperCase();
      wrap.appendChild(fallback);
    }

    return wrap;
  }

  // Enlace externo seguro: pestaña nueva sin acceso a la página de origen.
  function buildLink(project) {
    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = project.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.appendChild(document.createTextNode('Ver proyecto'));

    const icon = document.createElement('i');
    icon.className = 'bi bi-box-arrow-up-right';
    icon.setAttribute('aria-hidden', 'true');
    link.appendChild(icon);

    const hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = ' (se abre en una pestaña nueva)';
    link.appendChild(hint);

    return link;
  }

  function buildCard(project, index) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.style.setProperty('--i', String(index)); // Retraso escalonado de la animación
    card.appendChild(buildLogo(project));

    const body = document.createElement('div');
    body.className = 'project-body';

    const category = document.createElement('p');
    category.className = 'project-category';
    category.textContent = project.categoria;

    const title = document.createElement('h3');
    title.className = 'project-title';
    title.textContent = project.nombre;

    const description = document.createElement('p');
    description.className = 'project-desc';
    description.textContent = project.descripcion;

    body.appendChild(category);
    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(buildLink(project));
    card.appendChild(body);

    return card;
  }

  /* Renderizado -----------------------------------------------------------
     Un solo proyecto se centra a media fila; varios usan la rejilla de tres
     columnas. El DocumentFragment evita recalcular el diseño por cada tarjeta. */
  function renderProjects(projects) {
    const fragment = document.createDocumentFragment();
    const isSingle = projects.length === 1;

    projects.forEach(function (project, index) {
      const column = document.createElement('div');
      column.className = isSingle
        ? 'col-12 col-md-8 col-lg-6'
        : 'col-12 col-md-6 col-lg-4';
      column.appendChild(buildCard(project, index));
      fragment.appendChild(column);
    });

    grid.classList.toggle('justify-content-center', isSingle);
    grid.replaceChildren(fragment);
  }

  /* Carga de datos --------------------------------------------------------
     requestId descarta respuestas antiguas si se pulsa "Reintentar" varias
     veces. fetch no falla con 404/500: hay que revisar response.ok. */
  function loadProjects() {
    const currentRequest = requestId + 1;
    requestId = currentRequest;

    showLoading();
    grid.replaceChildren();

    fetch(DATA_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Respuesta HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        if (currentRequest !== requestId) {
          return;
        }

        const projects = extractProjects(data);

        if (projects.length === 0) {
          clearStatus();
          showEmpty();
          return;
        }

        clearStatus();
        renderProjects(projects);
      })
      .catch(function () {
        if (currentRequest !== requestId) {
          return;
        }
        clearStatus();
        renderProjects(DEFAULT_PROJECTS);
      });
  }

  loadProjects();
})();
