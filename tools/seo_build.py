#!/usr/bin/env python3
"""Write crawlable product/category HTML + sitemap for ANC Tools SEO."""
from __future__ import annotations

import json
import re
from datetime import date
from html import escape
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
SITE = "https://tools.anc.com.np/"
TODAY = date.today().isoformat()
PAGES = [
    ("how", "How it works", "How to buy digital subscriptions in Nepal from ANC Tools. Browse, get a WhatsApp NPR quote, pay with Khalti or eSewa, then receive access."),
    ("about", "About us", "ANC Tools is the digital subscriptions shop of Aseem and Consulting Pvt Ltd in Kushma, Gandaki, Nepal. Owned by Aseem Subedi."),
    ("delivery", "Delivery time", "Most ANC Tools digital orders in Nepal go out the same day after WhatsApp payment is confirmed. Kathmandu, Pokhara, Kushma, nationwide."),
    ("privacy", "Privacy policy", "ANC Tools privacy policy: we only use WhatsApp and email details to quote and fulfil orders in Nepal."),
    ("refund", "Refund policy", "ANC Tools refund policy for digital subscriptions quoted and agreed on WhatsApp in Nepal."),
    ("terms", "Terms of use", "Terms of use for ANC Tools — digital subscriptions sold by Aseem and Consulting Pvt Ltd in Nepal."),
    ("payment", "Payment", "Pay ANC Tools in Nepal with Khalti, eSewa, connectIPS, mobile banking, Visa, or Mastercard."),
    ("contact", "Contact us", "Contact ANC Tools in Kushma, Nepal on WhatsApp +977 9802840041 or info@anc.com.np. English and Nepali."),
    ("partnership", "Partnership", "Reseller, campus, and bulk digital licences in Nepal — partner with ANC Tools."),
]


def load_json(path: Path, default):
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def products() -> list[dict]:
    data = load_json(TOOLS / "products.json", [])
    return [p for p in data if isinstance(p, dict) and p.get("slug") and not p.get("hidden")]


def posts() -> list[dict]:
    data = load_json(TOOLS / "posts.json", [])
    if isinstance(data, dict):
        data = data.get("posts") or []
    return [p for p in data if isinstance(p, dict) and p.get("slug")]


def post_image(post: dict) -> str:
    slug = post.get("image") or (post.get("products") or [None])[0] or "chatgpt-plus"
    return f"{SITE}assets/products/{slug}.webp"


def post_faqs(post: dict) -> list[dict]:
    faqs = []
    for section in post.get("sections") or []:
        faqs.extend(section.get("faq") or [])
    return [f for f in faqs if f.get("q") and f.get("a")]


def render_sections(sections) -> str:
    chunks = []
    for section in sections or []:
        if section.get("h2"):
            chunks.append(f"      <h2>{escape(section['h2'])}</h2>")
        for text in section.get("p") or []:
            chunks.append(f"      <p>{escape(text)}</p>")
        if section.get("ul"):
            chunks.append("      <ul>")
            for text in section["ul"]:
                chunks.append(f"        <li>{escape(text)}</li>")
            chunks.append("      </ul>")
        if section.get("ol"):
            chunks.append("      <ol>")
            for text in section["ol"]:
                chunks.append(f"        <li>{escape(text)}</li>")
            chunks.append("      </ol>")
        for faq in section.get("faq") or []:
            chunks.append(f"      <h3>{escape(faq.get('q', ''))}</h3>")
            chunks.append(f"      <p>{escape(faq.get('a', ''))}</p>")
    return "\n".join(chunks)


