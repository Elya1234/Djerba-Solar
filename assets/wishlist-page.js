/**
 * GOLD MINES — Favoris (dedicated wishlist page).
 *
 * Reads window.GMWishlist (assets/wishlist.js, localStorage-backed —
 * per-browser, not synced across devices/accounts, stated plainly in the
 * page copy). For each saved {id, url} it fetches the product's own real
 * `.json` endpoint — never cached/invented data — to show current price,
 * image and availability.
 *
 * Cart/CTA decision kept identical to product cards / product page / Quick
 * View (assets/quickview.js):
 *   - tagged "sur-devis"        -> "Demander un devis" link, never a cart form
 *   - exactly one variant, available -> direct add-to-cart via window.GMCart
 *   - more than one variant     -> "Configurer cette création" link to the PDP
 *     (a wishlist entry stores no chosen variant, so guessing one would be
 *     dishonest; the visitor picks it on the real product page)
 *   - not available             -> disabled "Indisponible", never a working button
 */
(function () {
  'use strict';

  var grid = document.querySelector('[data-gm-wishlist-grid]');
  var empty = document.querySelector('[data-gm-wishlist-empty]');
  var skeleton = document.querySelector('[data-gm-wishlist-skeleton]');
  if (!grid || !empty) return;

  var cache = {}; // id -> product json, or false if fetch failed

  function money(cents) {
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: currency });
  }

  function cardHtml(entry, product) {
    if (!product) {
      return (
        '<div class="gm-wishlist-card gm-wishlist-card--unavailable" data-gm-wishlist-item="' + entry.id + '">' +
          '<div class="gm-wishlist-card__media"><div class="gm-skeleton" style="width:100%;height:100%;"></div></div>' +
          '<p class="gm-wishlist-card__title">Cette création n\'est plus disponible.</p>' +
          '<button type="button" class="gm-btn gm-btn--outline gm-btn--full gm-wishlist-card__cta" data-gm-wishlist-remove="' + entry.id + '">Retirer des favoris</button>' +
        '</div>'
      );
    }

    var isDevis = (product.tags || []).indexOf('sur-devis') !== -1;
    var variant = product.variants[0];
    var singleVariant = product.variants.length === 1;
    var available = product.available && variant.available;

    var priceHtml = isDevis
      ? 'Sur devis'
      : product.variants.every(function (v) { return v.price === variant.price; })
        ? money(variant.price)
        : 'À partir de ' + money(Math.min.apply(null, product.variants.map(function (v) { return v.price; })));

    var ctaHtml;
    if (isDevis) {
      ctaHtml = '<a href="/pages/rendez-vous?produit=' + encodeURIComponent(product.handle) + '" class="gm-btn gm-btn--primary gm-btn--full gm-wishlist-card__cta">Demander un devis</a>';
    } else if (!available) {
      ctaHtml = '<button type="button" class="gm-btn gm-btn--outline gm-btn--full gm-wishlist-card__cta" disabled>Indisponible</button>';
    } else if (singleVariant) {
      ctaHtml = '<button type="button" class="gm-btn gm-btn--primary gm-btn--full gm-wishlist-card__cta" data-gm-wishlist-add-cart data-variant-id="' + variant.id + '">Ajouter au panier</button>';
    } else {
      ctaHtml = '<a href="' + product.url + '" class="gm-btn gm-btn--outline gm-btn--full gm-wishlist-card__cta">Configurer cette création</a>';
    }

    var image = product.featured_image ? product.featured_image.replace(/(\.[a-z]+)(\?|$)/i, '_600x$1$2') : (product.images && product.images[0]);

    return (
      '<div class="gm-wishlist-card" data-gm-wishlist-item="' + entry.id + '">' +
        '<div class="gm-wishlist-card__media">' +
          '<a href="' + product.url + '">' + (image ? '<img src="' + image + '" alt="" loading="lazy">' : '') + '</a>' +
          '<button type="button" class="gm-wishlist-card__remove" data-gm-wishlist-remove="' + entry.id + '" aria-label="Retirer ' + product.title + ' des favoris">&times;</button>' +
        '</div>' +
        '<a href="' + product.url + '" class="gm-wishlist-card__title">' + product.title + '</a>' +
        '<div class="gm-wishlist-card__price">' + priceHtml + '</div>' +
        ctaHtml +
        (!available && !isDevis ? '<p class="gm-wishlist-card__note">Cette création n\'est plus disponible à l\'achat.</p>' : '') +
      '</div>'
    );
  }

  function render(entries) {
    if (!entries.length) {
      grid.hidden = true;
      grid.innerHTML = '';
      empty.hidden = false;
      if (skeleton) skeleton.hidden = true;
      return;
    }
    empty.hidden = true;
    if (skeleton) skeleton.hidden = true;
    grid.hidden = false;
    grid.innerHTML = entries.map(function (entry) { return cardHtml(entry, cache[entry.id] || null); }).join('');
    bindCardControls();
  }

  function bindCardControls() {
    grid.querySelectorAll('[data-gm-wishlist-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.GMWishlist.remove(btn.getAttribute('data-gm-wishlist-remove'));
      });
    });
    grid.querySelectorAll('[data-gm-wishlist-add-cart]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.GMCart) return;
        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Ajout en cours…';
        window.GMCart.addItem({ id: btn.getAttribute('data-variant-id'), quantity: 1 })
          .then(function () {
            btn.textContent = 'Ajouté ✓';
            setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 1800);
          })
          .catch(function () {
            btn.textContent = 'Erreur — réessayer';
            setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 2200);
          });
      });
    });
  }

  function load() {
    var entries = window.GMWishlist ? window.GMWishlist.read() : [];
    if (!entries.length) {
      render(entries);
      return;
    }
    var pending = entries.filter(function (e) { return !(e.id in cache) && e.url; });
    Promise.all(pending.map(function (entry) {
      return fetch(entry.url + '.json')
        .then(function (r) { if (!r.ok) throw new Error('not found'); return r.json(); })
        .then(function (data) { cache[entry.id] = data.product; })
        .catch(function () { cache[entry.id] = false; });
    })).then(function () { render(entries); });

    entries.forEach(function (e) { if (!e.url) cache[e.id] = false; });
    if (!pending.length) render(entries);
  }

  document.addEventListener('DOMContentLoaded', load);
  document.addEventListener('gm:wishlist:changed', load);
})();
