/**
 * ANC (Aseem and Consulting Pvt Ltd) - Adaptive Theme & Interactive Engine
 * Domain: anc.com.np | info@anc.com.np | Kushma 05 Parbat, Gandaki Nepal
 * WhatsApp: +977 9802840041
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSpotlight();
  initPipelineSimulator();
  initCopyEmail();
  initContactForm();
  initMobileMenu();
  initLegalModal();
});

/* 1. Theme Switcher (Light / Dark Mode) */
function initTheme() {
  const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('anc-theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  updateToggleIcons();
  syncThemeColor();

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('anc-theme', 'light');
        showMinimalToast('Switched to Light Mode');
      } else {
        html.classList.add('dark');
        localStorage.setItem('anc-theme', 'dark');
        showMinimalToast('Switched to Dark Mode');
      }
      updateToggleIcons();
      syncThemeColor();
    });
  });

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
}

/* 2. Interactive Live Architecture Pipeline Simulator */
function initPipelineSimulator() {
  const triggerBtn = document.getElementById('run-simulation-btn');
  const nodes = [
    document.getElementById('sim-node-aml'),
    document.getElementById('sim-node-remit'),
    document.getElementById('sim-node-travel')
  ];
  const logsContainer = document.getElementById('sim-log-feed');

  if (!triggerBtn || !logsContainer) return;

  const mockEvents = [
    { type: 'AML', title: 'Sanctions & PEP Screening', detail: 'Checked 4.2M global blacklist records. Fuzzy score: 0.00 (Clear)', time: '12ms' },
    { type: 'REMIT', title: 'Ledger Settlement & Switch', detail: 'Routed via secure API gateway. Double-entry balanced.', time: '24ms' },
    { type: 'TRAVEL', title: 'GDS Inventory Sync', detail: 'Real-time booking confirmed & seat inventory reserved.', time: '38ms' }
  ];

  let isRunning = false;

  triggerBtn.addEventListener('click', () => {
    if (isRunning) return;
    isRunning = true;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span>Processing Stream...</span>`;

    nodes.forEach(n => n?.classList.remove('active-pulse'));
    logsContainer.innerHTML = `<div class="text-[11px] font-mono text-cyan-500">Initializing transaction test sequence...</div>`;

    let step = 0;
    const interval = setInterval(() => {
      if (step < nodes.length) {
        nodes.forEach(n => n?.classList.remove('active-pulse'));
        nodes[step]?.classList.add('active-pulse');

        const ev = mockEvents[step];
        const logItem = document.createElement('div');
        logItem.className = 'text-xs font-mono py-1.5 border-b border-black/5 dark:border-white/5 flex justify-between items-center';
        logItem.innerHTML = `
          <div>
            <span class="text-cyan-500 font-bold">[${ev.type}]</span>
            <span class="font-semibold">${ev.title}</span>
            <div class="text-[11px] opacity-70">${ev.detail}</div>
          </div>
          <span class="text-emerald-500 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">${ev.time}</span>
        `;
        logsContainer.appendChild(logItem);
        step++;
      } else {
        clearInterval(interval);
        nodes.forEach(n => n?.classList.remove('active-pulse'));
        isRunning = false;
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = `<span>Simulate Next Pipeline Event ⚡</span>`;
        showMinimalToast('Pipeline simulation finished successfully.');
      }
    }, 600);
  });
}

/* 3. Bento Card Mouse Spotlight */
function initSpotlight() {
  const cards = document.querySelectorAll('.bento-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/* 4. 1-Click Email Copy */
function initCopyEmail() {
  const copyBtns = document.querySelectorAll('.copy-email-trigger');
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = 'info@anc.com.np';
      navigator.clipboard.writeText(email).then(() => {
        showMinimalToast(`Copied ${email} to clipboard`);
      }).catch(() => {
        const temp = document.createElement('textarea');
        temp.value = email;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showMinimalToast(`Copied ${email} to clipboard`);
      });
    });
  });
}

/* 5. Direct Inquiry Form */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]')?.value.trim();
    const email = form.querySelector('[name="email"]')?.value.trim();
    const service = form.querySelector('[name="service"]')?.value || 'Tech Consulting';
    const message = form.querySelector('[name="message"]')?.value.trim();

    if (!name || !email || !message) {
      showMinimalToast('Please fill in all required fields.');
      return;
    }

    const subject = encodeURIComponent(`Inquiry from ${name} [${service}]`);
    const body = encodeURIComponent(
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Area of Interest: ${service}\n\n` +
      `Message:\n${message}\n\n` +
      `Sent via anc.com.np`
    );

    showMinimalToast('Opening your email client to send message...');
    setTimeout(() => {
      window.location.href = `mailto:info@anc.com.np?subject=${subject}&body=${body}`;
      form.reset();
    }, 600);
  });
}

/* 6. Mobile Menu */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggleBtn || !menu) return;

  const iconOpen = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
  const iconClose = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

  function isOpen() {
    return !menu.classList.contains('hidden');
  }

  function setOpen(open) {
    menu.classList.toggle('hidden', !open);
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggleBtn.innerHTML = open ? iconClose : iconOpen;
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!isOpen());
  });

  document.querySelectorAll('.mobile-link').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (menu.contains(e.target) || toggleBtn.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && isOpen()) setOpen(false);
  });
}

/* 7. Legal & Compliance Modal (Privacy, Meta Data Policy, Terms, Google & Cookies) */
function initLegalModal() {
  const modal = document.getElementById('legal-modal');
  const openTriggers = document.querySelectorAll('.open-legal-modal');
  const closeBtn = document.getElementById('close-legal-modal');
  const tabBtns = document.querySelectorAll('.legal-tab-btn');
  const tabPanes = document.querySelectorAll('.legal-tab-pane');

  if (!modal) return;

  function openModal(tabTarget = 'privacy') {
    modal.classList.add('active');
    document.body.classList.add('overflow-hidden');
    switchTab(tabTarget);
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('overflow-hidden');
  }

  function switchTab(targetId) {
    tabBtns.forEach((btn) => {
      if (btn.getAttribute('data-target') === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPanes.forEach((pane) => {
      if (pane.id === `legal-pane-${targetId}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });
  }

  openTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = trigger.getAttribute('data-legal-tab') || 'privacy';
      openModal(tab);
    });
  });

  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchTab(target);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Handle direct hash navigation (e.g. #privacy, #terms, #cookies)
  function checkHash() {
    const hash = window.location.hash;
    if (hash === '#privacy' || hash === '#privacy-policy' || hash === '#data-policy') {
      openModal('privacy');
    } else if (hash === '#terms' || hash === '#terms-and-conditions') {
      openModal('terms');
    } else if (hash === '#cookies' || hash === '#google-policy') {
      openModal('cookies');
    }
  }

  window.addEventListener('hashchange', checkHash);
  checkHash();
}

/* 8. Minimal Toast Notification */
function showMinimalToast(msg) {
  let toast = document.getElementById('minimal-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'minimal-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="toast-futuristic">
      <span style="color: #06b6d4;">✦</span>
      <span>${msg}</span>
    </div>
  `;

  setTimeout(() => {
    toast.innerHTML = '';
  }, 3500);
}