def categories() -> list[dict]:
    # Keep in sync with catalog.js
    return [
        {"slug": "ai-tools", "name": "AI Tools", "blurb": "Chat, image, video, and coding assistants."},
        {"slug": "academic", "name": "Academic Tools", "blurb": "Writing, citations, and originality checks for study and papers."},
        {"slug": "microsoft", "name": "Microsoft", "blurb": "Windows, Office, Visio, Project, and Microsoft 365."},
        {"slug": "graphics", "name": "Design & Video", "blurb": "Canva, Adobe, Figma, AutoCAD, and video editors."},
        {"slug": "cloud", "name": "Cloud", "blurb": "Email, storage, meetings, hosting, and virtual machines."},
        {"slug": "antivirus", "name": "Antivirus", "blurb": "Device and identity protection suites."},
        {"slug": "vpn", "name": "VPN", "blurb": "Private connections for travel, Wi-Fi, and streaming."},
        {"slug": "learning", "name": "Learning", "blurb": "Courses, languages, and student packs."},
        {"slug": "streaming", "name": "Streaming", "blurb": "Films, series, music, and anime."},
        {"slug": "productivity", "name": "Work tools", "blurb": "PDF, passwords, recovery, and everyday office apps."},
    ]


LAT = 28.2294
LNG = 83.6890
CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Bharatpur", "Kushma"]


def cat_name(slug: str) -> str:
    for c in categories():
        if c["slug"] == slug:
            return c["name"]
    return slug.replace("-", " ").title()


def stock_url(slug: str) -> str:
    av = load_json(TOOLS / "availability.json", {})
    return "https://schema.org/OutOfStock" if av.get(slug) == "out" else "https://schema.org/InStock"


def org_graph() -> dict:
    return {
        "@type": "Organization",
        "@id": f"{SITE}#organization",
        "name": "ANC Tools",
        "legalName": "Aseem and Consulting Pvt Ltd",
        "alternateName": ["ANC Tools Nepal", "Aseem and Consulting Tools"],
        "url": SITE,
        "logo": {
            "@type": "ImageObject",
            "url": f"{SITE}assets/og-image.png",
            "width": 1200,
            "height": 630,
        },
        "image": f"{SITE}assets/og-image.png",
        "email": "info@anc.com.np",
        "telephone": "+977-9802840041",
        "foundingLocation": {
            "@type": "Place",
            "name": "Kushma, Gandaki, Nepal",
        },
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Kushma 05 Parbat",
            "addressLocality": "Kushma",
            "addressRegion": "Gandaki",
            "postalCode": "33400",
            "addressCountry": "NP",
        },
        "geo": {"@type": "GeoCoordinates", "latitude": LAT, "longitude": LNG},
        "areaServed": [
            {"@type": "Country", "name": "Nepal"},
            *[{"@type": "City", "name": city} for city in CITIES],
        ],
        "knowsLanguage": ["en", "ne"],
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "telephone": "+977-9802840041",
            "email": "info@anc.com.np",
            "areaServed": "NP",
            "availableLanguage": ["en", "ne"],
            "url": "https://wa.me/9779802840041",
        },
        "sameAs": [
            "https://anc.com.np/",
            "https://github.com/Aseemsubedi/ancweb",
            "https://wa.me/9779802840041",
        ],
        "parentOrganization": {
            "@type": "Organization",
            "@id": "https://anc.com.np/#organization",
            "name": "Aseem and Consulting Pvt Ltd",
            "url": "https://anc.com.np/",
        },
    }


