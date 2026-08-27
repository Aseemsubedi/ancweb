/**
 * ANC (Aseem and Consulting Pvt Ltd) - Main Interactive Script
 * Domain: anc.com.np | Email: info@anc.com.np | Kushma 05 Parbat, Gandaki Nepal
 * Founder: Aseem Subedi
 */

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initNavbar();
  initMobileMenu();
  initCounters();
  initServiceFilter();
  initEstimator();
  initModals();
  initContactForm();
  initCopyButtons();
  initFaqAccordion();
});

/* ==========================================================================
   1. Interactive Constellation Network Canvas
   ========================================================================== */
function initCanvas() {
  const canvas = document.getElementById('network-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor(window.innerWidth / 18), 75);
  const particles = [];
  const maxDistance = 140;

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 2 + 1;
      this.color = Math.random() > 0.4 ? '#06b6d4' : '#3b82f6';
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  // Mouse interaction
  let mouse = { x: null, y: null, radius: 150 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * 0.25;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Connect to mouse
      if (mouse.x !== null && mouse.y !== null) {
        const mdx = particles[i].x - mouse.x;
        const mdy = particles[i].y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < mouse.radius) {
          const alpha = (1 - mdist / mouse.radius) * 0.4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   2. Navbar Scroll Effects & Active Link Spy
   ========================================================================== */
function initNavbar() {
  const header = document.getElementById('main-header');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (scrollY > 30) {
      header?.classList.add('glass-nav', 'shadow-lg');
    } else {
      header?.classList.remove('shadow-lg');
    }

    // Scroll spy
    sections.forEach((current) => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('text-cyan-400', 'font-semibold');
          } else {
            link.classList.remove('text-cyan-400', 'font-semibold');
          }
        });
      }
    });
  });
}

/* ==========================================================================
   3. Mobile Navigation Drawer
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-mobile-menu');
  const menuDrawer = document.getElementById('mobile-drawer');
  const menuLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !menuDrawer) return;

  function openMenu() {
    menuDrawer.classList.remove('translate-x-full');
    document.body.classList.add('overflow-hidden');
  }

  function closeMenu() {
    menuDrawer.classList.add('translate-x-full');
    document.body.classList.remove('overflow-hidden');
  }

  toggleBtn.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);

  menuLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menuDrawer.classList.contains('translate-x-full')) {
      closeMenu();
    }
  });
}

/* ==========================================================================
   4. Animated Stat Counters
   ========================================================================== */
