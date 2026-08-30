#!/usr/bin/env python3
"""ANC Tools seller desk — local API + static files.

Run from anywhere:
  python3 tools/seller/server.py

Then open http://127.0.0.1:8081/
On Hostinger use api.php instead; this process is for local fetch.
"""
from __future__ import annotations

import hmac
import hashlib
import json
import posixpath
import re
import ssl
import sys
import threading
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
TOOLS = HERE.parent
sys.path.insert(0, str(HERE))
from lib_parse import summarize_fetch  # noqa: E402

HOST = "127.0.0.1"
PORT = 8081
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SSL_CTX = ssl.create_default_context()
COOKIE = "anc_seller"
HMAC_KEY = b"anc-seller-v1"
SITES = ("TM", "KSN", "CM", "KS")

_lock = threading.Lock()


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def config() -> dict:
    return load_json(HERE / "config.json", {"password": "Kushma33400", "sessionHours": 12})


def expected_token() -> str:
    pw = str(config().get("password") or "")
    return hmac.new(HMAC_KEY, pw.encode("utf-8"), hashlib.sha256).hexdigest()


def sources() -> dict:
    return load_json(HERE / "data" / "sources.json", {})


def sheet() -> dict:
    return load_json(HERE / "data" / "sheet.json", {})


def write_sheet(data: dict) -> None:
    save_json(HERE / "data" / "sheet.json", data)


def write_sources(data: dict) -> None:
    save_json(HERE / "data" / "sources.json", data)


CATALOG_PATH = TOOLS / "products.json"
CATEGORIES = [
    ("ai-tools", "AI Tools"),
    ("academic", "Academic"),
    ("microsoft", "Microsoft"),
    ("graphics", "Design"),
    ("cloud", "Cloud"),
    ("antivirus", "Antivirus"),
    ("vpn", "VPN"),
    ("learning", "Learning"),
    ("streaming", "Streaming"),
    ("productivity", "Work"),
]
CAT_SLUGS = {c[0] for c in CATEGORIES}
CAT_COLOR = {
    "ai-tools": "#10a37f",
    "academic": "#2563eb",
    "microsoft": "#0078d4",
    "graphics": "#7d2ae8",
    "cloud": "#1a73e8",
    "antivirus": "#c01820",
    "vpn": "#4687ff",
    "learning": "#0a66c2",
    "streaming": "#e50914",
    "productivity": "#0f172a",
}
HOST_SITE = {
    "toolsmandu.com": "TM",
    "www.toolsmandu.com": "TM",
    "keyshopnepal.com": "KSN",
    "www.keyshopnepal.com": "KSN",
    "cheapmandu.com": "CM",
    "www.cheapmandu.com": "CM",
    "keysewa.com": "KS",
    "www.keysewa.com": "KS",
}


def catalog() -> list:
    data = load_json(CATALOG_PATH, [])
    return data if isinstance(data, list) else []


def write_catalog(items: list) -> None:
    save_json(CATALOG_PATH, items)
    try:
        if str(TOOLS) not in sys.path:
            sys.path.insert(0, str(TOOLS))
        import seo_build
        seo_build.publish_seo()
    except Exception as exc:
        sys.stderr.write(f"seo_build skipped: {exc}\n")


def catalog_map() -> dict:
    return {p.get("slug"): p for p in catalog() if isinstance(p, dict) and p.get("slug")}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s[:60]


def site_from_url(url: str) -> str | None:
    try:
        host = urlparse(url).netloc.lower().split(":")[0]
    except Exception:
        return None
    if host.startswith("www."):
        host = host[4:]
    return HOST_SITE.get(host) or HOST_SITE.get("www." + host)


def clean_urls(raw) -> dict[str, str]:
    out = {}
    if not isinstance(raw, dict):
        return out
    for site, url in raw.items():
        site = str(site or "").upper()
        url = str(url or "").strip()
        if site not in SITES or not url:
            continue
        if not url.startswith(("http://", "https://")):
            continue
        got = site_from_url(url)
        if got and got != site:
            continue
        out[site] = url
    return out


def make_code(urls: dict, name: str) -> str:
    prefix = "-".join(s for s in SITES if s in urls) or "TM"
    short = " ".join((name or "").split()[:2]).strip() or "Product"
    return f"{prefix} {short}"[:48]


SITE_NAMES = {"TM": "Toolsmandu", "KSN": "Keyshop", "CM": "Cheapmandu", "KS": "Keysewa"}
AVAIL_PATH = TOOLS / "availability.json"
PLANS_PATH = TOOLS / "plans.json"


