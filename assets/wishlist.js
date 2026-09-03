/**
 * GOLD MINES — Wishlist (client-side, localStorage-backed).
 *
 * Honest architecture note: this is per-browser, per-device storage.
 * There is no account/back-end sync — a favorite added on a phone will
 * not appear on a desktop. That limitation is stated plainly in the
 * account/favorites UI, never hidden.
 *
 * Stores {id, url} pairs (not bare ids) because the dedicated Favoris
 * page (assets/wishlist-page.js) needs a real product URL to fetch each
 * item's current price/availability from Shopify's own `.json` endpoint
 * — it never invents or caches stale product data.
 *
 * To move this to real account-based persistence later: replace
 * read/write below with calls to a customer metafield or app API and
 * keep the same public window.GMWishlist surface — every control in the
 * theme (product card, product page, Quick View, Favoris page) already
 * goes through it rather than touching localStorage directly.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gm_wishlist';

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Back-compat: earlier versions stored bare ids.
      return raw.map(function (entry) {
        return typeof entry === 'object' && entry !== null ? entry : { id: String(entry), url: null };
      });
    } catch (e) {
      return [];
    }
  }
  function write(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('gm:wishlist:changed', { detail: entries }));
  }
  function has(id) {
    return read().some(function (e) { return String(e.id) === String(id); });
  }
  function add(id, url) {
    var entries = read();
    if (!has(id)) entries.push({ id: String(id), url: url || null });
    write(entries);
  }
  function remove(id) {
    write(read().filter(function (e) { return String(e.id) !== String(id); }));
  }
  function toggle(id, url) {
    if (has(id)) { remove(id); return false; }
    add(id, url);
    return true;
  }

  function bump(el) {
    el.classList.remove('gm-bump');
    // Force reflow so the animation replays even if it's still mid-run.
    void el.offsetWidth;
    el.classList.add('gm-bump');
  }

  function updateCountBadges() {
    var entries = read();
    document.querySelectorAll('[data-gm-wishlist-count]').forEach(function (el) {
      el.textContent = entries.length;
      el.hidden = entries.length === 0;
    });
  }
  function syncButtons() {
    document.querySelectorAll('[data-gm-wishlist-add]').forEach(function (btn) {
      var id = btn.getAttribute('data-product-id');
      btn.setAttribute('aria-pressed', String(has(id)));
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-gm-wishlist-add]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-product-id');
    var url = btn.getAttribute('data-product-url');
    var nowSaved = toggle(id, url);
    bump(btn);
    if (nowSaved) {
      document.querySelectorAll('[data-gm-wishlist-count]').forEach(bump);
    }
  });

  // Every write (add/remove/toggle, from any control — including the
  // Favoris page's own "remove" button, which calls GMWishlist.remove()
  // directly rather than through the click handler above) goes through
  // write(), so listening here is the single place that keeps the header
  // count and every button's pressed state in sync, everywhere.
  document.addEventListener('gm:wishlist:changed', function () {
    updateCountBadges();
    syncButtons();
  });

  document.addEventListener('DOMContentLoaded', function () {
    updateCountBadges();
    syncButtons();
  });

  window.GMWishlist = { read: read, has: has, add: add, remove: remove, toggle: toggle };
})();
