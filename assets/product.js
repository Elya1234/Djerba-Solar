/**
 * GOLD MINES — Product page: gallery, configurator, carat slider,
 * info tooltips, sticky mobile CTA, add-to-cart (AJAX).
 *
 * Reads the full variant graph from the JSON script tag emitted by
 * main-product.liquid ([data-gm-product-json]), so every combination
 * checked here reflects real Shopify variants — no invented state.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-gm-product-root]').forEach(initProduct);

  function initProduct(root) {
    var dataEl = root.querySelector('[data-gm-product-json]');
    if (!dataEl) return;
    var product;
    try {
      product = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }

    var form = root.querySelector('[data-gm-product-form]');
    var priceEl = root.querySelector('[data-gm-price]');
    var comparePriceEl = root.querySelector('[data-gm-compare-price]');
    var availabilityEl = root.querySelector('[data-gm-availability]');
    var submitBtn = root.querySelector('[data-gm-submit]');
    var variantIdInput = root.querySelector('[data-gm-variant-id]');
    // The sticky bar is a page-level singleton rendered as a sibling of
    // [data-gm-product-root] (see main-product.liquid), not a descendant —
    // it must be looked up from the document, not scoped to root. Declared
    // here (before the first updateUI() call below) so updateStickyCta can
    // rely on it from the very first render, not just after a user edit.
    var stickyBar = document.querySelector('[data-gm-sticky-cta]');
    var mainCtaAnchor = root.querySelector('[data-gm-cta-anchor]');
    function updateStickyCta(variant) {
      if (!stickyBar) return;
      var priceNode = stickyBar.querySelector('[data-gm-sticky-price]');
      if (priceNode && variant) priceNode.textContent = money(variant.price);
    }

    var initialVariantId = Number(root.getAttribute('data-initial-variant-id'));
    var initialVariant = product.variants.find(function (v) { return v.id === initialVariantId; }) || product.variants[0];

    var selected = {};
    (product.options || []).forEach(function (opt, i) {
      selected[opt.name] = initialVariant ? initialVariant['option' + (i + 1)] : (opt.values[0] || null);
    });

    function findVariant() {
      return product.variants.find(function (v) {
        return (product.options || []).every(function (opt, i) {
          return v['option' + (i + 1)] === selected[opt.name];
        });
      });
    }

    function optionCombinationExists(name, value) {
      // A value is only offered as selectable when it leads to a real,
      // in-stock variant — an existing-but-sold-out combination is
      // disabled too, not just a genuinely nonexistent one.
      var test = Object.assign({}, selected);
      test[name] = value;
      return product.variants.some(function (v) {
        return v.available && (product.options || []).every(function (opt, i) {
          return v['option' + (i + 1)] === test[opt.name];
        });
      });
    }

    function money(cents) {
      return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: product.currency || 'EUR' });
    }

    function updateUI() {
      var variant = findVariant();

      root.querySelectorAll('[data-gm-option]').forEach(function (control) {
        var name = control.getAttribute('data-gm-option');
        var value = control.getAttribute('data-value');
        var isSelected = selected[name] === value;
        control.setAttribute('aria-checked', String(isSelected));
        var exists = optionCombinationExists(name, value);
        control.setAttribute('aria-disabled', String(!exists));
      });

      root.querySelectorAll('[data-gm-step-value]').forEach(function (el) {
        var name = el.getAttribute('data-gm-step-value');
        el.textContent = selected[name] || '';
      });

      if (variant) {
        if (priceEl) {
          priceEl.classList.add('is-updating');
          setTimeout(function () {
            priceEl.textContent = money(variant.price);
            priceEl.classList.remove('is-updating');
          }, 90);
        }
        if (comparePriceEl) {
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            comparePriceEl.textContent = money(variant.compare_at_price);
            comparePriceEl.hidden = false;
          } else {
            comparePriceEl.hidden = true;
          }
        }
        if (variantIdInput) variantIdInput.value = variant.id;
        if (submitBtn) {
          var available = variant.available;
          submitBtn.disabled = !available;
          submitBtn.textContent = available ? submitBtn.getAttribute('data-label-available') : submitBtn.getAttribute('data-label-unavailable');
        }
        if (availabilityEl) {
          availabilityEl.classList.toggle('is-unavailable', !variant.available);
          availabilityEl.querySelector('[data-gm-availability-text]').textContent = variant.available
            ? availabilityEl.getAttribute('data-label-available')
            : availabilityEl.getAttribute('data-label-unavailable');
        }
        if (variant.featured_image) {
          var slide = root.querySelector('[data-gm-media-id="' + variant.featured_image.id + '"]');
          if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }
        updateStickyCta(variant);
      } else if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = submitBtn.getAttribute('data-label-unavailable');
      }
    }

    root.querySelectorAll('[data-gm-option]').forEach(function (control) {
      control.addEventListener('click', function () {
        if (control.getAttribute('aria-disabled') === 'true') return;
        var name = control.getAttribute('data-gm-option');
        var value = control.getAttribute('data-value');
        selected[name] = value;
        updateUI();
      });
    });

    /* ---- Carat slider ---- */
    root.querySelectorAll('[data-gm-carat-slider]').forEach(function (slider) {
      var name = slider.getAttribute('data-gm-carat-slider');
      var values = JSON.parse(slider.getAttribute('data-values') || '[]');
      var display = root.querySelector('[data-gm-carat-value="' + name + '"]');

      function setIndex(index) {
        index = Math.max(0, Math.min(values.length - 1, index));
        slider.value = index;
        var value = values[index];
        selected[name] = value;
        if (display) display.textContent = value + ' ct';
        updateUI();
      }

      slider.addEventListener('input', function () { setIndex(Number(slider.value)); });
      root.querySelectorAll('[data-gm-carat-tick="' + name + '"]').forEach(function (tick, i) {
        tick.addEventListener('click', function () { setIndex(i); });
      });
    });

    updateUI();

    /* ---- Engraving char counter ---- */
    var engravingInput = root.querySelector('[data-gm-engraving-input]');
    var engravingCount = root.querySelector('[data-gm-engraving-count]');
    if (engravingInput && engravingCount) {
      var max = Number(engravingInput.getAttribute('maxlength') || 20);
      engravingInput.addEventListener('input', function () {
        engravingCount.textContent = engravingInput.value.length + ' / ' + max;
      });
    }

    /* ---- Add to cart (AJAX) ---- */
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (submitBtn.disabled) return;
        var originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Ajout en cours…';
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        })
          .then(function (r) { if (!r.ok) throw new Error('cart-add-failed'); return r.json(); })
          .then(function () { return fetch('/cart.js').then(function (r) { return r.json(); }); })
          .then(function (cart) {
            document.querySelectorAll('[data-gm-cart-count]').forEach(function (el) {
              el.textContent = cart.item_count;
              el.hidden = cart.item_count === 0;
            });
            submitBtn.textContent = 'Ajouté ✓';
            document.dispatchEvent(new CustomEvent('gm:cart:added', { detail: cart }));
            setTimeout(function () { submitBtn.textContent = originalLabel; submitBtn.disabled = false; }, 1800);
          })
          .catch(function () {
            submitBtn.textContent = "Erreur — réessayer";
            setTimeout(function () { submitBtn.textContent = originalLabel; submitBtn.disabled = false; }, 2200);
          });
      });
    }

    /* ---- Sticky mobile CTA ---- */
    if (stickyBar && mainCtaAnchor && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          stickyBar.classList.toggle('is-visible', !entry.isIntersecting && window.matchMedia('(max-width: 989px)').matches);
        });
      }, { threshold: 0 });
      io.observe(mainCtaAnchor);

      var stickyAddBtn = stickyBar.querySelector('[data-gm-sticky-add]');
      if (stickyAddBtn) {
        stickyAddBtn.addEventListener('click', function () {
          if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
      }
    }

    /* ---- Gallery thumbnail sync ---- */
    var track = root.querySelector('[data-gm-gallery-track]');
    var thumbs = root.querySelectorAll('[data-gm-gallery-thumb]');
    var dots = root.querySelectorAll('[data-gm-gallery-dot]');
    if (track) {
      thumbs.forEach(function (thumb, i) {
        thumb.addEventListener('click', function () {
          var slide = track.children[i];
          if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'start' });
        });
      });
      var slides = track.querySelectorAll('[data-gm-gallery-slide]');
      if ('IntersectionObserver' in window && slides.length) {
        var galleryIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var index = Array.prototype.indexOf.call(slides, entry.target);
              thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === index); });
              dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
            }
          });
        }, { root: track, threshold: 0.6 });
        slides.forEach(function (s) { galleryIo.observe(s); });
      }
    }

    /* ---- Click-to-zoom (desktop) ---- */
    root.querySelectorAll('[data-gm-gallery-slide]').forEach(function (slide) {
      var img = slide.querySelector('img');
      if (!img) return;
      slide.addEventListener('mousemove', function (e) {
        if (!window.matchMedia('(min-width: 990px)').matches) return;
        var rect = slide.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = x + '% ' + y + '%';
        img.style.transform = 'scale(1.6)';
      });
      slide.addEventListener('mouseleave', function () {
        img.style.transform = 'scale(1)';
      });
    });

    /* ---- Share ---- */
    var shareBtn = root.querySelector('[data-gm-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var url = shareBtn.getAttribute('data-url');
        var title = shareBtn.getAttribute('data-title');
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            var original = shareBtn.getAttribute('aria-label');
            shareBtn.setAttribute('aria-label', 'Lien copié');
            setTimeout(function () { shareBtn.setAttribute('aria-label', original); }, 1600);
          });
        }
      });
    }

    /* ---- Size guide modal ---- */
    var sizeGuideBtn = root.querySelector('[data-gm-size-guide-open]');
    var sizeGuideModal = document.querySelector('[data-gm-size-guide-modal]');
    if (sizeGuideBtn && sizeGuideModal) {
      sizeGuideBtn.addEventListener('click', function () { sizeGuideModal.classList.add('is-open'); });
    }

    /* ---- Worn skin-tone toggle (progressive: only if variant media provided) ---- */
    root.querySelectorAll('[data-gm-worn-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-gm-worn-toggle]').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        var mediaId = btn.getAttribute('data-media-id');
        var target = root.querySelector('[data-gm-worn-slide]');
        var img = root.querySelector('[data-gm-media-id="' + mediaId + '"] img');
        if (target && img) target.querySelector('img').src = img.src;
      });
    });
  }

  /* ---- Size guide modal: shared close handling ---- */
  document.querySelectorAll('[data-gm-size-guide-modal]').forEach(function (modal) {
    modal.querySelectorAll('[data-gm-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { modal.classList.remove('is-open'); });
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('[data-gm-size-guide-modal].is-open').forEach(function (m) { m.classList.remove('is-open'); });
  });

  /* ---- Info tooltips (shared: gemological terms) ---- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-gm-info-trigger]');
    document.querySelectorAll('.gm-info-popover.is-open').forEach(function (p) {
      if (!trigger || p !== trigger.nextElementSibling) p.classList.remove('is-open');
    });
    if (trigger) {
      var popover = trigger.nextElementSibling;
      if (popover) popover.classList.toggle('is-open');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.gm-info-popover.is-open').forEach(function (p) { p.classList.remove('is-open'); });
  });
})();
