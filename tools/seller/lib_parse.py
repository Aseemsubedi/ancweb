"""Parse competitor product pages for the seller desk.

Toolsmandu: headline = cheapest in-stock variation (plan name under NPR).
Keyshop Nepal: headline = first plan in their dropdown (the default listed SKU).
Cheapmandu / Keysewa: headline = in-stock 1-month private/individual; skip
trial, edu, and team when a private plan exists. Related HTML is ignored.
"""
from __future__ import annotations

import json
import re
from html import unescape
from typing import Any
from urllib.parse import urlparse

MONTH_RE = re.compile(r"1\s*-?\s*month|monthly", re.I)
YEAR_RE = re.compile(r"1\s*-?\s*year|12\s*-?\s*month|annual", re.I)
PRIVATE_RE = re.compile(r"private|individual|personal|single|\(pro\)|professional", re.I)
SHARE_RE = re.compile(r"share|shared|team|\bedu\b|student", re.I)
TRIAL_RE = re.compile(r"trial|7\s*-?\s*days?|1\s*-?\s*week|\bdemo\b|\bsample\b", re.I)


def _is_share(label: str) -> bool:
    return bool(SHARE_RE.search(label or ""))


def _is_private(label: str) -> bool:
    if _is_share(label):
        return False
    return bool(PRIVATE_RE.search(label or ""))


def _is_trial(label: str) -> bool:
    return bool(TRIAL_RE.search(label or ""))


def _pretty_label(raw: str) -> str:
    s = unescape(raw or "").strip()
    s = re.sub(r"\s*[—–-]\s*Rs\.?.*$", "", s, flags=re.I).strip()
    if s and " " not in s and "-" in s:
        s = s.replace("-", " ")
    return re.sub(r"\s+", " ", s).strip()


def pick_woo_plan(plans: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str, str | None]:
    """Cheapmandu/Keysewa: in-stock 1-month private, not trial/edu/team junk."""
    usable = [p for p in plans if _ok_price(float(p.get("price") or 0))]
    if not usable:
        return None, "unknown", None
    live = [p for p in usable if p.get("stock") != "out"]
    pool = live or usable

    def lab(p: dict) -> str:
        return str(p.get("label") or "")

    no_trial = [p for p in pool if not _is_trial(lab(p))] or pool
    non_share = [p for p in no_trial if not _is_share(lab(p))]
    base = non_share or no_trial
    month_priv = [p for p in base if MONTH_RE.search(lab(p)) and _is_private(lab(p))]
    month = [p for p in base if MONTH_RE.search(lab(p))]
    priv = [p for p in base if _is_private(lab(p))]
    if month_priv:
        chosen = min(month_priv, key=lambda p: _npr(p["price"]))
    elif month:
        chosen = min(month, key=lambda p: _npr(p["price"]))
    elif priv:
        chosen = min(priv, key=lambda p: _npr(p["price"]))
    else:
        chosen = min(base, key=lambda p: _npr(p["price"]))
    stock = "in" if live else "out"
    note = _other_plans_note(chosen, live or usable)
    return chosen, stock, note


def _plan_labels(plans: list[dict[str, Any]] | None, chosen: dict[str, Any] | None = None) -> list[str]:
    out: list[str] = []

    def add(raw: str | None) -> None:
        lab = (raw or "").strip()
        if lab and lab not in out:
            out.append(lab)

    live = [p for p in (plans or []) if p.get("stock") != "out"]
    pool = live or list(plans or [])
    if chosen:
        add(str(chosen.get("label") or ""))
    for p in pool:
        add(str(p.get("label") or ""))
    return out


def _npr(n: int | float) -> int:
    return int(round(float(n)))


def _ok_price(n: float) -> bool:
    return 50 <= n <= 400000


def _json_ld_products(html: str) -> list[dict]:
    found: list[dict] = []
    for block in re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        stack = [data]
        while stack:
            cur = stack.pop()
            if isinstance(cur, dict):
                types = cur.get("@type")
                types = [types] if isinstance(types, str) else (types or [])
                if "Product" in types:
                    found.append(cur)
                stack.extend(cur.values())
            elif isinstance(cur, list):
                stack.extend(cur)
    return found


