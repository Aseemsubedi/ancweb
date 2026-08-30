(function () {
  const S = window.ANC_STORE;
  const app = document.getElementById('app');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const catNav = document.getElementById('cat-nav');
  const menuToggle = document.getElementById('menu-toggle');
  const waFloat = document.getElementById('wa-float');
  const header = document.querySelector('.site-header');

  let bySlug = Object.fromEntries(S.products.map((p) => [p.slug, p]));
  const rebuildIndex = () => {
    bySlug = Object.fromEntries(S.products.map((p) => [p.slug, p]));
  };
  let availability = {};
  let supplierPlans = {};
  let posts = [];
  const isLive = (p) => p && !p.hidden;
  const liveList = () => S.products.filter(isLive);
  const isOut = (p) => availability[p.slug] === 'out';
  const catBySlug = Object.fromEntries(S.categories.map((c) => [c.slug, c]));
  const catName = Object.fromEntries(S.categories.map((c) => [c.slug, c.name]));
  const CAT_ALIAS = { pro: 'productivity', special: 'productivity' };
  const resolveCat = (slug) => CAT_ALIAS[slug] || slug;

  const catsOf = (p) => {
    const primary = resolveCat(p.category);
    const t = `${p.slug} ${p.name}`.toLowerCase();
    const extra = [];
    if (primary !== 'microsoft' && /microsoft|windows[- ]?(10|11)|windows server|windows pro|visio|clipchamp|onedrive|office 365|office for windows|office for mac|project professional/.test(t)) {
      extra.push('microsoft');
    }
    if (primary !== 'vpn' && /\bvpn\b/.test(t)) extra.push('vpn');
    if (primary === 'academic' && /ai|gpt|humanize|humbot|jenni|paperpal|originality|quillbot|grammarly/.test(t)) extra.push('ai-tools');
    if (primary === 'ai-tools' && /humanize|bypass|stealth writer|originality|plagiarism|hix/.test(t)) extra.push('academic');
    if (p.slug === 'linkedin-premium') extra.push('learning');
    if (p.slug === 'microsoft-copilot' || p.slug === 'microsoft-onedrive' || p.slug === 'clipchamp') extra.push('microsoft');
    if (Array.isArray(p.also)) extra.push(...p.also);
    return [...new Set([primary, ...extra].filter((c) => catName[c]))];
  };

  const productsIn = (slug) => {
    const want = resolveCat(slug);
    return liveList().filter((p) => catsOf(p).includes(want)).sort((a, b) => {
      const ra = isOut(a) ? 2 : (a.deal || a.recently ? 0 : 1);
      const rb = isOut(b) ? 2 : (b.deal || b.recently ? 0 : 1);
      return ra - rb || a.name.localeCompare(b.name);
    });
  };

  const liveCats = () => S.categories.filter((c) => productsIn(c.slug).length);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const plansFor = (slug) => {
    const from = supplierPlans[slug];
    const base = Array.isArray(from) && from.length ? from : S.plans;
    return base.includes('Not sure') ? [...base] : [...base, 'Not sure'];
  };

  const planNote = (plan) => {
    if (plan === 'Not sure') return 'We’ll quote options';
    if (plan === '1 month') return 'Short term';
    if (plan === '3 months') return 'Popular';
    if (plan === '12 months') return 'Best value';
    return '';
  };

  const similarTo = (p) => {
    const mine = new Set(catsOf(p));
    return liveList()
      .filter((x) => x.slug !== p.slug)
      .map((x) => ({
        x,
        n: catsOf(x).filter((c) => mine.has(c)).length,
        same: resolveCat(x.category) === resolveCat(p.category)
      }))
      .filter((row) => row.n > 0)
      .sort((a, b) => b.n - a.n || Number(b.same) - Number(a.same) || Number(isOut(a.x)) - Number(isOut(b.x)))
      .slice(0, 4)
      .map((row) => row.x);
  };
  const sheetLines = (rows, footer = 'Please quote the price.') =>
    ['ANC Tools — Order sheet', '', ...rows, '', footer].join('\n');

  const quoteMsg = (p, plan, qty = 1) =>
    sheetLines([
      `Product: ${p.name}`,
      `SKU: ${p.code}`,
      `Duration: ${plan && plan !== 'Not sure' ? plan : 'Not specified'}`,
      `Qty: ${qty}`
    ]);

  const categorySheet = (cat) =>
    sheetLines([
      `Category: ${cat.name}`,
      `SKU: ${cat.name}`
    ], 'Please quote products in this category.');

  const defaultQuote = sheetLines([], 'Please send a price.');
  const searchSheet = (q) => sheetLines([`Looking for: ${q}`], 'Please quote if you have this.');

  const waLink = (text) =>
    `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}`;

  const productImg = (p, extraClass = '') =>
    `<img src="assets/products/${p.slug}.webp?v=5" alt="Buy ${esc(p.name)} in Nepal — ANC Tools" class="${extraClass}" width="480" height="720"${extraClass.includes('hero') ? '' : ' loading="lazy"'}>`;

  const thumb = (p, size) =>
    `<span class="thumb" style="width:${size}px;height:${size}px">${productImg(p)}</span>`;

  const media = (p) =>
    `<div class="media">${productImg(p)}</div>`;

  const icon = (name) => {
    const paths = {
      home: 'M3 10.5 12 3l9 7.5V21H3z',
      cloud: 'M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1.5A3.5 3.5 0 0 0 7 18z',
      spark: 'M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.7l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.3l2.8-2.8',
      book: 'M4 5h7v14H6a2 2 0 0 1-2-2V5zm9 0h7v12a2 2 0 0 1-2 2h-5V5z',
      pen: 'M4 20h4L19 9l-4-4L4 16v4z',
      shield: 'M12 3 20 7v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V7l8-4z',
      grad: 'M3 10 12 5l9 5-9 5-9-5zm4 4.2V17c0 .8 2.2 3 5 3s5-2.2 5-3v-2.8',
      lock: 'M8 11V8a4 4 0 1 1 8 0v3M6 11h12v10H6z',
      play: 'M8 6.5v11l9-5.5-9-5.5z',
      win: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
      brief: 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16v12H4z'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.spark}"/></svg>`;
  };

  const howStrip = () => `
    <section class="how" aria-label="How it works">
      <div class="how-step"><span class="n">1</span><div><h3>Pick a product</h3><p>Browse AI, Microsoft, Canva, VPN, and more. No account needed.</p></div></div>
      <div class="how-step"><span class="n">2</span><div><h3>Get a quote</h3><p>WhatsApp with today’s NPR rate. Plans stay easy to change.</p></div></div>
      <div class="how-step"><span class="n">3</span><div><h3>Pay, then receive</h3><p>Confirm, pay, and get access — usually the same day.</p></div></div>
    </section>`;

  const pathAbs = (rel) => new URL(rel, document.baseURI || (window.ANC_BASE || './')).pathname;

  const hrefHome = () => './';
  const hrefProduct = (slug) => `p/${slug}/`;
  const hrefCategory = (slug) => `c/${slug}/`;
  const hrefPage = (slug) => `${slug}/`;
  const hrefBlog = () => 'blog/';
  const hrefPost = (slug) => `blog/${slug}/`;
  const postForProduct = (slug) => posts.find((g) => (g.products || []).includes(slug));

  const goTo = (rel) => {
    const next = pathAbs(rel);
    if (location.pathname !== next) history.pushState(null, '', next);
    render();
  };

  const route = () => {
    const raw = location.hash || '';
    if (raw === '#/' || /^#\/((p|c)\/[a-z0-9-]+|blog(\/[a-z0-9-]+)?|how|about|delivery|privacy|refund|terms|payment|contact|partnership)\/?$/i.test(raw)) {
      const dest = raw.replace(/^#\/?/, '').replace(/\/$/, '');
      history.replaceState(null, '', pathAbs(dest ? `${dest}/` : './'));
    }
    const basePath = new URL('./', document.baseURI || location.origin + '/').pathname;
    let path = location.pathname;
    if (path.startsWith(basePath)) path = path.slice(basePath.length);
    path = path.replace(/index\.html$/i, '').replace(/^\/+|\/+$/g, '');
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'c' && parts[1]) return { name: 'category', slug: resolveCat(parts[1]) };
    if (parts[0] === 'p' && parts[1]) return { name: 'product', slug: parts[1] };
    if (parts[0] === 'blog' && parts[1]) return { name: 'post', slug: parts[1] };
    if (parts[0] === 'blog') return { name: 'blog' };
    if (parts[0] === 'account') return { name: 'page', slug: 'how' };
    if (['about', 'delivery', 'privacy', 'refund', 'terms', 'payment', 'contact', 'partnership', 'how'].includes(parts[0])) {
      return { name: 'page', slug: parts[0] };
    }
    return { name: 'notfound' };
  };

  const productCard = (p) => `
    <a class="product-card${isOut(p) ? ' is-oos' : ''}" href="${hrefProduct(p.slug)}">
      ${media(p)}
      <div class="body">
        <h3>${p.name}</h3>
        <span class="card-cta${isOut(p) ? ' oos-label' : ''}">${isOut(p) ? 'Out of stock' : 'Get a quote'}</span>
      </div>
    </a>`;

  const scroller = (slug) => {
    const items = productsIn(slug);
    if (!items.length) return '';
    return `
      <section class="section">
        <div class="section-head">
          <h2>${catName[slug]}</h2>
          <div style="display:flex;align-items:center;gap:10px">
            <a class="view-all" href="${hrefCategory(slug)}">View All</a>
            <div class="row-controls">
              <button type="button" class="scroll-btn" data-dir="-1" data-target="row-${slug}" aria-label="Previous">‹</button>
              <button type="button" class="scroll-btn" data-dir="1" data-target="row-${slug}" aria-label="Next">›</button>
            </div>
          </div>
        </div>
        <div class="scroller" id="row-${slug}">
          ${items.map(productCard).join('')}
        </div>
      </section>`;
  };

  const home = () => {
    const recent = liveList().filter((p) => p.recently).slice(0, 8);
    const deals = liveList().filter((p) => p.deal).slice(0, 8);
    const heroes = S.heroes.map((slug) => bySlug[slug]).filter(isLive);
    const featured = ['ai-tools', 'microsoft', 'graphics', 'streaming'];
    const heroSlugs = new Set(heroes.map((p) => p.slug));
    const quick = ['claude-ai', 'lovable-ai', 'capcut-pro', 'office-mac', 'office-windows', 'google-workspace', 'google-one', 'coursera-plus', 'udemy', 'netflix', 'icloud']
      .map((slug) => bySlug[slug])
      .filter((p) => p && isLive(p) && !heroSlugs.has(p.slug));
    const lead = heroes[0];
    const rest = heroes.slice(1, 3);

    return `
      <div class="home-stage">
      <section class="home-hero">
        <div class="home-hero-copy">
          <p class="kicker">ANC Tools · Kushma, Nepal</p>
          <h1>Buy digital subscriptions in Nepal</h1>
          <p>ChatGPT, Claude, Cursor, Adobe, Microsoft, CapCut, Netflix. Quote today’s NPR rate on WhatsApp. Pay with Khalti, eSewa, or connectIPS.</p>
          <div class="home-hero-actions">
            <a class="btn-wa" href="${waLink(defaultQuote)}" target="_blank" rel="noopener noreferrer">Get a quote</a>
            <a class="btn-navy" href="${hrefCategory('ai-tools')}">Browse products</a>
          </div>
          <ul class="trust-chips">
            <li>WhatsApp quote</li>
            <li>Khalti · eSewa</li>
            <li>Same-day delivery</li>
          </ul>
        </div>
        ${lead ? `
        <div class="home-show">
          <a class="show-lead" href="${hrefProduct(lead.slug)}" style="--accent:${lead.color || '#2563eb'}">
            <span class="show-art">${productImg(lead, 'hero-feat')}</span>
            <span class="show-meta">
              <span class="kicker">Featured</span>
              <strong>${lead.name}</strong>
              <em>Get a quote</em>
            </span>
          </a>
          ${rest.length ? `
          <div class="show-stack">
            ${rest.map((p) => `
            <a class="show-tile" href="${hrefProduct(p.slug)}" style="--accent:${p.color || '#2563eb'}">
              <span class="show-art">${productImg(p, 'hero-mini-img')}</span>
              <span class="show-meta">
                <strong>${p.name}</strong>
                <em>Get a quote</em>
              </span>
            </a>`).join('')}
          </div>` : ''}
        </div>` : ''}
      </section>
      ${quick.length ? `
      <div class="quick-wrap">
        <p class="quick-label">Also popular</p>
        <nav class="quick-shop" aria-label="Popular products">
          ${quick.map((p) => `
            <a href="${hrefProduct(p.slug)}">${thumb(p, 36)}<span>${p.name}</span></a>
          `).join('')}
        </nav>
      </div>` : ''}
      </div>

      ${howStrip()}

      <section class="section">
        <div class="section-head">
          <h2>Browse by category</h2>
        </div>
        <div class="cat-tiles">
          ${liveCats().map((c) => {
            const n = productsIn(c.slug).length;
            return `
            <a class="cat-tile" href="${hrefCategory(c.slug)}">
              <span class="cat-tile-icon">${icon(c.icon || 'spark')}</span>
              <strong>${c.nav || c.name}</strong>
              <span>${n} product${n === 1 ? '' : 's'}</span>
            </a>`;
          }).join('')}
        </div>
      </section>

      <section class="section">
        <div class="deals-banner">
          <h2>Popular right now</h2>
          <p>These move fastest. Message us for today’s NPR rate — no public price list to go stale.</p>
        </div>
        <div class="deals-grid">
          ${deals.map((p) => `
            <a class="deal-card${isOut(p) ? ' is-oos' : ''}" href="${hrefProduct(p.slug)}">
              <span class="offer-badge">${isOut(p) ? 'Out of stock' : 'Popular'}</span>
              ${media(p)}
              <div class="body">
                <h3>${p.name}</h3>
                <span class="btn-buy">${isOut(p) ? 'Out of stock' : 'Get a quote'}</span>
              </div>
            </a>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Recently added</h2></div>
        <div class="recent-grid">
          ${recent.map((p) => `
            <a class="recent-card${isOut(p) ? ' is-oos' : ''}" href="${hrefProduct(p.slug)}">
              ${thumb(p, 58)}
              <div>
                <h3>${p.name}</h3>
                <p class="price-soon${isOut(p) ? ' oos-label' : ''}">${isOut(p) ? 'Out of stock' : 'Get a quote'}</p>
              </div>
            </a>`).join('')}
        </div>
      </section>

      ${featured.map((slug) => scroller(slug)).join('')}

      ${posts.length ? `
      <section class="section">
        <div class="section-head">
          <h2>Buying guides</h2>
          <a class="view-all" href="${hrefBlog()}">All guides</a>
        </div>
        <div class="guide-grid">${posts.slice(0, 6).map((g) => guideCard(g)).join('')}</div>
      </section>` : ''}

      <section class="geo-faq">
        <header class="geo-head">
          <p class="kicker">Kushma · all Nepal</p>
          <h2>Buying digital tools in Nepal</h2>
          <p>ANC Tools is the digital subscriptions shop of Aseem and Consulting Pvt Ltd. Support is from Kushma 05 Parbat, Gandaki. We quote in NPR on WhatsApp so the price you see is today’s rate, not a frozen website number.</p>
        </header>
        <div class="geo-grid">
          <article>
            <span class="geo-ico" aria-hidden="true">${icon('home')}</span>
            <h3>Where we serve</h3>
            <p>Kathmandu, Lalitpur, Bhaktapur, Pokhara, Bharatpur, Kushma, and the rest of Nepal. Delivery is digital — you get access details after payment.</p>
            <ul class="geo-pills">
              <li>Kathmandu</li>
              <li>Pokhara</li>
              <li>Kushma</li>
              <li>Nationwide</li>
            </ul>
          </article>
          <article>
            <span class="geo-ico" aria-hidden="true">${icon('brief')}</span>
            <h3>How you pay</h3>
            <p>Khalti, eSewa, connectIPS, mobile banking, Visa, or Mastercard. The method is confirmed in the same WhatsApp chat before you pay.</p>
            <ul class="geo-pills">
              <li>Khalti</li>
              <li>eSewa</li>
              <li>connectIPS</li>
              <li>Card</li>
            </ul>
          </article>
          <article>
            <span class="geo-ico" aria-hidden="true">${icon('spark')}</span>
            <h3>Why quote, not cart</h3>
            <p>Supplier rates move. A public NPR list goes stale. You ask, we quote, you confirm. That is the shop.</p>
            <a class="geo-link" href="${waLink(defaultQuote)}" target="_blank" rel="noopener noreferrer">Ask for today’s rate</a>
          </article>
        </div>
        <div class="faq-block">
          <h2>FAQ</h2>
          <details class="faq-item" open>
            <summary>How do I buy a subscription in Nepal?</summary>
            <p>Pick a product, tap Get a quote, agree the NPR rate on WhatsApp, pay, then receive access — usually the same day.</p>
          </details>
          <details class="faq-item">
            <summary>Do you show prices on the site?</summary>
            <p>No. The catalog is public; the live rate is in chat.</p>
          </details>
          <details class="faq-item">
            <summary>How fast is delivery?</summary>
            <p>Most items go out after payment is confirmed, during Nepal daytime.</p>
          </details>
        </div>
      </section>
    `;
  };

  const category = (slug) => {
    const id = resolveCat(slug);
    const cat = catBySlug[id];
    if (!cat) return notFound();
    const items = productsIn(id);
    const live = items.filter((p) => !isOut(p)).length;
    return `
      <p class="crumbs"><a href="${hrefHome()}">Home</a> / ${cat.name}</p>
      <div class="section-head">
        <div>
          <h1>Buy ${cat.name} in Nepal</h1>
          <p class="muted cat-lead">${cat.blurb ? `${cat.blurb} ` : ''}Live NPR quote on WhatsApp from Kushma — <span id="cat-count">${items.length} product${items.length === 1 ? '' : 's'}</span>${live !== items.length ? ` · ${live} in stock` : ''}. Pay Khalti, eSewa, or connectIPS.</p>
        </div>
        <div class="cat-toolbar">
          <div class="cat-filter" role="group" aria-label="Stock filter">
            <button type="button" class="chip on" data-show="all">All</button>
            <button type="button" class="chip" data-show="in">In stock</button>
          </div>
          <a class="view-all" href="${waLink(categorySheet(cat))}" target="_blank" rel="noopener noreferrer">Quote this category</a>
        </div>
      </div>
      <div class="grid-products" id="cat-grid">${items.map(productCard).join('')}</div>
      <p class="empty-state" id="cat-empty" hidden>Nothing in stock in this category right now. <button type="button" class="view-all" data-show="all">Show all</button></p>
    `;
  };

  const product = (slug) => {
    const p = bySlug[slug];
    if (!p || !isLive(p)) return notFound();
    const similar = similarTo(p);
    const plans = plansFor(slug);
    const stacked = plans.some((x) => x !== 'Not sure' && x.length > 16);
    const first = plans[0];
    const oos = isOut(p);
    const primary = resolveCat(p.category);
    const guide = postForProduct(p.slug);
    const catChips = catsOf(p).map((c) => `<a class="cat-chip" href="${hrefCategory(c)}">${catName[c]}</a>`).join('');
    const quoteBtn = oos
      ? `<span class="btn-oos">Out of stock</span>`
      : `<a class="btn-enquire btn-wa" id="quote-btn" href="${waLink(quoteMsg(p, first, 1))}" target="_blank" rel="noopener noreferrer">Get a quote</a>`;
    const barBtn = oos
      ? `<span class="btn-oos">Out of stock</span>`
      : `<a class="btn-wa" id="quote-btn-bar" href="${waLink(quoteMsg(p, first, 1))}" target="_blank" rel="noopener noreferrer">Get a quote</a>`;
    const h1 = p.name.length > 42 ? p.name : `Buy ${p.name} in Nepal`;
    return `
      <p class="crumbs"><a href="${hrefHome()}">Home</a> / <a href="${hrefCategory(primary)}">${catName[primary]}</a> / ${p.name}</p>
      <div class="product-layout">
        <button type="button" class="product-art" data-lightbox aria-label="View ${p.name} image">
          ${productImg(p)}
        </button>
        <div class="product-info">
          <p class="cat-chips">${catChips}</p>
          <h1>${h1}</h1>
          ${oos ? '<p class="oos-banner">Out of stock</p>' : ''}
          <p class="muted">${p.blurb}</p>
          ${guide ? `<p class="guide-link">Buying guide: <a href="${hrefPost(guide.slug)}">${esc(guide.h1 || guide.title)}</a></p>` : ''}
          <div class="order-sheet" id="order-sheet">
            <div class="sheet-head">
              <span>Order sheet</span>
              <span>Quote only — not billed yet</span>
            </div>
            <div class="sheet-row">
              <span class="sheet-label">Product</span>
              <strong>${p.name}</strong>
            </div>
            <div class="sheet-plans">
              <span class="sheet-label" id="plan-label">Duration</span>
              <div class="plan-list${stacked ? ' stacked' : ''}" id="plan-chips" role="radiogroup" aria-labelledby="plan-label">
                ${plans.map((plan, i) => {
                  const note = planNote(plan);
                  return `<button type="button" class="plan-opt${i === 0 ? ' on' : ''}" data-plan="${esc(plan)}" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}">
                    <span class="plan-radio" aria-hidden="true"></span>
                    <span class="plan-opt-copy">
                      <span class="plan-opt-title">${esc(plan)}</span>
                      ${note ? `<span class="plan-opt-note">${esc(note)}</span>` : ''}
                    </span>
                  </button>`;
                }).join('')}
              </div>
            </div>
            <div class="sheet-row">
              <span class="sheet-label">Qty</span>
              <div class="qty-ctrl">
                <button type="button" class="qty-btn" data-qty="-1" aria-label="Decrease quantity">−</button>
                <strong id="order-qty">1</strong>
                <button type="button" class="qty-btn" data-qty="1" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div class="sheet-foot">
              ${quoteBtn}
              <span class="reply-note">${oos ? 'Not available to quote right now.' : S.hours}</span>
            </div>
          </div>
          <div class="prose">
            <h2>Buy ${p.name} in Nepal from ANC Tools</h2>
            <p>${p.blurb} ANC Tools in Kushma, Gandaki quotes ${p.name} on WhatsApp in NPR, then delivers access after you pay. That is how people in Kathmandu, Pokhara, and the rest of Nepal buy this without a stale website price.</p>
            <p>Pay with Khalti, eSewa, connectIPS, mobile banking, or card — we confirm the method in chat before you send money.</p>
            <h2>How to buy ${p.name}</h2>
            <ol>
              <li>Set duration and quantity on the order sheet, or leave duration as “Not sure”.</li>
              <li>Tap Get a quote — WhatsApp opens with the same order sheet filled in.</li>
              <li>We reply with the live rate, payment options, and delivery time.</li>
              <li>Pay only after you agree. Then we send access details.</li>
            </ol>
            <h2>FAQ</h2>
            <h3>How do I buy ${p.name} in Nepal?</h3>
            <p>Open this page, choose a duration, and tap Get a quote. We send the live NPR rate on WhatsApp from Kushma.</p>
            <h3>What does ${p.name} cost in Nepal?</h3>
            <p>The live NPR rate is in WhatsApp. We do not publish a catalog price because supplier rates change.</p>
            <h3>How do I pay?</h3>
            <p>Khalti, eSewa, connectIPS, mobile banking, or cards — confirmed in the same chat before you pay.</p>
            <h3>How fast is delivery?</h3>
            <p>Most digital items go out after payment is confirmed, usually the same day during Nepal daytime.</p>
          </div>
        </div>
      </div>
      ${similar.length ? `
        <section class="similar">
          <h2>Similar products</h2>
          <div class="grid-products" style="margin-top:14px">${similar.map(productCard).join('')}</div>
        </section>` : ''}
      <div class="buy-bar on" id="buy-bar">
        <div>
          <strong>${p.name}</strong>
        </div>
        ${barBtn}
      </div>
    `;
  };

  const pages = {
    how: {
      title: 'How it works',
      html: ''
    },
    about: {
      title: 'About us',
      html: `<p>ANC Tools is the digital subscriptions shop of <strong>Aseem and Consulting Pvt Ltd</strong>, owned by Aseem Subedi. The office is Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal.</p>
        <p>We help people across Nepal — Kathmandu, Pokhara, Bharatpur, Kushma, and nationwide — get AI, Microsoft, Canva, VPN, antivirus, cloud, and learning subscriptions. WhatsApp is the shop: you ask, we quote in NPR, you confirm, then we deliver access.</p>
        <p>Parent site: <a href="${S.mainSite}">anc.com.np</a>. Email ${S.email}. WhatsApp ${S.phone}.</p>`
    },
    delivery: {
      title: 'Delivery time',
      html: `<p>Most digital items go out after payment is confirmed. Typical turnaround is a few minutes to a few hours during Nepal working hours (NPT).</p>
        <p>Delivery is digital: login or licence details in WhatsApp or email. We serve Kathmandu, Pokhara, Kushma, and all Nepal the same way.</p>
        <p>We confirm timing in chat before you pay.</p>`
    },
    privacy: {
      title: 'Privacy policy',
      html: `<p>We only use what you send on WhatsApp or email: name, number, and order details, to quote and fulfil.</p>
        <p>We do not sell your data. To request deletion, email ${S.email} or message WhatsApp ${S.phone}.</p>`
    },
    refund: {
      title: 'Refund policy',
      html: `<p>Every order is agreed in WhatsApp before payment. If we cannot deliver what was quoted, we refund or replace as written in that chat.</p>
        <p>Once access is delivered as agreed, refunds depend on the vendor’s licence rules — we will say so before you pay.</p>`
    },
    terms: {
      title: 'Terms of use',
      html: `<p>ANC Tools lists digital subscriptions and software. You must use each product under its vendor’s licence.</p>
        <p>A quote on WhatsApp is an offer. The order is confirmed when both sides agree the product, duration, price, and payment in that chat.</p>`
    },
    payment: {
      title: 'Payment',
      html: `<p>Pay in Nepal with Khalti, eSewa, connectIPS, mobile banking, Visa, or Mastercard. The method for your order is confirmed on WhatsApp before you send money.</p>
        <p>If a transfer is pending, send the product name and the time of payment on WhatsApp ${S.phone}.</p>`
    },
    contact: {
      title: 'Contact us',
      html: `<p>WhatsApp is fastest: <a href="${waLink(defaultQuote)}">${S.phone}</a></p>
        <p>Email: <a href="mailto:${S.email}">${S.email}</a></p>
        <p>${S.address}</p>
        <p>We reply in English and Nepali during Nepal daytime.</p>`
    },
    partnership: {
      title: 'Partnership',
      html: `<p>For reseller, campus, or bulk licences, WhatsApp ${S.phone} or email ${S.email}.</p>`
    }
  };

  const renderBlocks = (sections) => (sections || []).map((s) => {
    if (s.faq && s.faq.length) {
      const items = s.faq.map((f) => `
        <details class="faq-item">
          <summary>${esc(f.q)}</summary>
          <p>${esc(f.a)}</p>
        </details>`).join('');
      return `${s.h2 ? `<h2 class="faq-label">${esc(s.h2)}</h2>` : ''}<div class="faq-block">${items}</div>`;
    }
    const h = s.h2 ? `<h2>${esc(s.h2)}</h2>` : '';
    const ps = (s.p || []).map((t) => `<p>${esc(t)}</p>`).join('');
    const ul = s.ul ? `<ul>${s.ul.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const ol = s.ol ? `<ol>${s.ol.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : '';
    return `${h}${ps}${ul}${ol}`;
  }).join('');

  const guideCard = (g, lead = false) => {
    const imgSlug = g.image || (g.products && g.products[0]) || '';
    const p = imgSlug && bySlug[imgSlug];
    return `
      <a class="guide-card${lead ? ' is-lead' : ''}" href="${hrefPost(g.slug)}" style="--accent:${p?.color || '#2563eb'}">
        <span class="guide-art">${p ? productImg(p, lead ? 'hero-feat' : '') : ''}</span>
        <span class="guide-copy">
          <span class="kicker">Guide</span>
          <h3>${esc(g.h1 || g.title)}</h3>
          <p>${esc(g.lede || g.description || '')}</p>
          <em>Read guide</em>
        </span>
      </a>`;
  };

  const liveFromSlugs = (slugs) => (slugs || []).map((s) => bySlug[s]).filter(isLive);

  const blogIndex = () => {
    const [lead, ...rest] = posts;
    return `
    <div class="home-stage guides-stage">
      <p class="crumbs"><a href="${hrefHome()}">Home</a> / Guides</p>
      <header class="guides-hero">
        <p class="kicker">ANC Tools · Nepal buying guides</p>
        <h1>How to buy digital subscriptions in Nepal</h1>
        <p>ChatGPT, Claude, Cursor, Lovable, CapCut, Adobe, Microsoft Office, Google Workspace, Gmail storage, Coursera, Udemy, Netflix, and iCloud. Catalog is public; today’s NPR rate is on WhatsApp.</p>
        <ul class="trust-chips">
          <li>Original guides</li>
          <li>WhatsApp quote</li>
          <li>Kushma, Nepal</li>
        </ul>
      </header>
      ${lead ? guideCard(lead, true) : ''}
    </div>
    ${rest.length ? `<div class="guides-grid">${rest.map((g) => guideCard(g)).join('')}</div>` : ''}`;
  };

  const blogPost = (slug) => {
    const g = posts.find((x) => x.slug === slug);
    if (!g) return notFound();
    const items = liveFromSlugs(g.products);
    const related = liveFromSlugs(g.related).slice(0, 4);
    const more = posts.filter((x) => x.slug !== g.slug).slice(0, 4);
    const imgSlug = g.image || (g.products && g.products[0]) || '';
    const hero = imgSlug && bySlug[imgSlug];
    const quoteHref = items[0] && !isOut(items[0])
      ? waLink(quoteMsg(items[0], S.plans[0]))
      : waLink(defaultQuote);
    return `
      <div class="post-stage" style="--accent:${hero?.color || '#2563eb'}">
        <p class="crumbs"><a href="${hrefHome()}">Home</a> / <a href="${hrefBlog()}">Guides</a> / ${esc(g.h1 || g.title)}</p>
        <header class="post-hero">
          <div class="post-hero-copy">
            <p class="kicker">Guide · Kushma, Nepal</p>
            <h1>${esc(g.h1 || g.title)}</h1>
            ${g.lede ? `<p class="lede">${esc(g.lede)}</p>` : ''}
            <div class="home-hero-actions">
              <a class="btn-wa" href="${quoteHref}" target="_blank" rel="noopener noreferrer">Get a quote</a>
              ${items[0] ? `<a class="btn-navy" href="${hrefProduct(items[0].slug)}">View product</a>` : ''}
            </div>
          </div>
          ${hero ? `<div class="post-hero-art">${productImg(hero, 'hero-feat')}</div>` : ''}
        </header>
      </div>
      <article class="post-body">
        ${renderBlocks(g.sections)}
      </article>
      ${items.length ? `
        <div class="post-cta">
          <div>
            <h2>Get a live NPR quote</h2>
            <p>WhatsApp from Kushma. Pay with Khalti, eSewa, or connectIPS after you agree.</p>
          </div>
          <a class="btn-wa" href="${quoteHref}" target="_blank" rel="noopener noreferrer">Get a quote on WhatsApp</a>
        </div>
        <div class="grid-products post-products">${items.map(productCard).join('')}</div>` : ''}
      ${related.length ? `
        <section class="similar">
          <h2>Related products</h2>
          <div class="grid-products" style="margin-top:14px">${related.map(productCard).join('')}</div>
        </section>` : ''}
      ${more.length ? `
        <section class="section">
          <div class="section-head">
            <h2>More guides</h2>
            <a class="view-all" href="${hrefBlog()}">All guides</a>
          </div>
          <div class="guides-grid">${more.map((x) => guideCard(x)).join('')}</div>
        </section>` : ''}`;
  };

  const pageView = (slug) => {
    const p = pages[slug];
    if (!p) return notFound();
    return `<article class="page-card"><h1>${p.title}</h1>${p.html}</article>`;
  };

  const howPage = () => {
    const more = posts.slice(0, 3);
    return `
    <div class="home-stage guides-stage">
      <p class="crumbs"><a href="${hrefHome()}">Home</a> / How it works</p>
      <header class="guides-hero">
        <p class="kicker">ANC Tools · Kushma, Nepal</p>
        <h1>How to buy from ANC Tools</h1>
        <p>No cart. No login. Pick a product, get today’s NPR rate on WhatsApp, pay, then receive access — usually the same day.</p>
        <div class="home-hero-actions">
          <a class="btn-wa" href="${waLink(defaultQuote)}" target="_blank" rel="noopener noreferrer">Start a quote</a>
          <a class="btn-navy" href="${hrefHome()}">Browse products</a>
        </div>
        <ul class="trust-chips">
          <li>WhatsApp quote</li>
          <li>Khalti · eSewa</li>
          <li>Same-day delivery</li>
        </ul>
      </header>
    </div>
    <div class="how-cards">
      <article class="how-card">
        <span class="n">1</span>
        <h3>Pick a product</h3>
        <p>Browse ChatGPT, Claude, Cursor, Adobe, Microsoft, CapCut, Netflix, and the rest of the catalog. No account needed.</p>
        <ul class="geo-pills">
          <li>Public catalog</li>
          <li>No signup</li>
        </ul>
      </article>
      <article class="how-card">
        <span class="n">2</span>
        <h3>Get a quote</h3>
        <p>WhatsApp opens with the product, SKU, duration, and quantity. We send today’s NPR rate from Kushma. Change the plan in the same chat.</p>
        <ul class="geo-pills">
          <li>Live NPR</li>
          <li>Order sheet</li>
        </ul>
      </article>
      <article class="how-card">
        <span class="n">3</span>
        <h3>Pay, then receive</h3>
        <p>Agree the rate, then pay with Khalti, eSewa, connectIPS, mobile banking, or card. Access details follow after payment.</p>
        <ul class="geo-pills">
          <li>Pay after you agree</li>
          <li>Digital delivery</li>
        </ul>
      </article>
    </div>
    <div class="post-cta">
      <div>
        <h2>WhatsApp is the shop</h2>
        <p>We do not publish NPR on the site. Rates move. The price you pay is the one we send in chat that day.</p>
      </div>
      <a class="btn-wa" href="${waLink(defaultQuote)}" target="_blank" rel="noopener noreferrer">Get a quote on WhatsApp</a>
    </div>
    <div class="faq-block">
      <h2>FAQ</h2>
      <details class="faq-item" open>
        <summary>Why are there no prices on the website?</summary>
        <p>Supplier rates change. A public NPR list goes stale. You ask, we quote, you confirm — that keeps the number current.</p>
      </details>
      <details class="faq-item">
        <summary>How do I pay in Nepal?</summary>
        <p>Khalti, eSewa, connectIPS, mobile banking, Visa, or Mastercard. The method is confirmed in the same WhatsApp chat before you send money.</p>
      </details>
      <details class="faq-item">
        <summary>How fast is delivery?</summary>
        <p>Most digital items go out after payment is confirmed, usually the same day during Nepal daytime. Delivery is login or licence details — not a parcel.</p>
      </details>
      <details class="faq-item">
        <summary>Do I need an account on ANC Tools?</summary>
        <p>No. Browse the catalog, tap Get a quote, and finish on WhatsApp. We serve Kathmandu, Pokhara, Kushma, and all Nepal.</p>
      </details>
    </div>
    ${more.length ? `
      <section class="section">
        <div class="section-head">
          <h2>Buying guides</h2>
          <a class="view-all" href="${hrefBlog()}">All guides</a>
        </div>
        <div class="guides-grid">${more.map((g) => guideCard(g)).join('')}</div>
      </section>` : ''}`;
  };

  const notFound = () =>
    `<div class="empty-state"><h1>Page not found</h1><p>That product is not in the catalog.</p><p><a class="view-all" href="${hrefHome()}">Back to ANC Tools</a></p></div>`;

  const SITE_URL = 'https://tools.anc.com.np/';

  const setSeoTag = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  const applySeo = (r) => {
    let title = 'Buy Digital Subscriptions in Nepal | ChatGPT, Canva, VPN | ANC Tools';
    let desc = 'Buy ChatGPT Plus, Canva Pro, Microsoft 365, NordVPN and 100+ digital subscriptions in Nepal. Quote today’s NPR rate on WhatsApp from Kushma.';
    let url = SITE_URL;
    let image = `${SITE_URL}assets/og-image.png`;
    let ogType = 'website';
    if (r.name === 'product' && bySlug[r.slug] && isLive(bySlug[r.slug])) {
      const p = bySlug[r.slug];
      title = `Buy ${p.name} in Nepal | Live WhatsApp Rate | ANC Tools`;
      desc = `Buy ${p.name} in Nepal from ANC Tools in Kushma. ${p.blurb || ''} Live NPR quote on WhatsApp. Pay Khalti, eSewa, or connectIPS.`.replace(/\s+/g, ' ').trim();
      url = `${SITE_URL}p/${p.slug}/`;
      image = `${SITE_URL}assets/products/${p.slug}.webp`;
      ogType = 'product';
    } else if (r.name === 'category' && catBySlug[r.slug]) {
      const cat = catBySlug[r.slug];
      title = `Buy ${cat.name} in Nepal | ANC Tools`;
      desc = `Buy ${cat.name} in Nepal from ANC Tools. ${cat.blurb || ''} Quote the live NPR rate on WhatsApp.`;
      url = `${SITE_URL}c/${cat.slug}/`;
    } else if (r.name === 'page' && pages[r.slug]) {
      title = `${pages[r.slug].title} | ANC Tools`;
      desc = `${pages[r.slug].title} — ANC Tools digital subscriptions in Nepal. WhatsApp ${S.phone}.`;
      url = `${SITE_URL}${r.slug}/`;
    } else if (r.name === 'blog') {
      title = 'How to buy digital subscriptions in Nepal | Guides | ANC Tools';
      desc = 'Buy ChatGPT, Claude, Cursor, Lovable, CapCut, Adobe, Microsoft Office, Google Workspace, Gmail storage, Coursera, Udemy, Netflix, and iCloud in Nepal. Live NPR quote on WhatsApp.';
      url = `${SITE_URL}blog/`;
    } else if (r.name === 'post') {
      const g = posts.find((x) => x.slug === r.slug);
      if (g) {
        title = `${g.title} | ANC Tools`;
        desc = g.description || g.lede || title;
        url = `${SITE_URL}blog/${g.slug}/`;
        const img = g.image || (g.products && g.products[0]);
        if (img) image = `${SITE_URL}assets/products/${img}.webp`;
        ogType = 'article';
      }
    } else if (r.name === 'notfound') {
      title = 'Page not found | ANC Tools';
      desc = 'That page is not in the ANC Tools catalog.';
    }
    document.title = title;
    setSeoTag('meta[name="title"]', 'content', title);
    setSeoTag('meta[name="description"]', 'content', desc);
    setSeoTag('link[rel="canonical"]', 'href', url);
    setSeoTag('meta[property="og:title"]', 'content', title);
    setSeoTag('meta[property="og:description"]', 'content', desc);
    setSeoTag('meta[property="og:url"]', 'content', url);
    setSeoTag('meta[property="og:type"]', 'content', ogType);
    setSeoTag('meta[property="og:image"]', 'content', image);
    setSeoTag('meta[name="twitter:title"]', 'content', title);
    setSeoTag('meta[name="twitter:description"]', 'content', desc);
    setSeoTag('meta[name="twitter:image"]', 'content', image);
    document.querySelectorAll('link[hreflang]').forEach((el) => el.setAttribute('href', url));
    const ldEl = document.getElementById('seo-jsonld');
    if (ldEl) {
      try {
        const data = JSON.parse(ldEl.textContent || '{}');
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
        graph.forEach((node) => {
          if (node && node['@type'] === 'WebPage') {
            node.name = title;
            node.description = desc;
            node.url = url;
            node['@id'] = url + '#webpage';
          }
        });
        ldEl.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
      } catch (e) {}
    }
  };

  const setTitle = (r) => applySeo(r);

  const currentPlan = () => document.querySelector('#plan-chips .plan-opt.on')?.dataset.plan || S.plans[0];
  const currentQty = () => Math.min(10, Math.max(1, Number(document.getElementById('order-qty')?.textContent || 1)));

  const setQuoteLinks = (p, plan, qty) => {
    const href = waLink(quoteMsg(p, plan, qty));
    ['quote-btn', 'quote-btn-bar', 'header-wa', 'footer-wa'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = href;
    });
    waFloat.href = href;
  };

  const refreshOrder = (p) => setQuoteLinks(p, currentPlan(), currentQty());

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const closeLightbox = () => {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    lightboxImg.removeAttribute('src');
  };
  const openLightbox = (img) => {
    if (!lightbox || !img) return;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || '';
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    lightboxClose.focus();
  };
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxClose) closeLightbox();
  });

  const render = () => {
    closeLightbox();
    const r = route();
    setTitle(r);
    if (r.name === 'home') app.innerHTML = home();
    else if (r.name === 'category') app.innerHTML = category(r.slug);
    else if (r.name === 'product') app.innerHTML = product(r.slug);
    else if (r.name === 'blog') app.innerHTML = blogIndex();
    else if (r.name === 'post') app.innerHTML = blogPost(r.slug);
    else if (r.name === 'page') app.innerHTML = r.slug === 'how' ? howPage() : pageView(r.slug);
    else app.innerHTML = notFound();

    app.classList.remove('page-enter');
    void app.offsetWidth;
    app.classList.add('page-enter');
    window.scrollTo(0, 0);
    searchResults.classList.remove('open');
    highlightNav(r);
    bindDynamic(r);

    const onProduct = r.name === 'product' && bySlug[r.slug];
    waFloat.classList.toggle('tuck', Boolean(onProduct));
    const quoteHref = onProduct
      ? waLink(quoteMsg(bySlug[r.slug], S.plans[0]))
      : waLink(defaultQuote);
    waFloat.href = quoteHref;
    ['header-wa', 'footer-wa'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = quoteHref;
    });

    if (window.matchMedia('(max-width: 720px)').matches) {
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  };

  const highlightNav = (r) => {
    const productPrimary = r.name === 'product' && bySlug[r.slug]
      ? resolveCat(bySlug[r.slug].category)
      : '';
    document.querySelectorAll('.cat-nav a').forEach((a) => {
      const slug = a.getAttribute('data-slug');
      const on =
        (r.name === 'category' && slug === r.slug) ||
        Boolean(productPrimary && productPrimary === slug);
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  let heroTimer;
  const bindDynamic = (r) => {
    document.querySelectorAll('.scroll-btn').forEach((btn) => {
      btn.onclick = () => {
        const el = document.getElementById(btn.dataset.target);
        if (el) el.scrollBy({ left: Number(btn.dataset.dir) * 240, behavior: 'smooth' });
      };
    });

    const slides = [...document.querySelectorAll('.hero-slide')];
    const dots = [...document.querySelectorAll('.hero-dot')];
    const minis = [...document.querySelectorAll('.hero-mini[data-side]')];
    const stage = document.getElementById('hero-main');
    let i = 0;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, idx) => s.classList.toggle('on', idx === i));
      dots.forEach((d, idx) => d.classList.toggle('on', idx === i));
      minis.forEach((m) => m.classList.toggle('is-current', Number(m.dataset.side) === i));
    };
    dots.forEach((d) => { d.onclick = (e) => { e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.slide)); }; });
    clearInterval(heroTimer);
    if (slides.length) {
      heroTimer = setInterval(() => show(i + 1), 5200);
      if (stage) {
        stage.onmouseenter = () => clearInterval(heroTimer);
        stage.onmouseleave = () => { clearInterval(heroTimer); heroTimer = setInterval(() => show(i + 1), 5200); };
      }
    }

    if (r.name === 'category') {
      const applyStockFilter = (show) => {
        document.querySelectorAll('.cat-filter [data-show]').forEach((b) => b.classList.toggle('on', b.dataset.show === show));
        let visible = 0;
        document.querySelectorAll('#cat-grid .product-card').forEach((card) => {
          const hide = show === 'in' && card.classList.contains('is-oos');
          card.hidden = hide;
          if (!hide) visible += 1;
        });
        const empty = document.getElementById('cat-empty');
        if (empty) empty.hidden = visible > 0;
      };
      document.querySelectorAll('[data-show]').forEach((btn) => {
        btn.onclick = () => applyStockFilter(btn.dataset.show);
      });
    }

    if (r.name === 'product' && bySlug[r.slug] && !isOut(bySlug[r.slug])) {
      const p = bySlug[r.slug];
      document.querySelectorAll('#plan-chips .plan-opt').forEach((chip) => {
        chip.onclick = () => {
          document.querySelectorAll('#plan-chips .plan-opt').forEach((c) => {
            c.classList.remove('on');
            c.setAttribute('aria-checked', 'false');
          });
          chip.classList.add('on');
          chip.setAttribute('aria-checked', 'true');
          refreshOrder(p);
        };
      });
      document.querySelectorAll('.qty-btn').forEach((btn) => {
        btn.onclick = () => {
          const next = currentQty() + Number(btn.dataset.qty);
          document.getElementById('order-qty').textContent = String(Math.min(10, Math.max(1, next)));
          refreshOrder(p);
        };
      });
    }

    const zoom = document.querySelector('[data-lightbox]');
    if (zoom) {
      zoom.onclick = () => openLightbox(zoom.querySelector('img'));
    }
  };

  let searchHits = [];
  let searchIndex = -1;

  const highlight = (text, q) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return `${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
  };

  const renderSearch = (q) => {
    const query = q.trim().toLowerCase();
    searchIndex = -1;
    if (!query) {
      searchResults.classList.remove('open');
      searchResults.innerHTML = '';
      searchHits = [];
      return;
    }
    searchHits = liveList()
      .map((p) => {
        const name = p.name.toLowerCase();
        const hay = `${p.blurb} ${catsOf(p).map((c) => catName[c]).join(' ')}`.toLowerCase();
        let score = 0;
        if (name.startsWith(query)) score = 3;
        else if (name.includes(query)) score = 2;
        else if (hay.includes(query)) score = 1;
        return { p, score };
      })
      .filter((row) => row.score)
      .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((row) => row.p);
    searchResults.classList.add('open');
    searchResults.innerHTML = searchHits.length
      ? searchHits.map((p, i) => `<a href="${hrefProduct(p.slug)}" role="option" data-i="${i}">${thumb(p, 36)}<span>${highlight(p.name, query)}${isOut(p) ? ' <small class="oos-label">Out of stock</small>' : ''}<br><small class="muted">${catName[resolveCat(p.category)]}</small></span></a>`).join('')
      : `<div class="empty">No products match “${q}”. <a href="${waLink(searchSheet(q))}" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a></div>`;
  };

  const moveSearch = (dir) => {
    const links = [...searchResults.querySelectorAll('a[data-i]')];
    if (!links.length) return;
    searchIndex = (searchIndex + dir + links.length) % links.length;
    links.forEach((a, i) => a.classList.toggle('active', i === searchIndex));
    links[searchIndex].scrollIntoView({ block: 'nearest' });
  };

  searchInput.addEventListener('input', () => renderSearch(searchInput.value));
  searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) renderSearch(searchInput.value); });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearch(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); }
    else if (e.key === 'Escape') { searchResults.classList.remove('open'); searchInput.blur(); }
    else if (e.key === 'Enter' && searchIndex >= 0 && searchHits[searchIndex]) {
      e.preventDefault();
      goTo(hrefProduct(searchHits[searchIndex].slug));
      searchResults.classList.remove('open');
      searchInput.value = '';
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) searchResults.classList.remove('open');
  });
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (searchIndex >= 0 && searchHits[searchIndex]) {
      goTo(hrefProduct(searchHits[searchIndex].slug));
    } else if (searchHits.length === 1) {
      goTo(hrefProduct(searchHits[0].slug));
    } else renderSearch(searchInput.value);
  });
  searchResults.addEventListener('click', () => {
    searchResults.classList.remove('open');
    searchInput.value = '';
  });

  menuToggle.addEventListener('click', () => {
    const hidden = catNav.classList.toggle('mobile-hidden');
    menuToggle.setAttribute('aria-expanded', String(!hidden));
  });
  if (window.matchMedia('(max-width: 720px)').matches) menuToggle.setAttribute('aria-expanded', 'true');

  document.addEventListener('keydown', (e) => {
    if (!lightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      return;
    }
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target;
    const tag = (el && el.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return;
    e.preventDefault();
    searchInput.focus();
  });

  const fillNav = () => {
    const ul = catNav.querySelector('ul');
    if (!ul) return;
    ul.innerHTML = liveCats().map((c) => `<li><a href="${hrefCategory(c.slug)}" data-slug="${c.slug}">${icon(c.icon || 'spark')}${c.nav || c.name}</a></li>`).join('');
  };

  fillNav();

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:/i.test(href)) return;
    e.preventDefault();
    searchResults.classList.remove('open');
    goTo(href);
  });

  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);
  fetch('availability.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      availability = data || {};
      render();
    })
    .catch(() => {});
  fetch('plans.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      supplierPlans = data || {};
      render();
    })
    .catch(() => {});
  fetch('products.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!Array.isArray(data) || !data.length) return;
      const tags = {};
      S.products.forEach((p) => { if (p.heroTag) tags[p.slug] = p.heroTag; });
      S.products = data;
      S.products.forEach((p) => {
        p.code = p.code || window.ANC_STORE.productCodes[p.slug] || ('TM ' + p.name);
        if (!p.heroTag && tags[p.slug]) p.heroTag = tags[p.slug];
      });
      rebuildIndex();
      fillNav();
      render();
    })
    .catch(() => {});
  fetch('posts.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!Array.isArray(data) || !data.length) return;
      posts = data;
      render();
    })
    .catch(() => {});
  render();
})();
