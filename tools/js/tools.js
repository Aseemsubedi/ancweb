/**
 * ANC Tools — in-browser workbench implementations.
 * Nothing here is sent to a server.
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function copyText(text, label) {
    const value = String(text ?? '');
    navigator.clipboard.writeText(value).then(() => {
      global.ANCToolsApp?.toast(`Copied ${label || 'result'}`);
    }).catch(() => {
      const temp = document.createElement('textarea');
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      global.ANCToolsApp?.toast(`Copied ${label || 'result'}`);
    });
  }

  function field(label, controlHtml) {
    return `<label class="block text-left"><span class="block text-xs font-medium opacity-70 mb-1.5">${escapeHtml(label)}</span>${controlHtml}</label>`;
  }

  function dualPane(left, right) {
    return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${left}${right}</div>`;
  }

  function toolbar(buttons) {
    return `<div class="tool-toolbar">${buttons}</div>`;
  }

  function statusLine() {
    return `<p class="tool-status mt-3" data-status></p>`;
  }

  function setStatus(root, kind, message) {
    const el = root.querySelector('[data-status]');
    if (!el) return;
    el.className = `tool-status mt-3 ${kind || ''}`;
    el.textContent = message || '';
  }

  /* ------------------------------------------------------------------ */
  /* JSON                                                               */
  /* ------------------------------------------------------------------ */
  function mountJson(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        ${toolbar(`
          <button type="button" class="tool-btn primary" data-act="format">Format</button>
          <button type="button" class="tool-btn" data-act="minify">Minify</button>
          <button type="button" class="tool-btn" data-act="copy">Copy</button>
          <button type="button" class="tool-btn" data-act="clear">Clear</button>
        `)}
        ${dualPane(
          `<textarea class="tool-textarea" data-in placeholder='{"hello":"ANC Tools"}' spellcheck="false"></textarea>`,
          `<pre class="tool-output" data-out></pre>`
        )}
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');

    function run(minify) {
      const raw = input.value.trim();
      if (!raw) {
        out.textContent = '';
        setStatus(root, 'warn', 'Paste JSON to format or minify.');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        out.textContent = JSON.stringify(parsed, null, minify ? 0 : 2);
        const keys = typeof parsed === 'object' && parsed ? Object.keys(parsed).length : 0;
        setStatus(root, 'ok', minify ? 'Minified.' : `Valid JSON${Array.isArray(parsed) ? ` · array[${parsed.length}]` : typeof parsed === 'object' ? ` · ${keys} top-level keys` : ''}.`);
      } catch (err) {
        out.textContent = '';
        setStatus(root, 'err', err.message);
      }
    }

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'format') run(false);
      if (act === 'minify') run(true);
      if (act === 'copy') copyText(out.textContent || input.value, 'JSON');
      if (act === 'clear') {
        input.value = '';
        out.textContent = '';
        setStatus(root, '', '');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* JWT                                                                */
  /* ------------------------------------------------------------------ */
  function b64urlDecode(str) {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function mountJwt(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <p class="text-xs opacity-70 mb-4">Decodes header and payload only. Signatures are <strong>not</strong> verified — do not treat this as authentication.</p>
        <textarea class="tool-textarea" data-in placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signature" spellcheck="false"></textarea>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="decode">Decode</button>
          <button type="button" class="tool-btn" data-act="copy">Copy payload</button>`)}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="jwt-block"><h4>Header</h4><pre data-header></pre></div>
          <div class="jwt-block"><h4>Payload</h4><pre data-payload></pre></div>
        </div>
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const headerEl = root.querySelector('[data-header]');
    const payloadEl = root.querySelector('[data-payload]');

    function decode() {
      const token = input.value.trim().replace(/^Bearer\s+/i, '');
      const parts = token.split('.');
      if (parts.length < 2) {
        setStatus(root, 'err', 'A JWT needs at least header.payload (three parts with signature).');
        return;
      }
      try {
        const header = JSON.parse(b64urlDecode(parts[0]));
        const payload = JSON.parse(b64urlDecode(parts[1]));
        headerEl.textContent = JSON.stringify(header, null, 2);
        payloadEl.textContent = JSON.stringify(payload, null, 2);
        const notes = [];
        if (payload.exp) notes.push(`exp ${new Date(payload.exp * 1000).toISOString()}`);
        if (payload.iat) notes.push(`iat ${new Date(payload.iat * 1000).toISOString()}`);
        if (payload.nbf) notes.push(`nbf ${new Date(payload.nbf * 1000).toISOString()}`);
        if (payload.exp && Date.now() > payload.exp * 1000) notes.push('token looks expired');
        setStatus(root, 'warn', `Decoded. Signature not verified.${notes.length ? ' · ' + notes.join(' · ') : ''}`);
      } catch (err) {
        setStatus(root, 'err', 'Could not decode: ' + err.message);
      }
    }

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'decode') decode();
      if (act === 'copy') copyText(payloadEl.textContent, 'payload');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Base64 / URL                                                       */
  /* ------------------------------------------------------------------ */
  function mountCodec(mode) {
    return function mount(root) {
      const isUrl = mode === 'url';
      root.innerHTML = `
        <div class="tool-workspace">
          ${toolbar(`
            <button type="button" class="tool-btn primary" data-act="encode">Encode</button>
            <button type="button" class="tool-btn" data-act="decode">Decode</button>
            <button type="button" class="tool-btn" data-act="copy">Copy output</button>
          `)}
          ${dualPane(
            `<textarea class="tool-textarea" data-in placeholder="${isUrl ? 'https://anc.com.np/?q=hello world' : 'Plain text'}" spellcheck="false"></textarea>`,
            `<textarea class="tool-textarea" data-out placeholder="Result" spellcheck="false"></textarea>`
          )}
          ${statusLine()}
        </div>`;
      const input = root.querySelector('[data-in]');
      const out = root.querySelector('[data-out]');

      root.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        try {
          if (act === 'encode') {
            out.value = isUrl ? encodeURIComponent(input.value) : btoa(unescape(encodeURIComponent(input.value)));
            setStatus(root, 'ok', 'Encoded.');
          }
          if (act === 'decode') {
            out.value = isUrl ? decodeURIComponent(input.value) : decodeURIComponent(escape(atob(input.value.replace(/\s/g, ''))));
            setStatus(root, 'ok', 'Decoded.');
          }
          if (act === 'copy') copyText(out.value, 'output');
        } catch (err) {
          setStatus(root, 'err', err.message);
        }
      });
    };
  }

  /* ------------------------------------------------------------------ */
  /* Hash                                                               */
  /* ------------------------------------------------------------------ */
  async function digest(algo, text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest(algo, data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function mountHash(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <textarea class="tool-textarea" data-in placeholder="Text to hash" spellcheck="false"></textarea>
        <div class="flex flex-wrap items-center gap-3 mt-4 mb-4">
          ${field('Algorithm', `<select class="tool-select" data-algo>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
            <option value="SHA-1">SHA-1 (legacy)</option>
          </select>`)}
          <button type="button" class="tool-btn primary self-end" data-act="hash">Hash</button>
          <button type="button" class="tool-btn self-end" data-act="copy">Copy</button>
        </div>
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');
    const algo = root.querySelector('[data-algo]');

    root.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'copy') return copyText(out.textContent, 'hash');
      if (act !== 'hash') return;
      if (!input.value) {
        setStatus(root, 'warn', 'Enter text first.');
        return;
      }
      const hex = await digest(algo.value, input.value);
      out.textContent = hex;
      setStatus(root, 'ok', `${algo.value} · ${hex.length / 2} bytes · computed locally.`);
    });
  }

  /* ------------------------------------------------------------------ */
  /* UUID                                                               */
  /* ------------------------------------------------------------------ */
  function uuidv4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function mountUuid(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <div class="flex flex-wrap gap-3 items-end mb-4">
          ${field('How many', `<input class="minimal-input" data-count type="number" min="1" max="100" value="5">`)}
          <button type="button" class="tool-btn primary" data-act="gen">Generate</button>
          <button type="button" class="tool-btn" data-act="copy">Copy all</button>
        </div>
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const out = root.querySelector('[data-out]');
    const count = root.querySelector('[data-count]');

    function gen() {
      const n = Math.min(100, Math.max(1, Number(count.value) || 1));
      const list = Array.from({ length: n }, uuidv4);
      out.textContent = list.join('\n');
      setStatus(root, 'ok', `${n} UUID v4 value${n > 1 ? 's' : ''} from the Web Crypto API.`);
    }
    gen();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'gen') gen();
      if (act === 'copy') copyText(out.textContent, 'UUIDs');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Timestamp                                                          */
  /* ------------------------------------------------------------------ */
  function mountTimestamp(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${field('Unix seconds or milliseconds', `<input class="minimal-input font-mono" data-unix placeholder="1730000000">`)}
          ${field('ISO / local datetime', `<input class="minimal-input font-mono" data-iso>`)}
        </div>
        ${toolbar(`
          <button type="button" class="tool-btn primary" data-act="now">Use now</button>
          <button type="button" class="tool-btn" data-act="from-unix">Unix → dates</button>
          <button type="button" class="tool-btn" data-act="from-iso">Date → unix</button>
        `)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const unix = root.querySelector('[data-unix]');
    const iso = root.querySelector('[data-iso]');
    const out = root.querySelector('[data-out]');

    function describe(date) {
      const sec = Math.floor(date.getTime() / 1000);
      const kathmandu = new Intl.DateTimeFormat('en-NP', {
        timeZone: 'Asia/Kathmandu',
        dateStyle: 'full',
        timeStyle: 'long'
      }).format(date);
      out.textContent = [
        `Unix seconds:      ${sec}`,
        `Unix milliseconds: ${date.getTime()}`,
        `ISO UTC:           ${date.toISOString()}`,
        `Local browser:     ${date.toString()}`,
        `Asia/Kathmandu:    ${kathmandu}`
      ].join('\n');
      unix.value = String(sec);
      iso.value = date.toISOString();
      setStatus(root, 'ok', 'Converted locally.');
    }

    function fromUnix() {
      const n = Number(unix.value.trim());
      if (!Number.isFinite(n)) {
        setStatus(root, 'err', 'Enter a numeric unix timestamp.');
        return;
      }
      describe(new Date(n > 1e12 ? n : n * 1000));
    }

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'now') describe(new Date());
      if (act === 'from-unix') fromUnix();
      if (act === 'from-iso') {
        const d = new Date(iso.value);
        if (Number.isNaN(d.getTime())) setStatus(root, 'err', 'Could not parse that datetime.');
        else describe(d);
      }
    });
    describe(new Date());
  }

  /* ------------------------------------------------------------------ */
  /* Regex                                                              */
  /* ------------------------------------------------------------------ */
  function mountRegex(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-3">
          ${field('Pattern', `<input class="minimal-input font-mono" data-pattern placeholder="\\\\b[A-Z]{2}\\\\d+\\\\b">`)}
          ${field('Flags', `<input class="minimal-input font-mono w-28" data-flags value="g" maxlength="6">`)}
        </div>
        <textarea class="tool-textarea" data-in placeholder="Test string"></textarea>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="run">Test</button>`)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const pattern = root.querySelector('[data-pattern]');
    const flags = root.querySelector('[data-flags]');
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')?.dataset.act !== 'run') return;
      try {
        const re = new RegExp(pattern.value, flags.value || '');
        const text = input.value;
        if (!pattern.value) {
          setStatus(root, 'warn', 'Enter a pattern.');
          return;
        }
        const matches = text.match(re);
        if (!matches) {
          out.textContent = '(no matches)';
          setStatus(root, 'warn', 'No matches.');
          return;
        }
        out.textContent = matches.map((m, i) => `[${i}] ${m}`).join('\n');
        setStatus(root, 'ok', `${matches.length} match${matches.length === 1 ? '' : 'es'}.`);
      } catch (err) {
        setStatus(root, 'err', err.message);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Diff                                                               */
  /* ------------------------------------------------------------------ */
  function mountDiff(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        ${dualPane(
          `<textarea class="tool-textarea" data-a placeholder="Original"></textarea>`,
          `<textarea class="tool-textarea" data-b placeholder="Changed"></textarea>`
        )}
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="diff">Compare lines</button>`)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const a = root.querySelector('[data-a]');
    const b = root.querySelector('[data-b]');
    const out = root.querySelector('[data-out]');

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')?.dataset.act !== 'diff') return;
      const left = a.value.replace(/\r\n/g, '\n').split('\n');
      const right = b.value.replace(/\r\n/g, '\n').split('\n');
      const max = Math.max(left.length, right.length);
      const rows = [];
      let added = 0;
      let removed = 0;
      for (let i = 0; i < max; i++) {
        const L = left[i];
        const R = right[i];
        if (L === R) {
          rows.push(`  ${L ?? ''}`);
        } else {
          if (L !== undefined) {
            rows.push(`- ${L}`);
            removed++;
          }
          if (R !== undefined) {
            rows.push(`+ ${R}`);
            added++;
          }
        }
      }
      out.innerHTML = rows.map((line) => {
        const cls = line.startsWith('+ ') ? 'diff-add' : line.startsWith('- ') ? 'diff-del' : 'diff-same';
        return `<div class="${cls}">${escapeHtml(line)}</div>`;
      }).join('');
      setStatus(root, 'ok', `Line compare · ${added} added · ${removed} removed. Pairwise by line number (not a full Myers diff).`);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Secret                                                             */
  /* ------------------------------------------------------------------ */
  function mountSecret(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          ${field('Length', `<input class="minimal-input" data-len type="number" min="8" max="128" value="24">`)}
          <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" data-upper checked> A–Z</label>
          <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" data-lower checked> a–z</label>
          <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" data-num checked> 0–9</label>
          <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" data-sym> Symbols</label>
        </div>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="gen">Generate</button>
          <button type="button" class="tool-btn" data-act="copy">Copy</button>`)}
        <pre class="tool-output text-lg tracking-wide" data-out></pre>
        ${statusLine()}
      </div>`;
    const out = root.querySelector('[data-out]');

    function gen() {
      const sets = [];
      if (root.querySelector('[data-upper]').checked) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
      if (root.querySelector('[data-lower]').checked) sets.push('abcdefghijkmnopqrstuvwxyz');
      if (root.querySelector('[data-num]').checked) sets.push('23456789');
      if (root.querySelector('[data-sym]').checked) sets.push('!@#$%^&*_-+=?');
      if (!sets.length) {
        setStatus(root, 'err', 'Select at least one character set.');
        return;
      }
      const alphabet = sets.join('');
      const len = Math.min(128, Math.max(8, Number(root.querySelector('[data-len]').value) || 24));
      const bytes = crypto.getRandomValues(new Uint8Array(len));
      let result = '';
      for (let i = 0; i < len; i++) result += alphabet[bytes[i] % alphabet.length];
      out.textContent = result;
      setStatus(root, 'ok', `${len}-character secret from crypto.getRandomValues. It never leaves this tab.`);
    }
    gen();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'gen') gen();
      if (act === 'copy') copyText(out.textContent, 'secret');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Contrast                                                           */
  /* ------------------------------------------------------------------ */
  function hexToRgb(hex) {
    const h = hex.replace('#', '').trim();
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function relLuminance({ r, g, b }) {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(a, b) {
    const L1 = relLuminance(hexToRgb(a));
    const L2 = relLuminance(hexToRgb(b));
    const light = Math.max(L1, L2);
    const dark = Math.min(L1, L2);
    return (light + 0.05) / (dark + 0.05);
  }

  function mountContrast(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          ${field('Foreground', `<input class="minimal-input font-mono" data-fg value="#111827">`)}
          ${field('Background', `<input class="minimal-input font-mono" data-bg value="#fbfbfd">`)}
        </div>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="check">Check WCAG</button>`)}
        <div class="contrast-swatch mb-4" data-swatch>Sample</div>
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const fg = root.querySelector('[data-fg]');
    const bg = root.querySelector('[data-bg]');
    const swatch = root.querySelector('[data-swatch]');
    const out = root.querySelector('[data-out]');

    function check() {
      try {
        const ratio = contrastRatio(fg.value, bg.value);
        swatch.style.color = fg.value;
        swatch.style.background = bg.value;
        const aa = ratio >= 4.5;
        const aaa = ratio >= 7;
        const aaLarge = ratio >= 3;
        out.textContent = [
          `Contrast ratio: ${ratio.toFixed(2)}:1`,
          `Normal text AA (4.5:1):  ${aa ? 'pass' : 'fail'}`,
          `Normal text AAA (7:1):   ${aaa ? 'pass' : 'fail'}`,
          `Large text AA (3:1):     ${aaLarge ? 'pass' : 'fail'}`
        ].join('\n');
        setStatus(root, aa ? 'ok' : 'err', aa ? 'Meets WCAG AA for normal text.' : 'Below WCAG AA for normal text.');
      } catch (err) {
        setStatus(root, 'err', 'Use 3- or 6-digit hex colors, e.g. #06b6d4.');
      }
    }
    check();
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')?.dataset.act === 'check') check();
    });
  }

  /* ------------------------------------------------------------------ */
  /* CSV / JSON                                                         */
  /* ------------------------------------------------------------------ */
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inQuotes) {
        if (c === '"' && src[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') inQuotes = false;
        else cell += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else cell += c;
    }
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  function mountCsv(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        ${toolbar(`
          <button type="button" class="tool-btn primary" data-act="to-json">CSV → JSON</button>
          <button type="button" class="tool-btn" data-act="to-csv">JSON → CSV</button>
          <button type="button" class="tool-btn" data-act="copy">Copy output</button>
        `)}
        ${dualPane(
          `<textarea class="tool-textarea" data-in placeholder="name,role&#10;Aseem,Consultant"></textarea>`,
          `<textarea class="tool-textarea" data-out placeholder="Result"></textarea>`
        )}
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');

    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      try {
        if (act === 'to-json') {
          const rows = parseCsv(input.value.trim());
          if (rows.length < 2) throw new Error('Need a header row and at least one data row.');
          const headers = rows[0];
          const data = rows.slice(1).map((r) => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
            return obj;
          });
          out.value = JSON.stringify(data, null, 2);
          setStatus(root, 'ok', `${data.length} records.`);
        }
        if (act === 'to-csv') {
          const data = JSON.parse(input.value);
          if (!Array.isArray(data) || !data.length) throw new Error('JSON must be a non-empty array of objects.');
          const headers = [...new Set(data.flatMap((row) => Object.keys(row)))];
          const esc = (v) => {
            const s = String(v ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          };
          const lines = [headers.join(','), ...data.map((row) => headers.map((h) => esc(row[h])).join(','))];
          out.value = lines.join('\n');
          setStatus(root, 'ok', `${data.length} rows.`);
        }
        if (act === 'copy') copyText(out.value, 'output');
      } catch (err) {
        setStatus(root, 'err', err.message);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cron                                                               */
  /* ------------------------------------------------------------------ */
  const CRON_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const CRON_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function describeCronField(value, type) {
    if (value === '*') return type === 'minute' ? 'every minute' : type === 'hour' ? 'every hour' : type === 'dom' ? 'every day of the month' : type === 'month' ? 'every month' : 'every weekday';
    if (value.startsWith('*/')) return `every ${value.slice(2)} ${type === 'minute' ? 'minutes' : type === 'hour' ? 'hours' : type}`;
    if (type === 'month' && /^\d+$/.test(value)) return CRON_MONTHS[(Number(value) - 1) % 12] || value;
    if (type === 'dow' && /^\d+$/.test(value)) return CRON_DAYS[Number(value) % 7];
    return value;
  }

  function mountCron(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        ${field('5-field cron (min hour day month weekday)', `<input class="minimal-input font-mono" data-in value="0 9 * * 1-5">`)}
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="explain">Explain</button>
          <button type="button" class="tool-btn" data-act="copy">Copy</button>`)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');

    function explain() {
      const parts = input.value.trim().split(/\s+/);
      if (parts.length !== 5) {
        setStatus(root, 'err', 'Use five fields: minute hour day-of-month month weekday.');
        return;
      }
      const [min, hour, dom, month, dow] = parts;
      const lines = [
        `Minute:        ${describeCronField(min, 'minute')}`,
        `Hour:          ${describeCronField(hour, 'hour')}`,
        `Day of month:  ${describeCronField(dom, 'dom')}`,
        `Month:         ${describeCronField(month, 'month')}`,
        `Weekday:       ${describeCronField(dow, 'dow')}`,
        '',
        `Expression: ${parts.join(' ')}`
      ];
      out.textContent = lines.join('\n');
      setStatus(root, 'ok', 'Standard 5-field cron. Not a full quartz/6-field parser.');
    }
    explain();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'explain') explain();
      if (act === 'copy') copyText(out.textContent, 'explanation');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Estimator                                                          */
  /* ------------------------------------------------------------------ */
  function mountEstimator(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <p class="text-xs opacity-70 mb-4">Planning ranges for discovery calls — not a quote. Final commercials follow a written proposal.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${field('Work type', `<select class="tool-select" data-type>
            <option value="web">Web application / site</option>
            <option value="app">Mobile app</option>
            <option value="consult">IT / architecture consulting</option>
            <option value="aml">AML / compliance system</option>
            <option value="remit">Remittance switch</option>
            <option value="travel">Travel / GDS platform</option>
          </select>`)}
          ${field('Scale', `<select class="tool-select" data-scale>
            <option value="s">Small (MVP / brochure)</option>
            <option value="m" selected>Medium (production)</option>
            <option value="l">Large (multi-module)</option>
          </select>`)}
          ${field('Integrations', `<select class="tool-select" data-int>
            <option value="0">None / few</option>
            <option value="1" selected>A handful of APIs</option>
            <option value="2">Many systems / ledgers</option>
          </select>`)}
        </div>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="run">Estimate</button>
          <button type="button" class="tool-btn" data-act="copy">Copy summary</button>`)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const out = root.querySelector('[data-out]');
    const base = {
      web: { weeks: [3, 8], npr: [120000, 450000] },
      app: { weeks: [8, 18], npr: [350000, 1200000] },
      consult: { weeks: [2, 6], npr: [80000, 280000] },
      aml: { weeks: [10, 24], npr: [600000, 2500000] },
      remit: { weeks: [12, 28], npr: [800000, 3200000] },
      travel: { weeks: [10, 26], npr: [700000, 2800000] }
    };
    const scaleMul = { s: 0.7, m: 1, l: 1.7 };
    const intMul = { 0: 1, 1: 1.2, 2: 1.55 };

    function npr(n) {
      return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n);
    }

    function run() {
      const type = root.querySelector('[data-type]').value;
      const scale = root.querySelector('[data-scale]').value;
      const integ = root.querySelector('[data-int]').value;
      const b = base[type];
      const m = scaleMul[scale] * intMul[integ];
      const w0 = Math.max(1, Math.round(b.weeks[0] * m));
      const w1 = Math.max(w0 + 1, Math.round(b.weeks[1] * m));
      const n0 = Math.round(b.npr[0] * m);
      const n1 = Math.round(b.npr[1] * m);
      const usd0 = Math.round(n0 / 135);
      const usd1 = Math.round(n1 / 135);
      const typeLabel = root.querySelector('[data-type]').selectedOptions[0].text;
      out.textContent = [
        `Aseem and Consulting — planning estimate`,
        `Type:          ${typeLabel}`,
        `Scale:         ${root.querySelector('[data-scale]').selectedOptions[0].text}`,
        `Integrations:  ${root.querySelector('[data-int]').selectedOptions[0].text}`,
        '',
        `Delivery window:  ${w0}–${w1} weeks`,
        `Indicative NPR:   ${npr(n0)} – ${npr(n1)}`,
        `Indicative USD:   $${usd0.toLocaleString()} – $${usd1.toLocaleString()} (≈ NPR 135)`,
        '',
        `Next step: WhatsApp +977 9802840041 or info@anc.com.np`
      ].join('\n');
      setStatus(root, 'ok', 'Indicative only. Confirm after a scoping call.');
    }
    run();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'run') run();
      if (act === 'copy') copyText(out.textContent, 'estimate');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Case                                                               */
  /* ------------------------------------------------------------------ */
  function mountCase(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <textarea class="tool-textarea" data-in placeholder="hello ANC tools"></textarea>
        ${toolbar(`
          <button type="button" class="tool-btn" data-mode="lower">lower</button>
          <button type="button" class="tool-btn" data-mode="upper">UPPER</button>
          <button type="button" class="tool-btn" data-mode="title">Title Case</button>
          <button type="button" class="tool-btn" data-mode="camel">camelCase</button>
          <button type="button" class="tool-btn" data-mode="snake">snake_case</button>
          <button type="button" class="tool-btn" data-mode="kebab">kebab-case</button>
          <button type="button" class="tool-btn" data-act="copy">Copy</button>
        `)}
        <pre class="tool-output" data-out></pre>
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');
    const words = (s) => s.replace(/[_\-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().split(/\s+/);

    root.addEventListener('click', (e) => {
      const mode = e.target.closest('[data-mode]')?.dataset.mode;
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'copy') return copyText(out.textContent, 'text');
      if (!mode) return;
      const s = input.value;
      const w = words(s);
      const map = {
        lower: () => s.toLowerCase(),
        upper: () => s.toUpperCase(),
        title: () => w.map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' '),
        camel: () => w.map((x, i) => i ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : x.toLowerCase()).join(''),
        snake: () => w.map((x) => x.toLowerCase()).join('_'),
        kebab: () => w.map((x) => x.toLowerCase()).join('-')
      };
      out.textContent = map[mode]();
    });
  }

  /* ------------------------------------------------------------------ */
  /* HTML entities                                                      */
  /* ------------------------------------------------------------------ */
  function mountEntities(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        ${toolbar(`
          <button type="button" class="tool-btn primary" data-act="encode">Encode</button>
          <button type="button" class="tool-btn" data-act="decode">Decode</button>
          <button type="button" class="tool-btn" data-act="copy">Copy output</button>
        `)}
        ${dualPane(
          `<textarea class="tool-textarea" data-in placeholder="<div class=&quot;card&quot;>ANC</div>"></textarea>`,
          `<textarea class="tool-textarea" data-out></textarea>`
        )}
        ${statusLine()}
      </div>`;
    const input = root.querySelector('[data-in]');
    const out = root.querySelector('[data-out]');
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'encode') {
        out.value = escapeHtml(input.value);
        setStatus(root, 'ok', 'Encoded & < > ".');
      }
      if (act === 'decode') {
        out.value = input.value
          .replace(/&nbsp;/gi, ' ')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
          .replace(/&amp;/gi, '&');
        setStatus(root, 'ok', 'Decoded HTML entities.');
      }
      if (act === 'copy') copyText(out.value, 'output');
    });
  }

  /* ------------------------------------------------------------------ */
  /* FX helper                                                          */
  /* ------------------------------------------------------------------ */
  function mountFx(root) {
    root.innerHTML = `
      <div class="tool-workspace">
        <p class="text-xs opacity-70 mb-4">Scratch-pad rates for remittance conversations. Edit the NPR-per-unit fields — these are not live NRB mid rates.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          ${field('Amount', `<input class="minimal-input" data-amt type="number" min="0" step="0.01" value="1000">`)}
          ${field('From', `<select class="tool-select" data-from>
            <option value="NPR">NPR</option>
            <option value="USD" selected>USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="AED">AED</option>
            <option value="GBP">GBP</option>
          </select>`)}
          ${field('To', `<select class="tool-select" data-to>
            <option value="NPR" selected>NPR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="AED">AED</option>
            <option value="GBP">GBP</option>
          </select>`)}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-xs">
          ${field('USD → NPR', `<input class="minimal-input font-mono" data-rate="USD" value="135">`)}
          ${field('EUR → NPR', `<input class="minimal-input font-mono" data-rate="EUR" value="148">`)}
          ${field('INR → NPR', `<input class="minimal-input font-mono" data-rate="INR" value="1.60">`)}
          ${field('AED → NPR', `<input class="minimal-input font-mono" data-rate="AED" value="36.7">`)}
          ${field('GBP → NPR', `<input class="minimal-input font-mono" data-rate="GBP" value="172">`)}
        </div>
        ${toolbar(`<button type="button" class="tool-btn primary" data-act="convert">Convert</button>
          <button type="button" class="tool-btn" data-act="copy">Copy</button>`)}
        <pre class="tool-output" data-out></pre>
        ${statusLine()}
      </div>`;
    const out = root.querySelector('[data-out]');

    function toNpr(code, amount) {
      if (code === 'NPR') return amount;
      return amount * Number(root.querySelector(`[data-rate="${code}"]`).value);
    }

    function run() {
      const amount = Number(root.querySelector('[data-amt]').value);
      const from = root.querySelector('[data-from]').value;
      const to = root.querySelector('[data-to]').value;
      if (!Number.isFinite(amount)) {
        setStatus(root, 'err', 'Enter a valid amount.');
        return;
      }
      const npr = toNpr(from, amount);
      const result = to === 'NPR' ? npr : npr / Number(root.querySelector(`[data-rate="${to}"]`).value);
      out.textContent = `${amount.toLocaleString()} ${from}  →  ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}\nvia NPR scratch-pad rates on this page.`;
      setStatus(root, 'ok', 'Not a live FX feed. Confirm with your bank or NRB before sending money.');
    }
    run();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'convert') run();
      if (act === 'copy') copyText(out.textContent, 'conversion');
    });
  }

  global.ANC_TOOLS = [
    { id: 'json', name: 'JSON Formatter', category: 'Data', blurb: 'Pretty-print, minify, and validate JSON in the browser.', keywords: 'json pretty validate minify', mount: mountJson },
    { id: 'jwt', name: 'JWT Decoder', category: 'Security', blurb: 'Inspect header and claims. Signatures are never verified here.', keywords: 'jwt token bearer decode', mount: mountJwt },
    { id: 'base64', name: 'Base64', category: 'Data', blurb: 'Encode or decode Base64 text locally.', keywords: 'base64 encode decode', mount: mountCodec('b64') },
    { id: 'url', name: 'URL Encode', category: 'Data', blurb: 'Percent-encode and decode URLs and query strings.', keywords: 'url uri encode percent', mount: mountCodec('url') },
    { id: 'hash', name: 'Hash Generator', category: 'Security', blurb: 'SHA-256 / 384 / 512 / 1 via the Web Crypto API.', keywords: 'sha256 sha hash digest checksum', mount: mountHash },
    { id: 'uuid', name: 'UUID Generator', category: 'Data', blurb: 'Create RFC 4122 version 4 identifiers.', keywords: 'uuid guid id', mount: mountUuid },
    { id: 'timestamp', name: 'Timestamp', category: 'Time', blurb: 'Unix, ISO, local, and Asia/Kathmandu time.', keywords: 'unix epoch iso nepal kathmandu', mount: mountTimestamp },
    { id: 'regex', name: 'Regex Tester', category: 'Text', blurb: 'Try a JavaScript regular expression against sample text.', keywords: 'regex regexp pattern match', mount: mountRegex },
    { id: 'diff', name: 'Text Diff', category: 'Text', blurb: 'Line-by-line compare for configs, logs, and copy.', keywords: 'diff compare text patch', mount: mountDiff },
    { id: 'secret', name: 'Secret Generator', category: 'Security', blurb: 'Random passwords from crypto.getRandomValues.', keywords: 'password secret token random', mount: mountSecret },
    { id: 'contrast', name: 'Color Contrast', category: 'Web', blurb: 'WCAG AA / AAA contrast checks for UI work.', keywords: 'wcag a11y contrast color accessibility', mount: mountContrast },
    { id: 'csv', name: 'CSV ↔ JSON', category: 'Data', blurb: 'Turn spreadsheet exports into JSON and back.', keywords: 'csv json spreadsheet', mount: mountCsv },
    { id: 'cron', name: 'Cron Explainer', category: 'Time', blurb: 'Read a 5-field cron expression in plain English.', keywords: 'cron schedule crontab', mount: mountCron },
    { id: 'case', name: 'Case Converter', category: 'Text', blurb: 'lower, UPPER, Title, camel, snake, and kebab.', keywords: 'case camel snake kebab', mount: mountCase },
    { id: 'entities', name: 'HTML Entities', category: 'Web', blurb: 'Escape or unescape HTML for safe snippets.', keywords: 'html entities escape xss', mount: mountEntities },
    { id: 'estimator', name: 'Project Estimator', category: 'Consulting', blurb: 'Indicative weeks and NPR ranges for ANC engagements.', keywords: 'estimate quote npr consulting', mount: mountEstimator },
    { id: 'fx', name: 'FX Scratch Pad', category: 'Consulting', blurb: 'Editable NPR cross rates for remittance conversations.', keywords: 'npr usd inr remittance forex', mount: mountFx }
  ];
})(window);
