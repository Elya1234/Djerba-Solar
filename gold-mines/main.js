/* GOLD MINES — BY ORPAZ · « Palais » */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* Ouverture */
  const open = () => setTimeout(() => document.body.classList.add('loaded'), reduce ? 0 : 1500);
  document.readyState === 'complete' ? open() : addEventListener('load', open);

  /* En-tête */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  document.querySelector('.nav__menu').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  document.querySelectorAll('.drawer a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* Poussière d'or (canvas léger, désactivé si réduction des animations) */
  const cv = document.getElementById('dust');
  if (!reduce && cv.getContext) {
    const ctx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const N = innerWidth < 700 ? 28 : 60;
    let W, H, parts;
    const size = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
    const make = () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.4 + .4) * dpr, vy: -(Math.random() * .25 + .05) * dpr, vx: (Math.random() - .5) * .15 * dpr, t: Math.random() * 6.28, s: Math.random() * .02 + .01 });
    size(); parts = Array.from({ length: N }, make);
    addEventListener('resize', size);
    let visible = true;
    document.addEventListener('visibilitychange', () => (visible = !document.hidden));
    (function tick() {
      if (visible) {
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy; p.t += p.s;
          if (p.y < -10) { Object.assign(p, make(), { y: H + 10 }); }
          const a = (Math.sin(p.t) + 1) / 2 * .7 + .1;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(255,236,180,${a})`); g.addColorStop(1, 'rgba(212,180,110,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    })();
  }

  /* Apparitions */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* Parallaxe */
  const qImg = document.querySelector('.quote__media img');
  const hMedia = document.querySelector('.hero__media');
  if (!reduce) addEventListener('scroll', () => {
    const r = qImg.closest('.quote').getBoundingClientRect();
    qImg.style.transform = `translate3d(0, ${(r.top + r.height / 2 - innerHeight / 2) * -0.12}px, 0)`;
    if (scrollY < innerHeight) hMedia.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0)`;
  }, { passive: true });

  /* Carrousel des collections : flèches, glisser, progression */
  const rail = document.getElementById('rail');
  const bar = document.getElementById('railBar');
  const step = () => rail.querySelector('.jewel').getBoundingClientRect().width + 30;
  const progress = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    bar.style.width = `${Math.max(12, (rail.clientWidth / rail.scrollWidth) * 100 + (max ? rail.scrollLeft / max : 0) * (100 - (rail.clientWidth / rail.scrollWidth) * 100))}%`;
  };
  rail.addEventListener('scroll', progress, { passive: true }); progress();
  document.querySelectorAll('.arrow').forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: step() * +b.dataset.dir, behavior: reduce ? 'auto' : 'smooth' })));
  if (fine) {
    let down = false, x0 = 0, s0 = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('dragging'); } rail.scrollLeft = s0 - dx; });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('dragging'); });
    rail.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
  }

  /* Signature : zoom */
  const arch = document.getElementById('sigMedia');
  const img = document.getElementById('sigImg');
  arch.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = arch.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    arch.classList.add('zooming');
  });
  arch.addEventListener('pointerleave', () => arch.classList.remove('zooming'));
  arch.addEventListener('click', () => arch.classList.toggle('zooming'));

  /* Signature : options & prix */
  const METALS = { jaune: 'Or jaune 18 carats', blanc: 'Or blanc 18 carats', rose: 'Or rose 18 carats', platine: 'Platine 950' };
  const state = { metal: 'jaune', carat: 1 };
  const priceEl = document.getElementById('price');
  const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n / 10) * 10) + ' €';
  const update = () => {
    document.getElementById('metalName').textContent = METALS[state.metal];
    document.getElementById('caratName').textContent = state.carat.toFixed(2).replace('.', ',') + (state.carat > 1 ? ' carats' : ' carat');
    priceEl.textContent = fmt(1300 + (state.metal === 'platine' ? 600 : 0) + 7600 * Math.pow(state.carat, 1.3));
    priceEl.classList.remove('tick'); void priceEl.offsetWidth; priceEl.classList.add('tick');
  };
  document.querySelectorAll('[data-group]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    g.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
    state[g.dataset.group] = g.dataset.group === 'carat' ? parseFloat(b.dataset.v) : b.dataset.v;
    update();
  }));

  /* Panier */
  let n = 0;
  const cart = document.querySelector('.cart');
  document.getElementById('addCart').addEventListener('click', e => {
    const label = e.currentTarget.querySelector('span');
    cart.querySelector('.cart__count').textContent = ++n;
    cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
    label.textContent = 'Ajouté à votre panier';
    setTimeout(() => (label.textContent = 'Ajouter au panier'), 1800);
  });
})();
