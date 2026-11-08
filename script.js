(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduced) document.body.classList.add('enter');

  /* ---------- Lenis smooth scrolling ----------
     Off for reduced motion and when the library fails to load; native scrolling takes over. */
  const NAV_OFFSET = -96;
  let lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), wheelMultiplier: 1, touchMultiplier: 1.4 });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    window.lenis = lenis;
  }
  const smoothTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { offset: NAV_OFFSET, ...opts });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  // In-page links glide with Lenis and land below the floating nav
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute('href');
    const target = id === '#' || id === '#top' || id === '#home' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    smoothTo(target, target === 0 ? { offset: 0 } : {});
    history.replaceState(null, '', id === '#' ? location.pathname : id);
  });

  /* Hero parallax: the name drifts down and fades behind the car as you scroll.
     Uses the `translate` property so it never fights the entrance animation's `transform`. */
  const heroWord = $('.hero-word'), heroStage = $('.hero-stage');
  if (heroWord && heroStage && !reduced) {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = heroStage.offsetHeight;
      const y = Math.min(Math.max(window.scrollY, 0), h);
      heroWord.style.setProperty('--py', (y * 0.42).toFixed(1) + 'px');
      heroWord.style.setProperty('--po', (1 - (y / h) * 0.85).toFixed(3));
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const date = $('#date');
  if (date) {
    const t = new Date();
    date.min = [t.getFullYear(), String(t.getMonth() + 1).padStart(2, '0'), String(t.getDate()).padStart(2, '0')].join('-');
  }

  /* ---------- Nav ---------- */
  const navWrap = $('.nav-wrap'), nav = $('#nav'), menuBtn = $('#menuBtn');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false); });

  // Sliding indicator behind the hovered / active link
  const linksBox = $('#navLinks'), indicator = $('.nav-indicator'), links = $$('#navLinks a');
  let activeLink = null;
  const moveIndicator = el => {
    if (!el) { indicator.style.opacity = '0'; return; }
    indicator.style.width = el.offsetWidth + 'px';
    indicator.style.transform = `translateX(${el.offsetLeft}px)`;
    indicator.style.opacity = '1';
  };
  links.forEach(a => a.addEventListener('mouseenter', () => moveIndicator(a)));
  linksBox.addEventListener('mouseleave', () => moveIndicator(activeLink));

  if ('IntersectionObserver' in window) {
    const byId = new Map(links.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.classList.remove('active'));
      activeLink = byId.get(en.target.id) || null;
      if (activeLink) activeLink.classList.add('active');
      if (!linksBox.matches(':hover')) moveIndicator(activeLink);
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['home', ...byId.keys()].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // Compact nav + mobile dock on scroll
  const dock = $('#dock'), book = $('#book');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    navWrap.classList.toggle('compact', y > 80);
    if (dock && book) {
      const r = book.getBoundingClientRect();
      dock.classList.toggle('show', y > window.innerHeight * 0.7 && !(r.top < window.innerHeight * 0.7 && r.bottom > 0));
    }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Package size toggle ---------- */
  const seg = $('.segmented'), vehicleType = $('#vehicle_type');
  const setSize = size => {
    seg.dataset.active = size;
    $$('button', seg).forEach(b => b.setAttribute('aria-checked', String(b.dataset.size === size)));
    $$('.amt[data-car]').forEach(el => {
      const val = '$' + el.dataset[size];
      if (el.textContent === val) return;
      if (reduced) { el.textContent = val; return; }
      el.classList.add('flip');
      setTimeout(() => { el.textContent = val; el.classList.remove('flip'); }, 170);
    });
  };
  $$('button', seg).forEach(b => b.addEventListener('click', () => setSize(b.dataset.size)));
  seg.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const next = seg.dataset.active === 'suv' ? 'car' : 'suv';
    setSize(next);
    $(`button[data-size="${next}"]`, seg).focus();
  });
  setSize('car');

  $$('[data-package]').forEach(a => a.addEventListener('click', () => {
    $('#service').value = a.dataset.package;
    if (vehicleType && !vehicleType.value) vehicleType.value = seg.dataset.active === 'suv' ? 'SUV or truck (+$20)' : 'Standard-size car';
    renderSummary();
  }));
  const atHome = $('#atHomeCta');
  if (atHome) atHome.addEventListener('click', () => { $('input[name="service_location"][value="At-home"]').checked = true; renderSummary(); });

  /* ---------- Form logic ---------- */
  const protection = $('#protection_type');
  const updateProtection = () => {
    const v = protection.value;
    const hasPPF = v === 'PPF' || v === 'Both PPF and ceramic coating';
    const hasAny = hasPPF || v === 'Ceramic coating';
    [['ppfFinishField', hasPPF], ['protectionBrandField', hasAny], ['protectionDateField', hasAny]].forEach(([id, show]) => {
      const f = document.getElementById(id);
      f.hidden = !show;
      $$('input,select', f).forEach(el => { el.disabled = !show; if (!show) el.value = ''; });
    });
  };
  protection.addEventListener('change', updateProtection);
  updateProtection();

  const phone = $('#phone'), method = $('#preferred_contact'), phoneLabel = $('#phoneLabel');
  const syncPhone = () => {
    phone.required = method.value === 'Text' || method.value === 'Call';
    phoneLabel.innerHTML = phone.required ? 'Phone <span class="opt">needed for text or call</span>' : 'Phone <span class="opt">optional</span>';
  };
  method.addEventListener('change', syncPhone);
  syncPhone();


  /* ---------- Order summary: mirrors the form live ---------- */
  const form = $('#requestForm');
  const val = id => { const el = document.getElementById(id); return el && !el.disabled ? el.value.trim() : ''; };
  const optText = id => { const el = document.getElementById(id); return el && !el.disabled && el.value ? el.options[el.selectedIndex].text : ''; };
  const put = (id, text, fallback = 'Not set') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || fallback;
    el.classList.toggle('is-empty', !text);
  };
  const BASE = { 'Regular Detail': 80, 'Premium Detail': 120 };
  function renderSummary() {
    if (!form || !$('#summary')) return;
    const pkg = val('service'), size = val('vehicle_type'), cond = val('vehicle_condition');
    const suv = size.startsWith('SUV');
    const price = BASE[pkg] ? BASE[pkg] + (suv ? 20 : 0) : 0;
    put('sumPrice', price ? '$' + price : '', '$—');
    put('sumPkg', pkg, 'Choose a package');
    const notes = [];
    if (pkg && suv) notes.push('Includes $20 for SUV or truck.');
    if (pkg && size === 'Other / not sure') notes.push('SUV or truck adds $20.');
    if (cond === 'Heavy') notes.push('Heavy dirt may need a custom quote.');
    notes.push('Final price is confirmed before work begins.');
    $('#sumPkgNote').textContent = notes.join(' ');

    put('sumVehicle', val('vehicle'));
    $('#sumVehicleSub').textContent = [optText('vehicle_type'), cond && cond + ' condition'].filter(Boolean).join(', ');

    const d = val('date');
    const dateText = d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
    put('sumDate', dateText);
    const loc = form.querySelector('input[name="service_location"]:checked');
    const time = val('time');
    $('#sumWhere').textContent = [time && (time === 'Flexible' ? 'Flexible time' : time), loc && loc.value].filter(Boolean).join(', ');

    put('sumName', val('name'));
    const how = val('preferred_contact');
    const reach = (how === 'Text' || how === 'Call') ? val('phone') : val('contact');
    $('#sumContact').textContent = [how && 'By ' + how.toLowerCase(), reach].filter(Boolean).join(': ');

    put('sumPaint', optText('protection_type'));
    const extras = [val('ppf_finish') && 'PPF finish: ' + optText('ppf_finish'), val('protection_brand'),
                    val('matte_finish') === 'Yes' && 'Matte or wrapped'].filter(Boolean);
    $('#sumMatte').textContent = extras.join(', ');
  }
  if (form && $('#summary')) {
    form.addEventListener('input', renderSummary);
    form.addEventListener('change', renderSummary);
    $$('.sum-edit').forEach(b => b.addEventListener('click', () => {
      const field = document.getElementById(b.dataset.edit);
      if (!field) return;
      if (lenis) lenis.scrollTo(field, { offset: -window.innerHeight / 3, onComplete: () => field.focus({ preventScroll: true }) });
      else { field.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => field.focus({ preventScroll: true }), reduced ? 0 : 350); }
    }));
    renderSummary();
  }

  /* ---------- Process gallery arrows ---------- */
  const gallery = $('#gallery');
  if (gallery) {
    const btns = $$('.gallery-nav .round-btn');
    const step = () => { const c = $('.card', gallery); return c ? c.offsetWidth + 16 : 316; };
    const sync = () => {
      const max = gallery.scrollWidth - gallery.clientWidth - 2;
      btns.forEach(b => { b.disabled = b.dataset.dir === '-1' ? gallery.scrollLeft <= 2 : gallery.scrollLeft >= max; });
    };
    btns.forEach(b => b.addEventListener('click', () => {
      gallery.scrollBy({ left: Number(b.dataset.dir) * step() * 2, behavior: reduced ? 'auto' : 'smooth' });
    }));
    gallery.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }

  /* ---------- Soft reveal (tiles and cards only) ---------- */
  const reveals = $$('.reveal');
  if (!reduced && 'IntersectionObserver' in window && reveals.length) {
    document.documentElement.classList.add('js-reveal');
    const ro = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const group = $$('.reveal', en.target.parentElement);
      en.target.style.transitionDelay = `${Math.min(group.indexOf(en.target), 4) * 80}ms`;
      en.target.classList.add('in');
      ro.unobserve(en.target);
    }), { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => ro.observe(el));
  }
})();
