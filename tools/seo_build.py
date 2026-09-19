#!/usr/bin/env python3
"""Write crawlable product/category HTML + sitemap for ANC Tools SEO."""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta, timezone
from html import escape
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
SITE = "https://tools.anc.com.np/"
TODAY = date.today().isoformat()
NPT = timezone(timedelta(hours=5, minutes=45))
MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
PAGES = [
    ("how", "How it works", "How to buy digital subscriptions in Nepal from ANC Tools. Browse, get a WhatsApp NPR quote, pay with Khalti or eSewa, then receive access."),
    ("about", "About ANC Tools", "ANC Tools is the digital subscriptions shop of Aseem and Consulting Pvt Ltd in Kushma, Nepal. Live NPR quotes on WhatsApp. Pay Khalti, eSewa, or connectIPS. Same-day digital delivery nationwide."),
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


def seo_block(title: str, description: str, url: str, image: str, page_type: str, extra_graph: list | None = None, og_type: str = "website", published: str | None = None, modified: str | None = None) -> str:
    desc = re.sub(r"\s+", " ", description).strip()[:320]
    reviewed = modified or published or content_reviewed()
    webpage = {
        "@type": "WebPage",
        "@id": f"{url}#webpage",
        "url": url,
        "name": title,
        "description": desc,
        "isPartOf": {"@id": f"{SITE}#website"},
        "about": {"@id": f"{SITE}#organization"},
        "inLanguage": "en-NP",
        "primaryImageOfPage": {"@type": "ImageObject", "url": image},
        "dateModified": iso_modified(published, reviewed),
    }
    if published:
        webpage["datePublished"] = iso_nepal(published, 10)
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
        webpage,
    ]
    if extra_graph:
        graph.extend(extra_graph)
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    article_meta = ""
    if og_type == "article" and published:
        article_meta = f"""
  <meta property="article:published_time" content="{iso_nepal(published, 10)}">
  <meta property="article:modified_time" content="{iso_modified(published, reviewed)}">"""
    return f"""  <title>{escape(title)}</title>
  <meta name="title" content="{escape(title)}">
  <meta name="description" content="{escape(desc)}">
  <meta name="author" content="Aseem and Consulting Pvt Ltd">
  <meta name="generator" content="ANC Tools 2026-09-19c">
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
  <meta property="og:image:alt" content="{escape(title)}">{article_meta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(desc)}">
  <meta name="twitter:image" content="{escape(image)}">
  <meta name="twitter:image:alt" content="{escape(title)}">
  <script type="application/ld+json" id="seo-jsonld">
{ld}
  </script>"""


def seo_copy() -> dict:
    data = load_json(TOOLS / "seo_copy.json", {})
    return data if isinstance(data, dict) else {}


def content_reviewed() -> str:
    """Calendar date of the last real copy pass — not date.today() on every build."""
    return str(seo_copy().get("updated") or TODAY)


def iso_nepal(day: str, hour: int = 10) -> str:
    y, m, d = (int(x) for x in day.split("-"))
    return datetime(y, m, d, hour, 0, 0, tzinfo=NPT).isoformat()


def iso_modified(published: str | None, modified: str | None) -> str:
    day = modified or published or content_reviewed()
    hour = 10 if published and day == published else 11
    return iso_nepal(day, hour)


