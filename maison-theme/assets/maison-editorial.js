/* =========================================================================
   MAISON — Pages éditoriales
   Accordéons (FAQ, contenus) et récapitulatif de rendez-vous.
   Le même verrou anti-doublon que la fiche produit est utilisé : si les deux
   scripts sont chargés, un accordéon n'est branché qu'une seule fois.
   ========================================================================= */
(function () {
  'use strict';

  function bindOnce(el, key) {
    if (!el) return false;
    if (el.getAttribute('data-bound-' + key)) return false;
    el.setAttribute('data-bound-' + key, '1');
    return true;
  }

  /* ---------- Accordéons ---------------------------------------------------- */
  function accordions() {
    document.querySelectorAll('[data-accordion]').forEach(function (item) {
      var head = item.querySelector('[data-accordion-head]');
      var panel = item.querySelector('[data-accordion-panel]');
      var inner = item.querySelector('[data-accordion-inner]');
      if (!head || !panel || !inner) return;

      function setHeight(open) { panel.style.height = open ? inner.offsetHeight + 'px' : '0px'; }

      if (bindOnce(head, 'acc')) {
        head.addEventListener('click', function () {
          var open = head.getAttribute('aria-expanded') === 'true';
          head.setAttribute('aria-expanded', String(!open));
          panel.setAttribute('aria-hidden', String(open));
          setHeight(!open);
        });
        window.addEventListener('resize', function () {
          if (head.getAttribute('aria-expanded') === 'true') setHeight(true);
        });
      }
      setHeight(head.getAttribute('aria-expanded') === 'true');
    });
  }

  accordions();
  document.addEventListener('shopify:section:load', accordions);

  /* ---------- Rendez-vous ---------------------------------------------------- */
  document.querySelectorAll('[data-appointment]').forEach(function (root) {
    if (!bindOnce(root, 'appt')) return;

    var typeField = root.querySelector('[data-appt-type-field]');
    var slotField = root.querySelector('[data-appt-slot-field]');
    var dateInput = root.querySelector('[data-appt-date]');
    var sumType = root.querySelector('[data-appt-summary-type]');
    var sumDate = root.querySelector('[data-appt-summary-date]');
    var sumSlot = root.querySelector('[data-appt-summary-slot]');

    function choose(selector, attribute, onPick) {
      var buttons = root.querySelectorAll('[' + attribute + ']');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          onPick(btn.getAttribute(attribute));
        });
      });
      var first = root.querySelector('[' + attribute + '][aria-pressed="true"]');
      if (first) onPick(first.getAttribute(attribute));
    }

    choose('type', 'data-appt-type', function (value) {
      if (typeField) typeField.value = value;
      if (sumType) sumType.textContent = value;
    });

    choose('slot', 'data-appt-slot', function (value) {
      if (slotField) slotField.value = value;
      if (sumSlot) sumSlot.textContent = value;
    });

    if (dateInput) {
      dateInput.addEventListener('change', function () {
        if (sumDate) sumDate.textContent = dateInput.value || '—';
      });
    }

    /* Si le visiteur arrive depuis le configurateur, son projet est repris
       dans le champ « Votre projet ». Rien n'est envoyé sans son action. */
    var project = null;
    try { project = window.sessionStorage.getItem('maison:projet'); } catch (e) {}
    if (project) {
      var textarea = root.querySelector('textarea');
      if (textarea && !textarea.value) textarea.value = 'Projet : ' + project;
      var summary = root.querySelector('[data-appt-summary]');
      if (summary && !summary.querySelector('[data-appt-project]')) {
        var line = document.createElement('p');
        line.className = 'appt__row';
        line.setAttribute('data-appt-project', '');
        line.innerHTML = '<span>Projet</span><span>' + project + '</span>';
        summary.appendChild(line);
      }
    }
  });
})();
