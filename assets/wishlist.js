/**
 * GOLD MINES — Wishlist (client-side, localStorage-backed).
 * A full account-synced wishlist can replace this in Phase 7 without
 * changing markup: every control keys off data-gm-wishlist-add /
 * data-product-id, and the header count off [data-gm-wishlist-count].
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gm_wishlist';

  function readWishlist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function writeWishlist(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
  }
  function updateCountBadges() {
    var ids = readWishlist();
    document.querySelectorAll('[data-gm-wishlist-count]').forEach(function (el) {
      el.textContent = ids.length;
      el.hidden = ids.length === 0;
    });
  }
  function syncButtons() {
    var ids = readWishlist().map(String);
    document.querySelectorAll('[data-gm-wishlist-add]').forEach(function (btn) {
      var id = btn.getAttribute('data-product-id');
      btn.setAttribute('aria-pressed', String(ids.indexOf(id) !== -1));
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-gm-wishlist-add]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-product-id');
    var ids = readWishlist().map(String);
    var index = ids.indexOf(id);
    if (index === -1) {
      ids.push(id);
      btn.setAttribute('aria-pressed', 'true');
    } else {
      ids.splice(index, 1);
      btn.setAttribute('aria-pressed', 'false');
    }
    writeWishlist(ids);
    updateCountBadges();
  });

  document.addEventListener('DOMContentLoaded', function () {
    updateCountBadges();
    syncButtons();
  });
})();