def display_date(day: str) -> str:
    y, m, d = (int(x) for x in day.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def post_published(post: dict) -> str:
    return str(post.get("date") or content_reviewed())


def post_modified(post: dict) -> str:
    return str(post.get("updated") or post.get("date") or content_reviewed())


def time_tag(day: str, hour: int = 10) -> str:
    return f'<time datetime="{iso_nepal(day, hour)}">{escape(display_date(day))}</time>'


def product_reviewed_html() -> str:
    day = content_reviewed()
    return (
        f'<p class="page-dates">Last reviewed <time datetime="{iso_nepal(day, 11)}">'
        f"{escape(display_date(day))}</time> (Nepal).</p>"
    )


def article_byline_html(post: dict) -> str:
    pub = post_published(post)
    mod = post_modified(post)
    bits = [f"Published {time_tag(pub, 10)}"]
    if mod != pub:
        bits.append(f"updated {time_tag(mod, 11)}")
    return f'<p class="page-dates">{" · ".join(bits)} · Kushma, Nepal</p>'


def featured_products(items: list[dict]) -> list[dict]:
    by = {p["slug"]: p for p in items}
    slugs = seo_copy().get("featured") or []
    out = [by[s] for s in slugs if s in by]
    if len(out) < 6:
        for p in items:
            if p not in out:
                out.append(p)
            if len(out) >= 6:
                break
    return out[:6]


def similar_for(p: dict, items: list[dict]) -> list[dict]:
    extra = ((seo_copy().get("products") or {}).get(p["slug"]) or {}).get("related") or []
    by = {x["slug"]: x for x in items}
    out = [by[s] for s in extra if s in by and s != p["slug"]]
    cat = p.get("category")
    for x in items:
        if x["slug"] == p["slug"] or x in out:
            continue
        if x.get("category") == cat:
            out.append(x)
        if len(out) >= 4:
            break
    return out[:4]


def product_article(p: dict) -> list[dict]:
    block = (seo_copy().get("products") or {}).get(p.get("slug") or "") or {}
    sections = list(block.get("sections") or [])
    name = p.get("name") or "this product"
    if not sections:
        sections = [
            {
                "h2": f"Buy {name} in Nepal",
                "p": [
                    f"{p.get('blurb') or name} ANC Tools in Kushma quotes {name} on WhatsApp in NPR for Kathmandu, Pokhara, and all Nepal.",
                    "Pay with eSewa, Khalti, connectIPS, mobile banking, or card after you agree. Access is digital.",
                ],
            },
            {
                "h2": f"{name} price in Nepal",
                "p": [
                    f"We do not publish a catalog rupee price for {name}. Official vendors bill in foreign currency; eSewa and Khalti do not complete those checkouts. The live NPR rate is the WhatsApp quote for the duration you pick. Last editorial update {TODAY}.",
                ],
            },
        ]
    return sections


def default_product_faqs(p: dict) -> list[dict]:
    name = p.get("name") or "this product"
    faqs = [
        {
            "q": f"How do I buy {name} in Nepal?",
            "a": f"Open the {name} page on ANC Tools, pick a duration, tap Get a quote, and we send today’s NPR rate on WhatsApp from Kushma.",
        },
        {
            "q": f"What does {name} cost in Nepal?",
            "a": f"The live NPR rate for {name} is quoted on WhatsApp. We do not print a catalog price because supplier rates change. You pay the figure in that chat.",
        },
        {
            "q": f"Can I pay for {name} with eSewa or Khalti?",
            "a": "Yes. After you agree the WhatsApp quote, pay eSewa, Khalti, connectIPS, mobile banking, or card — confirmed in the same chat.",
        },
        {
            "q": "Do I need a VPN to buy from ANC Tools?",
            "a": "No. You do not need a VPN to WhatsApp us or to pay eSewa or Khalti. If the product itself needs a VPN on your ISP, we say so in chat before you pay.",
        },
        {
            "q": "Will this work on WorldLink, Vianet, NTC, or Ncell?",
            "a": "Most subscriptions run on those Nepal ISPs after access is delivered. If a title is geo-locked, we tell you in the quote thread.",
        },
        {
            "q": "How fast is delivery in Nepal?",
            "a": "Most digital items go out after payment, usually the same day during Nepal daytime, to Kathmandu, Pokhara, Kushma, and nationwide.",
        },
        {
            "q": "Who runs ANC Tools?",
            "a": "ANC Tools is the shop of Aseem and Consulting Pvt Ltd, Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal.",
        },
    ]
    extra = ((seo_copy().get("products") or {}).get(p.get("slug") or "") or {}).get("faq") or []
    return faqs + [f for f in extra if isinstance(f, dict) and f.get("q")]


def render_article_html(sections: list[dict]) -> str:
    return render_sections(sections)


def product_title(name: str) -> str:
    return f"Buy {name} in Nepal — eSewa, Khalti | ANC Tools"


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
    names = ", ".join(p["name"] for p in featured_products(items))
    copy = seo_copy()
    title = copy.get("homeTitle") or "Buy ChatGPT, Canva, Adobe & VPN in Nepal | eSewa, Khalti | ANC Tools"
    desc = copy.get("homeDescription") or (
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
    return seo_block(title, desc, SITE, f"{SITE}assets/og-image.png", "home", extra, modified=content_reviewed())


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
                    "name": f["q"],
                    "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
                }
                for f in default_product_faqs(p)
            ],
        },
    ]
    return seo_block(
        product_title(p["name"]),
        product_desc(p),
        url,
        image,
        "product",
        extra,
        og_type="product",
        modified=content_reviewed(),
    )


def category_block(cat: dict, items: list[dict]) -> str:
    url = f"{SITE}c/{cat['slug']}/"
    intro = (seo_copy().get("categories") or {}).get(cat["slug"]) or cat["blurb"]
    title = f"Buy {cat['name']} in Nepal | eSewa, Khalti | ANC Tools"
    desc = (
        f"{intro} {len(items)} products. Live NPR quote on WhatsApp. "
        "Pay Khalti, eSewa, or connectIPS."
    )[:320]
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
    return seo_block(title, desc, url, f"{SITE}assets/og-image.png", "category", extra, modified=content_reviewed())


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
    return seo_block(f"{title} | ANC Tools", desc, url, f"{SITE}assets/og-image.png", "page", extra, modified=content_reviewed())