def seo_block(title: str, description: str, url: str, image: str, page_type: str, extra_graph: list | None = None, og_type: str = "website") -> str:
    desc = re.sub(r"\s+", " ", description).strip()[:320]
    graph = [
        org_graph(),
        {
            "@type": "WebSite",
            "@id": f"{SITE}#website",
            "url": SITE,
            "name": "ANC Tools",
            "alternateName": "ANC Tools Nepal",
            "inLanguage": ["en-NP", "en"],
            "publisher": {"@id": f"{SITE}#organization"},
        },
        {
            "@type": "WebPage",
            "@id": f"{url}#webpage",
            "url": url,
            "name": title,
            "description": desc,
            "isPartOf": {"@id": f"{SITE}#website"},
            "about": {"@id": f"{SITE}#organization"},
            "inLanguage": "en-NP",
            "primaryImageOfPage": {"@type": "ImageObject", "url": image},
        },
    ]
    if extra_graph:
        graph.extend(extra_graph)
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    return f"""  <title>{escape(title)}</title>
  <meta name="title" content="{escape(title)}">
  <meta name="description" content="{escape(desc)}">
  <meta name="author" content="Aseem and Consulting Pvt Ltd">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="googlebot" content="index, follow">
  <link rel="canonical" href="{escape(url)}">
  <link rel="alternate" hreflang="en-NP" href="{escape(url)}">
  <link rel="alternate" hreflang="x-default" href="{escape(url)}">
  <meta name="theme-color" content="#ffffff">
  <meta name="language" content="English">
  <meta name="geo.region" content="NP-P4">
  <meta name="geo.placename" content="Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal">
  <meta name="geo.position" content="{LAT};{LNG}">
  <meta name="ICBM" content="{LAT}, {LNG}">
  <meta property="og:locale" content="en_NP">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(desc)}">
  <meta property="og:url" content="{escape(url)}">
  <meta property="og:type" content="{escape(og_type)}">
  <meta property="og:site_name" content="ANC Tools">
  <meta property="og:image" content="{escape(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{escape(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(desc)}">
  <meta name="twitter:image" content="{escape(image)}">
  <meta name="twitter:image:alt" content="{escape(title)}">
  <script type="application/ld+json" id="seo-jsonld">
{ld}
  </script>"""


def product_title(name: str) -> str:
    return f"Buy {name} in Nepal | Live WhatsApp Rate | ANC Tools"


def product_desc(p: dict) -> str:
    blurb = str(p.get("blurb") or "").strip()
    name = p.get("name") or "this product"
    extra = f" {blurb}" if blurb else ""
    return (
        f"Buy {name} in Nepal from ANC Tools in Kushma.{extra} "
        "Live NPR quote on WhatsApp. Pay with Khalti, eSewa, connectIPS, or bank. "
        "Delivery after payment — Kathmandu, Pokhara, and all Nepal."
    )


def template() -> str:
    raw = (TOOLS / "index.html").read_text(encoding="utf-8")
    if "<!--ANC_SEO-->" not in raw:
        raise SystemExit("index.html is missing <!--ANC_SEO--> marker")
    return raw


def apply_seo(html: str, block: str) -> str:
    return re.sub(
        r"<!--ANC_SEO-->.*?<!--/ANC_SEO-->",
        "<!--ANC_SEO-->\n" + block + "\n  <!--/ANC_SEO-->",
        html,
        count=1,
        flags=re.S,
    )


def write_page(rel: str, html: str) -> None:
    dest = TOOLS / rel / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html, encoding="utf-8")


def prune_dirs(keep: set[str], folder: str) -> None:
    root = TOOLS / folder
    if not root.is_dir():
        return
    for child in root.iterdir():
        if child.is_dir() and child.name not in keep:
            idx = child / "index.html"
            if idx.is_file():
                idx.unlink()
            try:
                child.rmdir()
            except OSError:
                pass


