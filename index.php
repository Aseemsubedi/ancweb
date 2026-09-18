<?php
$home = __DIR__ . DIRECTORY_SEPARATOR . 'index.html';
header('Content-Type: text/html; charset=UTF-8');

if (!is_readable($home) || filesize($home) < 500) {
  http_response_code(500);
  echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Aseem and Consulting</title></head><body>';
  echo '<p>The homepage file is missing on the server. Email <a href="mailto:info@anc.com.np">info@anc.com.np</a>.</p>';
  echo '</body></html>';
  exit;
}

readfile($home);
