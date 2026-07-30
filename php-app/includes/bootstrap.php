<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

define('APP_ROOT', dirname(__DIR__));

if (!file_exists(APP_ROOT . '/config.php')) {
    header('Location: ' . (str_contains($_SERVER['SCRIPT_NAME'] ?? '', '/admin/') ? '../install.php' : 'install.php'));
    exit;
}

$CONFIG = require APP_ROOT . '/config.php';

function db(): PDO
{
    static $pdo = null;
    global $CONFIG;
    if ($pdo === null) {
        $d = $CONFIG['db'];
        $pdo = new PDO("mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function setting(string $key, ?string $default = null): ?string
{
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        foreach (db()->query('SELECT `key`, `value` FROM settings') as $row) {
            $cache[$row['key']] = $row['value'];
        }
    }
    return $cache[$key] ?? $default;
}

function set_setting(string $key, string $value): void
{
    $st = db()->prepare('INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)');
    $st->execute([$key, $value]);
}

function h($v): string { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }
function uid(): string { return bin2hex(random_bytes(16)); }
function money(int $cents): string { return 'R$ ' . number_format($cents / 100, 2, ',', '.'); }

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    return $_SESSION['csrf'];
}

function csrf_check(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !hash_equals($_SESSION['csrf'] ?? '', $_POST['_csrf'] ?? '')) {
        http_response_code(400);
        exit('Sessao expirada. Recarregue a pagina.');
    }
}

function fingerprint(): string
{
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $ip = trim(explode(',', (string) $ip)[0]);
    return hash('sha256', $ip . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''));
}

function current_user(): ?array
{
    static $user = null;
    if ($user !== null) { return $user ?: null; }
    if (empty($_SESSION['uid'])) { $user = false; return null; }
    $st = db()->prepare('SELECT * FROM users WHERE id = ?');
    $st->execute([$_SESSION['uid']]);
    $user = $st->fetch() ?: false;
    return $user ?: null;
}

function require_login(string $redirect = 'index.php'): array
{
    $u = current_user();
    if (!$u) { header('Location: ' . $redirect); exit; }
    return $u;
}

function require_admin(): array
{
    $u = require_login('../index.php');
    if (($u['role'] ?? '') !== 'admin') { http_response_code(403); exit('Acesso restrito.'); }
    return $u;
}

function is_admin(): bool { $u = current_user(); return $u && $u['role'] === 'admin'; }

function base_url(): string
{
    $configured = setting('site_url');
    if ($configured) { return rtrim($configured, '/'); }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}
