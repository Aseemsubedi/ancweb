#!/usr/bin/env python3
"""Fill seo_copy.json with unique Nepal product pages (no catalog prices)."""
from __future__ import annotations

import json
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
CITIES = ["Kathmandu", "Lalitpur", "Pokhara", "Bhaktapur", "Bharatpur", "Kushma"]

WHO = {
    "ai-tools": "Students, developers, and agencies",
    "academic": "Campus, plus-two, and research writers",
    "microsoft": "Offices, students, and PC or Mac users",
    "graphics": "Designers, editors, and campus clubs",
    "cloud": "Teams that need mail, storage, or meetings",
    "antivirus": "Households and shops protecting phones and PCs",
    "vpn": "People who need a VPN on travel Wi-Fi or office networks",
    "learning": "Students and working professionals",
    "streaming": "Households that want films, music, or series",
    "productivity": "Freelancers and offices that need writing, PDF, or recovery tools",
}

USE = {
    "ai-tools": "drafts, code help, and image or research work",
    "academic": "assignments, papers, and English or Nepali editing",
    "microsoft": "Office files, Windows licences, and day-to-day PC work",
    "graphics": "social posts, print, and video timelines",
    "cloud": "files, mail, and calls without a USD card on the vendor site",
    "antivirus": "malware, phishing, and device scans",
    "vpn": "a more private connection on WorldLink, Vianet, NTC, or Ncell",
    "learning": "courses and certificates paid in NPR",
    "streaming": "shows and music after a local payment",
    "productivity": "notes, passwords, PDFs, and disk recovery",
}

VENDOR = {
    "ai-tools": "The official vendor bills in foreign currency on an international card",
    "academic": "The publisher checkout expects a dollar card",
    "microsoft": "Microsoft’s own checkout is not eSewa or Khalti",
    "graphics": "Adobe, Canva, Autodesk and similar sites want an international card",
    "cloud": "Google, Microsoft, and Zoom checkouts are not Nepal wallets",
    "antivirus": "Antivirus vendors bill in USD or EUR, not eSewa",
    "vpn": "VPN brands bill in foreign currency",
    "learning": "Coursera, Udemy, and similar bill in USD",
    "streaming": "Netflix and other apps want an international payment method",
    "productivity": "The vendor site does not take eSewa or Khalti",
}


def _n(s: str) -> int:
    return sum(map(ord, s))


def brand(name: str) -> str:
    if name.lower().startswith("microsoft"):
        return "Microsoft"
    if name.lower().startswith("google"):
        return "Google"
    if name.lower().startswith("adobe"):
        return "Adobe"
    if name.lower().startswith("windows"):
        return "Microsoft"
    return name.split()[0]


def related_slugs(p: dict, items: list[dict]) -> list[str]:
    cat = p.get("category")
    out = []
    for x in items:
        if x["slug"] == p["slug"] or x.get("category") != cat:
            continue
        out.append(x["slug"])
        if len(out) >= 4:
            break
    return out


def vpn_copy(p: dict, name: str) -> tuple[str, str]:
    cat = p.get("category")
    if cat == "vpn":
        h2 = f"Using {name} in Nepal"
        p1 = (
            f"{name} is the VPN you are buying. After we send access, it runs on WorldLink, Vianet, Subisu, "
            "NTC, and Ncell. You do not need a second VPN to message ANC Tools or to pay eSewa or Khalti."
        )
        return h2, p1
    if cat == "streaming":
        h2 = f"Will {name} work on Nepal ISPs?"
        p1 = (
            f"After access is delivered, {name} is used in a browser or app on WorldLink, Vianet, NTC, and Ncell. "
            "Some catalogues are geo-locked. We say so in WhatsApp before you pay. You do not need a VPN to pay ANC Tools."
        )
        return h2, p1
    if cat == "microsoft":
        h2 = f"Mac or Windows for {name}"
        p1 = (
            f"Tell us the machine in WhatsApp: Windows 10, Windows 11, or Mac, and whether you need Home or Pro if that applies. "
            f"{name} is quoted for the SKU you actually need. You do not need a VPN to pay eSewa or Khalti."
        )
        return h2, p1
    h2 = f"Does {name} need a VPN in Nepal?"
    p1 = (
        f"Most people in Nepal use {name} on WorldLink, Vianet, Subisu, NTC, and Ncell after access is delivered. "
        "If a feature is blocked on your ISP, say so in WhatsApp before you pay. You do not need a VPN to send us eSewa or Khalti."
    )
    return h2, p1


