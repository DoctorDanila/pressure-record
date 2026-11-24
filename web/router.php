<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/index.php';
    return true;
}

$file = __DIR__ . $path;

if ($path !== '/' && is_file($file)) {
    return false;
}

// Не подменяем отсутствующие frontend assets страницей приложения
if (str_starts_with($path, '/dist/')) {
    http_response_code(404);
    return true;
}

// SPA
$spaIndex = __DIR__ . '/dist/index.html';

if (is_file($spaIndex)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($spaIndex);
    return true;
}

// Если frontend ещё не собран
$entryScript = __DIR__ . '/index.php';

$_SERVER['SCRIPT_FILENAME'] = $entryScript;
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require $entryScript;

return true;
