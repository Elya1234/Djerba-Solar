/**
 * GOLD MINES — Cart engine (drawer + page + header count).
 *
 * Single source of truth for every cart mutation in the theme: product
 * page, Quick View, and the drawer/page itself all call into window.GMCart
 * instead of hitting /cart/*.js directly, so there is exactly one fetch
 * path, one render path, and one place that keeps the header count, the
 * drawer and the cart page in sync. Every number and line shown comes from
 * Shopify's own cart JSON — nothing here is fabricated, and a request
 * Shopify rejects (sold out, quantity too high, network failure) is always
 * surfaced as an error, never silently treated as success.
 */
(function () {
  'use strict';

  var drawer = document.querySelector('[data-gm-cart-drawer]');
  var scrim = document.querySelector('[data-gm-scrim]');
  var lastFocused = null;
  var busy = false;

  function money(cents) {
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: currency });
  }

  function announce(message) {
    var live = document.querySelector('[data-gm-cart-live]');
    if (live) live.textContent = message;
  }

  function setBusy(state) {
    busy = state;
    if (drawer) drawer.setAttribute('aria-busy', String(state));
  }

  /* ---------------------------------------------------------------------
   * Rendering — drawer line items, subtotal, empty state, header count
   * ------------------------------------------------------------------- */
  function lineItemHtml(item) {
    var meta = (item.options_with_values || [])
      .filter(function (o) { return o.value && o.value !== 'Default Title'; })
      .map(function (o) { return '<div class="gm-cart-item__opt"><span>' + o.name + '</span><span>' + o.value + '</span></div>'; })
      .join('');

    var props = '';
    if (item.properties) {
      Object.keys(item.properties).forEach(function (key) {
        var value = item.properties[key];
        if (!value || key.charAt(0) === '_') return;
        props += '<div class="gm-cart-item__opt"><span>' + key + '</span><span>' + value + '</span></div>';
      });
    }

    var unitPrice = '<div class="gm-cart-item__opt"><span>Prix unitaire</span><span>' + money(item.original_price) + '</span></div>';

    var unavailableNote = item.variant && item.variant.available === false
      ? '<p class="gm-cart-item__warning">Cette variante n\'est plus disponible.</p>' : '';

    return (
      '<li class="gm-cart-item" data-gm-cart-line="' + item.key + '">' +
        '<a href="' + item.url + '" class="gm-cart-item__media">' +
          (item.image ? '<img src="' + item.image.replace(/(\.[a-z]+)(\?|$)/i, '_200x$1$2') + '" alt="' + (item.image_alt || '') + '" loading="lazy">' : '') +
        '</a>' +
        '<div class="gm-cart-item__body">' +
          '<a href="' + item.url + '" class="gm-cart-item__title">' + item.product_title + '</a>' +
          '<div class="gm-cart-item__opts">' + meta + props + unitPrice + '</div>' +
          unavailableNote +
          '<div class="gm-cart-item__row">' +
            '<div class="gm-qty-stepper" data-gm-qty-stepper>' +
              '<button type="button" class="gm-qty-stepper__btn" data-gm-qty-decrease aria-label="Diminuer la quantité">–</button>' +
              '<span class="gm-qty-stepper__value" aria-live="off">' + item.quantity + '</span>' +
              '<button type="button" class="gm-qty-stepper__btn" data-gm-qty-increase aria-label="Augmenter la quantité">+</button>' +
            '</div>' +
            '<button type="button" class="gm-cart-item__remove" data-gm-cart-remove aria-label="Retirer ' + item.product_title + ' du panier">Retirer</button>' +
          '</div>' +
        '</div>' +
        '<div class="gm-cart-item__price">' + money(item.final_line_price) + '</div>' +
      '</li>'
    );
  }

  function renderInto(container, cart) {
    if (!container) return;
    var list = container.querySelector('[data-gm-cart-items]');
    var emptyState = container.querySelector('[data-gm-cart-empty]');
    var footer = container.querySelector('[data-gm-cart-footer]');
    var subtotalEl = container.querySelector('[data-gm-cart-subtotal]');

    if (!cart.items.length) {
      if (list) { list.innerHTML = ''; list.hidden = true; }
      if (emptyState) emptyState.hidden = false;
      if (footer) footer.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (footer) footer.hidden = false;
    if (list) {
      list.hidden = false;
      list.innerHTML = cart.items.map(lineItemHtml).join('');
    }
    if (subtotalEl) subtotalEl.textContent = money(cart.items_subtotal_price);
  }

  function updateHeaderCount(cart) {
    document.querySelectorAll('[data-gm-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
  }

  function render(cart) {
    updateHeaderCount(cart);
    renderInto(drawer, cart);
    var page = document.querySelector('[data-gm-cart-page]');
    if (page) renderInto(page, cart);
    bindLineControls();
  }

  /* ---------------------------------------------------------------------
   * Cart API calls
   * ------------------------------------------------------------------- */
  function getCart() {
    return fetch('/cart.js').then(function (r) { return r.json(); });
  }

  function handleError(err, context) {
    console.error('[GMCart]', context, err);
    announce('Une erreur est survenue. Merci de réessayer.');
    var live = document.querySelector('[data-gm-cart-error]');
    if (live) {
      live.textContent = err && err.description ? err.description : 'Une erreur est survenue. Merci de réessayer.';
      live.hidden = false;
      setTimeout(function () { live.hidden = true; }, 4000);
    }
  }

  function addItem(payload) {
    if (busy) return Promise.reject(new Error('busy'));
    setBusy(true);
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) return Promise.reject(data);
          return data;
        });
      })
      .then(function (addedItem) {
        return getCart().then(function (cart) {
          render(cart);
          announce(addedItem.product_title + ' ajouté au panier. ' + cart.item_count + ' article' + (cart.item_count > 1 ? 's' : '') + ' au total.');
          document.dispatchEvent(new CustomEvent('gm:cart:added', { detail: cart }));
          open();
          return cart;
        });
      })
      .catch(function (err) { handleError(err, 'addItem'); return Promise.reject(err); })
      .finally(function () { setBusy(false); });
  }

  function changeLine(key, quantity) {
    if (busy) return Promise.reject(new Error('busy'));
    setBusy(true);
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) return Promise.reject(data);
          return data;
        });
      })
      .then(function (cart) {
        render(cart);
        announce('Panier mis à jour. ' + cart.item_count + ' article' + (cart.item_count > 1 ? 's' : '') + ' au total.');
        return cart;
      })
      .catch(function (err) { handleError(err, 'changeLine'); return Promise.reject(err); })
      .finally(function () { setBusy(false); });
  }

  function updateNote(note) {
    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ note: note })
    }).then(function (r) { return r.json(); }).catch(function (err) { handleError(err, 'updateNote'); });
  }

  /* ---------------------------------------------------------------------
   * Drawer open/close — focus trap, Escape, focus return
   * ------------------------------------------------------------------- */
  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    );
  }

  function open() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    scrim && scrim.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    var focusables = getFocusable(drawer);
    if (focusables.length) focusables[0].focus();
  }

  function close() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    scrim && scrim.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  if (drawer) {
    drawer.querySelectorAll('[data-gm-cart-close]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = getFocusable(drawer);
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) close();
  });
  if (scrim) scrim.addEventListener('click', close);

  document.querySelectorAll('[data-gm-cart-toggle]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      if (!drawer) return; // fall back to routes.cart_url navigation
      e.preventDefault();
      lastFocused = trigger;
      open();
    });
  });

  /* ---------------------------------------------------------------------
   * Line item controls (drawer + cart page share the same markup/handlers)
   * ------------------------------------------------------------------- */
  function bindLineControls() {
    document.querySelectorAll('[data-gm-cart-line]').forEach(function (row) {
      if (row.dataset.gmBound) return;
      row.dataset.gmBound = 'true';
      var key = row.getAttribute('data-gm-cart-line');
      var valueEl = row.querySelector('.gm-qty-stepper__value');

      row.querySelector('[data-gm-qty-increase]').addEventListener('click', function () {
        var qty = parseInt(valueEl.textContent, 10) + 1;
        changeLine(key, qty);
      });
      row.querySelector('[data-gm-qty-decrease]').addEventListener('click', function () {
        var qty = parseInt(valueEl.textContent, 10) - 1;
        changeLine(key, Math.max(qty, 0));
      });
      row.querySelector('[data-gm-cart-remove]').addEventListener('click', function () {
        changeLine(key, 0);
      });
    });
  }
  bindLineControls();

  var noteField = document.querySelector('[data-gm-cart-note]');
  if (noteField) {
    var noteTimer;
    noteField.addEventListener('input', function () {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(function () { updateNote(noteField.value); }, 600);
    });
  }

  /**
   * Builds a real Shopify /cart/add.js payload from a product form,
   * turning bracket-style field names (properties[Gravure]) into the
   * nested `properties` object the JSON endpoint actually expects —
   * sending them as flat keys silently drops them.
   */
  function serializeForm(form) {
    var fd = new FormData(form);
    var payload = { properties: {} };
    fd.forEach(function (value, key) {
      var match = key.match(/^properties\[(.+)\]$/);
      if (match) {
        if (value) payload.properties[match[1]] = value;
      } else if (key === 'id') {
        payload.id = value;
      } else if (key === 'quantity') {
        payload.quantity = Number(value) || 1;
      }
    });
    if (!Object.keys(payload.properties).length) delete payload.properties;
    if (!payload.quantity) payload.quantity = 1;
    return payload;
  }

  window.GMCart = {
    addItem: addItem,
    changeLine: changeLine,
    updateNote: updateNote,
    open: open,
    close: close,
    serializeForm: serializeForm,
    refresh: function () { return getCart().then(render); }
  };
})();
