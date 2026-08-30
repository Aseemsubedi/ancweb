<?php
/**
 * ANC Tools seller desk API (Hostinger).
 * Same contract as server.py — POST JSON { action, ... } to api.php
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$HERE = __DIR__;
$CONFIG_PATH = $HERE . '/config.json';
$SOURCES_PATH = $HERE . '/data/sources.json';
$SHEET_PATH = $HERE . '/data/sheet.json';
$COOKIE = 'anc_seller';
$HMAC_KEY = 'anc-seller-v1';
$SITES = ['TM', 'KSN', 'CM', 'KS'];
$AVAIL_PATH = dirname($HERE) . '/availability.json';
$PLANS_PATH = dirname($HERE) . '/plans.json';
$CATALOG_PATH = dirname($HERE) . '/products.json';
$CATEGORIES = [
    ['ai-tools', 'AI Tools'],
    ['academic', 'Academic'],
    ['microsoft', 'Microsoft'],
    ['graphics', 'Design'],
    ['cloud', 'Cloud'],
    ['antivirus', 'Antivirus'],
    ['vpn', 'VPN'],
    ['learning', 'Learning'],
    ['streaming', 'Streaming'],
    ['productivity', 'Work'],
];
$CAT_COLOR = [
    'ai-tools' => '#10a37f',
    'academic' => '#2563eb',
    'microsoft' => '#0078d4',
    'graphics' => '#7d2ae8',
    'cloud' => '#1a73e8',
    'antivirus' => '#c01820',
    'vpn' => '#4687ff',
    'learning' => '#0a66c2',
    'streaming' => '#e50914',
    'productivity' => '#0f172a',
];
$HOST_SITE = [
    'toolsmandu.com' => 'TM',
    'keyshopnepal.com' => 'KSN',
    'cheapmandu.com' => 'CM',
    'keysewa.com' => 'KS',
];

function as_our($rec) {
    $our = $rec['our'] ?? null;
    if (is_array($our)) return $our;
    if (is_numeric($our)) return ['npr' => (int) $our];
    return [];
}

function market_stock($fetched) {
    $anyIn = false;
    $known = false;
    foreach ($fetched ?: [] as $cell) {
        if (!is_array($cell)) continue;
        $st = $cell['stock'] ?? '';
        if ($st === 'in') { $known = true; $anyIn = true; }
        elseif ($st === 'out') $known = true;
    }
    if (!$known) return null;
    return $anyIn ? 'in' : 'out';
}

function row_stock($rec) {
    $our = $rec['our'] ?? null;
    if (is_array($our) && in_array($our['stock'] ?? '', ['in', 'out'], true)) return $our['stock'];
    return market_stock($rec['fetched'] ?? []);
}

function labels_from_cell($cell) {
    if (!is_array($cell)) return [];
    $raw = $cell['plans'] ?? null;
    if (is_array($raw) && $raw) {
        $out = [];
        foreach ($raw as $item) {
            $lab = trim((string) $item);
            if ($lab !== '' && !in_array($lab, $out, true)) $out[] = $lab;
        }
        if ($out) return $out;
    }
    $out = [];
    $plan = trim((string) ($cell['plan'] ?? ''));
    if ($plan !== '') $out[] = $plan;
    $note = (string) ($cell['note'] ?? '');
    $rest = preg_replace('/^Also:\s*/i', '', $note);
    foreach (preg_split('/\s*·\s*/u', $rest) as $part) {
        $lab = trim(preg_replace('/\s*₨\s*[\d,]+.*$/u', '', $part));
        $lab = trim(preg_replace('/\s+Rs\.?\s*[\d,]+.*$/i', '', $lab));
        if ($lab !== '' && !in_array($lab, $out, true)) $out[] = $lab;
    }
    return $out;
}

function public_plans_for($rec) {
    global $SITES;
    $fetched = $rec['fetched'] ?? [];
    if (is_array($fetched)) {
        foreach ($SITES as $site) {
            $labs = labels_from_cell($fetched[$site] ?? []);
            if ($labs) return $labs;
        }
    }
    $our = $rec['our'] ?? [];
    if (is_array($our) && isset($our['plans']) && is_array($our['plans'])) {
        $out = [];
        foreach ($our['plans'] as $item) {
            $lab = trim((string)$item);
            if ($lab !== '' && !in_array($lab, $out, true)) $out[] = $lab;
        }
        if ($out) return $out;
    }
    return [];
}

