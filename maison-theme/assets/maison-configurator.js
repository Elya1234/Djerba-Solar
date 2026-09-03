/* =========================================================================
   MAISON — Configurateur de bague

   Principe : le configurateur ne fabrique aucun prix. Il lit les prix réels
   des variantes Shopify rendues par Liquid, affiche une ESTIMATION, et
   ajoute au panier deux articles Shopify réels (la monture et la pierre).
   Le montant facturé est celui calculé par Shopify.

   L'aperçu autonome remplace uniquement les données (window.MAISON_CONFIG_DATA)
   et l'adaptateur panier. Le comportement est identique.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-configurator]');
  if (!root) return;

  var data = {};
  try {
    data = JSON.parse(root.querySelector('[data-config-json]').textContent);
  } catch (e) { return; }
  if (window.MAISON_CONFIG_DATA) data = window.MAISON_CONFIG_DATA;

  var STEPS = ['model', 'metal', 'pavage', 'shape', 'stone', 'size', 'recap'];
  var LABELS = {
    model: 'Modèle', metal: 'Métal', pavage: 'Pavage', shape: 'Forme',
    stone: 'Pierre', size: 'Taille', recap: 'Récapitulatif'
  };

  var state = { model: null, metal: null, pavage: null, shape: null, stone: null, size: null, step: 0 };

  /* ---------- Utilitaires ------------------------------------------------- */
  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function money(cents) {
    if (window.MaisonCart && window.MaisonCart.money) return window.MaisonCart.money(cents);
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- Compatibilités ----------------------------------------------
     Chaque modèle déclare les pavages et formes qu'il accepte, et chaque
     combinaison métal + pavage correspond à une variante Shopify existante.
     Une option sans variante disponible est désactivée, jamais masquée. */
  function model() { return byId(data.models, state.model); }

  function variantKey(metal, pavage) { return metal + '|' + pavage; }

  function variantFor(metal, pavage) {
    var m = model();
    if (!m || !m.variants) return null;
    return m.variants[variantKey(metal, pavage)] || null;
  }

  function metalAllowed(metalId) {
    var m = model();
    if (!m) return false;
    if (state.pavage && variantFor(metalId, state.pavage)) return variantFor(metalId, state.pavage).available;
    for (var key in m.variants) {
      if (key.indexOf(metalId + '|') === 0 && m.variants[key].available) return true;
    }
    return false;
  }

  function pavageAllowed(pavageId) {
    var m = model();
    if (!m) return false;
    if (m.pavages && m.pavages.indexOf(pavageId) === -1) return false;
    if (!state.metal) return true;
    var v = variantFor(state.metal, pavageId);
    return !!(v && v.available);
  }

  function shapeAllowed(shapeId) {
    var m = model();
    if (!m) return false;
    if (m.shapes && m.shapes.length && m.shapes.indexOf(shapeId) === -1) return false;
    return true;
  }

  function stonesForShape() {
    return (data.stones || []).filter(function (s) {
      return !state.shape || s.shape === state.shape;
    });
  }

  /* Après un changement, on ne détruit pas la configuration : on retire
     uniquement ce qui devient impossible, et on le signale. */
  function reconcile(changed) {
    var messages = [];

    if (state.metal && !metalAllowed(state.metal)) { state.metal = null; messages.push('métal'); }
    if (state.pavage && !pavageAllowed(state.pavage)) { state.pavage = null; messages.push('pavage'); }
    if (state.shape && !shapeAllowed(state.shape)) { state.shape = null; messages.push('forme'); }
    if (state.stone) {
      var stone = byId(data.stones, state.stone);
      if (!stone || (state.shape && stone.shape !== state.shape)) { state.stone = null; messages.push('pierre'); }
    }

    var notice = root.querySelector('[data-config-notice]');
    if (notice) {
      if (messages.length && changed) {
        notice.hidden = false;
        notice.textContent = 'Ce changement demande de sélectionner à nouveau votre ' + messages.join(', ') + '.';
      } else {
        notice.hidden = true;
      }
    }
  }

  /* ---------- Médias -------------------------------------------------------
     Association par clé, avec repli en cascade : combinaison exacte, puis
     modèle + métal + pavage, puis modèle + métal, puis modèle, puis aplat. */
  function mediaFor() {
    var map = data.media || {};
    var keys = [
      [state.model, state.metal, state.pavage, state.shape].join('|'),
      [state.model, state.metal, state.pavage].join('|'),
      [state.model, state.metal].join('|'),
      String(state.model)
    ];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('null') === -1 && map[keys[i]]) return map[keys[i]];
    }
    return null;
  }

  var stage = root.querySelector('[data-config-frame]');

  function paintMedia() {
    if (!stage) return;
    var src = mediaFor();
    var caption = root.querySelector('[data-config-caption]');
    if (caption) {
      caption.textContent = [
        model() ? model().title : '',
        state.metal ? byId(data.metals, state.metal).title : '',
        state.pavage ? byId(data.pavages, state.pavage).title : '',
        state.shape ? byId(data.shapes, state.shape).title : ''
      ].filter(Boolean).join(' · ');
    }

    if (!src) {
      stage.querySelectorAll('img').forEach(function (img) { img.classList.remove('is-active'); });
      var ph = stage.querySelector('[data-config-placeholder]');
      if (ph) ph.hidden = false;
      return;
    }

    var placeholder = stage.querySelector('[data-config-placeholder]');
    if (placeholder) placeholder.hidden = true;

    var existing = stage.querySelector('img[data-src="' + src + '"]');
    if (!existing) {
      existing = document.createElement('img');
      existing.setAttribute('data-src', src);
      existing.src = src;
      existing.alt = caption ? caption.textContent : '';
      existing.loading = 'lazy';
      stage.appendChild(existing);
    }
    /* Fondu croisé : l'ancienne image s'efface, la nouvelle apparaît. */
    stage.querySelectorAll('img').forEach(function (img) {
      img.classList.toggle('is-active', img === existing);
    });
  }

  /* ---------- Zoom ---------------------------------------------------------
     Réutilise la galerie plein écran de la fiche produit : aucun composant
     supplémentaire. Sans visuel chargé, on l'explique au lieu de ne rien faire. */
  var zoomPanel = document.querySelector('[data-zoom]');

  var zoomTrigger = root.querySelector('[data-config-zoom]');
  if (zoomTrigger) {
    zoomTrigger.addEventListener('click', function () {
      var src = mediaFor();
      var notice = root.querySelector('[data-config-notice]');
      if (!src || !zoomPanel) {
        if (notice) {
          notice.hidden = false;
          notice.textContent = 'Le visuel agrandi apparaîtra une fois vos rendus associés à cette combinaison.';
        }
        return;
      }
      var img = zoomPanel.querySelector('[data-zoom-image]');
      var counter = zoomPanel.querySelector('[data-zoom-counter]');
      if (img) { img.src = src; img.alt = ''; img.classList.remove('is-zoomed'); }
      if (counter) counter.textContent = '1 / 1';
      if (window.MaisonModal) window.MaisonModal.open(zoomPanel, zoomTrigger);
    });
  }

  /* ---------- Prix ---------------------------------------------------------
     Estimation = prix de la variante de monture + prix de la pierre, tous
     deux lus depuis Shopify. Aucun prix n'est inventé côté navigateur. */
  function mountingVariant() {
    if (!state.metal || !state.pavage) return null;
    return variantFor(state.metal, state.pavage);
  }

  function total() {
    var sum = 0;
    var mv = mountingVariant();
    if (mv) sum += mv.price;
    var stone = byId(data.stones, state.stone);
    if (stone) sum += stone.price;
    return sum;
  }

  /* ---------- Rendu des étapes -------------------------------------------- */
  function option(id, name, text, extra, selected, disabled, note) {
    return '<button class="cfg__option" type="button" data-choice="' + escapeHtml(id) + '"' +
      ' aria-pressed="' + (selected ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') + '>' +
      (extra || '') +
      '<span class="cfg__option-name">' + escapeHtml(name) + '</span>' +
      (text ? '<span class="cfg__option-text">' + escapeHtml(text) + '</span>' : '') +
      (disabled && note ? '<span class="cfg__option-note">' + escapeHtml(note) + '</span>' : '') +
      '</button>';
  }

  function renderModel(pane) {
    pane.innerHTML = '<div class="cfg__options">' + (data.models || []).map(function (m) {
      var frame = m.image
        ? '<span class="cfg__option-frame"><img src="' + escapeHtml(m.image) + '" alt="" loading="lazy"></span>'
        : '<span class="cfg__option-frame"><span class="ph" aria-hidden="true"><span class="ph__label t-label">' + escapeHtml(m.title) + '</span></span></span>';
      var price = m.from_price ? 'À partir de ' + money(m.from_price) : '';
      return option(m.id, m.title, m.text || price, frame, state.model === m.id, false);
    }).join('') + '</div>';
  }

  function renderMetal(pane) {
    pane.innerHTML = '<div class="cfg__swatches">' + (data.metals || []).map(function (metal) {
      var allowed = metalAllowed(metal.id);
      return '<button class="cfg__swatch cfg__swatch--' + escapeHtml(metal.id) + '" type="button"' +
        ' data-choice="' + escapeHtml(metal.id) + '" aria-pressed="' + (state.metal === metal.id) + '"' +
        (allowed ? '' : ' disabled title="Non disponible avec cette configuration"') + '>' +
        '<span class="cfg__swatch-dot" aria-hidden="true"></span>' +
        '<span class="cfg__swatch-name">' + escapeHtml(metal.title) + '</span></button>';
    }).join('') + '</div>';
  }

  function renderPavage(pane) {
    pane.innerHTML = '<div class="cfg__options">' + (data.pavages || []).map(function (p) {
      var allowed = pavageAllowed(p.id);
      var v = state.metal ? variantFor(state.metal, p.id) : null;
      var price = v ? money(v.price) : '';
      var extra = price ? '<span class="cfg__option-price">' + price + '</span>' : '';
      return option(p.id, p.title, p.text, extra, state.pavage === p.id, !allowed, 'Non disponible avec cette configuration');
    }).join('') + '</div>';
  }

  function renderShape(pane) {
    pane.innerHTML = '<div class="cfg__shapes">' + (data.shapes || []).map(function (s) {
      var allowed = shapeAllowed(s.id);
      return '<button class="cfg__shape" type="button" data-choice="' + escapeHtml(s.id) + '"' +
        ' aria-pressed="' + (state.shape === s.id) + '"' + (allowed ? '' : ' disabled') + '>' +
        '<span class="eshape__figure" style="border:0;background:transparent">' +
        '<span class="eshape__glyph eshape__glyph--' + escapeHtml(s.id) + '" aria-hidden="true"></span></span>' +
        '<span class="cfg__shape-name">' + escapeHtml(s.title) + '</span></button>';
    }).join('') + '</div>';
  }

  function stoneRow(stone) {
    var shape = byId(data.shapes, stone.shape);
    return '<button class="cfg__stone" type="button" data-choice="' + escapeHtml(stone.id) + '"' +
      ' aria-pressed="' + (state.stone === stone.id) + '">' +
      '<span class="cfg__stone-glyph"><span class="eshape__glyph eshape__glyph--' + escapeHtml(stone.shape) +
      '" style="width:22px;height:22px" aria-hidden="true"></span></span>' +
      '<span><span class="cfg__stone-carat">' + escapeHtml(stone.carat) + ' ct</span> ' +
      '<span class="cfg__stone-meta">' + escapeHtml([stone.color, stone.clarity, stone.cut].filter(Boolean).join(' · ')) +
      (shape ? ' · ' + escapeHtml(shape.title) : '') + '</span></span>' +
      '<span class="cfg__stone-price">' + money(stone.price) + '</span></button>';
  }

  function renderStone(pane) {
    var stones = stonesForShape();
    function select(id, key, label) {
      return '<label class="visually-hidden" for="' + id + '">' + label + '</label>' +
        '<select id="' + id + '" data-stone-filter="' + key + '"><option value="">' + label + '</option>' +
        uniq(stones, key).map(function (v) { return '<option>' + escapeHtml(v) + '</option>'; }).join('') + '</select>';
    }

    var filters = '<div class="cfg__filters">' +
      select('cfg-carat', 'carat', 'Carat') +
      select('cfg-color', 'color', 'Couleur') +
      select('cfg-clarity', 'clarity', 'Pureté') +
      select('cfg-lab', 'lab', 'Certification') +
      '<label class="visually-hidden" for="cfg-sort">Tri</label>' +
      '<select id="cfg-sort" data-stone-sort>' +
      '<option value="carat">Carat</option>' +
      '<option value="price">Prix croissant</option>' +
      '<option value="price-desc">Prix décroissant</option></select></div>';

    var list = stones.length
      ? '<div class="cfg__stones" data-stone-list>' + stones.map(stoneRow).join('') + '</div>'
      : '<p class="cfg__hint">Aucune pierre disponible pour cette forme.</p>';

    var detail = '<p class="cfg__notice">Touchez une pierre pour voir son détail complet.</p>';

    pane.innerHTML = filters + list + detail;
  }

  function uniq(list, key) {
    var seen = [];
    list.forEach(function (item) { if (item[key] && seen.indexOf(item[key]) === -1) seen.push(item[key]); });
    return seen;
  }

  function renderSize(pane) {
    pane.innerHTML = '<div class="cfg__sizes">' + (data.sizes || []).map(function (size) {
      return '<button class="cfg__size" type="button" data-choice="' + escapeHtml(size) + '"' +
        ' aria-pressed="' + (state.size === size) + '">' + escapeHtml(size) + '</button>';
    }).join('') + '</div>' +
    (data.size_guide_url
      ? '<a class="cta" href="' + escapeHtml(data.size_guide_url) + '">Je ne connais pas ma taille<span class="cta__arrow" aria-hidden="true"></span></a>'
      : '');
  }

  function recapRows() {
    var stone = byId(data.stones, state.stone);
    return [
      ['Modèle', model() ? model().title : '—', 0],
      ['Métal', state.metal ? byId(data.metals, state.metal).title : '—', 1],
      ['Pavage', state.pavage ? byId(data.pavages, state.pavage).title : '—', 2],
      ['Forme', state.shape ? byId(data.shapes, state.shape).title : '—', 3],
      ['Pierre', stone ? stone.carat + ' ct — ' + [stone.color, stone.clarity].filter(Boolean).join(' — ') : '—', 4],
      ['Taille', state.size || '—', 5]
    ];
  }

  function renderRecap(pane) {
    var mv = mountingVariant();
    var stone = byId(data.stones, state.stone);
    var complete = mv && stone && state.size;

    pane.innerHTML =
      '<div class="cfg__recap">' + recapRows().map(function (row) {
        return '<div class="cfg__recap-row">' +
          '<span class="t-label cfg__recap-key">' + row[0] + '</span>' +
          '<span>' + escapeHtml(row[1]) + '</span>' +
          '<button class="t-label cfg__recap-edit" type="button" data-goto="' + row[2] + '">Modifier</button>' +
        '</div>';
      }).join('') + '</div>' +

      '<div class="cfg__total"><span class="t-label">Estimation</span>' +
      '<span class="cfg__total-value" data-config-total>' + money(total()) + '</span></div>' +
      '<p class="cfg__estimate">' + escapeHtml(data.price_note || 'Montant calculé par Shopify au moment de l\u2019ajout au panier : monture et pierre sont deux articles réels.') + '</p>' +

      '<p class="cfg__error" data-config-error hidden></p>' +

      '<div class="cfg__actions">' +
        '<button class="btn btn--solid" type="button" data-config-add' + (complete ? '' : ' disabled') + '>Ajouter au panier</button>' +
        '<div class="cfg__actions-row">' +
          '<button class="cta" type="button" data-config-save>Sauvegarder ma création<span class="cta__arrow" aria-hidden="true"></span></button>' +
          '<button class="cta" type="button" data-config-share>Partager ma création<span class="cta__arrow" aria-hidden="true"></span></button>' +
        '</div>' +
        '<div class="cfg__actions-row">' +
          (data.advisor_url ? '<a class="cta" href="' + escapeHtml(data.advisor_url) + '" data-config-advisor>Parler à un conseiller<span class="cta__arrow" aria-hidden="true"></span></a>' : '') +
          (data.appointment_url ? '<a class="cta" href="' + escapeHtml(data.appointment_url) + '" data-config-appointment>Prendre rendez-vous<span class="cta__arrow" aria-hidden="true"></span></a>' : '') +
        '</div>' +
        '<div class="cfg__share" data-config-share-box hidden>' +
          '<label class="visually-hidden" for="cfg-share">Lien de votre création</label>' +
          '<input id="cfg-share" type="text" readonly value="">' +
          '<button class="t-label" type="button" data-config-copy>Copier</button>' +
        '</div>' +
        '<div class="cfg__saved" data-config-saved></div>' +
      '</div>';

    paintSaved();
  }

  var RENDERERS = {
    model: renderModel, metal: renderMetal, pavage: renderPavage,
    shape: renderShape, stone: renderStone, size: renderSize, recap: renderRecap
  };

  /* ---------- Navigation --------------------------------------------------- */
  function stepReady(index) {
    switch (STEPS[index]) {
      case 'model': return true;
      case 'metal': return !!state.model;
      case 'pavage': return !!state.metal;
      case 'shape': return !!state.pavage;
      case 'stone': return !!state.shape;
      case 'size': return !!state.stone;
      case 'recap': return !!state.size;
    }
    return false;
  }

  function paintSteps() {
    var nav = root.querySelector('[data-config-steps]');
    if (!nav) return;
    nav.innerHTML = STEPS.map(function (key, i) {
      return '<button class="cfg__step t-label" type="button" data-step="' + i + '"' +
        (i === state.step ? ' aria-current="step"' : '') +
        (stepReady(i) ? '' : ' disabled') + '>' +
        '<span class="cfg__step-num">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<span class="cfg__step-label">' + LABELS[key] + '</span></button>';
    }).join('');
  }

  function paintBar() {
    var bar = root.querySelector('[data-config-bar]');
    if (!bar) return;
    var key = STEPS[state.step];
    var value = {
      model: model() && model().title,
      metal: state.metal && byId(data.metals, state.metal).title,
      pavage: state.pavage && byId(data.pavages, state.pavage).title,
      shape: state.shape && byId(data.shapes, state.shape).title,
      stone: state.stone && (byId(data.stones, state.stone).carat + ' ct'),
      size: state.size,
      recap: money(total())
    }[key];

    bar.querySelector('[data-config-bar-step]').textContent = LABELS[key];
    bar.querySelector('[data-config-bar-value]').textContent = value || 'À choisir';

    /* Le prix suit la configuration dès qu'il est calculable. */
    var running = root.querySelector('[data-config-running]');
    if (running) {
      var sum = total();
      running.hidden = sum === 0;
      var amount = running.querySelector('[data-config-running-amount]');
      if (amount) amount.textContent = money(sum);
    }
    var barPrice = bar.querySelector('[data-config-bar-price]');
    if (barPrice) {
      var sum2 = total();
      barPrice.hidden = sum2 === 0;
      barPrice.textContent = money(sum2);
    }
    var next = bar.querySelector('[data-config-next]');
    next.disabled = !stepReady(state.step + 1);
    next.textContent = state.step >= STEPS.length - 1 ? 'Ajouter au panier' : 'Continuer';
  }

  function show(index, push) {
    if (index < 0 || index >= STEPS.length) return;
    if (!stepReady(index)) return;
    state.step = index;

    root.querySelectorAll('[data-config-pane]').forEach(function (pane) {
      pane.hidden = parseInt(pane.dataset.configPane, 10) !== index;
    });

    var pane = root.querySelector('[data-config-pane="' + index + '"]');
    var body = pane.querySelector('[data-config-body]');
    RENDERERS[STEPS[index]](body);

    var title = pane.querySelector('[data-config-title]');
    if (title) title.textContent = (data.titles && data.titles[STEPS[index]]) || LABELS[STEPS[index]];

    paintSteps();
    paintBar();
    paintMedia();

    /* On conserve l'écran courant dans l'état d'historique : le routeur de
       l'aperçu peut ainsi distinguer un retour d'étape d'un retour d'écran. */
    if (push && window.history && window.history.pushState) {
      var previous = (window.history.state && window.history.state.screen) || null;
      try { window.history.pushState({ configStep: index, screen: previous }, ''); } catch (e) {}
    }
    if (window.MaisonPreviewRoutes) window.MaisonPreviewRoutes.bind();
  }

  window.addEventListener('popstate', function (event) {
    if (!event.state || typeof event.state.configStep !== 'number') return;
    show(event.state.configStep, false);
  });

  /* ---------- Choix -------------------------------------------------------- */
  root.addEventListener('click', function (event) {
    var choice = event.target.closest('[data-choice]');
    if (choice && !choice.disabled) {
      var value = choice.getAttribute('data-choice');
      var key = STEPS[state.step];

      if (key === 'stone' && state.stone === value) { openStone(value); return; }

      state[key] = value;
      reconcile(true);
      show(state.step, false);
      if (stepReady(state.step + 1) && key !== 'stone') show(state.step + 1, true);
      return;
    }

    var stepBtn = event.target.closest('[data-step]');
    if (stepBtn && !stepBtn.disabled) { show(parseInt(stepBtn.dataset.step, 10), true); return; }

    var goto = event.target.closest('[data-goto]');
    if (goto) { show(parseInt(goto.dataset.goto, 10), true); return; }

    var next = event.target.closest('[data-config-next]');
    if (next) {
      if (state.step >= STEPS.length - 1) { addToCart(); return; }
      show(state.step + 1, true);
      return;
    }

    if (event.target.closest('[data-config-add]')) { addToCart(); return; }
    if (event.target.closest('[data-config-save]')) { saveCreation(); return; }
    if (event.target.closest('[data-config-share]')) { shareCreation(); return; }
    if (event.target.closest('[data-config-copy]')) { copyShare(); return; }

    var restore = event.target.closest('[data-config-restore]');
    if (restore) { restoreCreation(restore.dataset.configRestore); return; }

    var remove = event.target.closest('[data-config-forget]');
    if (remove) { forgetCreation(remove.dataset.configForget); return; }
  });

  root.addEventListener('change', function (event) {
    var filter = event.target.closest('[data-stone-filter], [data-stone-sort]');
    if (!filter) return;
    var list = root.querySelector('[data-stone-list]');
    if (!list) return;

    var sort = root.querySelector('[data-stone-sort]');
    var active = {};
    root.querySelectorAll('[data-stone-filter]').forEach(function (field) {
      if (field.value) active[field.dataset.stoneFilter] = field.value;
    });

    var stones = stonesForShape().filter(function (s) {
      for (var key in active) { if (String(s[key]) !== active[key]) return false; }
      return true;
    });

    function carat(stone) { return parseFloat(String(stone.carat).replace(',', '.')) || 0; }
    if (sort && sort.value === 'price') stones.sort(function (a, b) { return a.price - b.price; });
    else if (sort && sort.value === 'price-desc') stones.sort(function (a, b) { return b.price - a.price; });
    else stones.sort(function (a, b) { return carat(a) - carat(b); });

    list.innerHTML = stones.map(stoneRow).join('');
  });

  /* ---------- Détail d'une pierre ------------------------------------------ */
  var drawer = document.querySelector('[data-stone-drawer]');

  function openStone(id) {
    var stone = byId(data.stones, id);
    if (!stone || !drawer) return;
    var shape = byId(data.shapes, stone.shape);
    var rows = [
      ['Forme', shape ? shape.title : stone.shape],
      ['Carat', stone.carat + ' ct'],
      ['Couleur', stone.color],
      ['Pureté', stone.clarity],
      ['Taille', stone.cut],
      ['Poli', stone.polish],
      ['Symétrie', stone.symmetry],
      ['Fluorescence', stone.fluorescence],
      ['Dimensions', stone.dimensions],
      ['Laboratoire', stone.lab],
      ['Certificat', stone.certificate]
    ].filter(function (row) { return row[1]; });

    drawer.querySelector('[data-stone-detail]').innerHTML =
      '<div class="pspec">' + rows.map(function (row) {
        return '<div class="pspec__row"><span class="pspec__key">' + row[0] + '</span><span>' + escapeHtml(row[1]) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="card__price" style="margin-top:var(--s-5)">' + money(stone.price) + '</p>' +
      (stone.note ? '<p class="cfg__notice" style="margin-top:var(--s-4)">' + escapeHtml(stone.note) + '</p>' : '');

    var pick = drawer.querySelector('[data-stone-pick]');
    if (pick) pick.setAttribute('data-stone-pick', id);

    if (window.MaisonModal) window.MaisonModal.open(drawer, document.activeElement);
  }

  if (drawer) {
    drawer.addEventListener('click', function (event) {
      var pick = event.target.closest('[data-stone-pick]');
      if (!pick) return;
      state.stone = pick.getAttribute('data-stone-pick');
      if (window.MaisonModal) window.MaisonModal.close(drawer);
      show(STEPS.indexOf('size'), true);
    });
  }

  /* ---------- Panier -------------------------------------------------------
     Deux articles Shopify réels, reliés par un identifiant de configuration
     transmis en line item properties. Le prix vient de Shopify. */
  function properties(configId) {
    var stone = byId(data.stones, state.stone);
    return {
      'Modèle': model().title,
      'Métal': byId(data.metals, state.metal).title,
      'Pavage': byId(data.pavages, state.pavage).title,
      'Forme': byId(data.shapes, state.shape).title,
      'Pierre': stone.carat + ' ct — ' + [stone.color, stone.clarity].filter(Boolean).join(' — '),
      'Référence pierre': stone.reference || stone.id,
      'Taille': state.size,
      '_configuration': configId
    };
  }

  function addToCart() {
    var mv = mountingVariant();
    var stone = byId(data.stones, state.stone);
    var error = root.querySelector('[data-config-error]');
    var button = root.querySelector('[data-config-add]');

    if (!mv || !stone || !state.size) {
      if (error) { error.hidden = false; error.textContent = 'Votre création n\u2019est pas encore complète.'; }
      return;
    }
    if (error) error.hidden = true;

    var configId = 'CFG-' + Date.now().toString(36).toUpperCase();
    var props = properties(configId);

    var items = [
      { id: mv.id, quantity: 1, properties: props },
      { id: stone.variantId || stone.id, quantity: 1, properties: { 'Pour la création': configId, '_configuration': configId } }
    ];

    if (!window.MaisonCart || !window.MaisonCart.addItems) return;
    window.MaisonCart.addItems(items, { button: button, errorTarget: error });
  }

  /* ---------- Sauvegarde, partage ------------------------------------------ */
  var STORE_KEY = 'maison:creations';

  function readStore() {
    try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function writeStore(list) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function summary() {
    var stone = byId(data.stones, state.stone);
    return [
      model() && model().title,
      state.metal && byId(data.metals, state.metal).title,
      state.pavage && byId(data.pavages, state.pavage).title,
      state.shape && byId(data.shapes, state.shape).title,
      stone && stone.carat + ' ct',
      state.size && 'Taille ' + state.size
    ].filter(Boolean).join(' / ');
  }

  function encode() {
    return [state.model, state.metal, state.pavage, state.shape, state.stone, state.size]
      .map(function (v) { return v || ''; }).join('~');
  }

  function decode(value) {
    var parts = String(value || '').split('~');
    state.model = parts[0] || null;
    state.metal = parts[1] || null;
    state.pavage = parts[2] || null;
    state.shape = parts[3] || null;
    state.stone = parts[4] || null;
    state.size = parts[5] || null;
    reconcile(false);
  }

  function saveCreation() {
    var list = readStore();
    list.unshift({ code: encode(), label: summary(), at: Date.now() });
    writeStore(list.slice(0, 10));
    paintSaved();
  }

  function forgetCreation(code) {
    writeStore(readStore().filter(function (item) { return item.code !== code; }));
    paintSaved();
  }

  function restoreCreation(code) {
    decode(code);
    show(STEPS.length - 1, true);
  }

  function paintSaved() {
    var slot = root.querySelector('[data-config-saved]');
    if (!slot) return;
    var list = readStore();
    if (!list.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = '<p class="t-label" style="margin-top:var(--s-5)">Vos créations enregistrées</p>' +
      list.map(function (item) {
        return '<div class="cfg__saved-row"><span class="t-body-s">' + escapeHtml(item.label) + '</span>' +
          '<span><button class="t-label" type="button" data-config-restore="' + escapeHtml(item.code) + '">Reprendre</button> ' +
          '<button class="t-label t-muted" type="button" data-config-forget="' + escapeHtml(item.code) + '">Retirer</button></span></div>';
      }).join('');
  }

  function shareUrl() {
    var base = data.share_base || (window.location.origin + window.location.pathname);
    return base + '?creation=' + encodeURIComponent(encode());
  }

  function shareCreation() {
    var box = root.querySelector('[data-config-share-box]');
    if (!box) return;
    box.hidden = false;
    var input = box.querySelector('input');
    input.value = shareUrl();
    input.select();
  }

  function copyShare() {
    var input = root.querySelector('[data-config-share-box] input');
    if (!input) return;
    input.select();
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).catch(function () {});
    else { try { document.execCommand('copy'); } catch (e) {} }
  }

  /* Le conseiller et le rendez-vous reçoivent le résumé de la configuration. */
  root.addEventListener('click', function (event) {
    var link = event.target.closest('[data-config-advisor], [data-config-appointment]');
    if (!link) return;
    try { window.sessionStorage.setItem('maison:projet', summary()); } catch (e) {}
  });

  /* ---------- Démarrage ----------------------------------------------------- */
  var params = new URLSearchParams(window.location.search);
  if (params.get('creation')) decode(params.get('creation'));

  root.querySelectorAll('[data-config-pane]').forEach(function (pane) {
    pane.hidden = parseInt(pane.dataset.configPane, 10) !== 0;
  });

  var startAt = 0;
  for (var i = STEPS.length - 1; i >= 0; i--) { if (stepReady(i)) { startAt = i; break; } }
  show(startAt, false);

  window.MaisonConfigurator = {
    show: show,
    state: function () { return JSON.parse(JSON.stringify(state)); },
    summary: summary
  };
})();
