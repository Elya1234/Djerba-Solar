/**
 * GOLD MINES — Contact / appointment forms.
 * Progressive enhancement only: the form is a real Shopify contact form and
 * works perfectly with JS disabled. This adds reason-card sync, inline
 * client-side validation feedback, and a submit loading state.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-gm-reason-group]').forEach(function (group) {
    var cards = group.querySelectorAll('.gm-reason-card');
    var hiddenInput = document.querySelector('[data-gm-reason-input]');

    function syncActive() {
      cards.forEach(function (card) {
        var input = card.querySelector('input[type="radio"]');
        card.classList.toggle('is-active', input.checked);
      });
    }

    cards.forEach(function (card) {
      var input = card.querySelector('input[type="radio"]');
      input.addEventListener('change', function () {
        if (hiddenInput) hiddenInput.value = input.value;
        syncActive();
      });
    });

    if (hiddenInput) {
      var checked = group.querySelector('input[type="radio"]:checked');
      if (checked) hiddenInput.value = checked.value;
    }
    syncActive();
  });

  document.querySelectorAll('.gm-form').forEach(function (form) {
    // Take over validation display once JS is running, so errors render in
    // our own styled state instead of the browser's native tooltip — the
    // `required` attributes remain as the no-JS fallback.
    form.setAttribute('novalidate', 'novalidate');

    form.addEventListener('submit', function (e) {
      var invalidFields = Array.prototype.slice.call(form.querySelectorAll(':invalid'));
      var errorEl = form.querySelector('[data-gm-form-client-error]');

      form.querySelectorAll('.gm-form__field[data-invalid="true"]').forEach(function (field) {
        field.setAttribute('data-invalid', 'false');
      });

      if (invalidFields.length) {
        e.preventDefault();
        invalidFields.forEach(function (field) {
          var wrapper = field.closest('.gm-form__field');
          if (wrapper) wrapper.setAttribute('data-invalid', 'true');
        });
        if (errorEl) {
          errorEl.textContent = 'Merci de compléter les champs requis.';
          errorEl.hidden = false;
        }
        invalidFields[0].focus();
        return;
      }

      if (errorEl) errorEl.hidden = true;
      var submitBtn = form.querySelector('[data-gm-form-submit]');
      if (submitBtn) {
        submitBtn.dataset.originalLabel = submitBtn.textContent;
        submitBtn.textContent = 'Envoi en cours…';
        submitBtn.disabled = true;
      }
    });

    // Clear a field's error state as soon as the visitor fixes it.
    form.querySelectorAll('.gm-input[required]').forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.checkValidity()) {
          var wrapper = input.closest('.gm-form__field');
          if (wrapper) wrapper.setAttribute('data-invalid', 'false');
        }
      });
    });
  });

  document.querySelectorAll('[data-gm-form-success]').forEach(function (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