def labels_from_cell(cell: dict | None) -> list[str]:
    if not isinstance(cell, dict):
        return []
    raw = cell.get("plans")
    if isinstance(raw, list) and raw:
        out = []
        for item in raw:
            lab = str(item or "").strip()
            if lab and lab not in out:
                out.append(lab)
        if out:
            return out
    out = []
    plan = str(cell.get("plan") or "").strip()
    if plan:
        out.append(plan)
    note = str(cell.get("note") or "")
    rest = re.sub(r"^Also:\s*", "", note, flags=re.I)
    for part in re.split(r"\s*·\s*", rest):
        lab = re.sub(r"\s*₨\s*[\d,]+.*$", "", part).strip()
        lab = re.sub(r"\s+Rs\.?\s*[\d,]+.*$", "", lab, flags=re.I).strip()
        if lab and lab not in out:
            out.append(lab)
    return out


def public_plans_for(rec: dict) -> list[str]:
    fetched = rec.get("fetched") or {}
    for site in SITES:
        labs = labels_from_cell(fetched.get(site) if isinstance(fetched, dict) else None)
        if labs:
            return labs
    our = rec.get("our") if isinstance(rec.get("our"), dict) else {}
    raw = our.get("plans") if our else None
    if isinstance(raw, list):
        out = []
        for item in raw:
            lab = str(item or "").strip()
            if lab and lab not in out:
                out.append(lab)
        if out:
            return out
    return []


def publish_plans(sh: dict | None = None) -> None:
    data = sh if sh is not None else sheet()
    out = {}
    for slug in sources():
        labs = public_plans_for(data.get(slug) or {})
        if labs:
            out[slug] = labs
    save_json(PLANS_PATH, out)


def as_our(rec: dict) -> dict:
    our = rec.get("our")
    if isinstance(our, dict):
        return dict(our)
    if isinstance(our, (int, float)):
        return {"npr": int(our)}
    return {}


def market_stock(fetched: dict) -> str | None:
    any_in = False
    known = False
    for cell in (fetched or {}).values():
        if not isinstance(cell, dict):
            continue
        st = cell.get("stock")
        if st == "in":
            known = True
            any_in = True
        elif st == "out":
            known = True
    if not known:
        return None
    return "in" if any_in else "out"


def row_stock(rec: dict) -> str | None:
    our = rec.get("our")
    if isinstance(our, dict) and our.get("stock") in ("in", "out"):
        return our["stock"]
    return market_stock(rec.get("fetched") or {})


def publish_availability(sh: dict | None = None) -> None:
    data = sh if sh is not None else sheet()
    out = {}
    for slug, meta in sources().items():
        st = row_stock(data.get(slug) or {})
        if st:
            out[slug] = st
    save_json(AVAIL_PATH, out)
    publish_plans(data)


def flag_row(our, fetched: dict) -> dict:
    live = []
    oos = []
    missing = []
    for site in SITES:
        cell = fetched.get(site) or {}
        if not cell:
            continue
        p = cell.get("price")
        if cell.get("ok") is False or p in (None, ""):
            if cell.get("ok") is False:
                missing.append(site)
            continue
        if cell.get("stock") == "out":
            oos.append(site)
            continue
        live.append((site, int(p)))
    market_min = min((p for _, p in live), default=None)
    cheapest = min(live, key=lambda x: x[1])[0] if live else None
    vs = "need-fetch"
    if our is None and market_min is None:
        vs = "empty"
    elif our is None:
        vs = "set-ours"
    elif market_min is None:
        vs = "no-market"
    elif our <= market_min:
        vs = "low"
    elif our > market_min * 1.08:
        vs = "high"
    else:
        vs = "ok"
    return {
        "marketMin": market_min,
        "marketMax": market_min,
        "cheapestSite": SITE_NAMES.get(cheapest, cheapest),
        "vs": vs,
        "oos": oos,
        "missing": missing,
        "likes": None,
    }


def merge_rows() -> list[dict]:
    src = sources()
    sh = sheet()
    rows = []
    for slug, meta in src.items():
        rec = sh.get(slug) or {}
        our = rec.get("our")
        npr = None
        note = ""
        if isinstance(our, dict):
            npr = our.get("npr")
            note = our.get("note") or ""
        elif isinstance(our, (int, float)):
            npr = int(our)
        fetched = rec.get("fetched") or {}
        flags = flag_row(npr if isinstance(npr, (int, float)) else None, fetched)
        shop = catalog_map().get(slug) or {}
        rows.append(
            {
                "slug": slug,
                "name": meta.get("name") or slug,
                "code": meta.get("code") or "",
                "urls": meta.get("sources") or {},
                "our": npr,
                "stock": row_stock(rec) or "in",
                "note": note,
                "fetched": fetched,
                "hidden": bool(shop.get("hidden")),
                "category": shop.get("category") or "",
                **flags,
            }
        )
    rows.sort(key=lambda r: r["name"].lower())
    return rows