def home_block(items: list[dict]) -> str:
    names = ", ".join(p["name"] for p in items[:6])
    title = "Buy Digital Subscriptions in Nepal | ChatGPT, Canva, VPN | ANC Tools"
    desc = (
        f"Buy {names} and 100+ digital subscriptions in Nepal. "
        "Live NPR quote on WhatsApp from Kushma. Pay Khalti, eSewa, or connectIPS. "
        "Same-day delivery after payment — Kathmandu, Pokhara, and all Nepal."
    )
    extra = [
        {
            "@type": ["OnlineStore", "LocalBusiness"],
            "@id": f"{SITE}#store",
            "name": "ANC Tools",
            "url": SITE,
            "image": f"{SITE}assets/og-image.png",
            "telephone": "+977-9802840041",
            "email": "info@anc.com.np",
            "currenciesAccepted": "NPR",
            "paymentAccepted": "Khalti, eSewa, connectIPS, Mobile banking, Visa, Mastercard",
            "priceRange": "Quoted on WhatsApp",
            "address": org_graph()["address"],
            "geo": {"@type": "GeoCoordinates", "latitude": LAT, "longitude": LNG},
            "areaServed": org_graph()["areaServed"],
            "parentOrganization": {"@id": f"{SITE}#organization"},
        },
        {
            "@type": "ItemList",
            "name": "Digital subscriptions in Nepal",
            "numberOfItems": len(items),
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "url": f"{SITE}p/{p['slug']}/",
                    "name": p["name"],
                }
                for i, p in enumerate(items[:40])
            ],
        },
        {
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "How do I buy digital subscriptions in Nepal from ANC Tools?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Browse the catalog, tap Get a quote, and we send today’s NPR rate on WhatsApp. Pay after you agree. Access usually follows the same day.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Why is the price not on the website?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Rates change. ANC Tools quotes live NPR on WhatsApp so you never pay a stale catalog price.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "Which payment methods work in Nepal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Khalti, eSewa, connectIPS, mobile banking, and cards, confirmed on WhatsApp for each order.",
                    },
                },
            ],
        },
    ]
    return seo_block(title, desc, SITE, f"{SITE}assets/og-image.png", "home", extra)


def product_block(p: dict) -> str:
    url = f"{SITE}p/{p['slug']}/"
    image = f"{SITE}assets/products/{p['slug']}.webp"
    cat = str(p.get("category") or "cloud")
    cname = cat_name(cat)
    extra = [
        {
            "@type": "Product",
            "name": p["name"],
            "description": product_desc(p),
            "image": image,
            "sku": p.get("code") or p["slug"],
            "brand": {"@type": "Brand", "name": p["name"].split()[0]},
            "category": cname,
            "offers": {
                "@type": "Offer",
                "url": url,
                "availability": stock_url(p["slug"]),
                "priceCurrency": "NPR",
                "seller": {"@id": f"{SITE}#organization"},
                "areaServed": {"@type": "Country", "name": "Nepal"},
            },
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": cname, "item": f"{SITE}c/{cat}/"},
                {"@type": "ListItem", "position": 3, "name": p["name"], "item": url},
            ],
        },
        {
            "@type": "HowTo",
            "name": f"How to buy {p['name']} in Nepal",
            "step": [
                {"@type": "HowToStep", "position": 1, "name": "Pick duration", "text": "Choose a plan on the order sheet, or leave Not sure."},
                {"@type": "HowToStep", "position": 2, "name": "Get a quote", "text": "WhatsApp opens with the product, SKU, duration, and quantity."},
                {"@type": "HowToStep", "position": 3, "name": "Pay", "text": "Pay with Khalti, eSewa, connectIPS, or bank after you agree the NPR rate."},
                {"@type": "HowToStep", "position": 4, "name": "Receive access", "text": "We send access details, usually the same day during Nepal working hours."},
            ],
        },
        {
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": f"How do I buy {p['name']} in Nepal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f"Open the {p['name']} page on ANC Tools, pick a duration, tap Get a quote, and we send today’s NPR rate on WhatsApp from Kushma.",
                    },
                },
                {
                    "@type": "Question",
                    "name": f"What does {p['name']} cost in Nepal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "The live NPR rate is quoted on WhatsApp. We do not publish a catalog price because supplier rates change.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "How do I pay?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Khalti, eSewa, connectIPS, mobile banking, or cards — confirmed in the same WhatsApp chat before you pay.",
                    },
                },
                {
                    "@type": "Question",
                    "name": "How fast is delivery in Nepal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Most digital items go out after payment is confirmed, usually the same day during Nepal daytime, to Kathmandu, Pokhara, Kushma, and nationwide.",
                    },
                },
            ],
        },
    ]
    return seo_block(product_title(p["name"]), product_desc(p), url, image, "product", extra, og_type="product")