def unique_block(p: dict, items: list[dict]) -> dict:
    name = p["name"]
    slug = p["slug"]
    cat = str(p.get("category") or "productivity")
    blurb = (p.get("blurb") or name).rstrip(".")
    city_a = CITIES[_n(slug) % len(CITIES)]
    city_b = CITIES[(_n(slug) + 3) % len(CITIES)]
    who = WHO.get(cat, "People across Nepal")
    use = USE.get(cat, "everyday paid software")
    vendor = VENDOR.get(cat, "The official site bills in foreign currency")
    b = brand(name)
    v_h2, v_p = vpn_copy(p, name)

    openers = [
        f"{name} is {blurb[0].lower() + blurb[1:] if blurb and blurb[0].isupper() else blurb}. {who} in {city_a} and {city_b} use it for {use}.",
        f"In Nepal, {name} is the paid plan people look for when they need {blurb[0].lower() + blurb[1:] if len(blurb) > 8 else blurb}. {who} in {city_a} keep it next to their other tools.",
        f"{blurb}. That is what {name} is for. {who} in {city_a}, {city_b}, and the rest of Nepal buy access through a local shop instead of a dollar card.",
    ]
    opener = openers[_n(slug) % 3]
    if opener[0].islower():
        opener = opener[0].upper() + opener[1:]

    return {
        "related": related_slugs(p, items),
        "sections": [
            {
                "h2": f"What {name} is for people in Nepal",
                "p": [
                    opener,
                    f"You still sign in on {b}’s own site or app. ANC Tools is the Nepal shop of Aseem and Consulting Pvt Ltd in Kushma: we quote {name} in NPR on WhatsApp after you tap Get a quote, you pay with eSewa, Khalti, or connectIPS, then we send the access details.",
                ],
            },
            {
                "h2": f"{name} price in Nepal (why it is not on this page)",
                "p": [
                    f"{vendor}. eSewa and Khalti do not complete that checkout. A rupee number printed here goes stale when the supplier moves.",
                    f"ANC Tools quotes the live NPR rate for {name} in WhatsApp from Kushma, with duration and quantity on the order sheet. The amount you pay is the one in that chat, not a figure copied from another Nepal website.",
                ],
            },
            {
                "h2": f"How to buy {name} with eSewa or Khalti",
                "ol": [
                    f"Open this {name} page, pick a duration (or Not sure) and quantity.",
                    f"Tap Get a quote. WhatsApp opens with {name} already filled in.",
                    "We reply with today’s NPR rate, how you can pay, and when access usually goes out.",
                    "Pay only after you agree. Most orders leave the same Nepal working day.",
                ],
            },
            {
                "h2": v_h2,
                "p": [v_p],
            },
        ],
        "faq": [
            {
                "q": f"Can I buy {name} in Nepal without a dollar card?",
                "a": f"Yes. ANC Tools quotes {name} in NPR on WhatsApp. You pay eSewa, Khalti, connectIPS, mobile banking, or card after you agree.",
            },
            {
                "q": f"Is this the official {b} website?",
                "a": f"No. {b}’s own site is official. ANC Tools is the Nepal digital subscriptions shop of Aseem and Consulting Pvt Ltd in Kushma. We quote {name} in NPR and deliver after payment.",
            },
        ],
    }


def expand() -> dict:
    items = [p for p in json.loads((TOOLS / "products.json").read_text(encoding="utf-8")) if p.get("slug") and not p.get("hidden")]
    copy = json.loads((TOOLS / "seo_copy.json").read_text(encoding="utf-8"))
    products = dict(copy.get("products") or {})
    for p in items:
        slug = p["slug"]
        existing = products.get(slug) or {}
        generated = unique_block(p, items)
        if existing.get("sections"):
            if not existing.get("related"):
                existing["related"] = generated["related"]
            if not existing.get("faq"):
                existing["faq"] = generated["faq"]
            products[slug] = existing
        else:
            products[slug] = generated
    copy["products"] = products
    copy["updated"] = "2026-09-19"
    (TOOLS / "seo_copy.json").write_text(json.dumps(copy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return copy


if __name__ == "__main__":
    data = expand()
    print("product seo pages", len(data.get("products") or {}))