ABOUT_FAQS = [
    {
        "q": "What is ANC Tools?",
        "a": "ANC Tools is a digital subscriptions shop in Nepal. We list AI, Microsoft, design, VPN, antivirus, cloud, learning, and streaming products, then quote today’s NPR rate on WhatsApp.",
    },
    {
        "q": "Who owns ANC Tools?",
        "a": "Aseem and Consulting Pvt Ltd. The office is in Kushma, Gandaki, Nepal.",
    },
    {
        "q": "Where is ANC Tools based?",
        "a": "Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal. We serve Kathmandu, Pokhara, Bharatpur, and all Nepal with digital delivery.",
    },
    {
        "q": "How do I buy a subscription in Nepal from ANC Tools?",
        "a": "Open the product page, tap Get a quote, and finish on WhatsApp. Pay only after you agree the rate. Access usually follows the same day.",
    },
    {
        "q": "Do you show prices on the website?",
        "a": "No. A public NPR list goes stale when supplier rates change. The price you pay is the one we send in chat that day.",
    },
    {
        "q": "How can I contact ANC Tools?",
        "a": "WhatsApp +977 9802840041 is fastest. Email info@anc.com.np. We reply in English and Nepali during Nepal daytime.",
    },
]


def about_block() -> str:
    url = f"{SITE}about/"
    title = "About ANC Tools | Digital Subscriptions in Nepal"
    desc = (
        "ANC Tools is the digital subscriptions shop of Aseem and Consulting Pvt Ltd in Kushma, Nepal. "
        "Live NPR quotes on WhatsApp. Pay Khalti, eSewa, or connectIPS. Same-day digital delivery nationwide."
    )
    extra = [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": "About us", "item": url},
            ],
        },
        {
            "@type": "AboutPage",
            "@id": f"{url}#aboutpage",
            "url": url,
            "name": title,
            "description": desc,
            "isPartOf": {"@id": f"{SITE}#website"},
            "mainEntity": {"@id": f"{SITE}#organization"},
            "inLanguage": "en-NP",
        },
        {
            "@type": "FAQPage",
            "@id": f"{url}#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": f["q"],
                    "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
                }
                for f in ABOUT_FAQS
            ],
        },
    ]
    return seo_block(title, desc, url, f"{SITE}assets/og-image.png", "about", extra, modified=content_reviewed())


def noscript_about() -> str:
    faqs = "\n".join(
        f"      <h3>{escape(f['q'])}</h3>\n      <p>{escape(f['a'])}</p>" for f in ABOUT_FAQS
    )
    cats = "\n".join(
        f'      <li><a href="c/{c["slug"]}/">{escape(c["name"])}</a> — {escape(c["blurb"])}</li>'
        for c in categories()
    )
    return noscript_wrap(
        f"""      <h1>About ANC Tools</h1>
      <p>ANC Tools is an online shop for genuine digital subscriptions in Nepal. We quote today’s NPR rate on WhatsApp, you pay after you agree, then we send access — usually the same day.</p>
      <h2>Who we are</h2>
      <p>ANC Tools is the digital subscriptions shop of Aseem and Consulting Pvt Ltd (company registration 326626, PAN 620866943). The office is Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal. Parent site: <a href="https://anc.com.np/">anc.com.np</a>.</p>
      <p>People in Kathmandu, Lalitpur, Bhaktapur, Pokhara, Bharatpur, Kushma, and across Nepal use us for AI tools, Microsoft, Canva, Adobe, VPN, antivirus, cloud, learning, and streaming. The catalog is public. The live NPR price is not — supplier rates move, so we quote in chat.</p>
      <h2>How we sell</h2>
      <p>There is no cart and no login. You pick a product, tap Get a quote, and WhatsApp opens with the order sheet. We reply with today’s rate, payment options, and delivery time. You pay only after both sides agree. Access details follow after payment is confirmed.</p>
      <h2>Our contact details</h2>
      <ul>
        <li>Address: Kushma 05 Parbat, Kushma, Gandaki 33400, Nepal</li>
        <li>Phone / WhatsApp: <a href="https://wa.me/9779802840041">+977 9802840041</a></li>
        <li>Email: <a href="mailto:info@anc.com.np">info@anc.com.np</a></li>
        <li>Website: <a href="./">tools.anc.com.np</a></li>
      </ul>
      <h2>What we sell</h2>
      <ul>
{cats}
      </ul>
      <h2>FAQ</h2>
{faqs}
      <p><a href="./">Back to ANC Tools</a></p>"""
    )


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
    return seo_block(title, desc, url, f"{SITE}assets/og-image.png", "blog", extra, modified=content_reviewed())


