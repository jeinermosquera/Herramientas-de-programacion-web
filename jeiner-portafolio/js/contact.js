/**
 * contact.js
 * Validación del formulario de contacto. No hay backend conectado: comprueba
 * los datos y lo dice con claridad, sin afirmar que el mensaje fue enviado.
 */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  if (!form || !status) {
    return;
  }

  /* Reglas de validación --------------------------------------------------
     Cada función recibe el valor recortado y devuelve '' si es válido o el
     mensaje de error que se mostrará. */
  const validators = {
    nombre: function (value) {
      if (!value) {
        return 'Escribe tu nombre completo.';
      }
      if (value.length < 3) {
        return 'El nombre debe tener al menos 3 caracteres.';
      }
      if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\- ]+$/.test(value)) {
        return 'Usa solo letras, espacios, puntos, apóstrofos o guiones en el nombre.';
      }
      return '';
    },
    correo: function (value) {
      if (!value) {
        return 'Escribe tu correo electrónico.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value)) {
        return 'Escribe un correo con formato válido, por ejemplo nombre@dominio.com.';
      }
      if (value.length > 120) {
        return 'El correo no puede superar los 120 caracteres.';
      }
      return '';
    },
    asunto: function (value) {
      if (!value) {
        return 'Escribe un asunto para el mensaje.';
      }
      if (value.length < 5) {
        return 'El asunto debe tener al menos 5 caracteres.';
      }
      return '';
    },
    mensaje: function (value) {
      if (!value) {
        return 'Escribe el mensaje que quieres dejar.';
      }
      if (value.length < 20) {
        return 'El mensaje debe tener al menos 20 caracteres.';
      }
      return '';
    }
  };

  /* Asociación campo → mensaje de error ----------------------------------- */
  const fields = ['nombre', 'correo', 'asunto', 'mensaje']
    .map(function (id) {
      return {
        input: document.getElementById(id),
        error: document.getElementById(id + 'Error'),
        touched: false
      };
    })
    .filter(function (field) {
      const ok = field.input && field.error && validators[field.input.id];
      if (!ok && typeof console !== 'undefined' && console.warn) {
        console.warn('Campo de formulario no encontrado o sin validador:', field.input && field.input.id);
      }
      return ok;
    });

  function getFieldError(id, value) {
    const validator = validators[id];
    return validator ? validator(value) : '';
  }

  /* Pintado del estado ----------------------------------------------------
     Muestra el error, actualiza las clases de Bootstrap y aria-invalid.
     Devuelve true si el campo es válido. */
  function renderFieldState(field, message, showValidState) {
    if (message) {
      field.error.textContent = message;
      field.error.hidden = false;
      field.input.classList.add('is-invalid');
      field.input.classList.remove('is-valid');
      field.input.setAttribute('aria-invalid', 'true');
      return false;
    }

    field.error.textContent = '';
    field.error.hidden = true;
    field.input.classList.remove('is-invalid');
    field.input.classList.toggle('is-valid', Boolean(showValidState));
    field.input.removeAttribute('aria-invalid');
    return true;
  }

  function validateField(field, showValidState) {
    const value = field.input.value.trim();
    const message = getFieldError(field.input.id, value);
    return renderFieldState(field, message, showValidState);
  }

  function showStatus(message, modifier, moveFocus) {
    status.textContent = message;
    status.className = 'form-status ' + modifier;
    status.hidden = false;

    if (moveFocus) {
      status.focus();
    }
  }

  // Oculta el mensaje de éxito en cuanto el usuario vuelve a escribir.
  function hideSuccessStatus() {
    if (status.classList.contains('is-success')) {
      status.textContent = '';
      status.hidden = true;
    }
  }

  /* Eventos de cada campo -------------------------------------------------
     blur valida al salir; input corrige solo si el campo ya fue tocado. */
  fields.forEach(function (field) {
    field.input.addEventListener('blur', function () {
      field.touched = true;
      validateField(field, true);
    });

    field.input.addEventListener('input', function () {
      hideSuccessStatus();

      if (field.touched || field.input.classList.contains('is-invalid')) {
        validateField(field, true);
      }
    });
  });

  /* Envío ----------------------------------------------------------------
     Se cancela el envío real porque no hay backend. Si hay errores, enfoca
     el primero; si todo es válido, muestra el mensaje honesto. */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    let firstInvalid = null;

    fields.forEach(function (field) {
      field.touched = true;
      const isValid = validateField(field, true);

      if (!isValid && !firstInvalid) {
        firstInvalid = field.input;
      }
    });

    if (firstInvalid) {
      showStatus('Revisa los campos marcados. Hay datos incompletos o con un formato que no es válido.', 'is-error', false);
      firstInvalid.focus();
      return;
    }

    showStatus(
      'Los datos del formulario son válidos. El envío real todavía no está disponible porque no hay un servicio de envío conectado: falta configurar un servidor o un servicio que reciba el mensaje.',
      'is-success',
      true
    );
  });
})();
