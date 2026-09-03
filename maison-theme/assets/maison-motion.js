/* =========================================================================
   MAISON — Mouvement de la page d'accueil
   IntersectionObserver + rAF. Aucune bibliothèque.
   Le langage d'animation (durées, courbes, décalages) vient de l'étape 1.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Apparitions au défilement -------------------------------- */
  var revealables = document.querySelectorAll('[data-reveal], .line-mask');

  if (!('IntersectionObserver' in window) || reduce) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- 2. Hero : séquence de chargement ---------------------------- */
  document.querySelectorAll('[data-hero]').forEach(function (hero) {
    var media = hero.querySelector('img, video');

    function start() { hero.classList.add('is-loaded'); }

    if (!media) { start(); return; }
    if (media.tagName === 'VIDEO') {
      if (media.readyState >= 2) start();
      else media.addEventListener('loadeddata', start, { once: true });
      setTimeout(start, 1600); // filet de sécurité si la vidéo tarde
    } else if (media.complete) {
      start();
    } else {
      media.addEventListener('load', start, { once: true });
      media.addEventListener('error', start, { once: true });
    }
  });

  /* ---------- 3. Pierres : fondu croisé image + texte --------------------- */
  document.querySelectorAll('[data-stones]').forEach(function (root) {
    var buttons = root.querySelectorAll('[data-stone]');
    var images = root.querySelectorAll('[data-stone-image]');
    var copies = root.querySelectorAll('[data-stone-copy]');

    function select(key) {
      buttons.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.stone === key)); });
      images.forEach(function (i) { i.classList.toggle('is-active', i.dataset.stoneImage === key); });
      copies.forEach(function (c) { c.classList.toggle('is-active', c.dataset.stoneCopy === key); });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.dataset.stone); });
      btn.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) select(btn.dataset.stone);
      });
      btn.addEventListener('focus', function () { select(btn.dataset.stone); });
    });
  });

  /* ---------- 4. Favoris ---------------------------------------------------
     Enregistrement local, côté navigateur. À relier à un vrai service
     client lors de l'étape Compte. Aucun bouton sans effet visible.
     ------------------------------------------------------------------------ */
  var store = (function () {
    var memory = {};
    var ok = false;
    try {
      window.localStorage.setItem('__maison', '1');
      window.localStorage.removeItem('__maison');
      ok = true;
    } catch (e) { ok = false; }
    return {
      read: function () {
        if (!ok) return memory;
        try { return JSON.parse(window.localStorage.getItem('maison:favoris') || '{}'); }
        catch (e) { return {}; }
      },
      write: function (data) {
        memory = data;
        if (!ok) return;
        try { window.localStorage.setItem('maison:favoris', JSON.stringify(data)); } catch (e) {}
      }
    };
  })();

  /* Le cœur ne doit jamais ouvrir la fiche produit : on arrête la propagation
     avant que le routeur ou un lien parent ne s'en saisisse. */
  function syncFavourites() {
    var favs = store.read();
    var count = Object.keys(favs).length;

    document.querySelectorAll('[data-fav]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(!!favs[btn.dataset.fav]));
      if (btn.getAttribute('data-fav-bound')) return;
      btn.setAttribute('data-fav-bound', '1');
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var current = store.read();
        var id = btn.dataset.fav;
        if (current[id]) {
          delete current[id];
        } else {
          current[id] = { handle: btn.dataset.favHandle || id, at: Date.now() };
        }
        store.write(current);
        syncFavourites();
        document.dispatchEvent(new CustomEvent('maison:favourites:updated', { detail: current }));
      });
    });

    document.querySelectorAll('[data-fav-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
  }

  syncFavourites();

  window.MaisonFavourites = {
    list: function () { return store.read(); },
    handles: function () {
      var data = store.read();
      return Object.keys(data).map(function (key) {
        return (data[key] && data[key].handle) || key;
      });
    },
    remove: function (id) {
      var current = store.read();
      delete current[id];
      store.write(current);
      syncFavourites();
      document.dispatchEvent(new CustomEvent('maison:favourites:updated', { detail: current }));
    },
    sync: syncFavourites
  };

  /* ---------- 5. Parallaxe très légère ------------------------------------ */
  var parallax = document.querySelectorAll('[data-parallax]');
  if (parallax.length && !reduce && window.matchMedia('(min-width: 750px)').matches) {
    var ticking = false;

    function frame() {
      var vh = window.innerHeight;
      parallax.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -1 → 1
        var amount = parseFloat(el.dataset.parallax) || 18;
        var img = el.querySelector('img');
        if (img) img.style.transform = 'translate3d(0,' + (-progress * amount).toFixed(2) + 'px,0) scale(1.06)';
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener('resize', frame);
    frame();
  }

  /* ---------- 6. Theme Editor : rejouer les apparitions ------------------- */
  document.addEventListener('shopify:section:load', function (event) {
    event.target.querySelectorAll('[data-reveal], .line-mask').forEach(function (el) {
      el.classList.add('is-in');
    });
    event.target.querySelectorAll('[data-hero]').forEach(function (h) { h.classList.add('is-loaded'); });
  });
})();
