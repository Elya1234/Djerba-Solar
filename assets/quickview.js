/**
 * GOLD MINES — Quick View.
 *
 * Deliberately lean: fetches the product's own `.json` endpoint (real
 * Shopify data — no invented content) and renders a compact preview.
 * For products with more than one option (most fine-jewelry configurators:
 * métal + carat + taille…) it does not attempt to reproduce the full
 * configurator inline — that would either omit real constraints or
 * duplicate a lot of logic in a modal. It shows the essentials and sends
 * the visitor to the full configurator instead. Simple, single-option
 * products (e.g. a fixed-size pendant) get an inline add-to-cart, which
 * goes through the shared GMCart engine (assets/cart.js) so the cart
 * drawer, header count and cart page all stay in sync — there is no
 * separate add-to-cart implementation here.
 */
(function () {
  'use strict';

  var modal = document.querySelector('[data-gm-quickview-modal]');
  var body = document.querySelector('[data-gm-quickview-body]');
  if (!modal || !body) return;

  var lastFocused = null;

  function money(cents, currency) {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: currency || 'EUR' });
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  modal.querySelectorAll('[data-gm-modal-close]').forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  function render(product) {
    var variant = product.variants[0];
    var mediaHtml = (product.images || []).slice(0, 1).map(function (src) {
      return '<img src="' + src + '" alt="" loading="eager" style="width:100%;height:100%;object-fit:cover;">';
    }).join('');

    var isDevis = (product.tags || []).indexOf('sur-devis') !== -1;
    var simple = !isDevis && (product.options || []).length <= 1 && (product.options[0] ? product.options[0].values.length <= 6 : true);

    var optionsHtml = '';
    var ctaHtml = '';

    if (isDevis) {
      ctaHtml = '<a href="/pages/rendez-vous?produit=' + encodeURIComponent(product.handle) + '" class="gm-btn gm-btn--primary gm-btn--full">Demander un devis</a>';
    } else if (simple && product.options.length === 1) {
      var opt = product.options[0];
      optionsHtml = '<div class="gm-quickview__option"><div class="gm-config__step-title" style="margin-bottom:.8rem;">' + opt.name + '</div><div class="gm-option-pills" data-gm-qv-options>' +
        opt.values.map(function (v) {
          var match = product.variants.find(function (vt) { return vt.option1 === v; });
          return '<span class="gm-option-pill" role="radio" tabindex="0" data-value="' + v + '" data-variant-id="' + (match ? match.id : '') + '" aria-checked="' + (v === variant.option1) + '">' + v + '</span>';
        }).join('') + '</div></div>';

      ctaHtml = '<button type="button" class="gm-btn gm-btn--primary gm-btn--full" data-gm-qv-add data-variant-id="' + variant.id + '"' + (variant.available ? '' : ' disabled') + '>' +
        (variant.available ? 'Ajouter au panier' : 'Indisponible') + '</button>';
    } else if (product.options.length > 1) {
      optionsHtml = '<p style="color:var(--gm-text-muted); font-size:1.3rem;">Métal, taille, pierre… cette création se configure entièrement sur sa fiche produit.</p>';
      ctaHtml = '<a href="' + product.url + '" class="gm-btn gm-btn--primary gm-btn--full">Configurer cette création</a>';
    } else {
      ctaHtml = '<button type="button" class="gm-btn gm-btn--primary gm-btn--full" data-gm-qv-add data-variant-id="' + variant.id + '"' + (variant.available ? '' : ' disabled') + '>' +
        (variant.available ? 'Ajouter au panier' : 'Indisponible') + '</button>';
    }

    var priceHtml = isDevis ? 'Sur devis' : product.variants.every(function (v) { return v.price === variant.price; })
      ? money(variant.price, window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'EUR')
      : 'À partir de ' + money(Math.min.apply(null, product.variants.map(function (v) { return v.price; })));

    body.innerHTML =
      '<div class="gm-quickview__grid">' +
        '<div class="gm-quickview__media">' + mediaHtml + '</div>' +
        '<div class="gm-quickview__info">' +
          '<h3 class="gm-h3">' + product.title + '</h3>' +
          '<div class="gm-product__price" style="font-size:1.8rem; margin-top:.8rem;">' + priceHtml + '</div>' +
          '<div style="margin-top:1.6rem;">' + optionsHtml + '</div>' +
          '<div style="margin-top:2rem; display:flex; flex-direction:column; gap:.8rem;">' +
            ctaHtml +
            '<a href="' + product.url + '" class="gm-btn gm-btn--outline gm-btn--full">Voir la fiche complète</a>' +
            '<button type="button" class="gm-btn gm-btn--ghost" data-gm-wishlist-add data-product-id="' + product.id + '" data-product-url="' + product.url + '" aria-pressed="false">Ajouter aux favoris</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var pills = body.querySelectorAll('[data-gm-qv-options] .gm-option-pill');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) { p.setAttribute('aria-checked', String(p === pill)); });
        var addBtn = body.querySelector('[data-gm-qv-add]');
        var vid = pill.getAttribute('data-variant-id');
        var matchedVariant = product.variants.find(function (v) { return String(v.id) === vid; });
        if (addBtn && matchedVariant) {
          addBtn.setAttribute('data-variant-id', matchedVariant.id);
          addBtn.disabled = !matchedVariant.available;
          addBtn.textContent = matchedVariant.available ? 'Ajouter au panier' : 'Indisponible';
        }
      });
    });

    var addBtn = body.querySelector('[data-gm-qv-add]');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (addBtn.disabled || !window.GMCart) return;
        var originalLabel = addBtn.textContent;
        addBtn.disabled = true;
        addBtn.textContent = 'Ajout en cours…';
        window.GMCart.addItem({ id: addBtn.getAttribute('data-variant-id'), quantity: 1 })
          .then(function () {
            addBtn.textContent = 'Ajouté ✓';
            // The cart drawer is now open; the Quick View (higher z-index)
            // would otherwise sit on top of it and hide it from view.
            closeModal();
            setTimeout(function () { addBtn.textContent = originalLabel; addBtn.disabled = false; }, 1800);
          })
          .catch(function () {
            addBtn.textContent = 'Erreur — réessayer';
            setTimeout(function () { addBtn.textContent = originalLabel; addBtn.disabled = false; }, 2200);
          });
      });
    }
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-gm-quickview-open]');
    if (!trigger) return;
    e.preventDefault();
    lastFocused = trigger;

    body.innerHTML = '<div class="gm-skeleton" style="width:100%; aspect-ratio:4/5; border-radius:4px;"></div>';
    modal.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('[data-gm-modal-close]:not(.gm-modal__scrim)');
    if (closeBtn) closeBtn.focus();

    fetch(trigger.getAttribute('data-product-url') + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { render(data.product); })
      .catch(function () {
        body.innerHTML = '<p style="color:var(--gm-error);">Impossible de charger cet aperçu pour le moment. <a href="' + trigger.getAttribute('data-product-url') + '">Voir la fiche produit</a>.</p>';
      });
  });
})();
