/**
 * ANC Tools — catalog, hash router, theme, chrome.
 */
(function () {
  'use strict';

  const appRoot = document.getElementById('app');
  const tools = window.ANC_TOOLS || [];
  const categories = ['All', ...[...new Set(tools.map((t) => t.category))]];

  window.ANCToolsApp = { toast: showToast };

  initTheme();
  initMobileMenu();
  initSpotlightDelegate();
  window.addEventListener('hashchange', render);
  render();

  function currentId() {
    return (location.hash || '#/').replace(/^#\/?/, '').split('/')[0].split('?')[0];
  }

  function render() {
    const id = currentId();
    const tool = tools.find((t) => t.id === id);
    if (tool) renderTool(tool);
    else renderCatalog();
    window.scrollTo(0, 0);
  }

  function renderCatalog() {
    document.title = 'ANC Tools | Browser workbench by Aseem and Consulting';
    appRoot.innerHTML = `
      <main>
        <div class="text-center mb-12">
          <div class="badge-minimal mb-4">ANC Tools · runs in your browser</div>
          <h1 class="text-4xl sm:text-6xl font-black tracking-tight hero-gradient-text leading-[1.08] mb-4">
            Workbench for<br>
            <span class="cyan-gradient-text">engineering &amp; consulting.</span>
          </h1>
          <p class="opacity-75 max-w-2xl mx-auto text-base sm:text-lg">
            Format JSON, inspect JWTs, hash secrets, estimate a build — all on this device.
            Aseem and Consulting does not receive what you paste.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="search" class="minimal-input" data-search placeholder="Search tools — json, jwt, npr, hash…" aria-label="Search tools">
        </div>
        <div class="flex flex-wrap gap-2 mb-8" data-filters></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-grid></div>
      </main>`;

    const filters = appRoot.querySelector('[data-filters]');
    const grid = appRoot.querySelector('[data-grid]');
    const search = appRoot.querySelector('[data-search]');
    let active = 'All';

    filters.innerHTML = categories.map((c) =>
      `<button type="button" class="chip${c === 'All' ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');

    function paint() {
      const q = (search.value || '').toLowerCase().trim();
      const visible = tools.filter((t) => {
        const catOk = active === 'All' || t.category === active;
        const hay = `${t.name} ${t.blurb} ${t.keywords} ${t.category}`.toLowerCase();
        return catOk && (!q || hay.includes(q));
      });
      if (!visible.length) {
        grid.innerHTML = `<p class="opacity-70 col-span-full py-12 text-center">No tools match that search.</p>`;
        return;
      }
      grid.innerHTML = visible.map((t) => `
        <a class="bento-card p-6" href="#/${t.id}">
          <div class="flex items-start justify-between gap-3 mb-4">
            <span class="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">${t.category}</span>
            <span class="opacity-40 text-xs font-mono">↗</span>
          </div>
          <h2 class="text-xl font-bold mb-2">${t.name}</h2>
          <p class="text-sm opacity-75 leading-relaxed">${t.blurb}</p>
        </a>`).join('');
    }

    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      active = btn.dataset.cat;
      filters.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === active));
      paint();
    });
    search.addEventListener('input', paint);
    paint();
  }

  function renderTool(tool) {
    document.title = `${tool.name} | ANC Tools`;
    appRoot.innerHTML = `
      <main>
        <a href="#/" class="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100 hover:text-cyan-500 mb-6">
          ← All tools
        </a>
        <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div class="badge-minimal mb-3">${tool.category}</div>
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">${tool.name}</h1>
            <p class="opacity-75 mt-2 max-w-2xl">${tool.blurb}</p>
          </div>
          <p class="text-[11px] font-mono opacity-60">Processed on this device · not uploaded</p>
        </div>
        <div data-mount></div>
      </main>`;
    tool.mount(appRoot.querySelector('[data-mount]'));
  }

  function initTheme() {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const html = document.documentElement;

    function updateToggleIcons() {
      const isDark = html.classList.contains('dark');
      toggleBtns.forEach((btn) => {
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.innerHTML = isDark
          ? `<svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`
          : `<svg class="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
      });
    }

    function syncThemeColor() {
      const isDark = html.classList.contains('dark');
      document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
        el.setAttribute('content', isDark ? '#05070d' : '#fbfbfd');
      });
    }

    updateToggleIcons();
    syncThemeColor();

    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('anc-theme', html.classList.contains('dark') ? 'dark' : 'light');
        updateToggleIcons();
        syncThemeColor();
        showToast(html.classList.contains('dark') ? 'Dark mode' : 'Light mode');
      });
    });
  }

  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggleBtn || !menu) return;
    const iconOpen = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
    const iconClose = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggleBtn.innerHTML = open ? iconClose : iconOpen;
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(menu.classList.contains('hidden'));
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !toggleBtn.contains(e.target)) {
        setOpen(false);
      }
    });
  }

  function initSpotlightDelegate() {
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.bento-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  }

  function showToast(message) {
    document.querySelectorAll('.toast-futuristic').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'toast-futuristic fixed bottom-6 left-1/2 -translate-x-1/2 z-[80]';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
})();
