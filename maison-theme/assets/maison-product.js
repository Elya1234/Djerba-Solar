/* =========================================================================
   MAISON — Fiche produit
   Shopify reste la source de vérité : les variantes sont lues depuis le JSON
   rendu par Liquid, jamais reconstruites en JavaScript.
   Les favoris réutilisent le système des cartes produit (data-fav).
   L'ajout au panier passe par maison-cart.js : un seul système de panier.

   Le module est réinitialisable — window.MaisonProduct.init() — pour le
   Theme Editor de Shopify et pour l'aperçu autonome, qui change de produit
   sans recharger la page.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Évite tout listener dupliqué si init() est appelé plusieurs fois. */
  function bindOnce(el, key) {
    if (!el) return false;
    if (el.getAttribute('data-bound-' + key)) return false;
    el.setAttribute('data-bound-' + key, '1');
    return true;
  }

  function openPanel(panel, opener) {
    if (panel && window.MaisonModal) window.MaisonModal.open(panel, opener);
  }

  function init() {
    /* ---------- 1. Accordéons ---------------------------------------------- */
    document.querySelectorAll('[data-accordion]').forEach(function (item) {
      var head = item.querySelector('[data-accordion-head]');
      var panel = item.querySelector('[data-accordion-panel]');
      var inner = item.querySelector('[data-accordion-inner]');
      if (!head || !panel || !inner) return;

      function setHeight(open) {
        panel.style.height = open ? inner.offsetHeight + 'px' : '0px';
      }

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

    /* ---------- 2. Guide des tailles --------------------------------------- */
    var sizeGuide = document.querySelector('[data-size-guide]');
    document.querySelectorAll('[data-size-guide-open]').forEach(function (btn) {
      if (!bindOnce(btn, 'size')) return;
      btn.addEventListener('click', function () { openPanel(sizeGuide, btn); });
    });

    var root = document.querySelector('[data-product]');
    if (!root) return;

    /* ---------- 3. Galerie -------------------------------------------------- */
    var track = root.querySelector('[data-gallery-track]');
    var slides = root.querySelectorAll('[data-slide]');
    var counter = root.querySelector('[data-gallery-counter]');
    var thumbs = root.querySelectorAll('[data-gallery-thumb]');

    function currentIndex() {
      if (!track) return 0;
      var mid = track.scrollLeft + track.clientWidth / 2;
      var index = 0;
      slides.forEach(function (slide, i) { if (slide.offsetLeft <= mid) index = i; });
      return index;
    }

    function syncCounter() {
      if (!counter || !slides.length) return;
      counter.textContent = (currentIndex() + 1) + ' / ' + slides.length;
    }

    if (track && bindOnce(track, 'gal')) {
      var ticking = false;
      track.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () { syncCounter(); ticking = false; });
      }, { passive: true });
    }
    syncCounter();

    thumbs.forEach(function (thumb) {
      if (!bindOnce(thumb, 'thumb')) return;
      thumb.addEventListener('click', function () {
        var target = slides[parseInt(thumb.dataset.galleryThumb, 10)];
        if (!target) return;
        thumbs.forEach(function (t) { t.setAttribute('aria-current', String(t === thumb)); });
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'center' });
      });
    });

    function focusMedia(mediaId) {
      if (!mediaId) return;
      var slide = root.querySelector('[data-slide][data-media-id="' + mediaId + '"]');
      if (!slide) return;
      if (window.matchMedia('(min-width: 990px)').matches) {
        slide.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      } else if (track) {
        track.scrollTo({ left: slide.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    /* ---------- 4. Zoom plein écran ---------------------------------------- */
    var zoom = document.querySelector('[data-zoom]');
    if (zoom) {
      var zoomImg = zoom.querySelector('[data-zoom-image]');
      var zoomCount = zoom.querySelector('[data-zoom-counter]');
      var sources = [];
      slides.forEach(function (slide) {
        var img = slide.querySelector('img');
        if (img) sources.push({ src: img.currentSrc || img.src, alt: img.alt || '' });
      });
      var zIndex = 0;

      var paint = function () {
        if (!sources.length || !zoomImg) return;
        zoomImg.src = sources[zIndex].src;
        zoomImg.alt = sources[zIndex].alt;
        zoomImg.classList.remove('is-zoomed');
        if (zoomCount) zoomCount.textContent = (zIndex + 1) + ' / ' + sources.length;
      };

      root.querySelectorAll('[data-zoom-open]').forEach(function (btn, i) {
        if (!bindOnce(btn, 'zoom')) return;
        btn.addEventListener('click', function () { zIndex = i; paint(); openPanel(zoom, btn); });
      });

      var prev = zoom.querySelector('[data-zoom-prev]');
      var next = zoom.querySelector('[data-zoom-next]');
      if (prev && bindOnce(prev, 'zoomprev')) prev.addEventListener('click', function () { zIndex = (zIndex - 1 + sources.length) % sources.length; paint(); });
      if (next && bindOnce(next, 'zoomnext')) next.addEventListener('click', function () { zIndex = (zIndex + 1) % sources.length; paint(); });
      if (zoomImg && bindOnce(zoomImg, 'zoomimg')) zoomImg.addEventListener('click', function () { zoomImg.classList.toggle('is-zoomed'); });
      if (bindOnce(zoom, 'zoomkeys')) {
        document.addEventListener('keydown', function (event) {
          if (!zoom.classList.contains('is-open')) return;
          if (event.key === 'ArrowLeft' && prev) prev.click();
          if (event.key === 'ArrowRight' && next) next.click();
        });
      }
    }

    /* ---------- 5. Variantes ------------------------------------------------ */
    var dataTag = root.querySelector('[data-variants-json]');
    var variants = [];
    try { variants = JSON.parse(dataTag.textContent); } catch (e) { variants = []; }

    var form = root.querySelector('[data-product-form]');
    var idInput = root.querySelector('[data-variant-id]');
    var priceEl = root.querySelector('[data-variant-price]');
    var compareEl = root.querySelector('[data-variant-compare]');
    var skuEl = root.querySelector('[data-variant-sku]');
    var stockEl = root.querySelector('[data-variant-stock]');
    var stockText = root.querySelector('[data-variant-stock-text]');
    var addBtn = root.querySelector('[data-add-button]');
    var errorTarget = root.querySelector('[data-add-error]');
    var barPrice = document.querySelector('[data-bar-price]');

    function money(cents) {
      if (window.MaisonCart && window.MaisonCart.money) return window.MaisonCart.money(cents);
      return (cents / 100).toFixed(2).replace('.', ',') + ' €';
    }

    function selectedOptions() {
      var values = [];
      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var checked = group.querySelector('input:checked');
        values[parseInt(group.dataset.optionIndex, 10)] = checked ? checked.value : null;
      });
      return values;
    }

    function matches(variant, values) {
      for (var j = 0; j < values.length; j++) {
        if (values[j] === null || values[j] === undefined) continue;
        if (variant.options[j] !== values[j]) return false;
      }
      return true;
    }

    function findVariant(values) {
      for (var i = 0; i < variants.length; i++) {
        if (matches(variants[i], values)) return variants[i];
      }
      return null;
    }

    /* Disponibilité progressive, comme sur Shopify : une valeur n'est barrée
       que si elle est impossible compte tenu des options PRÉCÉDENTES. Choisir
       « Or blanc » ne doit jamais empêcher de choisir ensuite « 52 », même si
       « Or blanc + 50 » est épuisé. Vaut pour 1, 2 ou 3 options. */
    function hasAvailable(values) {
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].available && matches(variants[i], values)) return true;
      }
      return false;
    }

    function refreshAvailability() {
      var values = selectedOptions();
      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var index = parseInt(group.dataset.optionIndex, 10);
        group.querySelectorAll('input').forEach(function (input) {
          var test = [];
          for (var i = 0; i < index; i++) test[i] = values[i];
          test[index] = input.value;
          input.disabled = !hasAvailable(test);
        });
      });
    }

    /* Si la combinaison courante n'existe plus après un changement, on glisse
       vers la première valeur disponible des options suivantes. */
    function reconcile(changedIndex) {
      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var index = parseInt(group.dataset.optionIndex, 10);
        if (index <= changedIndex) return;
        var values = selectedOptions();
        var checked = group.querySelector('input:checked');
        var test = [];
        for (var i = 0; i < index; i++) test[i] = values[i];
        test[index] = checked ? checked.value : null;
        if (hasAvailable(test)) return;

        var options = Array.prototype.slice.call(group.querySelectorAll('input'));
        for (var k = 0; k < options.length; k++) {
          var candidate = [];
          for (var m = 0; m < index; m++) candidate[m] = values[m];
          candidate[index] = options[k].value;
          if (hasAvailable(candidate)) { options[k].checked = true; break; }
        }
      });
    }

    function update() {
      var variant = findVariant(selectedOptions());

      root.querySelectorAll('[data-option-index]').forEach(function (group) {
        var checked = group.querySelector('input:checked');
        group.querySelectorAll('[data-option-value]').forEach(function (label) {
          if (checked) label.textContent = checked.value;
        });
      });

      if (errorTarget) { errorTarget.hidden = true; errorTarget.textContent = ''; }

      if (!variant) {
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = addBtn.dataset.unavailable || 'Indisponible'; }
        return;
      }

      if (idInput) idInput.value = variant.id;
      if (priceEl) priceEl.textContent = money(variant.price);
      if (barPrice) barPrice.textContent = money(variant.price);
      if (compareEl) {
        var show = variant.compare_at_price && variant.compare_at_price > variant.price;
        compareEl.hidden = !show;
        if (show) compareEl.textContent = money(variant.compare_at_price);
      }
      if (skuEl) { skuEl.textContent = variant.sku || ''; skuEl.hidden = !variant.sku; }
      if (stockEl && stockText) {
        stockEl.dataset.state = variant.available ? 'in' : 'out';
        stockText.textContent = variant.availability;
      }
      if (addBtn) {
        addBtn.disabled = !variant.available;
        addBtn.textContent = variant.available
          ? (addBtn.dataset.add || 'Ajouter au panier')
          : (addBtn.dataset.soldOut || 'Épuisé');
      }
      focusMedia(variant.media_id);

      if (window.history && window.history.replaceState && root.dataset.url) {
        try { window.history.replaceState({}, '', root.dataset.url + '?variant=' + variant.id); } catch (e) {}
      }
      refreshAvailability();
    }

    root.querySelectorAll('[data-option-index]').forEach(function (group) {
      var index = parseInt(group.dataset.optionIndex, 10);
      group.querySelectorAll('input').forEach(function (input) {
        if (!bindOnce(input, 'opt')) return;
        input.addEventListener('change', function () { reconcile(index); update(); });
      });
    });

    /* ---------- 6. Ajout au panier ------------------------------------------
       Un seul système : maison-cart.js ajoute au vrai panier Shopify,
       met à jour le compteur et ouvre le mini-panier. */
    if (form && bindOnce(form, 'add')) {
      form.addEventListener('submit', function (event) {
        if (!window.MaisonCart || !window.fetch) return; /* repli : envoi classique */
        event.preventDefault();

        var variant = findVariant(selectedOptions());
        if (!variant || !variant.available) {
          if (errorTarget) {
            errorTarget.hidden = false;
            errorTarget.textContent = variant
              ? (root.dataset.errorSoldOut || 'Cette création est épuisée.')
              : (root.dataset.errorCombination || 'Cette combinaison n\u2019est pas disponible.');
          }
          return;
        }
        window.MaisonCart.add(variant.id, 1, { button: addBtn, errorTarget: errorTarget });
      });
    }

    /* ---------- 7. Barre d'achat mobile ------------------------------------- */
    var bar = document.querySelector('[data-buy-bar]');
    if (bar && addBtn && 'IntersectionObserver' in window && bindOnce(bar, 'bar')) {
      var sentinel = root.querySelector('[data-buy-sentinel]');
      if (sentinel) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
          });
        }, { threshold: 0 }).observe(sentinel);
      }
      var barBtn = bar.querySelector('[data-bar-add]');
      if (barBtn) barBtn.addEventListener('click', function () { addBtn.click(); });
    }

    refreshAvailability();
    update();

    /* ---------- 8. Recommandations Shopify -----------------------------------
       Chargement asynchrone via routes.product_recommendations_url et la
       Section Rendering API. La carte produit reste maison-card-product. */
    var reco = document.querySelector('[data-recommendations]');
    if (reco && reco.dataset.url && window.fetch && bindOnce(reco, 'reco')) {
      fetch(reco.dataset.url)
        .then(function (response) { return response.text(); })
        .then(function (html) {
          var parsed = new DOMParser().parseFromString(html, 'text/html');
          var fresh = parsed.querySelector('[data-recommendations]');
          var list = fresh && fresh.querySelector('[data-reco-list]');
          var target = reco.querySelector('[data-reco-list]');
          if (!list || !target || !list.children.length) return; /* le repli reste affiché */
          target.innerHTML = list.innerHTML;
          target.querySelectorAll('[data-reveal], .line-mask').forEach(function (el) {
            el.classList.add('is-in');
          });
        })
        .catch(function () { /* la collection associée reste affichée */ });
    }
  }

  window.MaisonProduct = { init: init };

  init();
  document.addEventListener('shopify:section:load', init);
})();