function publish_plans($sh = null) {
    global $SOURCES_PATH, $SHEET_PATH, $PLANS_PATH;
    if ($sh === null) $sh = load_json($SHEET_PATH, []);
    $src = load_json($SOURCES_PATH, []);
    $out = [];
    foreach ($src as $slug => $meta) {
        $labs = public_plans_for($sh[$slug] ?? []);
        if ($labs) $out[$slug] = $labs;
    }
    save_json($PLANS_PATH, $out);
}

function publish_availability($sh = null) {
    global $SOURCES_PATH, $SHEET_PATH, $AVAIL_PATH;
    if ($sh === null) $sh = load_json($SHEET_PATH, []);
    $src = load_json($SOURCES_PATH, []);
    $out = [];
    foreach ($src as $slug => $meta) {
        $st = row_stock($sh[$slug] ?? []);
        if ($st) $out[$slug] = $st;
    }
    save_json($AVAIL_PATH, $out);
    publish_plans($sh);
}

function load_json($path, $default) {
    if (!is_file($path)) return $default;
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function save_json($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    rename($tmp, $path);
}

function catalog() {
    global $CATALOG_PATH;
    $data = load_json($CATALOG_PATH, []);
    return is_array($data) ? array_values($data) : [];
}

function write_catalog($items) {
    global $CATALOG_PATH;
    save_json($CATALOG_PATH, array_values($items));
    $py = dirname($CATALOG_PATH) . '/seo_build.py';
    if (is_file($py)) {
        @exec('python3 ' . escapeshellarg($py) . ' >/dev/null 2>&1');
    }
}

function catalog_map() {
    $out = [];
    foreach (catalog() as $p) {
        if (is_array($p) && !empty($p['slug'])) $out[$p['slug']] = $p;
    }
    return $out;
}

function slugify($name) {
    $s = strtolower((string) $name);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return substr(trim($s, '-'), 0, 60);
}

function site_from_url($url) {
    global $HOST_SITE;
    $host = strtolower((string) (parse_url($url, PHP_URL_HOST) ?: ''));
    if (str_starts_with($host, 'www.')) $host = substr($host, 4);
    return $HOST_SITE[$host] ?? null;
}

function clean_urls($raw) {
    global $SITES;
    $out = [];
    if (!is_array($raw)) return $out;
    foreach ($raw as $site => $url) {
        $site = strtoupper((string) $site);
        $url = trim((string) $url);
        if (!in_array($site, $SITES, true) || $url === '') continue;
        if (!preg_match('#^https?://#i', $url)) continue;
        $got = site_from_url($url);
        if ($got && $got !== $site) continue;
        $out[$site] = $url;
    }
    return $out;
}

function make_code($urls, $name) {
    global $SITES;
    $bits = [];
    foreach ($SITES as $s) {
        if (!empty($urls[$s])) $bits[] = $s;
    }
    $prefix = $bits ? implode('-', $bits) : 'TM';
    $parts = preg_split('/\s+/', trim((string) $name));
    $short = trim(implode(' ', array_slice($parts, 0, 2))) ?: 'Product';
    return substr($prefix . ' ' . $short, 0, 48);
}

function cfg() {
    global $CONFIG_PATH;
    $c = load_json($CONFIG_PATH, ['password' => 'Kushma33400']);
    return $c;
}

function expected_token() {
    global $HMAC_KEY;
    $pw = (string) (cfg()['password'] ?? '');
    return hash_hmac('sha256', $pw, $HMAC_KEY);
}

function authed() {
    global $COOKIE;
    $got = $_COOKIE[$COOKIE] ?? '';
    return $got !== '' && hash_equals(expected_token(), $got);
}

function out($code, $body, $setCookie = null) {
    http_response_code($code);
    if ($setCookie !== null) {
        header('Set-Cookie: ' . $setCookie, false);
    }
    echo json_encode($body);
    exit;
}

function ok_price($n) {
    return $n >= 50 && $n <= 400000;
}

function parse_result($ok, $price, $plan, $stock, $note, $error = null, $plans = null) {
    $labels = [];
    foreach ($plans ?: [] as $lab) {
        $lab = trim((string) $lab);
        if ($lab !== '' && !in_array($lab, $labels, true)) $labels[] = $lab;
    }
    return [
        'ok' => $ok,
        'price' => $price,
        'plan' => $plan,
        'stock' => $stock,
        'note' => $note,
        'likes' => null,
        'min' => $price,
        'max' => $price,
        'error' => $error,
        'plans' => $labels ?: null,
    ];
}

function plan_labels($plans, $chosen = null) {
    $out = [];
    $add = function ($lab) use (&$out) {
        $lab = trim((string) $lab);
        if ($lab !== '' && !in_array($lab, $out, true)) $out[] = $lab;
    };
    $live = array_values(array_filter($plans ?: [], function ($p) { return ($p['stock'] ?? '') !== 'out'; }));
    $pool = $live ?: ($plans ?: []);
    if ($chosen) $add($chosen['label'] ?? '');
    foreach ($pool as $p) $add($p['label'] ?? '');
    return $out;
}

function is_share($label) {
    return preg_match('/share|shared|team|\bedu\b|student/i', $label);
}

function is_private($label) {
    if (is_share($label)) return false;
    return preg_match('/private|individual|personal|single|\(pro\)|professional/i', $label);
}

function is_trial($label) {
    return preg_match('/trial|7\s*-?\s*days?|1\s*-?\s*week|\bdemo\b|\bsample\b/i', $label);
}

function pretty_label($raw) {
    $s = trim(html_entity_decode((string) $raw, ENT_QUOTES, 'UTF-8'));
    $s = preg_replace('/\s*[—–-]\s*Rs\.?.*$/i', '', $s);
    $s = trim($s);
    if ($s !== '' && strpos($s, ' ') === false && strpos($s, '-') !== false) {
        $s = str_replace('-', ' ', $s);
    }
    return trim(preg_replace('/\s+/', ' ', $s));
}

function other_plans_note($chosen, $plans) {
    $others = [];
    foreach ($plans as $p) {
        if (($p['label'] === ($chosen['label'] ?? '') && (int) $p['price'] === (int) $chosen['price']) || ($p['stock'] ?? '') === 'out') continue;
        $others[] = $p;
    }
    if (!$others) return null;
    $picks = [];
    $add = function ($p) use (&$picks) {
        if ($p) {
            foreach ($picks as $have) {
                if ($have['label'] === $p['label'] && $have['price'] === $p['price']) return;
            }
            $picks[] = $p;
        }
    };
    $years = array_values(array_filter($others, function ($p) { return preg_match('/1\s*-?\s*year|12\s*-?\s*month|annual/i', $p['label'] ?? ''); }));
    if ($years) {
        $low = $years[0];
        foreach ($years as $p) { if ($p['price'] < $low['price']) $low = $p; }
        $add($low);
    }
    $shares = array_values(array_filter($others, function ($p) { return is_share($p['label'] ?? ''); }));
    if ($shares) {
        $low = $shares[0];
        foreach ($shares as $p) { if ($p['price'] < $low['price']) $low = $p; }
        $add($low);
    }
    if (!$picks) {
        $mid = array_values(array_filter($others, function ($p) { return preg_match('/3\s*-?\s*month|6\s*-?\s*month/i', $p['label'] ?? ''); }));
        $pool = $mid ?: $others;
        $low = $pool[0];
        foreach ($pool as $p) { if ($p['price'] < $low['price']) $low = $p; }
        $add($low);
    }
    $bits = [];
    foreach (array_slice($picks, 0, 2) as $p) {
        $bits[] = $p['label'] . ' ₨' . number_format($p['price']);
    }
    return 'Also: ' . implode(' · ', $bits);
}

function pick_woo_plan($plans) {
    $usable = [];
    foreach ($plans as $p) {
        $n = (int) round($p['price']);
        if (ok_price($n)) $usable[] = ['label' => $p['label'] ?? '', 'price' => $n, 'stock' => $p['stock'] ?? 'in'];
    }
    if (!$usable) return [null, 'unknown', null];
    $live = array_values(array_filter($usable, function ($p) { return ($p['stock'] ?? '') !== 'out'; }));
    $pool = $live ?: $usable;
    $noTrial = array_values(array_filter($pool, function ($p) { return !is_trial($p['label']); }));
    if (!$noTrial) $noTrial = $pool;
    $nonShare = array_values(array_filter($noTrial, function ($p) { return !is_share($p['label']); }));
    $base = $nonShare ?: $noTrial;
    $monthPriv = $month = $priv = [];
    foreach ($base as $p) {
        $isMonth = preg_match('/1\s*-?\s*month|monthly/i', $p['label']);
        if ($isMonth && is_private($p['label'])) $monthPriv[] = $p;
        if ($isMonth) $month[] = $p;
        if (is_private($p['label'])) $priv[] = $p;
    }
    $group = $monthPriv ?: ($month ?: ($priv ?: $base));
    $chosen = $group[0];
    foreach ($group as $p) {
        if ($p['price'] < $chosen['price']) $chosen = $p;
    }
    $stock = $live ? 'in' : 'out';
    return [$chosen, $stock, other_plans_note($chosen, $live ?: $usable)];
}

function json_ld_products($html) {
    $found = [];
    if (!preg_match_all('/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $blocks)) {
        return $found;
    }
    foreach ($blocks[1] as $block) {
        $data = json_decode($block, true);
        if (!$data) continue;
        $stack = [$data];
        while ($stack) {
            $cur = array_pop($stack);
            if (!is_array($cur)) continue;
            $types = $cur['@type'] ?? null;
            if (is_string($types)) $types = [$types];
            if (is_array($types) && in_array('Product', $types, true)) $found[] = $cur;
            foreach ($cur as $v) {
                if (is_array($v)) $stack[] = $v;
            }
        }
    }
    return $found;
}

function offer_price_stock($product) {
    $offer = $product['offers'] ?? null;
    if (isset($offer[0])) $offer = $offer[0];
    if (!is_array($offer)) return [null, 'unknown'];
    $raw = $offer['price'] ?? null;
    if ($raw === null) {
        $spec = $offer['priceSpecification'] ?? null;
        if (isset($spec[0]['price'])) $raw = $spec[0]['price'];
        elseif (is_array($spec) && isset($spec['price'])) $raw = $spec['price'];
    }
    $price = is_numeric($raw) ? (int) round($raw) : null;
    if ($price !== null && !ok_price($price)) $price = null;
    $avail = (string) ($offer['availability'] ?? '');
    $stock = strpos($avail, 'OutOfStock') !== false ? 'out' : (strpos($avail, 'InStock') !== false ? 'in' : 'unknown');
    return [$price, $stock];
}

function parse_tm($html, $url = '') {
    $plans = [];
    if (preg_match_all('/\{id:"[^"]+",name:"((?:\\\\.|[^"\\\\])*)",price:(\d+),original_price:(?:\d+|null),expiry_days:(?:\d+|null),stock_status:"([^"]+)"/', $html, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $row) {
            $label = trim(stripcslashes($row[1]));
            $n = (int) $row[2];
            if ($label && ok_price($n)) {
                $plans[] = ['label' => $label, 'price' => $n, 'stock' => $row[3] === 'in_stock' ? 'in' : 'out'];
            }
        }
    }
    if (!$plans) {
        $start = strpos($html, 'Select a Plan');
        $box = $start !== false ? substr($html, $start, 14000) : '';
        $chunks = preg_split('/<button type="button"/', $box);
        array_shift($chunks);
        foreach ($chunks as $chunk) {
            if (!preg_match('/<div class="font-semibold text-sm">([^<]+)<\/div>/', $chunk, $lm)) continue;
            if (!preg_match('/text-success">NPR[\s\xC2\xA0 ]*([\d,]+)<\/span>/i', $chunk, $pm)) continue;
            $label = trim(html_entity_decode($lm[1], ENT_QUOTES, 'UTF-8'));
            $n = (int) str_replace(',', '', $pm[1]);
            if (!$label || !ok_price($n)) continue;
            $oos = preg_match('/out of stock|sold\s*out/i', $chunk);
            $plans[] = ['label' => $label, 'price' => $n, 'stock' => $oos ? 'out' : 'in'];
        }
    }
    $uiOos = preg_match('/>Out of Stock<\/button>/', substr($html, max(0, (int) strpos($html, 'Select a Plan')), 8000));
    if (!$plans) {
        $slug = basename(parse_url($url, PHP_URL_PATH) ?: '');
        $price = null;
        $stock = $uiOos ? 'out' : 'unknown';
        if ($slug && preg_match('/slug:"' . preg_quote($slug, '/') . '".{0,100000}?,price:(\d+),compare_price:/s', $html, $pm)) {
            $n = (int) $pm[1];
            if (ok_price($n)) $price = $n;
        }
        $plan = null;
        if (preg_match('/<div class="font-semibold text-sm">([^<]+)<\/div>/', substr($html, max(0, (int) strpos($html, 'Select a Plan')), 4000), $lm)) {
            $plan = trim(html_entity_decode($lm[1], ENT_QUOTES, 'UTF-8')) ?: null;
        }
        if ($price) return parse_result(true, $price, $plan, $stock, null, null, $plan ? [$plan] : null);
        return parse_result(false, null, null, $stock, null, 'no rate');
    }
    $live = array_values(array_filter($plans, function ($p) { return ($p['stock'] ?? '') !== 'out'; }));
    $pool = $live ?: $plans;
    $chosen = $pool[0];
    foreach ($pool as $p) {
        if ($p['price'] < $chosen['price']) $chosen = $p;
    }
    $stock = $live ? 'in' : 'out';
    $note = other_plans_note($chosen, $live ?: $plans);
    return parse_result(true, $chosen['price'], $chosen['label'] ?: null, $stock, $note, null, plan_labels($plans, $chosen));
}

function parse_ksn($html) {
    $plans = [];
    if (preg_match_all('/<option[^>]*value="([^"]*)"[^>]*data-after="([\d.]+)"/i', $html, $m, PREG_SET_ORDER)) {
        foreach ($m as $row) {
            $n = (int) round((float) $row[2]);
            $label = pretty_label($row[1]);
            if ($label && ok_price($n)) $plans[] = ['label' => $label, 'price' => $n, 'stock' => 'in'];
        }
    }
    if (!$plans && preg_match_all('/<option[^>]*data-after="([\d.]+)"[^>]*>([\s\S]*?)<\/option>/i', $html, $m, PREG_SET_ORDER)) {
        foreach ($m as $row) {
            $n = (int) round((float) $row[1]);
            $label = pretty_label(strip_tags($row[2]));
            if ($label && ok_price($n)) $plans[] = ['label' => $label, 'price' => $n, 'stock' => 'in'];
        }
    }
    if (!$plans) return parse_result(false, null, null, 'unknown', null, 'no rate');
    $start = strpos($html, 'quantity-stock');
    $box = $start !== false ? substr($html, max(0, $start - 500), 3000) : $html;
    $stock = preg_match('/out of stock|sold\s*out|(?<!\d)0 items left/i', $box) ? 'out' : 'in';
    $chosen = $plans[0];
    return parse_result(true, $chosen['price'], $chosen['label'] ?: null, $stock, other_plans_note($chosen, $plans), null, plan_labels($plans, $chosen));
}

function woo_attr_labels($html) {
    $out = [];
    if (!preg_match_all('/<select([^>]*)>([\s\S]*?)<\/select>/i', $html, $sels, PREG_SET_ORDER)) return $out;
    foreach ($sels as $sel) {
        if (stripos($sel[1], 'attribute') === false) continue;
        if (!preg_match_all('/<option[^>]*value="([^"]*)"[^>]*>([^<]+)/i', $sel[2], $opts, PREG_SET_ORDER)) continue;
        foreach ($opts as $o) {
            $val = trim(html_entity_decode($o[1], ENT_QUOTES, 'UTF-8'));
            $text = trim(html_entity_decode($o[2], ENT_QUOTES, 'UTF-8'));
            if ($val === '' || stripos($text, 'choose') === 0) continue;
            $out[$val] = $text;
        }
    }
    return $out;
}

function parse_woo($html) {
    $summary = $html;
    if (preg_match('/(?:entry-summary|product-summary|div class="summary)([\s\S]{0,12000})/i', $html, $sm)) {
        $summary = $sm[0];
    }
    $plans = [];
    if (preg_match('/data-product_variations="([^"]*)"/', $html, $vm)) {
        $data = json_decode(html_entity_decode($vm[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'), true);
        $names = woo_attr_labels($html);
        if (is_array($data)) {
            foreach ($data as $plan) {
                if (!is_array($plan) || !isset($plan['display_price'])) continue;
                $n = (int) round($plan['display_price']);
                $bits = [];
                foreach (array_values($plan['attributes'] ?? []) as $v) {
                    if (!$v) continue;
                    $bits[] = $names[(string) $v] ?? (string) $v;
                }
                $label = pretty_label(implode(' ', $bits));
                $in = array_key_exists('is_in_stock', $plan) ? (bool) $plan['is_in_stock'] : true;
                if (ok_price($n)) $plans[] = ['label' => $label, 'price' => $n, 'stock' => $in ? 'in' : 'out'];
            }
        }
    }
    if ($plans) {
        [$chosen, $stock, $note] = pick_woo_plan($plans);
        if (!$chosen) return parse_result(false, null, null, $stock, null, 'no rate');
        return parse_result(true, $chosen['price'], $chosen['label'] ?: null, $stock, $note, null, plan_labels($plans, $chosen));
    }
    $price = null;
    $block = null;
    if (preg_match('/<p class="price">([\s\S]*?)<\/p>/i', $summary, $main) || preg_match('/<p class="price">([\s\S]*?)<\/p>/i', $html, $main)) {
        $block = $main[1];
        $src = $block;
        if (preg_match('/<ins[\s\S]*?<\/ins>/i', $block, $ins)) $src = $ins[0];
        else $src = preg_replace('/<del[\s\S]*?<\/del>/i', ' ', $block);
        $text = html_entity_decode(strip_tags($src), ENT_QUOTES, 'UTF-8');
        if (preg_match_all('/([\d,]+(?:\.\d+)?)/', $text, $nm)) {
            foreach ($nm[1] as $raw) {
                $n = (int) round((float) str_replace(',', '', $raw));
                if (ok_price($n) && $n !== 8360) { $price = $n; break; }
            }
        }
    }
    $stock = 'in';
    if (preg_match('/<p class="stock out-of-stock"/i', $summary)) $stock = 'out';
    elseif (preg_match('/<p class="stock in-stock"/i', $summary)) $stock = 'in';
    else {
        $products = json_ld_products($html);
        if ($products) {
            [, $ldStock] = offer_price_stock($products[0]);
            if ($ldStock !== 'unknown') $stock = $ldStock;
        }
    }
    if ($price) return parse_result(true, $price, null, $stock, null);
    $products = json_ld_products($html);
    if ($products) {
        [$ldPrice, $ldStock] = offer_price_stock($products[0]);
        if ($ldPrice) return parse_result(true, $ldPrice, null, $ldStock, null);
    }
    return parse_result(false, null, null, $stock, null, 'no rate');
}

function summarize_fetch($html, $url, $status) {
    if ($status >= 400 || $html === '' || $html === false) {
        return [
            'ok' => false, 'url' => $url, 'price' => null, 'plan' => null, 'stock' => 'unknown',
            'note' => null, 'likes' => null, 'min' => null, 'max' => null,
            'error' => $status ? ('http ' . $status) : 'empty',
        ];
    }
    $host = parse_url($url, PHP_URL_HOST) ?: '';
    if (strpos($host, 'toolsmandu.com') !== false) $parsed = parse_tm($html, $url);
    elseif (strpos($host, 'keyshopnepal.com') !== false) $parsed = parse_ksn($html);
    else $parsed = parse_woo($html);
    $parsed['url'] = $url;
    return $parsed;
}

function fetch_url($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 14,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml', 'Accept-Language: en-US,en;q=0.9'],
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
        curl_close($ch);
        return ['', 0];
    }
    curl_close($ch);
    return [$body, $code ?: 200];
}

function flag_row($our, $fetched) {
    global $SITES;
    $names = ['TM' => 'Toolsmandu', 'KSN' => 'Keyshop', 'CM' => 'Cheapmandu', 'KS' => 'Keysewa'];
    $live = [];
    $oos = [];
    $missing = [];
    foreach ($SITES as $site) {
        $cell = $fetched[$site] ?? null;
        if (!$cell) continue;
        $p = $cell['price'] ?? null;
        if (($cell['ok'] ?? null) === false || !is_numeric($p) || !$p) {
            if (($cell['ok'] ?? null) === false) $missing[] = $site;
            continue;
        }
        if (($cell['stock'] ?? '') === 'out') {
            $oos[] = $site;
            continue;
        }
        $live[] = [$site, (int) $p];
    }
    $marketMin = null;
    $cheapest = null;
    foreach ($live as $row) {
        if ($marketMin === null || $row[1] < $marketMin) {
            $marketMin = $row[1];
            $cheapest = $row[0];
        }
    }
    if ($our === null && $marketMin === null) $vs = 'empty';
    elseif ($our === null) $vs = 'set-ours';
    elseif ($marketMin === null) $vs = 'no-market';
    elseif ($our <= $marketMin) $vs = 'low';
    elseif ($our > $marketMin * 1.08) $vs = 'high';
    else $vs = 'ok';
    return [
        'marketMin' => $marketMin,
        'marketMax' => $marketMin,
        'cheapestSite' => $cheapest ? ($names[$cheapest] ?? $cheapest) : null,
        'vs' => $vs,
        'oos' => $oos,
        'missing' => $missing,
        'likes' => null,
    ];
}

function merge_rows() {
    global $SOURCES_PATH, $SHEET_PATH;
    $src = load_json($SOURCES_PATH, []);
    $sh = load_json($SHEET_PATH, []);
    $rows = [];
    foreach ($src as $slug => $meta) {
        $rec = $sh[$slug] ?? [];
        $our = $rec['our'] ?? null;
        $npr = null;
        $note = '';
        if (is_array($our)) {
            $npr = $our['npr'] ?? null;
            $note = $our['note'] ?? '';
        } elseif (is_numeric($our)) {
            $npr = (int) $our;
        }
        $fetched = $rec['fetched'] ?? [];
        $flags = flag_row(is_numeric($npr) ? (int) $npr : null, $fetched);
        $shop = catalog_map()[$slug] ?? [];
        $rows[] = array_merge([
            'slug' => $slug,
            'name' => $meta['name'] ?? $slug,
            'code' => $meta['code'] ?? '',
            'urls' => $meta['sources'] ?? [],
            'our' => is_numeric($npr) ? (int) $npr : null,
            'stock' => row_stock($rec) ?: 'in',
            'note' => $note,
            'fetched' => $fetched,
            'hidden' => !empty($shop['hidden']),
            'category' => $shop['category'] ?? '',
        ], $flags);
    }
    usort($rows, function ($a, $b) { return strcasecmp($a['name'], $b['name']); });
    return $rows;
}

function fetch_slug($slug) {
    global $SOURCES_PATH, $SHEET_PATH;
    $src = load_json($SOURCES_PATH, []);
    $meta = $src[$slug] ?? [];
    $urls = $meta['sources'] ?? [];
    $now = gmdate('Y-m-d\TH:i:s\Z');
    $results = [];
    foreach ($urls as $site => $url) {
        [$html, $status] = fetch_url($url);
        $cell = summarize_fetch($html, $url, $status);
        $cell['fetchedAt'] = $now;
        $results[$site] = $cell;
    }
    $sh = load_json($SHEET_PATH, []);
    $rec = $sh[$slug] ?? [];
    $prev = $rec['fetched'] ?? [];
    $rec['fetched'] = array_merge($prev, $results);
    $auto = market_stock($rec['fetched']);
    if ($auto) {
        $our = as_our($rec);
        $our['stock'] = $auto;
        $rec['our'] = $our;
    }
    $sh[$slug] = $rec;
    save_json($SHEET_PATH, $sh);
    publish_availability($sh);
    return $results;
}

$payload = [];
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($ct, 'application/json') !== false) {
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
} else {
    $payload = $_POST;
}
$action = $payload['action'] ?? ($_GET['action'] ?? '');

if ($action === 'login') {
    $pw = (string) ($payload['password'] ?? '');
    if (hash_equals((string) (cfg()['password'] ?? ''), $pw)) {
        $token = expected_token();
        out(200, ['ok' => true], $COOKIE . '=' . $token . '; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200');
    }
    out(401, ['ok' => false, 'error' => 'Wrong password']);
}

if ($action === 'logout') {
    out(200, ['ok' => true], $COOKIE . '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

if (!authed()) {
    out(401, ['ok' => false, 'error' => 'auth']);
}

if ($action === 'sheet' || $action === 'me' || $action === '') {
    global $CATEGORIES;
    $cats = [];
    foreach ($CATEGORIES as $c) $cats[] = ['slug' => $c[0], 'name' => $c[1]];
    out(200, ['ok' => true, 'rows' => merge_rows(), 'categories' => $cats]);
}

if ($action === 'save') {
    $slug = (string) ($payload['slug'] ?? '');
    $src = load_json($SOURCES_PATH, []);
    if (!isset($src[$slug])) out(400, ['ok' => false, 'error' => 'unknown product']);
    $sh = load_json($SHEET_PATH, []);
    $rec = $sh[$slug] ?? [];
    $our = as_our($rec);
    if (array_key_exists('our', $payload)) {
        $npr = $payload['our'];
        if ($npr === '' || $npr === null) unset($our['npr']);
        else $our['npr'] = (int) $npr;
    }
    if (isset($payload['note'])) $our['note'] = (string) $payload['note'];
    if (in_array($payload['stock'] ?? '', ['in', 'out'], true)) $our['stock'] = $payload['stock'];
    if ($our) $rec['our'] = $our;
    else unset($rec['our']);
    $sh[$slug] = $rec;
    save_json($SHEET_PATH, $sh);
    publish_availability($sh);
    $rows = array_values(array_filter(merge_rows(), function ($r) use ($slug) { return $r['slug'] === $slug; }));
    out(200, ['ok' => true, 'rows' => $rows]);
}

if ($action === 'fetch') {
    $slug = (string) ($payload['slug'] ?? ($_GET['slug'] ?? ''));
    $src = load_json($SOURCES_PATH, []);
    if (!isset($src[$slug])) out(400, ['ok' => false, 'error' => 'unknown product']);
    fetch_slug($slug);
    $rows = array_values(array_filter(merge_rows(), function ($r) use ($slug) { return $r['slug'] === $slug; }));
    out(200, ['ok' => true, 'rows' => $rows]);
}

if ($action === 'add') {
    global $CATEGORIES, $CAT_COLOR, $SOURCES_PATH, $SHEET_PATH;
    $name = trim((string) ($payload['name'] ?? ''));
    $category = trim((string) ($payload['category'] ?? ''));
    $blurb = trim((string) ($payload['blurb'] ?? ''));
    $urls = clean_urls($payload['urls'] ?? []);
    $slug = slugify((string) ($payload['slug'] ?? $name));
    $allowed = [];
    foreach ($CATEGORIES as $c) $allowed[$c[0]] = true;
    if ($name === '') out(400, ['ok' => false, 'error' => 'Name is required']);
    if (empty($allowed[$category])) out(400, ['ok' => false, 'error' => 'Pick a category']);
    if ($slug === '') out(400, ['ok' => false, 'error' => 'Need a product slug']);
    if (!$urls) out(400, ['ok' => false, 'error' => 'Add at least one supplier URL']);
    $src = load_json($SOURCES_PATH, []);
    $existing = catalog_map();
    if (isset($src[$slug]) || isset($existing[$slug])) out(400, ['ok' => false, 'error' => 'That product already exists']);
    $src[$slug] = [
        'name' => $name,
        'code' => make_code($urls, $name),
        'sources' => $urls,
    ];
    save_json($SOURCES_PATH, $src);
    $items = catalog();
    $items[] = [
        'slug' => $slug,
        'name' => $name,
        'category' => $category,
        'color' => $CAT_COLOR[$category] ?? '#2563eb',
        'blurb' => $blurb !== '' ? $blurb : ($name . ' in Nepal. Ask for today’s rate on WhatsApp.'),
        'code' => $src[$slug]['code'],
        'hidden' => false,
    ];
    write_catalog($items);
    $sh = load_json($SHEET_PATH, []);
    if (!isset($sh[$slug])) $sh[$slug] = [];
    save_json($SHEET_PATH, $sh);
    publish_availability($sh);
    $rows = array_values(array_filter(merge_rows(), function ($r) use ($slug) { return $r['slug'] === $slug; }));
    out(200, ['ok' => true, 'rows' => $rows]);
}

if ($action === 'hide') {
    global $SOURCES_PATH;
    $slug = (string) ($payload['slug'] ?? '');
    $hidden = !empty($payload['hidden']);
    $src = load_json($SOURCES_PATH, []);
    if (!isset($src[$slug])) out(400, ['ok' => false, 'error' => 'unknown product']);
    $items = catalog();
    $found = false;
    foreach ($items as &$p) {
        if (is_array($p) && ($p['slug'] ?? '') === $slug) {
            $p['hidden'] = $hidden;
            $found = true;
            break;
        }
    }
    unset($p);
    if (!$found) {
        $meta = $src[$slug];
        $items[] = [
            'slug' => $slug,
            'name' => $meta['name'] ?? $slug,
            'category' => 'productivity',
            'color' => '#0f172a',
            'blurb' => '',
            'code' => $meta['code'] ?? '',
            'hidden' => $hidden,
        ];
    }
    write_catalog($items);
    $rows = array_values(array_filter(merge_rows(), function ($r) use ($slug) { return $r['slug'] === $slug; }));
    out(200, ['ok' => true, 'rows' => $rows]);
}

if ($action === 'delete') {
    global $SOURCES_PATH, $SHEET_PATH;
    $slug = (string) ($payload['slug'] ?? '');
    $src = load_json($SOURCES_PATH, []);
    if (!isset($src[$slug])) out(400, ['ok' => false, 'error' => 'unknown product']);
    unset($src[$slug]);
    save_json($SOURCES_PATH, $src);
    write_catalog(array_values(array_filter(catalog(), function ($p) use ($slug) {
        return !(is_array($p) && ($p['slug'] ?? '') === $slug);
    })));
    $sh = load_json($SHEET_PATH, []);
    unset($sh[$slug]);
    save_json($SHEET_PATH, $sh);
    publish_availability($sh);
    out(200, ['ok' => true, 'deleted' => $slug, 'rows' => []]);
}

out(400, ['ok' => false, 'error' => 'unknown action']);
