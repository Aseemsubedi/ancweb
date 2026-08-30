const API = "api.php";
const SITES = [
  ["TM", "Toolsmandu"],
  ["KSN", "Keyshop"],
  ["CM", "Cheapmandu"],
  ["KS", "Keysewa"],
];

const state = {
  rows: [],
  categories: [],
  filter: "all",
  q: "",
  busy: new Set(),
};

function $(id) {
  return document.getElementById(id);
}

async function api(action, body = {}) {
  const res = await fetch(API, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({ ok: false, error: "bad json" }));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function npr(n) {
  if (n == null || n === "") return "—";
  return "₨" + Number(n).toLocaleString("en-NP");
}

function pickAlts(cell) {
  const raw = String(cell.note || "").replace(/^Also:\s*/i, "").trim();
  if (!raw) return [];
  const items = raw.split(/\s*·\s*/).filter((p) => p && !/^\+\d+/.test(p));
  const nprOf = (p) => {
    const m = p.match(/₨\s*([\d,]+)/);
    return m ? Number(m[1].replace(/,/g, "")) : Infinity;
  };
  const cheapest = (list) => list.slice().sort((a, b) => nprOf(a) - nprOf(b))[0];
  const year = cheapest(items.filter((p) => /1\s*-?\s*year|12\s*-?\s*month|annual/i.test(p)));
  const share = cheapest(items.filter((p) => /share|team|\bedu\b/i.test(p)));
  const mid = cheapest(items.filter((p) => /3\s*-?\s*month|6\s*-?\s*month/i.test(p)));
  const out = [];
  for (const p of [year, share, mid, items[0]]) {
    if (p && !out.includes(p) && out.length < 2) out.push(p);
  }
  return out;
}

function siteCell(row, site) {
  const url = row.urls[site];
  const cell = (row.fetched && row.fetched[site]) || null;
  if (!url) return `<span class="muted">—</span>`;
  if (!cell) {
    return `<a class="need" href="${url}" target="_blank" rel="noopener">Fetch</a>`;
  }
  if (!cell.ok || cell.price == null) {
    const why = cell.error === "http 404" || cell.error === "not found" ? "Not found" : (cell.error || "No price");
    return `<a class="bad" href="${url}" target="_blank" rel="noopener">${escapeHtml(why)}</a>`;
  }
  const stock = cell.stock === "out" ? `<span class="badge out">Out</span>` : "";
  const plan = cell.plan ? `<div class="plan">${escapeHtml(cell.plan)}</div>` : "";
  const alts = pickAlts(cell).map((p) => `<div class="alt">${escapeHtml(p)}</div>`).join("");
  return `<a class="cell-link" href="${url}" target="_blank" rel="noopener">
    <div class="price">${npr(cell.price)}${stock}</div>
    ${plan}${alts}
  </a>`;
}

function vsLine(r) {
  if (r.marketMin == null) return `<span class="muted">—</span>`;
  const who = `${escapeHtml(r.cheapestSite || "")} ${npr(r.marketMin)}`;
  if (r.vs === "low") return `<div class="flag low">Cheaper than ${who}</div>`;
  if (r.vs === "high") return `<div class="flag high">Costlier than ${who}</div>`;
  if (r.vs === "ok") return `<div class="flag ok">Same as ${who}</div>`;
  return `<div class="vs-sub">${who}</div>`;
}

function visibleRows() {
  const q = state.q.trim().toLowerCase();
  return state.rows.filter((r) => {
    if (q && !(`${r.name} ${r.code} ${r.slug}`.toLowerCase().includes(q))) return false;
    if (state.filter === "high") return r.vs === "high";
    if (state.filter === "low") return r.vs === "low";
    if (state.filter === "oos") return r.stock === "out";
    if (state.filter === "hidden") return r.hidden;
    if (state.filter === "missing") {
      const need = Object.keys(r.urls || {});
      return need.some((s) => !r.fetched || !r.fetched[s]);
    }
    return true;
  });
}

function render() {
  const rows = visibleRows();
  $("rows").innerHTML = rows.map((r) => {
    const cls = [
      r.vs === "high" ? "row-high" : "",
      r.vs === "low" ? "row-low" : "",
      r.stock === "out" ? "row-oos" : "",
      r.hidden ? "row-hidden" : "",
    ].filter(Boolean).join(" ");
    const busy = state.busy.has(r.slug);
    return `<tr class="${cls}" data-slug="${r.slug}">
      <td>
        <div class="prod">
          <img src="/assets/products/${r.slug}.webp?v=5" alt="" />
          <div>
            <strong>${escapeHtml(r.name)}</strong>
            ${r.hidden ? '<small><span class="badge hide">Hidden</span></small>' : ""}
          </div>
        </div>
      </td>
      <td class="our-cell">
        <input class="our-input" type="number" min="0" step="1" placeholder="NPR" value="${r.our ?? ""}" data-our="${r.slug}" />
        <select class="stock-pick" data-stock="${r.slug}" aria-label="Our stock">
          <option value="in"${r.stock !== "out" ? " selected" : ""}>In stock</option>
          <option value="out"${r.stock === "out" ? " selected" : ""}>Out of stock</option>
        </select>
      </td>
      ${SITES.map(([k]) => `<td class="cell">${siteCell(r, k)}</td>`).join("")}
      <td class="vs-col">${vsLine(r)}</td>
      <td class="row-actions">
        <button class="tiny" data-fetch="${r.slug}" ${busy ? "disabled" : ""}>${busy ? "…" : "Fetch"}</button>
        <button class="tiny" data-hide="${r.slug}" data-on="${r.hidden ? "1" : "0"}">${r.hidden ? "Show" : "Hide"}</button>
        <button class="tiny danger" data-delete="${r.slug}">Delete</button>
      </td>
    </tr>`;
  }).join("");
  $("status").textContent = `${rows.length} products`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function upsert(rows) {
  const map = new Map(state.rows.map((r) => [r.slug, r]));
  for (const r of rows) map.set(r.slug, r);
  state.rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function loadSheet() {
  const data = await api("sheet");
  state.rows = data.rows || [];
  state.categories = data.categories || [];
  fillCategories();
  render();
}

function fillCategories() {
  const sel = $("add-category");
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = state.categories.map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join("");
  if (cur) sel.value = cur;
}

function openAdd() {
  $("add-err").hidden = true;
  $("add-form").reset();
  fillCategories();
  $("add-modal").hidden = false;
  $("add-name").focus();
}

function closeAdd() {
  $("add-modal").hidden = true;
}

async function fetchOne(slug) {
  state.busy.add(slug);
  render();
  try {
    const data = await api("fetch", { slug });
    upsert(data.rows || []);
  } catch (err) {
    $("status").textContent = err.message || "Fetch failed";
  } finally {
    state.busy.delete(slug);
    render();
  }
}

async function fetchVisible() {
  const slugs = visibleRows().map((r) => r.slug);
  $("fetch-visible").disabled = true;
  let done = 0;
  const queue = [...slugs];
  async function worker() {
    while (queue.length) {
      const slug = queue.shift();
      $("status").textContent = `Fetching ${done + 1}/${slugs.length}…`;
      await fetchOne(slug);
      done += 1;
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  $("fetch-visible").disabled = false;
  $("status").textContent = `Updated ${slugs.length} products`;
}

function showDesk() {
  $("login").hidden = true;
  $("desk").hidden = false;
}

function showLogin(msg) {
  $("desk").hidden = true;
  $("login").hidden = false;
  if (msg) {
    $("login-err").hidden = false;
    $("login-err").textContent = msg;
  }
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-err").hidden = true;
  try {
    await api("login", { password: $("password").value });
    showDesk();
    await loadSheet();
  } catch (err) {
    showLogin(err.message === "auth" ? "Wrong password" : (err.message || "Could not sign in"));
  }
});

$("logout").addEventListener("click", async () => {
  try { await api("logout"); } catch (_) {}
  showLogin();
});

$("q").addEventListener("input", (e) => {
  state.q = e.target.value;
  render();
});

$("filters").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-f]");
  if (!btn) return;
  state.filter = btn.dataset.f;
  $("filters").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
  render();
});

$("fetch-visible").addEventListener("click", fetchVisible);
$("add-product").addEventListener("click", openAdd);
$("add-cancel").addEventListener("click", closeAdd);
$("add-modal").addEventListener("click", (e) => {
  if (e.target === $("add-modal")) closeAdd();
});

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("add-err").hidden = true;
  const payload = {
    name: $("add-name").value,
    category: $("add-category").value,
    blurb: $("add-blurb").value,
    urls: {
      TM: $("add-tm").value,
      KSN: $("add-ksn").value,
      CM: $("add-cm").value,
      KS: $("add-ks").value,
    },
  };
  try {
    const data = await api("add", payload);
    upsert(data.rows || []);
    closeAdd();
    render();
    $("status").textContent = "Added " + (data.rows && data.rows[0] && data.rows[0].name);
  } catch (err) {
    $("add-err").hidden = false;
    $("add-err").textContent = err.message || "Could not add";
  }
});

