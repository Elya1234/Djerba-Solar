/* =========================================================================
   MAISON — Page Favoris
   Les favoris sont enregistrés côté navigateur (localStorage), gérés par
   maison-motion.js. Cette page récupère les produits correspondants auprès
   de Shopify (/products/<handle>.js) et les affiche avec la même carte.

   Limite assumée : les favoris ne sont pas encore rattachés au compte client.
   Le jour où ils le seront, seule la source de données changera : l'API
   window.MaisonFavourites reste la même.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-favourites]');
  if (!root) return;

  var list = root.querySelector('[data-favourites-list]');
  var empty = root.querySelector('[data-favourites-empty]');
  var adapter = window.MAISON_FAVOURITES_ADAPTER || {
    load: function (handles) {
      return Promise.all(handles.map(function (handle) {
        return fetch('/products/' + handle + '.js')
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
      })).then(function (items) {
        return items.filter(Boolean).map(function (p) {
          return {
            id: p.id,
            handle: p.handle,
            title: p.title,
            url: '/products/' + p.handle,
            image: p.featured_image || (p.images && p.images[0]) || '',
            meta: p.type || '',
            price: p.price
          };
        });
      });
    }
  };

  function money(cents) {
    if (window.MaisonCart && window.MaisonCart.money) return window.MaisonCart.money(cents);
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  }

  function cardMarkup(item) {
    var media = item.image
      ? '<img src="' + item.image + '" alt="" loading="lazy">'
      : '<div class="ph" aria-hidden="true"><span class="ph__label t-label">' + item.title + '</span></div>';
    var link = 'href="' + item.url + '"';
    if (window.MAISON_LINK_ADAPTER) {
      link = window.MAISON_LINK_ADAPTER(item.url) || link;
    }

    return '<article class="card" data-fav-card="' + item.id + '">' +
      '<a class="card__media" ' + link + ' aria-label="' + item.title + '">' + media + '</a>' +
      '<button class="card__fav" type="button" data-fav="' + item.id + '" data-fav-handle="' + item.handle + '" aria-pressed="true">' +
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2S3.8 15 3.8 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.2 2.4c0 5.6-8.2 10.8-8.2 10.8Z"/></svg>' +
        '<span class="visually-hidden">Retirer des favoris — ' + item.title + '</span>' +
      '</button>' +
      '<div class="card__info">' +
        '<a class="card__name" ' + link + '>' + item.title + '</a>' +
        (item.meta ? '<p class="card__meta">' + item.meta + '</p>' : '') +
        '<p class="card__price">' + money(item.price) + '</p>' +
      '</div></article>';
  }

  function paint() {
    var handles = window.MaisonFavourites ? window.MaisonFavourites.handles() : [];

    if (!handles.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    adapter.load(handles).then(function (items) {
      list.innerHTML = items.map(cardMarkup).join('');
      if (window.MaisonFavourites) window.MaisonFavourites.sync();
      if (window.MaisonPreviewRoutes) window.MaisonPreviewRoutes.bind();
    });
  }

  /* Retirer un favori met la liste à jour immédiatement. */
  document.addEventListener('maison:favourites:updated', function () {
    if (root.offsetParent === null && !root.closest('[data-screen]')) return;
    paint();
  });

  paint();
})();
