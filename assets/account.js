/**
 * GOLD MINES — Customer account UI behaviour.
 *
 * Progressive enhancement over real Shopify-native forms/routes: password
 * show/hide, the login/recover-password toggle, and the header's account
 * dropdown. Nothing here talks to a custom auth backend — every form still
 * posts to Shopify's own {% form %} endpoints with JS disabled.
 */
(function () {
  'use strict';

  /* ---- Password show/hide ---- */
  document.querySelectorAll('[data-gm-password-toggle]').forEach(function (btn) {
    var field = document.getElementById(btn.getAttribute('data-gm-password-toggle'));
    if (!field) return;
    btn.addEventListener('click', function () {
      var showing = field.type === 'text';
      field.type = showing ? 'password' : 'text';
      btn.textContent = showing ? btn.getAttribute('data-label-show') : btn.getAttribute('data-label-hide');
      btn.setAttribute('aria-pressed', String(!showing));
    });
  });

  /* ---- Login / recover-password toggle (single section, two Shopify forms) ---- */
  var loginBlock = document.querySelector('[data-gm-login-block]');
  var recoverBlock = document.querySelector('[data-gm-recover-block]');
  if (loginBlock && recoverBlock) {
    function showRecover() {
      loginBlock.hidden = true;
      recoverBlock.hidden = false;
      var firstField = recoverBlock.querySelector('input');
      if (firstField) firstField.focus();
    }
    function showLogin() {
      recoverBlock.hidden = true;
      loginBlock.hidden = false;
    }
    document.querySelectorAll('[data-gm-show-recover]').forEach(function (link) {
      link.addEventListener('click', function (e) { e.preventDefault(); showRecover(); });
    });
    document.querySelectorAll('[data-gm-show-login]').forEach(function (link) {
      link.addEventListener('click', function (e) { e.preventDefault(); showLogin(); });
    });
    if (window.location.hash === '#recover') {
      showRecover();
    }
  }

  /* ---- Header account dropdown (desktop) ---- */
  document.querySelectorAll('[data-gm-account-menu]').forEach(function (menu) {
    var trigger = menu.querySelector('[data-gm-account-trigger]');
    var panel = menu.querySelector('[data-gm-account-panel]');
    if (!trigger || !panel) return;

    function close() {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    function open() {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (panel.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        close();
        trigger.focus();
      }
    });
  });
})();
