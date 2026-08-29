# ANC Tools

Live site: **https://tools.anc.com.np**

Browser workbench for Aseem and Consulting Pvt Ltd. Every tool runs on the visitor’s device.

## Local preview

From the ANC Website repo root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/tools/

## Hostinger subdomain

1. hPanel → Websites → `anc.com.np` → **Subdomains**.
2. Create **tools** (full host: `tools.anc.com.np`).
3. Document root: `public_html/tools` (this folder in the Git deploy).
4. SSL → issue certificate for `tools.anc.com.np`.
