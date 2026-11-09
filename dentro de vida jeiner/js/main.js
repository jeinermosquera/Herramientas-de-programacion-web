/**
 * main.js
 * Tema claro/oscuro, menú móvil, enlace activo, año del pie de página y
 * animaciones de aparición.
 */
(function () {
  'use strict';

  const THEME_KEY = 'portafolio-tema';
  const NAV_OFFSET = 140;
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = themeToggle ? themeToggle.querySelector('.theme-toggle-label') : null;
  const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  /* Tema claro / oscuro ---------------------------------------------------
     Orden: preferencia guardada → preferencia del sistema. Al pulsar el
     botón se alterna y se guarda. Si nunca se eligió, el sitio sigue los
     cambios del sistema operativo. */
  function readSavedTheme() {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      /* Sin almacenamiento: el tema funciona solo durante la sesión. */
    }
  }

  // Aplica el tema en <html>, que es lo que leen el CSS y Bootstrap, y
  // sincroniza el texto, el icono y los atributos ARIA del botón.
  function applyTheme(theme, persist) {
    const isDark = theme === 'dark';
    root.setAttribute('data-bs-theme', theme);

    if (themeToggle && themeLabel && themeIcon) {
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
      themeLabel.textContent = isDark ? 'Claro' : 'Oscuro';
      themeIcon.className = isDark ? 'bi bi-sun' : 'bi bi-moon-stars';
    }

    if (persist) {
      saveTheme(theme);
    }
  }

  if (themeToggle) {
    applyTheme(readSavedTheme() || (systemTheme.matches ? 'dark' : 'light'), false);

    themeToggle.addEventListener('click', function () {
      const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });

    const handleSystemThemeChange = function (event) {
      if (!readSavedTheme()) {
        applyTheme(event.matches ? 'dark' : 'light', false);
      }
    };

    if (typeof systemTheme.addEventListener === 'function') {
      systemTheme.addEventListener('change', handleSystemThemeChange);
    } else if (typeof systemTheme.addListener === 'function') {
      systemTheme.addListener(handleSystemThemeChange);
    }
  }

  /* Menú móvil ------------------------------------------------------------
     Usa el componente Collapse de Bootstrap y mejora el teclado: Escape
     cierra el menú y devuelve el foco al botón. */
  const menu = document.getElementById('menuPrincipal');
  const toggler = document.querySelector('.navbar-toggler');

  if (menu && toggler && window.bootstrap) {
    const collapse = window.bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false });

    menu.querySelectorAll('a.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (menu.classList.contains('show')) {
          collapse.hide();
        }
      });
    });

    menu.addEventListener('show.bs.collapse', function () {
      toggler.setAttribute('aria-label', 'Cerrar menú de navegación');
    });

    menu.addEventListener('hide.bs.collapse', function () {
      toggler.setAttribute('aria-label', 'Abrir menú de navegación');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('show')) {
        collapse.hide();
        toggler.focus();
      }
    });
  }

  /* Enlace activo ---------------------------------------------------------
     Marca con aria-current el enlace de la sección que ya pasó el umbral. */
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = Array.from(document.querySelectorAll('.navbar-nav a.nav-link'));

  function updateActiveLink() {
    if (!sections.length) {
      return;
    }

    let currentId = sections[0].id;

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= NAV_OFFSET) {
        currentId = section.id;
      }
    });

    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + currentId) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  /* Año del pie de página ------------------------------------------------- */
  const year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  /* Aparición progresiva --------------------------------------------------
     IntersectionObserver añade .is-visible cuando el bloque entra en
     pantalla. Se desactiva si el usuario prefiere reducir movimiento. */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealTargets = document.querySelectorAll('[data-reveal]');

    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    revealTargets.forEach(function (target) {
      target.classList.add('reveal');
      revealObserver.observe(target);
    });

    // Al saltar a una sección, muestra también los bloques que quedaron arriba.
    const revealList = Array.from(revealTargets);

    const revealInView = function () {
      revealList.forEach(function (element) {
        if (
          !element.classList.contains('is-visible') &&
          element.getBoundingClientRect().top < window.innerHeight * 0.95
        ) {
          element.classList.add('is-visible');
          revealObserver.unobserve(element);
        }
      });
    };

    window.addEventListener('scroll', revealInView, { passive: true });
    revealInView();
  }
})();