def category_block(cat: dict, items: list[dict]) -> str:
    url = f"{SITE}c/{cat['slug']}/"
    title = f"Buy {cat['name']} in Nepal | ANC Tools"
    desc = (
        f"Buy {cat['name']} in Nepal from ANC Tools in Kushma. {cat['blurb']} "
        f"{len(items)} products. Live NPR quote on WhatsApp. Pay Khalti, eSewa, or connectIPS."
    )
    extra = [
        {
            "@type": "CollectionPage",
            "name": cat["name"],
            "url": url,
            "description": desc,
        },
        {
            "@type": "ItemList",
            "name": f"{cat['name']} in Nepal",
            "numberOfItems": len(items),
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "url": f"{SITE}p/{p['slug']}/",
                    "name": p["name"],
                }
                for i, p in enumerate(items[:30])
            ],
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": cat["name"], "item": url},
            ],
        },
    ]
    return seo_block(title, desc, url, f"{SITE}assets/og-image.png", "category", extra)


def page_block(slug: str, title: str, desc: str) -> str:
    url = f"{SITE}{slug}/"
    extra = [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": title, "item": url},
            ],
        }
    ]
    return seo_block(f"{title} | ANC Tools", desc, url, f"{SITE}assets/og-image.png", "page", extra)


def blog_index_block(items: list[dict]) -> str:
    url = f"{SITE}blog/"
    title = "How to buy digital subscriptions in Nepal | Guides | ANC Tools"
    desc = (
        "Buy ChatGPT, Claude, Cursor, Lovable, CapCut, Adobe, Microsoft Office, "
        "Google Workspace, Gmail storage, Coursera, Udemy, Netflix, and iCloud in Nepal. "
        "Live NPR quote on WhatsApp from Kushma."
    )
    extra = [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": url},
            ],
        },
        {
            "@type": "ItemList",
            "name": "Buying guides for digital subscriptions in Nepal",
            "numberOfItems": len(items),
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "url": f"{SITE}blog/{p['slug']}/",
                    "name": p.get("h1") or p.get("title"),
                }
                for i, p in enumerate(items)
            ],
        },
    ]
    return seo_block(title, desc, url, f"{SITE}assets/og-image.png", "blog", extra)


def article_block(post: dict) -> str:
    url = f"{SITE}blog/{post['slug']}/"
    title = f"{post.get('title') or post.get('h1')} | ANC Tools"
    desc = post.get("description") or post.get("lede") or title
    image = post_image(post)
    extra = [
        {
            "@type": "Article",
            "@id": f"{url}#article",
            "headline": post.get("h1") or post.get("title"),
            "description": desc,
            "datePublished": post.get("date") or TODAY,
            "dateModified": post.get("date") or TODAY,
            "inLanguage": "en-NP",
            "image": image,
            "author": {"@id": f"{SITE}#organization"},
            "publisher": {"@id": f"{SITE}#organization"},
            "mainEntityOfPage": {"@id": f"{url}#webpage"},
            "about": [{"@type": "Thing", "name": slug.replace("-", " ")} for slug in (post.get("products") or [])],
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{SITE}blog/"},
                {"@type": "ListItem", "position": 3, "name": post.get("h1") or post.get("title"), "item": url},
            ],
        },
    ]
    faqs = post_faqs(post)
    if faqs:
        extra.append(
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": f["q"],
                        "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
                    }
                    for f in faqs
                ],
            }
        )
    return seo_block(title, desc, url, image, "article", extra, og_type="article")


def noscript_wrap(inner: str) -> str:
    return f"""  <noscript>
    <div class="page">
{inner}
    </div>
  </noscript>"""


