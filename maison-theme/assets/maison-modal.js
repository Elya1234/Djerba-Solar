/* =========================================================================
   MAISON — Fenêtres modales
   Un seul comportement pour le zoom, le guide des tailles, le mini-panier
   et les tiroirs : focus placé à l'ouverture, tabulation piégée, Échap ferme,
   focus rendu à l'élément qui a ouvert la fenêtre.
   Le design n'est pas touché : ce fichier ne gère que le comportement.
   ========================================================================= */
(function () {
  'use strict';

  var stack = [];

  function focusables(panel) {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
  }

  function quietFocus(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function open(panel, opener) {
    if (!panel || panel.classList.contains('is-open')) return;

    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');

    stack.push({ panel: panel, opener: opener || document.activeElement });

    var target = panel.querySelector('[data-modal-initial]') || focusables(panel)[0];
    quietFocus(target);
  }

  function close(panel) {
    var entry = null;
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].panel === panel) { entry = stack.splice(i, 1)[0]; break; }
    }
    if (!panel) return;

    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');

    if (!document.querySelector('.is-open[data-modal], .mmenu.is-open')) {
      document.body.classList.remove('is-locked');
    }
    if (entry && entry.opener && document.contains(entry.opener)) quietFocus(entry.opener);
  }

  function closeTop() {
    if (!stack.length) return;
    close(stack[stack.length - 1].panel);
  }

  /* Échap ferme la fenêtre la plus haute ; la tabulation reste à l'intérieur. */
  document.addEventListener('keydown', function (event) {
    if (!stack.length) return;
    var top = stack[stack.length - 1].panel;

    if (event.key === 'Escape') { event.preventDefault(); close(top); return; }
    if (event.key !== 'Tab') return;

    var items = focusables(top);
    if (!items.length) { event.preventDefault(); return; }
    var first = items[0];
    var last = items[items.length - 1];

    if (!top.contains(document.activeElement)) { event.preventDefault(); quietFocus(first); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); quietFocus(last); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); quietFocus(first); }
  });

  /* Ouverture et fermeture déclaratives : data-modal-open="ID", data-modal-close */
  document.addEventListener('click', function (event) {
    var opener = event.target.closest ? event.target.closest('[data-modal-open]') : null;
    if (opener) {
      var panel = document.getElementById(opener.getAttribute('data-modal-open'));
      if (panel) { event.preventDefault(); open(panel, opener); }
      return;
    }
    var closer = event.target.closest ? event.target.closest('[data-modal-close]') : null;
    if (closer) {
      event.preventDefault();
      close(closer.closest('[data-modal]'));
    }
  });

  window.MaisonModal = { open: open, close: close, closeTop: closeTop };
})();