$("rows").addEventListener("click", async (e) => {
  const fetchBtn = e.target.closest("[data-fetch]");
  if (fetchBtn) {
    fetchOne(fetchBtn.dataset.fetch);
    return;
  }
  const hideBtn = e.target.closest("[data-hide]");
  if (hideBtn) {
    const slug = hideBtn.dataset.hide;
    const hidden = hideBtn.dataset.on !== "1";
    try {
      const data = await api("hide", { slug, hidden });
      upsert(data.rows || []);
      render();
      $("status").textContent = hidden ? "Hidden on shop" : "Shown on shop";
    } catch (err) {
      $("status").textContent = err.message || "Hide failed";
    }
    return;
  }
  const delBtn = e.target.closest("[data-delete]");
  if (delBtn) {
    const slug = delBtn.dataset.delete;
    const row = state.rows.find((r) => r.slug === slug);
    const name = row ? row.name : slug;
    if (!confirm("Delete " + name + " from the shop? This cannot be undone.")) return;
    try {
      await api("delete", { slug });
      state.rows = state.rows.filter((r) => r.slug !== slug);
      render();
      $("status").textContent = "Deleted " + name;
    } catch (err) {
      $("status").textContent = err.message || "Delete failed";
    }
  }
});

$("rows").addEventListener("change", async (e) => {
  const ourInput = e.target.closest("[data-our]");
  const stockPick = e.target.closest("[data-stock]");
  if (!ourInput && !stockPick) return;
  const slug = (ourInput || stockPick).dataset.our || (stockPick && stockPick.dataset.stock);
  const row = state.rows.find((r) => r.slug === slug);
  const tr = e.target.closest("tr");
  const nprEl = tr.querySelector("[data-our]");
  const stEl = tr.querySelector("[data-stock]");
  const payload = { slug };
  if (ourInput) payload.our = nprEl.value === "" ? null : Number(nprEl.value);
  if (stockPick) payload.stock = stEl.value;
  if (ourInput && stEl) payload.stock = stEl.value;
  try {
    const data = await api("save", payload);
    upsert(data.rows || []);
    render();
    $("status").textContent = "Saved";
  } catch (err) {
    $("status").textContent = err.message || "Save failed";
  }
});

(async function boot() {
  try {
    await loadSheet();
    showDesk();
  } catch (err) {
    showLogin(err.status === 401 ? "" : (err.message || ""));
  }
})();