def fetch_url(url: str) -> tuple[str, int]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=14, context=SSL_CTX) as resp:
            html = resp.read().decode("utf-8", "replace")
            return html, getattr(resp, "status", 200) or 200
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace") if e.fp else ""
        return body, e.code
    except Exception as e:
        return "", 0


def fetch_slug(slug: str) -> dict:
    meta = sources().get(slug) or {}
    urls = meta.get("sources") or {}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    results: dict[str, dict] = {}

    def work(site: str, url: str):
        html, status = fetch_url(url)
        cell = summarize_fetch(html, url, status)
        cell["fetchedAt"] = now
        results[site] = cell

    threads = []
    for site, url in urls.items():
        t = threading.Thread(target=work, args=(site, url), daemon=True)
        threads.append(t)
        t.start()
    for t in threads:
        t.join(timeout=20)

    with _lock:
        sh = sheet()
        rec = sh.get(slug) or {}
        prev = rec.get("fetched") or {}
        merged = dict(prev)
        merged.update(results)
        rec["fetched"] = merged
        auto = market_stock(merged)
        if auto:
            our = as_our(rec)
            our["stock"] = auto
            rec["our"] = our
        sh[slug] = rec
        write_sheet(sh)
        publish_availability(sh)
    return results


class SellerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _cookie_ok(self) -> bool:
        raw = self.headers.get("Cookie") or ""
        want = expected_token()
        for part in raw.split(";"):
            if "=" not in part:
                continue
            k, v = part.strip().split("=", 1)
            if k == COOKIE and hmac.compare_digest(v, want):
                return True
        return False

    def _send(self, code: int, body, content_type="application/json; charset=utf-8", extra=None):
        data = body if isinstance(body, bytes) else (
            json.dumps(body).encode("utf-8") if not isinstance(body, str) else body.encode("utf-8")
        )
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if extra:
            for k, v in extra:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}

    def _api(self, payload: dict | None = None):
        payload = payload or {}
        qs = {}
        if "?" in self.path:
            from urllib.parse import parse_qs, urlparse

            qs = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
        action = payload.get("action") or qs.get("action") or ""

        if action == "login":
            pw = str(payload.get("password") or "")
            if hmac.compare_digest(pw, str(config().get("password") or "")):
                token = expected_token()
                self._send(
                    200,
                    {"ok": True},
                    extra=[("Set-Cookie", f"{COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200")],
                )
            else:
                self._send(401, {"ok": False, "error": "Wrong password"})
            return

        if action == "logout":
            self._send(
                200,
                {"ok": True},
                extra=[("Set-Cookie", f"{COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")],
            )
            return

        if not self._cookie_ok():
            self._send(401, {"ok": False, "error": "auth"})
            return

        if action in ("sheet", "me", ""):
            self._send(200, {"ok": True, "rows": merge_rows(), "categories": [{"slug": s, "name": n} for s, n in CATEGORIES]})
            return

        if action == "save":
            slug = str(payload.get("slug") or "")
            if slug not in sources():
                self._send(400, {"ok": False, "error": "unknown product"})
                return
            with _lock:
                sh = sheet()
                rec = sh.get(slug) or {}
                our = as_our(rec)
                if "our" in payload:
                    npr = payload.get("our")
                    if npr in ("", None):
                        our.pop("npr", None)
                    else:
                        try:
                            our["npr"] = int(npr)
                        except (TypeError, ValueError):
                            self._send(400, {"ok": False, "error": "our must be NPR number"})
                            return
                if "note" in payload:
                    our["note"] = str(payload.get("note") or "")
                if payload.get("stock") in ("in", "out"):
                    our["stock"] = payload["stock"]
                if our:
                    rec["our"] = our
                elif "our" in rec:
                    rec.pop("our", None)
                sh[slug] = rec
                write_sheet(sh)
                publish_availability(sh)
            self._send(200, {"ok": True, "rows": [r for r in merge_rows() if r["slug"] == slug]})
            return

        if action == "fetch":
            slug = str(payload.get("slug") or qs.get("slug") or "")
            if slug not in sources():
                self._send(400, {"ok": False, "error": "unknown product"})
                return
            fetch_slug(slug)
            self._send(200, {"ok": True, "rows": [r for r in merge_rows() if r["slug"] == slug]})
            return

        if action == "add":
            name = str(payload.get("name") or "").strip()
            category = str(payload.get("category") or "").strip()
            blurb = str(payload.get("blurb") or "").strip()
            urls = clean_urls(payload.get("urls") or {})
            slug = slugify(str(payload.get("slug") or name))
            if not name:
                self._send(400, {"ok": False, "error": "Name is required"})
                return
            if category not in CAT_SLUGS:
                self._send(400, {"ok": False, "error": "Pick a category"})
                return
            if not slug:
                self._send(400, {"ok": False, "error": "Need a product slug"})
                return
            if not urls:
                self._send(400, {"ok": False, "error": "Add at least one supplier URL"})
                return
            with _lock:
                src = sources()
                if slug in src or slug in catalog_map():
                    self._send(400, {"ok": False, "error": "That product already exists"})
                    return
                src[slug] = {
                    "name": name,
                    "code": make_code(urls, name),
                    "sources": urls,
                }
                write_sources(src)
                items = catalog()
                items.append(
                    {
                        "slug": slug,
                        "name": name,
                        "category": category,
                        "color": CAT_COLOR.get(category, "#2563eb"),
                        "blurb": blurb or f"{name} in Nepal. Ask for today’s rate on WhatsApp.",
                        "code": src[slug]["code"],
                        "hidden": False,
                    }
                )
                write_catalog(items)
                sh = sheet()
                sh[slug] = sh.get(slug) or {}
                write_sheet(sh)
                publish_availability(sh)
            self._send(200, {"ok": True, "rows": [r for r in merge_rows() if r["slug"] == slug]})
            return

        if action == "hide":
            slug = str(payload.get("slug") or "")
            hidden = bool(payload.get("hidden"))
            with _lock:
                if slug not in sources():
                    self._send(400, {"ok": False, "error": "unknown product"})
                    return
                items = catalog()
                found = False
                for p in items:
                    if isinstance(p, dict) and p.get("slug") == slug:
                        p["hidden"] = hidden
                        found = True
                        break
                if not found:
                    meta = sources().get(slug) or {}
                    items.append(
                        {
                            "slug": slug,
                            "name": meta.get("name") or slug,
                            "category": "productivity",
                            "color": "#0f172a",
                            "blurb": "",
                            "code": meta.get("code") or "",
                            "hidden": hidden,
                        }
                    )
                write_catalog(items)
            self._send(200, {"ok": True, "rows": [r for r in merge_rows() if r["slug"] == slug]})
            return

        if action == "delete":
            slug = str(payload.get("slug") or "")
            with _lock:
                src = sources()
                if slug not in src:
                    self._send(400, {"ok": False, "error": "unknown product"})
                    return
                src.pop(slug, None)
                write_sources(src)
                write_catalog([p for p in catalog() if not (isinstance(p, dict) and p.get("slug") == slug)])
                sh = sheet()
                sh.pop(slug, None)
                write_sheet(sh)
                publish_availability(sh)
            self._send(200, {"ok": True, "deleted": slug, "rows": []})
            return

        self._send(400, {"ok": False, "error": "unknown action"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api.php", "/api", "/seller/api.php"):
            self._api(self._read_json())
            return
        self._send(404, {"ok": False, "error": "not found"})

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api.php", "/api", "/seller/api.php"):
            from urllib.parse import parse_qs, urlparse

            qs = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
            self._api(qs)
            return
        # Map shop images so thumbs work on :8081
        if path.startswith("/assets/"):
            target = (TOOLS / path.lstrip("/")).resolve()
            if str(target).startswith(str(TOOLS.resolve())) and target.is_file():
                data = target.read_bytes()
                ctype = "image/webp" if target.suffix == ".webp" else "application/octet-stream"
                if target.suffix == ".png":
                    ctype = "image/png"
                elif target.suffix == ".svg":
                    ctype = "image/svg+xml"
                self._send(200, data, ctype)
                return
            self.send_error(404)
            return
        blocked = {"/config.json", "/server.py", "/lib_parse.py"}
        if path in blocked or path.startswith("/data/"):
            self.send_error(403)
            return
        if path == "/":
            self.path = "/index.html"
        # prevent path escape
        rel = posixpath.normpath(self.path.lstrip("/"))
        if rel.startswith(".."):
            self.send_error(403)
            return
        return super().do_GET()


def main():
    httpd = ThreadingHTTPServer((HOST, PORT), SellerHandler)
    print(f"ANC seller desk  http://{HOST}:{PORT}/")
    print("Password is in tools/seller/config.json  (change it)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
