/* =========================================================================
   MAISON — Panier
   UN SEUL système : mini-panier, page panier et compteur d'en-tête lisent
   tous le même état, renvoyé par Shopify (Cart AJAX API). Aucun total n'est
   recalculé localement.

   L'aperçu autonome remplace uniquement la couche d'accès aux données en
   définissant window.MAISON_CART_ADAPTER avant de charger ce fichier.
   Le rendu et le comportement restent identiques.
   ========================================================================= */
(function () {
  'use strict';

  var routes = window.MaisonRoutes || {};

  /* ---------- Couche de données ------------------------------------------- */
  function json(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.description || body.message || 'Erreur');
        return body;
      });
    });
  }

  var shopifyAdapter = {
    get: function () {
      return json(routes.cart || '/cart.js');
    },
    add: function (id, quantity, properties) {
      return shopifyAdapter.addItems([{ id: id, quantity: quantity || 1, properties: properties }]);
    },
    addItems: function (items) {
      return json((routes.cartAdd || '/cart/add') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function () { return shopifyAdapter.get(); });
    },
    change: function (key, quantity) {
      return json((routes.cartChange || '/cart/change') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity })
      });
    },
    note: function (note) {
      return json((routes.cartUpdate || '/cart/update') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ note: note })
      });
    }
  };

  var adapter = window.MAISON_CART_ADAPTER || shopifyAdapter;

  /* ---------- Formatage ---------------------------------------------------- */
  var format = document.documentElement.getAttribute('data-money-format') || '{{amount}} €';

  function money(cents) {
    var value = (cents / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, ' ');
    var parts = value.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return format.replace(/\{\{\s*amount\s*\}\}/, parts.join(','));
  }

  /* ---------- Rendu -------------------------------------------------------- */
  var drawer = document.querySelector('[data-mini-cart]');
  var state = null;

  function lineMarkup(item) {
    var image = item.image
      ? '<img src="' + item.image + '" alt="" loading="lazy">'
      : '<span class="mcart__ph" aria-hidden="true"></span>';
    var variant = (item.variant_title && item.variant_title !== 'Default Title') ? item.variant_title : '';

    /* Les propriétés de ligne (configuration sur-mesure) sont affichées,
       sauf celles préfixées par « _ », réservées à l'usage technique. */
    var details = '';
    var props = item.properties || {};
    Object.keys(props).forEach(function (key) {
      if (key.indexOf('_') === 0 || !props[key]) return;
      details += '<span class="mcart__variant">' + key + ' : ' + props[key] + '</span>';
    });

    return '' +
      '<article class="mcart__line" data-line-key="' + item.key + '">' +
        '<a class="mcart__thumb" href="' + (item.url || '#') + '">' + image + '</a>' +
        '<div class="mcart__body">' +
          '<a class="mcart__name" href="' + (item.url || '#') + '">' + item.product_title + '</a>' +
          (variant ? '<p class="mcart__variant">' + variant + '</p>' : '') +
          (details ? '<div class="mcart__props">' + details + '</div>' : '') +
          '<div class="mcart__row">' +
            '<div class="qty" data-qty>' +
              '<button class="qty__btn" type="button" data-qty-down aria-label="Diminuer la quantité">−</button>' +
              '<input class="qty__input" type="number" inputmode="numeric" min="0" value="' + item.quantity + '" aria-label="Quantité" data-qty-input>' +
              '<button class="qty__btn" type="button" data-qty-up aria-label="Augmenter la quantité">+</button>' +
            '</div>' +
            '<p class="mcart__price">' + money(item.line_price) + '</p>' +
          '</div>' +
          '<button class="mcart__remove t-label" type="button" data-line-remove>Supprimer</button>' +
        '</div>' +
      '</article>';
  }

  function render(cart) {
    state = cart;

    /* Compteur d'en-tête : desktop et mobile partagent le même état */
    document.querySelectorAll('[data-header-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });

    if (drawer) {
      var lines = drawer.querySelector('[data-cart-lines]');
      var empty = drawer.querySelector('[data-cart-empty]');
      var filled = drawer.querySelector('[data-cart-filled]');
      var subtotal = drawer.querySelector('[data-cart-subtotal]');
      var count = drawer.querySelector('[data-cart-count]');

      if (lines) lines.innerHTML = cart.items.map(lineMarkup).join('');
      if (subtotal) subtotal.textContent = money(cart.total_price);
      if (count) count.textContent = cart.item_count;
      if (empty) empty.hidden = cart.item_count > 0;
      if (filled) filled.hidden = cart.item_count === 0;
    }

    renderCartPage(cart);

    /* Événement unique : tout ce qui doit réagir au panier écoute ici,
       plutôt que de maintenir un second état JavaScript. */
    document.dispatchEvent(new CustomEvent('maison:cart:updated', { detail: cart }));
  }

  /* Page panier : mêmes données, mise à jour sans rechargement */
  function renderCartPage(cart) {
    var page = document.querySelector('[data-cart-page]');
    if (!page) return;

    var empty = page.querySelector('[data-cart-page-empty]');
    var filled = page.querySelector('[data-cart-page-filled]');
    if (empty) empty.hidden = cart.item_count > 0;
    if (filled) filled.hidden = cart.item_count === 0;

    page.querySelectorAll('[data-line-key]').forEach(function (node) {
      var item = null;
      cart.items.forEach(function (i) { if (i.key === node.dataset.lineKey) item = i; });
      if (!item) { node.remove(); return; }
      var price = node.querySelector('[data-line-price]');
      var input = node.querySelector('[data-qty-input]');
      if (price) price.textContent = money(item.line_price);
      if (input) input.value = item.quantity;
    });

    var subtotal = page.querySelector('[data-cart-page-subtotal]');
    if (subtotal) subtotal.textContent = money(cart.total_price);
    var count = page.querySelector('[data-cart-page-count]');
    if (count) count.textContent = cart.item_count;
  }

  /* ---------- Messages ------------------------------------------------------ */
  function message(target, text, tone) {
    if (!target) return;
    target.textContent = text || '';
    target.hidden = !text;
    target.dataset.tone = tone || 'error';
  }

  /* ---------- Actions ------------------------------------------------------- */
  var busy = false;

  function refresh() {
    return adapter.get().then(render);
  }

  function open() {
    if (!drawer) return;
    if (window.MaisonModal) window.MaisonModal.open(drawer, document.activeElement);
  }

  function addItems(items, opts) {
    opts = opts || {};
    if (busy) return Promise.resolve();
    busy = true;

    var button = opts.button;
    var original = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = button.dataset.adding || 'Ajout en cours…';
    }
    message(opts.errorTarget, '');

    return adapter.addItems(items)
      .then(function (cart) { render(cart); open(); })
      .catch(function (error) {
        message(opts.errorTarget, error.message || 'Cette création n\u2019a pas pu être ajoutée.', 'error');
      })
      .then(function () {
        busy = false;
        if (button) { button.disabled = false; button.textContent = original || 'Ajouter au panier'; }
      });
  }

  function add(id, quantity, opts) {
    opts = opts || {};
    if (busy) return Promise.resolve();
    busy = true;

    var button = opts.button;
    var original = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = button.dataset.adding || 'Ajout en cours…';
    }
    message(opts.errorTarget, '');

    return adapter.add(id, quantity || 1)
      .then(function (cart) {
        render(cart);
        open();
      })
      .catch(function (error) {
        message(opts.errorTarget, error.message || 'Cette création n\u2019a pas pu être ajoutée.', 'error');
      })
      .then(function () {
        busy = false;
        if (button) { button.disabled = false; button.textContent = original || button.dataset.add || 'Ajouter au panier'; }
      });
  }

  function change(key, quantity) {
    if (busy) return Promise.resolve();
    busy = true;
    return adapter.change(key, quantity)
      .then(render)
      .catch(function () { return refresh(); })
      .then(function () { busy = false; });
  }

  /* ---------- Écoutes déléguées (aucun listener dupliqué) ------------------ */
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target.closest) return;

    var opener = target.closest('[data-cart-open]');
    if (opener && drawer) {
      event.preventDefault();
      refresh().then(function () {
        if (window.MaisonModal) window.MaisonModal.open(drawer, opener);
      });
      return;
    }

    var line = target.closest('[data-line-key]');
    if (!line) return;
    var key = line.dataset.lineKey;
    var input = line.querySelector('[data-qty-input]');
    var current = input ? parseInt(input.value, 10) : 1;

    if (target.closest('[data-qty-up]')) { change(key, current + 1); }
    else if (target.closest('[data-qty-down]')) { change(key, Math.max(0, current - 1)); }
    else if (target.closest('[data-line-remove]')) { change(key, 0); }
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest ? event.target.closest('[data-qty-input]') : null;
    if (!input) return;
    var line = input.closest('[data-line-key]');
    if (!line) return;
    var value = parseInt(input.value, 10);
    change(line.dataset.lineKey, isNaN(value) || value < 0 ? 0 : value);
  });

  /* Message cadeau : enregistré dans la note de commande Shopify */
  var noteField = document.querySelector('[data-cart-note]');
  if (noteField && adapter.note) {
    var noteTimer = null;
    var noteStatus = document.querySelector('[data-cart-note-status]');
    noteField.addEventListener('input', function () {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(function () {
        adapter.note(noteField.value).then(function () {
          if (noteStatus) { noteStatus.hidden = false; noteStatus.textContent = 'Message enregistré.'; }
        });
      }, 600);
    });
  }

  window.MaisonCart = {
    add: add,
    addItems: addItems,
    change: change,
    refresh: refresh,
    open: open,
    render: render,
    money: money,
    state: function () { return state; }
  };

  refresh();
})();
