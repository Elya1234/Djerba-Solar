/* =========================================================================
   MAISON — Collections
   Le formulaire de filtres fonctionne sans JavaScript (méthode GET + bouton
   Appliquer). Le JS n'ajoute que le confort : panneau animé, envoi
   automatique sur ordinateur, pastilles de métal.
   ========================================================================= */
(function () {
  'use strict';

  var desktop = window.matchMedia('(min-width: 750px)');

  /* ---------- 1. Panneau de filtres --------------------------------------- */
  document.querySelectorAll('[data-filters-root]').forEach(function (root) {
    var panel = root.querySelector('[data-filters-panel]');
    var toggles = root.querySelectorAll('[data-filters-toggle]');
    var closers = root.querySelectorAll('[data-filters-close]');
    if (!panel) return;

    var lastFocus = null;

    function measure() {
      if (!desktop.matches) return;
      var inner = panel.querySelector('[data-filters-inner]');
      panel.style.height = panel.classList.contains('is-open') && inner ? inner.offsetHeight + 'px' : '0px';
    }

    function open() {
      lastFocus = document.activeElement;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });
      measure();
      if (!desktop.matches) {
        document.body.classList.add('is-locked');
        var first = panel.querySelector('[data-filters-close]');
        if (first) first.focus();
      }
    }

    function close() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
      panel.style.height = '';
      measure();
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    }

    toggles.forEach(function (t) {
      t.addEventListener('click', function () {
        if (panel.classList.contains('is-open')) close(); else open();
      });
    });
    closers.forEach(function (c) { c.addEventListener('click', close); });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    window.addEventListener('resize', function () {
      if (panel.classList.contains('is-open')) measure();
      if (desktop.matches) document.body.classList.remove('is-locked');
    });

    /* Envoi automatique sur ordinateur ; sur mobile, le bouton Appliquer
       reste nécessaire pour éviter un rechargement à chaque case cochée. */
    var form = root.querySelector('[data-filters-form]');
    if (form) {
      form.addEventListener('change', function (event) {
        if (!desktop.matches) return;
        if (event.target.type === 'number' || event.target.type === 'text') return;
        form.submit();
      });
    }
  });

  /* ---------- 2. Tri -------------------------------------------------------- */
  document.querySelectorAll('[data-sort]').forEach(function (select) {
    select.addEventListener('change', function () {
      if (select.form) select.form.submit();
    });
  });

  /* ---------- 3. Pastilles de métal sur la carte produit ------------------- */
  document.querySelectorAll('[data-swatches]').forEach(function (group) {
    var card = group.closest('.card');
    if (!card) return;
    var image = card.querySelector('.card__img--main');
    var links = card.querySelectorAll('[data-card-link]');
    var buttons = group.querySelectorAll('[data-swatch]');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

        var src = btn.dataset.swatchImage;
        if (src && image) {
          image.removeAttribute('srcset');
          image.src = src;
        }

        var variant = btn.dataset.swatchVariant;
        var base = card.dataset.productUrl;
        if (variant && base) {
          links.forEach(function (a) { a.href = base + '?variant=' + variant; });
        }
      });
    });
  });
})();
