# ANC Tools

Live site: **https://tools.anc.com.np**

Digital subscriptions shop for Aseem and Consulting Pvt Ltd. Catalog is live; product prices, checkout, and accounts will be added later. Enquiries go to WhatsApp.

## Local preview

From the ANC Website repo root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/tools/

## Seller desk (internal)

Password-protected sheet at `tools/seller/`. Customer shop stays quote-only; this is for sellers only (our NPR vs Toolsmandu / Keyshop Nepal / Cheapmandu / Keysewa, fetch rates, out-of-stock, high/low).

Local (needed for Fetch rates):

```bash
python3 tools/seller/server.py
```

Open http://127.0.0.1:8081/ — password is in `tools/seller/config.json`. Change it before going live.

On Hostinger the same UI uses `seller/api.php`. Do not add a public shop link to `/seller/`.

## Hostinger subdomain

1. hPanel → Websites → `anc.com.np` → **Subdomains**.
2. Create **tools** (full host: `tools.anc.com.np`).
3. Document root: `public_html/tools` (this folder in the Git deploy).
4. SSL → issue certificate for `tools.anc.com.np`.

## Buying guides

Original Nepal “how to buy” articles live in `posts.json` and render at `/blog/`. After editing posts, regenerate crawlable HTML and the sitemap:

```bash
python3 tools/seo_build.py
```