function initCounters() {
  const counters = document.querySelectorAll('.counter-value');
  let animated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          counters.forEach((counter) => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const suffix = counter.getAttribute('data-suffix') || '';
            const decimals = parseInt(counter.getAttribute('data-decimals') || '0', 10);
            const duration = 2000;
            const startTime = performance.now();

            function updateCount(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // easeOutQuart
              const easeProgress = 1 - Math.pow(1 - progress, 4);
              const currentVal = easeProgress * target;

              counter.textContent = currentVal.toFixed(decimals) + suffix;

              if (progress < 1) {
                requestAnimationFrame(updateCount);
              } else {
                counter.textContent = target.toFixed(decimals) + suffix;
              }
            }

            requestAnimationFrame(updateCount);
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  const statsSection = document.getElementById('stats-section');
  if (statsSection) {
    observer.observe(statsSection);
  }
}

/* ==========================================================================
   5. Filterable Services Grid
   ========================================================================== */
function initServiceFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const serviceCards = document.querySelectorAll('.service-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      serviceCards.forEach((card) => {
        const categories = card.getAttribute('data-category')?.split(' ') || [];
        if (filterValue === 'all' || categories.includes(filterValue)) {
          card.style.display = 'block';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px) scale(0.96)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

/* ==========================================================================
   6. Interactive Project Scope & Estimator
   ========================================================================== */
function initEstimator() {
  const projectTypeSelect = document.getElementById('est-project-type');
  const complexityRange = document.getElementById('est-complexity');
  const complexityLabel = document.getElementById('est-complexity-label');
  const featureCheckboxes = document.querySelectorAll('.est-feature');
  
  const estimatedWeeksElem = document.getElementById('est-weeks');
  const estimatedScopeElem = document.getElementById('est-scope-tag');
  const estSummaryText = document.getElementById('est-summary-text');
  const estInquiryBtn = document.getElementById('est-send-inquiry');

  if (!projectTypeSelect || !complexityRange) return;

  const complexityNames = ['MVP / Prototype', 'Standard Production', 'Enterprise / High Security', 'Mission-Critical Architecture'];
  const baseWeeks = {
    web: 2,
    aml: 4,
    remit: 4,
    travel: 3,
    consulting: 1
  };

  function recalculate() {
    const pType = projectTypeSelect.value;
    const compIdx = parseInt(complexityRange.value, 10);
    complexityLabel.textContent = complexityNames[compIdx];

    let base = baseWeeks[pType] || 2;
    let weeks = base * (compIdx + 1);

    let checkedCount = 0;
    featureCheckboxes.forEach((cb) => {
      if (cb.checked) checkedCount++;
    });

    weeks += Math.ceil(checkedCount * 0.75);

    estimatedWeeksElem.textContent = `${weeks} - ${weeks + 2} Weeks`;
    
    let scopeDesc = '';
    if (pType === 'aml') {
      scopeDesc = 'AML / CFT Engine with Sanction Screening, Rule Logic & Audit Compliance';
    } else if (pType === 'remit') {
      scopeDesc = 'Remittance Core Switch with Ledger, Payout Connectors & Multi-Currency Flow';
    } else if (pType === 'travel') {
      scopeDesc = 'Travel / Tour Portal with GDS/API Aggregation, Dynamic Pricing & Booking';
    } else if (pType === 'web') {
      scopeDesc = 'Bespoke Modern Web Application / Portal with High Performance Cloud Stack';
    } else {
      scopeDesc = 'Enterprise Tech Strategy, Cloud Architecture & Security Audit Roadmap';
    }

    estimatedScopeElem.textContent = complexityNames[compIdx];
    estSummaryText.textContent = `Tailored for ${scopeDesc} with ${checkedCount} advanced architecture modules selected.`;
  }

  projectTypeSelect.addEventListener('change', recalculate);
  complexityRange.addEventListener('input', recalculate);
  featureCheckboxes.forEach((cb) => cb.addEventListener('change', recalculate));

  recalculate();

  estInquiryBtn?.addEventListener('click', () => {
    const pType = projectTypeSelect.options[projectTypeSelect.selectedIndex].text;
    const comp = complexityNames[parseInt(complexityRange.value, 10)];
    const weeks = estimatedWeeksElem.textContent;

    const subject = encodeURIComponent(`Project Consultation Inquiry - ${pType} (${comp})`);
    const body = encodeURIComponent(
      `Hello Aseem Subedi & ANC Team,\n\nI used your online Scope Estimator on anc.com.np and would like to discuss an upcoming project.\n\n` +
      `• Project Vertical: ${pType}\n` +
      `• Scale / Complexity: ${comp}\n` +
      `• Target Delivery Timeline: ${weeks}\n\n` +
      `Please let me know when we can schedule a consultation call.\n\nBest regards,\n[Your Name]\n[Your Company / Organization]`
    );

    window.location.href = `mailto:info@anc.com.np?subject=${subject}&body=${body}`;
  });
}

/* ==========================================================================
   7. Modal Controller (Consultation & Scope)
   ========================================================================== */
function initModals() {
  const openModalBtns = document.querySelectorAll('.open-consultation-modal');
  const modal = document.getElementById('consultation-modal');
  const closeModalBtns = document.querySelectorAll('.close-modal');

  if (!modal) return;

  function openModal() {
    modal.classList.add('active');
    document.body.classList.add('overflow-hidden');
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('overflow-hidden');
  }

  openModalBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  }));

  closeModalBtns.forEach((btn) => btn.addEventListener('click', closeModal));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

/* ==========================================================================
   8. Contact Form Handler with Validation & Mailto Fallback
   ========================================================================== */
function initContactForm() {
  const forms = [document.getElementById('contact-form'), document.getElementById('modal-contact-form')];

  forms.forEach((form) => {
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="name"]')?.value.trim();
      const email = form.querySelector('[name="email"]')?.value.trim();
      const service = form.querySelector('[name="service"]')?.value || 'Tech Consulting';
      const message = form.querySelector('[name="message"]')?.value.trim();

      if (!name || !email || !message) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      // Generate direct mailto launch
      const subject = encodeURIComponent(`Consultation Inquiry from ${name} [${service}]`);
      const body = encodeURIComponent(
        `Full Name: ${name}\n` +
        `Email: ${email}\n` +
        `Domain / Service of Interest: ${service}\n\n` +
        `Message / Requirements:\n${message}\n\n` +
        `-- Sent via anc.com.np contact form`
      );

      // Toast notification
      showToast('Preparing your inquiry... Opening your email client.', 'success');

      setTimeout(() => {
        window.location.href = `mailto:info@anc.com.np?subject=${subject}&body=${body}`;
        form.reset();
        const modal = document.getElementById('consultation-modal');
        if (modal) modal.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
      }, 700);
    });
  });
}

/* ==========================================================================
   9. 1-Click Copy Helper
   ========================================================================== */
function initCopyButtons() {
  const copyEmailBtns = document.querySelectorAll('.copy-email-btn');

  copyEmailBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = 'info@anc.com.np';
      navigator.clipboard.writeText(email).then(() => {
        showToast(`Copied ${email} to clipboard!`, 'success');
      }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = email;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Copied ${email} to clipboard!`, 'success');
      });
    });
  });
}

/* ==========================================================================
   10. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-header');

  faqItems.forEach((header) => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.faq-icon');
      const isOpen = !content.classList.contains('hidden');

      // Close other items
      document.querySelectorAll('.faq-body').forEach((b) => b.classList.add('hidden'));
      document.querySelectorAll('.faq-icon').forEach((i) => i.classList.remove('rotate-180'));

      if (!isOpen) {
        content.classList.remove('hidden');
        icon?.classList.add('rotate-180');
      }
    });
  });
}

/* ==========================================================================
   11. Toast Notification Utility
   ========================================================================== */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  const iconSvg = type === 'success'
    ? `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-5 h-5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