def noscript_html(items: list[dict], cats: list[dict], guides: list[dict] | None = None) -> str:
    links = "\n".join(f'      <li><a href="p/{p["slug"]}/">{escape(p["name"])}</a></li>' for p in items)
    clinks = "\n".join(f'      <li><a href="c/{c["slug"]}/">{escape(c["name"])}</a></li>' for c in cats)
    plinks = "\n".join(
        f'      <li><a href="blog/{p["slug"]}/">{escape(p.get("h1") or p.get("title") or p["slug"])}</a></li>'
        for p in (guides or [])
    )
    return noscript_wrap(
        f"""      <h1>Buy digital subscriptions in Nepal</h1>
      <p>ANC Tools quotes live NPR rates on WhatsApp from Kushma. Catalog is public; price is in chat.</p>
      <h2>Categories</h2>
      <ul>
{clinks}
      </ul>
      <h2>Products</h2>
      <ul>
{links}
      </ul>
      <h2>Buying guides</h2>
      <ul>
{plinks}
      </ul>"""
    )


def noscript_product(p: dict) -> str:
    return noscript_wrap(
        f"""      <h1>Buy {escape(p["name"])} in Nepal</h1>
      <p>{escape(product_desc(p))}</p>
      <p><a href="./">ANC Tools home</a> · <a href="https://wa.me/9779802840041">Get a quote on WhatsApp</a></p>"""
    )


def noscript_category(cat: dict, items: list[dict]) -> str:
    links = "\n".join(f'      <li><a href="p/{p["slug"]}/">{escape(p["name"])}</a></li>' for p in items)
    return noscript_wrap(
        f"""      <h1>Buy {escape(cat["name"])} in Nepal</h1>
      <p>{escape(cat["blurb"])} Quote the live NPR rate on WhatsApp.</p>
      <ul>
{links}
      </ul>"""
    )


def noscript_page(title: str, desc: str) -> str:
    return noscript_wrap(
        f"""      <h1>{escape(title)}</h1>
      <p>{escape(desc)}</p>
      <p><a href="./">Back to ANC Tools</a></p>"""
    )


def noscript_blog_index(guides: list[dict]) -> str:
    links = "\n".join(
        f'      <li><a href="blog/{p["slug"]}/">{escape(p.get("h1") or p.get("title") or p["slug"])}</a></li>'
        for p in guides
    )
    return noscript_wrap(
        f"""      <h1>How to buy digital subscriptions in Nepal</h1>
      <p>Original buying guides from ANC Tools in Kushma. Live NPR rate on WhatsApp.</p>
      <ul>
{links}
      </ul>"""
    )


def noscript_post(post: dict) -> str:
    body = render_sections(post.get("sections"))
    products = "\n".join(
        f'      <li><a href="p/{slug}/">{escape(slug.replace("-", " "))}</a></li>'
        for slug in (post.get("products") or [])
    )
    return noscript_wrap(
        f"""      <h1>{escape(post.get("h1") or post.get("title") or "")}</h1>
      <p>{escape(post.get("lede") or post.get("description") or "")}</p>
{body}
      <h2>Get a quote</h2>
      <ul>
{products}
      </ul>
      <p><a href="blog/">All guides</a> · <a href="https://wa.me/9779802840041">WhatsApp</a></p>"""
    )


def apply_noscript(html: str, ns: str) -> str:
    if "<!--ANC_NOSCRIPT-->" not in html:
        return html
    return re.sub(
        r"<!--ANC_NOSCRIPT-->.*?<!--/ANC_NOSCRIPT-->",
        "<!--ANC_NOSCRIPT-->\n" + ns + "\n  <!--/ANC_NOSCRIPT-->",
        html,
        count=1,
        flags=re.S,
    )


