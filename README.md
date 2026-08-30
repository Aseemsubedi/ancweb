# Aseem and Consulting Pvt Ltd (ANC) - Official Website

**Live Domain**: [https://anc.com.np](https://anc.com.np)  
**Official Email**: `info@anc.com.np`  
**Headquarters**: Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal  
**Founder & Principal Consultant**: Aseem Subedi  

---

## 🌟 Overview

This repository contains the production-ready source code for **Aseem and Consulting Pvt Ltd (ANC)**, a modern tech consulting and software engineering firm specializing in:
- **AML (Anti-Money Laundering) & Regulatory Compliance Tech**
- **Remittance & Cross-Border Payment Switches**
- **Travel Tech & Booking Engines (GDS & Dynamic Packaging)**
- **Modern Bespoke Web & Cloud Applications**
- **Strategic Tech Consulting & Architecture Audits**

---

## 📁 Project Structure

```text
.
├── index.html         # Main single-page application with semantic SEO & Schema.org markup
├── css/
│   └── styles.css     # Custom dark tech aesthetic, glassmorphism, responsive styles
├── js/
│   └── main.js        # Interactive constellation network canvas, estimator, modals, & forms
├── assets/
│   ├── logo.svg       # Official vector brand logo
│   └── favicon.svg    # Browser tab icon
├── .htaccess          # Hostinger Apache performance, gzip, caching & security rules
├── robots.txt         # Search engine crawler instructions
├── sitemap.xml        # XML Sitemap for search engines
├── .gitignore         # Git ignore rules
├── tools/             # ANC Tools shop at tools.anc.com.np
└── README.md          # Deployment & maintenance guide
```

---

## 🚀 Local Development & Preview

To preview the website locally on your computer:

```bash
# Using Python built-in HTTP server:
python3 -m http.server 8000

# Then open in your browser:
# http://localhost:8000
```

---

## 🌿 Step 1: Push Code to GitHub / Git

To push this website to your GitHub account:

1. **Create a new repository on GitHub**:
   - Go to [https://github.com/new](https://github.com/new)
   - Name the repository (e.g. `anc-website` or `anc.com.np`)
   - Keep it Public or Private
   - **Do NOT** check "Initialize with README" (since we already have our files ready)

2. **Run these commands in your terminal**:
   ```bash
   cd "/Users/aseem/Documents/ANC Website "

   # If git is not yet initialized:
   git init
   git add .
   git commit -m "Initial release of Aseem and Consulting Pvt Ltd website"

   # Rename branch to main
   git branch -M main

   # Link to your remote GitHub repo (replace with your actual GitHub URL):
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/anc-website.git

   # Push the code
   git push -u origin main
   ```

---

## 🌐 Step 2: Deploy to Hostinger

Hostinger supports multiple easy ways to publish this website:

### Option A: Automatic Git Deployment in Hostinger (Recommended)

1. Log into your **Hostinger hPanel** (`https://hpanel.hostinger.com`).
2. Go to **Websites** &rarr; Select `anc.com.np` &rarr; Click **Manage**.
3. In the sidebar search bar, type **Git** and click on the **Git** tool.
4. Fill in the deployment details:
   - **Repository**: `https://github.com/YOUR_GITHUB_USERNAME/anc-website.git`
   - **Branch**: `main`
   - **Install path**: `public_html` (leave default)
5. Click **Create** / **Deploy**.
6. Whenever you run `git push origin main` in the future, you can simply click **Auto-Deploy Webhook** or **Deploy** in Hostinger to update your live website instantly!

---

### Option B: Hostinger File Manager (Quick Direct Upload)

1. Log into **Hostinger hPanel** &rarr; **File Manager**.
2. Open the `public_html` directory of `anc.com.np`.
3. Upload all files and folders:
   - `index.html`
   - `css/`
   - `js/`
   - `assets/`
   - `.htaccess`
   - `robots.txt`
   - `sitemap.xml`
4. Visit `https://anc.com.np` in your browser!

---

## 📧 Step 3: Configure `info@anc.com.np` Email in Hostinger

1. In **Hostinger hPanel**, navigate to **Emails** &rarr; Select `anc.com.np`.
2. Click **Create email account**.
3. Set username to `info` and set a strong password.
4. You can now access your webmail at `https://mail.hostinger.com` or connect it to Gmail/Apple Mail via IMAP/SMTP.

---

## 🇳🇵 Step 4: .np Domain DNS Setup (register.com.np)

For the `.com.np` domain registered at Mercantile (register.com.np):
1. In Hostinger hPanel, locate your **Nameservers** (e.g. `ns1.dns-parking.com` and `ns2.dns-parking.com`, or your assigned Hostinger nameservers).
2. Log into your account at [https://register.com.np](https://register.com.np).
3. Under your domain `anc.com.np`, update the **Primary Name Server** and **Secondary Name Server** with your Hostinger nameservers.
4. DNS propagation usually takes 2 to 24 hours.

---

## 🧰 ANC Tools (`tools.anc.com.np`)

This repo includes the ANC Tools digital shop in the `tools/` folder. Live URL: **https://tools.anc.com.np**

In Hostinger, create subdomain `tools` on `anc.com.np`, set document root to `public_html/tools`, and issue SSL.

See `tools/README.md` for local preview commands.

---

## 🛠️ Tech Stack & Features

- **Frontend**: HTML5, Tailwind CSS, Modern Vanilla ES6+ JavaScript
- **Performance**: Zero-bundle static files, Gzip & Cache-Control optimized via `.htaccess`
- **Design Tokens**: Deep dark mode (`#070b14`), electric cyan (`#06b6d4`), responsive layout
- **Interactive Modules**:
  - Live Canvas Constellation Node Network
  - Dynamic Project Scope & Timeline Estimator
  - Service Category Filter
  - Direct Consultation Modal & Validation
  - 1-Click Email Copy Helper
  - FAQ Accordion
  - IntersectionObserver Animated Stat Counters
