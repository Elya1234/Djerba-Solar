/* =========================================================================
   MAISON — Comportements du header
   Vanilla JS, aucune dépendance. Animations déléguées au CSS
   (transform / opacity / clip-path uniquement).
   ========================================================================= */
(function () {
  'use strict';

  var header = document.querySelector('[data-header]');
  if (!header) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var desktop = window.matchMedia('(min-width: 990px)');

  /* ---------------------------------------------------------------------
     1. ÉTAT AU DÉFILEMENT — voilé, opaque, compact
     --------------------------------------------------------------------- */
  var transparent = header.hasAttribute('data-transparent');
  var lastY = window.scrollY;
  var ticking = false;
  var VEIL = 8;       // px avant l'apparition du fond voilé
  var SOLID = 120;    // px avant le fond opaque
  var COMPACT = 180;  // px avant le header compact

  function applyScrollState() {
    var y = window.scrollY;
    var goingDown = y > lastY + 2;
    var goingUp = y < lastY - 2;

    if (transparent) {
      header.classList.toggle('is-veiled', y > VEIL && y <= SOLID);
      header.classList.toggle('is-solid', y > SOLID);
    } else {
      header.classList.add('is-solid');
    }

    if (goingDown && y > COMPACT) header.classList.add('is-compact');
    if (goingUp || y <= VEIL) header.classList.remove('is-compact');

    lastY = y;
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(applyScrollState);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  applyScrollState();

  /* ---------------------------------------------------------------------
     2. CONTRASTE AUTOMATIQUE
     Toute section peut déclarer data-header-contrast="light|dark".
     "light" = le header doit passer en blanc (visuel sombre derrière).
     --------------------------------------------------------------------- */
  if (transparent && 'IntersectionObserver' in window) {
    var zones = document.querySelectorAll('[data-header-contrast]');
    if (zones.length) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            header.classList.toggle('is-inverted', entry.target.dataset.headerContrast === 'light');
          }
        });
      }, { rootMargin: '-1px 0px -98% 0px', threshold: 0 });
      zones.forEach(function (z) { observer.observe(z); });
    }
  }

  /* ---------------------------------------------------------------------
     3. MEGA-MENU
     --------------------------------------------------------------------- */
  var mega = header.querySelector('[data-mega]');
  var stage = header.querySelector('[data-mega-stage]');
  var scrim = document.querySelector('[data-scrim]');
  var triggers = Array.prototype.slice.call(header.querySelectorAll('[data-mega-trigger]'));
  var current = null;
  var openTimer = null;
  var closeTimer = null;

  function panelFor(key) {
    return stage ? stage.querySelector('[data-panel="' + key + '"]') : null;
  }

  function setHeight(panel) {
    if (!mega) return;
    var h = panel ? panel.offsetHeight : 0;
    mega.style.height = h + 'px';
    if (stage) stage.style.height = h + 'px';
  }

  function openMega(key) {
    if (!mega || !desktop.matches) return;
    var panel = panelFor(key);
    if (!panel) { closeMega(); return; }

    clearTimeout(closeTimer);

    if (current && current !== key) {
      var prev = panelFor(current);
      if (prev) {
        prev.classList.remove('is-active');
        prev.setAttribute('aria-hidden', 'true');
      }
    }

    panel.classList.add('is-active');
    panel.setAttribute('aria-hidden', 'false');
    setHeight(panel);

    header.classList.add('is-mega-open');
    if (scrim) scrim.classList.add('is-visible');

    triggers.forEach(function (t) {
      t.setAttribute('aria-expanded', String(t.dataset.megaTrigger === key));
    });

    current = key;
  }

  function closeMega() {
    if (!mega || current === null) return;
    var panel = panelFor(current);
    if (panel) {
      panel.classList.remove('is-active');
      panel.setAttribute('aria-hidden', 'true');
    }
    mega.style.height = '0px';
    if (stage) stage.style.height = '0px';
    header.classList.remove('is-mega-open');
    if (scrim) scrim.classList.remove('is-visible');
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    current = null;
  }

  function scheduleOpen(key) {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    // Ouverture immédiate si un panneau est déjà visible : transition interne
    var delay = current ? 0 : (reduce.matches ? 0 : 90);
    openTimer = setTimeout(function () { openMega(key); }, delay);
  }

  function scheduleClose() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeMega, 180);
  }

  triggers.forEach(function (trigger) {
    var key = trigger.dataset.megaTrigger;

    if (canHover.matches) {
      trigger.addEventListener('mouseenter', function () { scheduleOpen(key); });
      trigger.addEventListener('focus', function () { openMega(key); });
    }

    // Clavier et pointeur grossier : bascule explicite
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      if (current === key) { closeMega(); trigger.focus(); }
      else { openMega(key); }
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' && current === key) {
        var panel = panelFor(key);
        var first = panel && panel.querySelector('a');
        if (first) { event.preventDefault(); first.focus(); }
      }
    });
  });

  var navRow = header.querySelector('[data-nav]');

  if (mega) {
    if (canHover.matches) {
      mega.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
      mega.addEventListener('mouseleave', scheduleClose);
    }
    mega.addEventListener('focusout', function (event) {
      var next = event.relatedTarget;
      if (!next) return;
      if (!mega.contains(next) && !(navRow && navRow.contains(next))) closeMega();
    });
  }

  if (navRow && canHover.matches) {
    navRow.addEventListener('mouseleave', scheduleClose);
  }
  if (scrim) {
    scrim.addEventListener('mouseenter', scheduleClose);
    scrim.addEventListener('click', closeMega);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && current) {
      var active = document.querySelector('[data-mega-trigger][aria-expanded="true"]');
      closeMega();
      if (active) active.focus();
    }
  });

  /* Recalcul de la hauteur : redimensionnement, chargement des images, polices */
  function recalc() {
    if (!current) return;
    if (!desktop.matches) { closeMega(); return; }
    setHeight(panelFor(current));
  }
  window.addEventListener('resize', recalc);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(recalc);
  if (stage) {
    stage.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('load', recalc);
    });
  }

  /* ---------------------------------------------------------------------
     4. MENU MOBILE — panneaux empilés (racine > catégorie > métaux/formes…)
     Chaque niveau glisse depuis la droite ; le niveau qu'il recouvre reste
     visible, légèrement décalé et estompé ("is-back"), pour donner une
     sensation de profondeur plutôt qu'un saut brutal. RETOUR dépile
     exactement le niveau courant ; X ferme tout, quel que soit le niveau.
     --------------------------------------------------------------------- */
  var mmenu = document.querySelector('[data-mmenu]');
  var burger = header.querySelector('[data-mmenu-open]');
  var lastFocus = null;

  if (mmenu && burger) {
    var closers = mmenu.querySelectorAll('[data-mmenu-close]');
    var openers = mmenu.querySelectorAll('[data-mmenu-open]');
    var backs = mmenu.querySelectorAll('[data-mmenu-back]');
    var rootPanel = mmenu.querySelector('.mmenu__panel--root');
    var viewport = mmenu.querySelector('[data-mmenu-viewport]');
    var stack = rootPanel ? [rootPanel] : [];

    /* Le focus ne doit jamais faire défiler le conteneur : sur iOS, donner le
       focus à un élément d'un panneau encore hors écran décale tout le menu
       et laisse un écran vide. */
    function focusQuietly(el) {
      if (!el) return;
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    }

    function panelById(id) {
      return mmenu.querySelector('#' + id);
    }

    function markActive(panel) {
      panel.classList.add('is-active');
      panel.classList.remove('is-back');
      panel.setAttribute('aria-hidden', 'false');
    }
    function markBack(panel) {
      panel.classList.remove('is-active');
      panel.classList.add('is-back');
      panel.setAttribute('aria-hidden', 'true');
    }
    function markHidden(panel) {
      panel.classList.remove('is-active', 'is-back');
      panel.setAttribute('aria-hidden', 'true');
    }

    function openMobile() {
      lastFocus = document.activeElement;
      mmenu.classList.add('is-open');
      mmenu.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
      focusQuietly(mmenu.querySelector('.mmenu__bar [data-mmenu-close]'));
    }

    function closeMobile() {
      mmenu.classList.remove('is-open');
      mmenu.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      collapseToRoot();
      if (lastFocus) lastFocus.focus();
    }

    function collapseToRoot() {
      while (stack.length > 1) {
        markHidden(stack.pop());
      }
      if (rootPanel) markActive(rootPanel);
      mmenu.classList.remove('has-sub');
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    }

    function openPanel(id) {
      var panel = panelById(id);
      if (!panel) return;
      var top = stack[stack.length - 1];
      if (top) markBack(top);
      markActive(panel);
      stack.push(panel);
      mmenu.classList.add('has-sub');
      panel.scrollTop = 0;
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
      focusQuietly(panel.querySelector('[data-mmenu-back]'));
    }

    function goBack() {
      if (stack.length <= 1) return;
      markHidden(stack.pop());
      var prev = stack[stack.length - 1];
      markActive(prev);
      mmenu.classList.toggle('has-sub', stack.length > 1);
      if (viewport) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
      focusQuietly(prev.querySelector('[data-mmenu-open], [data-mmenu-back], .mmenu__row'));
    }

    burger.addEventListener('click', openMobile);
    closers.forEach(function (btn) { btn.addEventListener('click', closeMobile); });
    openers.forEach(function (btn) {
      btn.addEventListener('click', function () { openPanel(btn.dataset.mmenuOpen); });
    });
    backs.forEach(function (btn) { btn.addEventListener('click', goBack); });

    function getFocusable(container) {
      if (!container) return [];
      return Array.prototype.filter.call(
        container.querySelectorAll('a[href], button:not([disabled]), select'),
        function (el) { return el.offsetParent !== null; }
      );
    }

    mmenu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (stack.length > 1) { goBack(); } else { closeMobile(); }
        return;
      }
      if (event.key !== 'Tab') return;

      // Piège de focus limité à la barre + au panneau du niveau courant
      var scope = getFocusable(mmenu.querySelector('.mmenu__bar')).concat(
        getFocusable(stack[stack.length - 1])
      );
      if (!scope.length) return;
      var first = scope[0];
      var last = scope[scope.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });

    // Retour au desktop : on referme proprement
    var onBreakpoint = function () {
      if (desktop.matches && mmenu.classList.contains('is-open')) closeMobile();
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  /* ---------------------------------------------------------------------
     5. Sélecteur pays / région — envoi du formulaire au changement
     --------------------------------------------------------------------- */
  document.querySelectorAll('.hdr__locale select').forEach(function (select) {
    select.addEventListener('change', function () {
      if (select.form) select.form.submit();
    });
  });

  /* ---------------------------------------------------------------------
     6. Theme Editor Shopify — rechargement des sections
     --------------------------------------------------------------------- */
  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.querySelector('[data-header]')) window.location.reload();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var key = event.target.getAttribute('data-panel');
    if (key) openMega(key);
  });
  document.addEventListener('shopify:block:deselect', function () { closeMega(); });
})();