def article_block(post: dict) -> str:
    url = f"{SITE}blog/{post['slug']}/"
    title = f"{post.get('title') or post.get('h1')} | ANC Tools"
    desc = post.get("description") or post.get("lede") or title
    image = post_image(post)
    pub = post_published(post)
    mod = post_modified(post)
    extra = [
        {
            "@type": "BlogPosting",
            "@id": f"{url}#article",
            "headline": post.get("h1") or post.get("title"),
            "description": desc,
            "datePublished": iso_nepal(pub, 10),
            "dateModified": iso_modified(pub, mod),
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
    return seo_block(
        title,
        desc,
        url,
        image,
        "article",
        extra,
        og_type="article",
        published=pub,
        modified=mod,
    )


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
      <h2>Why buy from ANC Tools</h2>
      <ul>
        <li>Shop of Aseem and Consulting Pvt Ltd, Kushma 05 Parbat, Gandaki 33400 (Reg. 326626, PAN 620866943).</li>
        <li>Quote on WhatsApp, pay after you agree — eSewa, Khalti, or connectIPS.</li>
        <li>Same-day digital delivery to Kathmandu, Pokhara, and all Nepal.</li>
      </ul>
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


def noscript_product(p: dict, items: list[dict] | None = None) -> str:
    items = items or products()
    cat = str(p.get("category") or "")
    cname = cat_name(cat)
    article = render_article_html(product_article(p))
    faqs = default_product_faqs(p)
    faq_html = "\n".join(f"      <h3>{escape(f['q'])}</h3>\n      <p>{escape(f['a'])}</p>" for f in faqs)
    related = similar_for(p, items)
    rel = "\n".join(f'      <li><a href="p/{x["slug"]}/">{escape(x["name"])}</a></li>' for x in related)
    guide = next((g for g in posts() if p["slug"] in (g.get("products") or [])), None)
    guide_line = (
        f'      <p>Buying guide: <a href="blog/{guide["slug"]}/">{escape(guide.get("h1") or guide.get("title") or "Guide")}</a></p>'
        if guide
        else ""
    )
    return noscript_wrap(
        f"""      <nav class="crumbs"><a href="./">Home</a> / <a href="c/{escape(cat)}/">{escape(cname)}</a> / {escape(p["name"])}</nav>
      <h1>Buy {escape(p["name"])} in Nepal</h1>
      {product_reviewed_html()}
      <p>{escape(product_desc(p))}</p>
{guide_line}
      <p><a href="https://wa.me/9779802840041">Get a quote on WhatsApp</a></p>
{article}
      <h2>FAQ</h2>
{faq_html}
      <h2>Similar products</h2>
      <ul>
{rel}
      </ul>"""
    )


def noscript_category(cat: dict, items: list[dict]) -> str:
    intro = (seo_copy().get("categories") or {}).get(cat["slug"]) or cat["blurb"]
    links = "\n".join(f'      <li><a href="p/{p["slug"]}/">{escape(p["name"])}</a></li>' for p in items)
    return noscript_wrap(
        f"""      <nav class="crumbs"><a href="./">Home</a> / {escape(cat["name"])}</nav>
      <h1>Buy {escape(cat["name"])} in Nepal</h1>
      <p>{escape(intro)}</p>
      <ul>
{links}
      </ul>
      <p><a href="https://wa.me/9779802840041">Quote this category on WhatsApp</a></p>"""
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
      {article_byline_html(post)}
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
        pri, freq = ("0.6", "weekly") if slug == "about" else ("0.4", "monthly")
        urls.append((f"{SITE}{slug}/", pri, freq))
    for c in cats:
        urls.append((f"{SITE}c/{c['slug']}/", "0.7", "weekly"))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    reviewed = content_reviewed()
    for loc, pri, freq in urls:
        lines += [
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <lastmod>{reviewed}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{pri}</priority>",
            "  </url>",
        ]
    for p in items:
        img = f"{SITE}assets/products/{p['slug']}.webp"
        lines += [
            "  <url>",
            f"    <loc>{SITE}p/{p['slug']}/</loc>",
            f"    <lastmod>{reviewed}</lastmod>",
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
            f"    <lastmod>{post_modified(g)}</lastmod>",
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
                apply_noscript(apply_seo(home_html, product_block(p)), noscript_product(p, items)),
            )
        write_sitemap(items, cats, guides)
        return

    keep_p = set()
    for p in items:
        write_page(
            f"p/{p['slug']}",
            apply_noscript(apply_seo(home_html, product_block(p)), noscript_product(p, items)),
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
        if page_slug == "about":
            about_html = apply_noscript(apply_seo(home_html, about_block()), noscript_about())
            write_page("about", about_html)
            write_page("about-us", about_html)
            continue
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