def _offer_price_stock(product: dict) -> tuple[int | None, str]:
    offer = product.get("offers")
    if isinstance(offer, list) and offer:
        offer = offer[0]
    if not isinstance(offer, dict):
        return None, "unknown"
    raw = offer.get("price")
    if raw is None:
        spec = offer.get("priceSpecification")
        if isinstance(spec, list) and spec and isinstance(spec[0], dict):
            raw = spec[0].get("price")
        elif isinstance(spec, dict):
            raw = spec.get("price")
    price = None
    try:
        if raw is not None:
            price = _npr(str(raw).replace(",", ""))
            if not _ok_price(price):
                price = None
    except (TypeError, ValueError):
        price = None
    avail = str(offer.get("availability") or "")
    stock = "out" if "OutOfStock" in avail else ("in" if "InStock" in avail else "unknown")
    return price, stock


VAR_RE = re.compile(
    r'\{id:"[^"]+",name:"((?:\\.|[^"\\])*)",price:(\d+),'
    r"original_price:(\d+|null),expiry_days:(\d+|null),stock_status:\"([^\"]+)\"",
)


def _tm_variations(html: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for m in VAR_RE.finditer(html):
        name = unescape(m.group(1).replace(r"\"", '"')).strip()
        n = int(m.group(2))
        if not name or not _ok_price(n):
            continue
        out.append(
            {
                "label": name,
                "price": n,
                "stock": "in" if m.group(5) == "in_stock" else "out",
            }
        )
    return out


def _tm_product_fallback(html: str, url: str) -> tuple[int | None, str]:
    slug = urlparse(url).path.rstrip("/").split("/")[-1]
    if not slug:
        return None, "unknown"
    m = re.search(
        rf'slug:"{re.escape(slug)}".{{0,100000}}?,price:(\d+),compare_price:',
        html,
        re.S,
    )
    if not m:
        return None, "unknown"
    n = int(m.group(1))
    sm = re.search(
        rf'slug:"{re.escape(slug)}".{{0,100000}}?stock_status:"([^"]+)"',
        html,
        re.S,
    )
    stock = "in" if sm and sm.group(1) == "in_stock" else "out"
    if _tm_plan_box_oos(html):
        stock = "out"
    return (n if _ok_price(n) else None), stock


def _tm_plan_box_oos(html: str) -> bool:
    start = html.find("Select a Plan")
    box = html[start : start + 8000] if start >= 0 else html[:8000]
    return bool(re.search(r">Out of Stock</button>", box))


def _tm_plan_label(html: str) -> str | None:
    start = html.find("Select a Plan")
    box = html[start : start + 4000] if start >= 0 else ""
    m = re.search(r'<div class="font-semibold text-sm">([^<]+)</div>', box)
    if not m:
        return None
    label = unescape(m.group(1)).strip()
    return label or None


def _other_plans_note(chosen: dict[str, Any], plans: list[dict[str, Any]]) -> str | None:
    """Year and share/team — the options sellers actually quote against."""
    others = [
        p
        for p in plans
        if not (p.get("label") == chosen.get("label") and _npr(p["price"]) == _npr(chosen["price"]))
        and p.get("stock") != "out"
    ]
    if not others:
        return None
    picks: list[dict[str, Any]] = []

    def add(p: dict[str, Any] | None) -> None:
        if p and p not in picks:
            picks.append(p)

    def lab(p: dict) -> str:
        return str(p.get("label") or "")

    years = [p for p in others if YEAR_RE.search(lab(p))]
    if years:
        add(min(years, key=lambda p: _npr(p["price"])))
    shares = [p for p in others if _is_share(lab(p))]
    if shares:
        add(min(shares, key=lambda p: _npr(p["price"])))
    if not picks:
        mid = [p for p in others if re.search(r"3\s*-?\s*month|6\s*-?\s*month", lab(p), re.I)]
        add(min(mid, key=lambda p: _npr(p["price"])) if mid else min(others, key=lambda p: _npr(p["price"])))
    bits = [f"{p['label']} ₨{_npr(p['price']):,}" for p in picks[:2]]
    return "Also: " + " · ".join(bits)


def parse_tm(html: str, url: str = "") -> dict[str, Any]:
    """Toolsmandu: catalog price = cheapest in-stock variation. Ignore JSON-LD."""
    plans = _tm_variations(html)
    if not plans:
        # HTML picker (same data, used if JS shape changes)
        start = html.find("Select a Plan")
        box = html[start : start + 14000] if start >= 0 else ""
        rel = re.search(r"Related products|You may also|aria-label=\"Product description\"", box)
        if rel and rel.start() > 200:
            box = box[: rel.start()]
        for chunk in re.split(r'<button type="button"', box)[1:]:
            lm = re.search(r'<div class="font-semibold text-sm">([^<]+)</div>', chunk)
            pm = re.search(r'text-success">NPR[\s\xa0]*([\d,]+)</span>', chunk, re.I)
            if not lm or not pm:
                continue
            label = unescape(lm.group(1)).strip()
            n = _npr(pm.group(1).replace(",", ""))
            if not _ok_price(n) or not label:
                continue
            oos = bool(re.search(r"out of stock|sold\s*out", chunk, re.I))
            plans.append({"label": label, "price": n, "stock": "out" if oos else "in"})
    ui_oos = _tm_plan_box_oos(html)
    if not plans:
        price, stock = _tm_product_fallback(html, url)
        if ui_oos:
            stock = "out"
        if price:
            lab = _tm_plan_label(html)
            return _result(True, price, lab, stock, None, plans=[lab] if lab else None)
        return _result(False, None, None, "out" if ui_oos else stock, None, error="no rate")
    live = [p for p in plans if p.get("stock") != "out"]
    pool = live or plans
    chosen = min(pool, key=lambda p: _npr(p["price"]))
    stock = "in" if live else "out"
    if ui_oos and not live:
        stock = "out"
    note = _other_plans_note(chosen, plans)
    return _result(True, _npr(chosen["price"]), chosen.get("label"), stock, note, plans=_plan_labels(plans, chosen))


def parse_ksn(html: str) -> dict[str, Any]:
    """Keyshop Nepal: listed SKU = first <option data-after> in the plan dropdown."""
    plans: list[dict[str, Any]] = []
    for m in re.finditer(
        r'<option[^>]*value="([^"]*)"[^>]*data-after="([\d.]+)"[^>]*>',
        html,
        re.I,
    ):
        n = _npr(m.group(2))
        label = _pretty_label(m.group(1))
        if _ok_price(n) and label:
            plans.append({"label": label, "price": n, "stock": "in"})
    if not plans:
        for m in re.finditer(
            r'<option[^>]*data-after="([\d.]+)"[^>]*>([\s\S]*?)</option>',
            html,
            re.I,
        ):
            n = _npr(m.group(1))
            label = _pretty_label(re.sub(r"<[^>]+>", "", unescape(m.group(2))))
            if _ok_price(n) and label:
                plans.append({"label": label, "price": n, "stock": "in"})
    if not plans:
        return _result(False, None, None, "unknown", None, error="no rate")
    box = html
    start = html.find("quantity-stock")
    if start >= 0:
        box = html[max(0, start - 500) : start + 2500]
    stock = "out" if re.search(r"out of stock|sold\s*out|(?<!\d)0 items left", box, re.I) else "in"
    chosen = plans[0]
    note = _other_plans_note(chosen, plans)
    return _result(True, _npr(chosen["price"]), chosen.get("label"), stock, note, plans=_plan_labels(plans, chosen))


def _summary_html(html: str) -> str:
    m = re.search(
        r'(?:entry-summary|product-summary|div class="summary)([\s\S]{0,12000})',
        html,
        re.I,
    )
    return m.group(0) if m else html[:20000]


def _woo_attr_labels(html: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for sel in re.finditer(r"<select([^>]*)>([\s\S]*?)</select>", html, re.I):
        attrs = sel.group(1)
        if "attribute" not in attrs.lower():
            continue
        for o in re.finditer(r'<option[^>]*value="([^"]*)"[^>]*>([^<]+)', sel.group(2), re.I):
            val = unescape(o.group(1)).strip()
            text = unescape(o.group(2)).strip()
            if not val or text.lower().startswith("choose"):
                continue
            out[val] = text
    return out


def _woo_variations(html: str) -> list[dict[str, Any]]:
    var_attr = re.search(r'data-product_variations="([^"]*)"', html)
    if not var_attr:
        return []
    try:
        data = json.loads(unescape(var_attr.group(1)))
    except (json.JSONDecodeError, TypeError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    names = _woo_attr_labels(html)
    plans: list[dict[str, Any]] = []
    for plan in data:
        if not isinstance(plan, dict) or plan.get("display_price") is None:
            continue
        n = _npr(plan["display_price"])
        if not _ok_price(n):
            continue
        bits = []
        for v in (plan.get("attributes") or {}).values():
            if not v:
                continue
            bits.append(names.get(str(v), str(v)))
        label = _pretty_label(" ".join(bits))
        instock = plan.get("is_in_stock")
        if instock is None:
            instock = True
        plans.append({"label": label, "price": n, "stock": "in" if instock else "out"})
    return plans


def _woo_simple_price(html: str) -> int | None:
    summary = _summary_html(html)
    m = re.search(r'<p class="price">([\s\S]*?)</p>', summary, re.I)
    if not m:
        m = re.search(r'<p class="price">([\s\S]*?)</p>', html, re.I)
    if not m:
        return None
    block = m.group(1)
    ins = re.search(r"<ins[\s\S]*?</ins>", block, re.I)
    src = ins.group(0) if ins else re.sub(r"<del[\s\S]*?</del>", " ", block, flags=re.I)
    text = unescape(re.sub(r"<[^>]+>", " ", src)).replace("&#8360;", " ")
    for raw in re.findall(r"([\d,]+(?:\.\d+)?)", text):
        try:
            n = _npr(raw.replace(",", ""))
        except ValueError:
            continue
        if _ok_price(n) and n != 8360:
            return n
    return None


def _woo_simple_stock(html: str) -> str:
    summary = _summary_html(html)
    if re.search(r'<p class="stock out-of-stock"', summary, re.I):
        return "out"
    if re.search(r'<p class="stock in-stock"', summary, re.I):
        return "in"
    products = _json_ld_products(html)
    if products:
        _, stock = _offer_price_stock(products[0])
        if stock != "unknown":
            return stock
    return "in"


def parse_woo(html: str) -> dict[str, Any]:
    plans = _woo_variations(html)
    if plans:
        chosen, stock, note = pick_woo_plan(plans)
        if not chosen:
            return _result(False, None, None, stock, None, error="no rate")
        return _result(
            True,
            _npr(chosen["price"]),
            chosen.get("label"),
            stock,
            note,
            plans=_plan_labels(plans, chosen),
        )
    price = _woo_simple_price(html)
    stock = _woo_simple_stock(html)
    if price:
        return _result(True, price, None, stock, None)
    products = _json_ld_products(html)
    if products:
        price, stock = _offer_price_stock(products[0])
        if price:
            return _result(True, price, None, stock, None)
    return _result(False, None, None, stock, None, error="no rate")


def _result(
    ok: bool,
    price: int | None,
    plan: str | None,
    stock: str,
    note: str | None,
    error: str | None = None,
    plans: list[str] | None = None,
) -> dict[str, Any]:
    labels: list[str] = []
    for lab in plans or []:
        lab = (lab or "").strip()
        if lab and lab not in labels:
            labels.append(lab)
    return {
        "ok": ok,
        "price": price,
        "plan": (plan or "").strip() or None,
        "stock": stock,
        "note": note,
        "likes": None,
        "min": price,
        "max": price,
        "error": error,
        "plans": labels or None,
    }


def summarize_fetch(html: str, url: str, status: int) -> dict[str, Any]:
    empty = {
        "ok": False,
        "url": url,
        "price": None,
        "plan": None,
        "stock": "unknown",
        "note": None,
        "likes": None,
        "min": None,
        "max": None,
        "plans": None,
        "error": f"http {status}" if status else "empty",
    }
    if status >= 400 or not html:
        return empty
    host = urlparse(url).netloc.lower()
    if "toolsmandu.com" in host:
        parsed = parse_tm(html, url)
    elif "keyshopnepal.com" in host:
        parsed = parse_ksn(html)
    elif "cheapmandu.com" in host or "keysewa.com" in host:
        parsed = parse_woo(html)
    else:
        parsed = parse_woo(html)
    parsed["url"] = url
    if not parsed.get("ok") and parsed.get("error") is None:
        parsed["error"] = "no rate"
    return parsed
