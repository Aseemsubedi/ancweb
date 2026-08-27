/**
 * ANC (Aseem and Consulting Pvt Ltd) - Futuristic Minimal Script
 * Domain: anc.com.np | info@anc.com.np | Kushma 05 Parbat, Gandaki Nepal
 */

document.addEventListener('DOMContentLoaded', () => {
  initSpotlight();
  initCopyEmail();
  initContactForm();
  initMobileMenu();
});

/* 1. Bento Card Mouse Spotlight Effect */
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

/* 2. 1-Click Email Copy */
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

/* 3. Direct Minimal Inquiry Form */
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
      showMinimalToast('Please complete all required fields.');
      return;
    }

    const subject = encodeURIComponent(`Consultation Inquiry: ${name} [${service}]`);
    const body = encodeURIComponent(
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Focus Area: ${service}\n\n` +
      `Message:\n${message}\n\n` +
      `Sent via anc.com.np`
    );

    showMinimalToast('Opening your email client to send inquiry...');
    setTimeout(() => {
      window.location.href = `mailto:info@anc.com.np?subject=${subject}&body=${body}`;
      form.reset();
    }, 600);
  });
}

/* 4. Mobile Menu */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener('click', () => {
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }
  });

  document.querySelectorAll('.mobile-link').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden');
    });
  });
}

/* 5. Minimal Toast Notification */
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
      <span style="color: #38bdf8;">✦</span>
      <span>${msg}</span>
    </div>
  `;

  setTimeout(() => {
    toast.innerHTML = '';
  }, 3500);
}