def write_sitemap(items: list[dict], cats: list[dict], guides: list[dict] | None = None) -> None:
    guides = guides if guides is not None else posts()
    urls = [
        (SITE, "1.0", "daily"),
        (f"{SITE}blog/", "0.7", "weekly"),
    ]
    for slug, *_ in PAGES:
        urls.append((f"{SITE}{slug}/", "0.4", "monthly"))
    for c in cats:
        urls.append((f"{SITE}c/{c['slug']}/", "0.7", "weekly"))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for loc, pri, freq in urls:
        lines += [
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <lastmod>{TODAY}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{pri}</priority>",
            "  </url>",
        ]
    for p in items:
        img = f"{SITE}assets/products/{p['slug']}.webp"
        lines += [
            "  <url>",
            f"    <loc>{SITE}p/{p['slug']}/</loc>",
            f"    <lastmod>{TODAY}</lastmod>",
            "    <changefreq>weekly</changefreq>",
            "    <priority>0.8</priority>",
            "    <image:image>",
            f"      <image:loc>{img}</image:loc>",
            f"      <image:title>Buy {escape(p['name'])} in Nepal</image:title>",
            "    </image:image>",
            "  </url>",
        ]
    for g in guides:
        img = post_image(g)
        headline = g.get("h1") or g.get("title") or g["slug"]
        lines += [
            "  <url>",
            f"    <loc>{SITE}blog/{g['slug']}/</loc>",
            f"    <lastmod>{g.get('date') or TODAY}</lastmod>",
            "    <changefreq>monthly</changefreq>",
            "    <priority>0.65</priority>",
            "    <image:image>",
            f"      <image:loc>{img}</image:loc>",
            f"      <image:title>{escape(headline)}</image:title>",
            "    </image:image>",
            "  </url>",
        ]
    lines.append("</urlset>\n")
    (TOOLS / "sitemap.xml").write_text("\n".join(lines), encoding="utf-8")


def publish_seo(slug: str | None = None) -> None:
    html0 = template()
    items = products()
    cats = categories()
    guides = posts()
    by_cat = {c["slug"]: [p for p in items if p.get("category") == c["slug"]] for c in cats}

    home_html = apply_noscript(apply_seo(html0, home_block(items)), noscript_html(items, cats, guides))
    (TOOLS / "index.html").write_text(home_html, encoding="utf-8")

    if slug:
        p = next((x for x in items if x["slug"] == slug), None)
        if p:
            write_page(
                f"p/{slug}",
                apply_noscript(apply_seo(home_html, product_block(p)), noscript_product(p)),
            )
        write_sitemap(items, cats, guides)
        return

    keep_p = set()
    for p in items:
        write_page(
            f"p/{p['slug']}",
            apply_noscript(apply_seo(home_html, product_block(p)), noscript_product(p)),
        )
        keep_p.add(p["slug"])
    prune_dirs(keep_p, "p")

    keep_c = set()
    for c in cats:
        cat_items = by_cat.get(c["slug"]) or []
        write_page(
            f"c/{c['slug']}",
            apply_noscript(apply_seo(home_html, category_block(c, cat_items)), noscript_category(c, cat_items)),
        )
        keep_c.add(c["slug"])
    prune_dirs(keep_c, "c")

    for page_slug, title, desc in PAGES:
        write_page(
            page_slug,
            apply_noscript(apply_seo(home_html, page_block(page_slug, title, desc)), noscript_page(title, desc)),
        )

    write_page(
        "blog",
        apply_noscript(apply_seo(home_html, blog_index_block(guides)), noscript_blog_index(guides)),
    )
    keep_b = set()
    for g in guides:
        write_page(
            f"blog/{g['slug']}",
            apply_noscript(apply_seo(home_html, article_block(g)), noscript_post(g)),
        )
        keep_b.add(g["slug"])
    prune_dirs(keep_b, "blog")
    write_sitemap(items, cats, guides)


if __name__ == "__main__":
    publish_seo()
    print("seo pages", len(products()), "guides", len(posts()), "sitemap written")
