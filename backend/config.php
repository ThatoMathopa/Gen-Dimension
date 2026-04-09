<?php
// ===========================
// Gen Dimension — Backend Config
// ===========================

// ── Catch ALL PHP errors and return JSON so the JS never gets an HTML page ──
ini_set('display_errors', 0);
error_reporting(E_ALL);

set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
        header('Access-Control-Allow-Origin: *');
    }
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit();
});

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
            header('Access-Control-Allow-Origin: *');
        }
        http_response_code(500);
        echo json_encode(['error' => 'Fatal error: ' . $err['message']]);
        exit();
    }
});

// ── Database ─────────────────────────────────────────────────────
define('DB_HOST',    'localhost');
define('DB_NAME',    'gendimen_DB');
define('DB_USER',    'gendimen_admin');
define('DB_PASS',    'gendimension2025');
define('DB_CHARSET', 'utf8mb4');

// ── Admin ─────────────────────────────────────────────────────────
define('ADMIN_PASSWORD', 'GenDim@2025');

// ── Site ──────────────────────────────────────────────────────────
define('ADMIN_EMAIL',     'hello@gendimension.co.za');
define('WHATSAPP_NUMBER', '27798796513');
define('SITE_URL',        'https://gendimension.co.za');

// ── PayFast ───────────────────────────────────────────────────────
define('PAYFAST_MERCHANT_ID',  '34464777');
define('PAYFAST_MERCHANT_KEY', 'dlafzyubih35x');
define('PAYFAST_PASSPHRASE',   '');
define('PAYFAST_SANDBOX',      true);

// ── CORS Headers ─────────────────────────────────────────────────
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=UTF-8');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// ── PDO Connection ────────────────────────────────────────────────
function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST
         . ';dbname='    . DB_NAME
         . ';charset='   . DB_CHARSET;

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception('Database connection failed: ' . $e->getMessage());
    }
}

// ── Email Helper ──────────────────────────────────────────────────
function sendMail($to, $subject, $body, $replyTo = null) {
    $from    = ADMIN_EMAIL;
    $replyTo = $replyTo ?: $from;

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: Gen Dimension <{$from}>\r\n";
    $headers .= "Reply-To: {$replyTo}\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

    return mail($to, $subject, $body, $headers);
}

// ── Admin session guard ───────────────────────────────────────────
function requireAdminAuth() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['gd_admin'])) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorised']);
        exit();
    }
}

// ── JSON response helpers ─────────────────────────────────────────
function jsonOk($data = []) {
    echo json_encode($data);
    exit();
}

function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}
