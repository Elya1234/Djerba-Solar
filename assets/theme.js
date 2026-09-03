/**
 * GOLD MINES — BY ORPAZ
 * Core theme behaviour: header state, mega-menu, mobile nav, accordions,
 * scroll reveals, cart/wishlist counters. Namespaced under window.GM.
 */
(function () {
  'use strict';

  var GM = window.GM || {};
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
   * Header: solid on scroll, mega-menu open/close, mobile nav
   * ------------------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('[data-gm-header]');
    if (!header) return;

    var scrim = document.querySelector('[data-gm-scrim]');
    var mobileNav = document.querySelector('[data-gm-mobile-nav]');
    var navToggle = document.querySelector('[data-gm-nav-toggle]');
    var mega = document.querySelector('[data-gm-mega]');
    var navItems = header.querySelectorAll('[data-gm-nav-item]');
    var isTransparentTemplate = header.getAttribute('data-transparent') === 'true';

    function setScrolled() {
      var scrolled = window.scrollY > 8;
      header.classList.toggle('is-scrolled', scrolled || !isTransparentTemplate);
    }
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });

    function openScrim() { scrim && scrim.classList.add('is-open'); }
    function closeScrim() { scrim && scrim.classList.remove('is-open'); }

    function closeMega() {
      if (!mega) return;
      mega.classList.remove('is-open');
      navItems.forEach(function (item) { item.classList.remove('is-open'); });
      header.classList.remove('is-menu-open');
      closeScrim();
    }

    navItems.forEach(function (item) {
      var link = item.querySelector('[data-gm-nav-link]');
      var panelId = item.getAttribute('data-gm-nav-item');
      if (!link || !mega) return;

      function openThisMega() {
        mega.querySelectorAll('[data-gm-mega-panel]').forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-gm-mega-panel') !== panelId;
        });
        navItems.forEach(function (i) { i.classList.toggle('is-open', i === item); });
        mega.classList.add('is-open');
        header.classList.add('is-menu-open');
        openScrim();
      }

      item.addEventListener('mouseenter', function () {
        if (window.matchMedia('(min-width: 1200px)').matches) openThisMega();
      });
      link.addEventListener('focus', openThisMega);
      link.addEventListener('click', function (e) {
        if (item.hasAttribute('data-gm-mega-panel-only') && mega) {
          e.preventDefault();
          openThisMega();
        }
      });
    });

    header.addEventListener('mouseleave', function () {
      if (window.matchMedia('(min-width: 1200px)').matches) closeMega();
    });
    if (scrim) scrim.addEventListener('click', closeMega);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMega();
    });

    /* Mobile fullscreen nav */
    if (navToggle && mobileNav) {
      function closeMobileNav() {
        if (!mobileNav.classList.contains('is-open')) return;
        mobileNav.classList.remove('is-open');
        header.classList.remove('is-menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.documentElement.style.overflow = '';
        navToggle.focus();
      }

      navToggle.addEventListener('click', function () {
        var isOpen = mobileNav.classList.toggle('is-open');
        header.classList.toggle('is-menu-open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
        document.documentElement.style.overflow = isOpen ? 'hidden' : '';
      });

      mobileNav.querySelectorAll('[data-gm-mobile-trigger]').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          var sub = trigger.parentElement.querySelector('[data-gm-mobile-sub]');
          if (!sub) return;
          var open = sub.getAttribute('data-open') === 'true';
          mobileNav.querySelectorAll('[data-gm-mobile-sub]').forEach(function (s) {
            s.setAttribute('data-open', 'false');
          });
          sub.setAttribute('data-open', String(!open));
        });
      });

      mobileNav.querySelectorAll('[data-gm-mobile-close]').forEach(function (btn) {
        btn.addEventListener('click', closeMobileNav);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMobileNav();
      });
    }
  }

  /* ---------------------------------------------------------------------
   * Accordions (product details, FAQ, filters)
   * ------------------------------------------------------------------- */
  function initAccordions() {
    document.querySelectorAll('[data-gm-accordion-trigger]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.setAttribute('data-open', String(!expanded));
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Scroll reveals via IntersectionObserver
   * ------------------------------------------------------------------- */
  function initReveals() {
    var targets = document.querySelectorAll('[data-gm-reveal]');
    if (!targets.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = entry.target.getAttribute('data-gm-reveal-delay');
          if (delay) entry.target.style.transitionDelay = delay + 'ms';
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { observer.observe(t); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initAccordions();
    initReveals();
  });

  window.GM = GM;
})();
