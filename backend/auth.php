<?php
// ===========================
// Gen Dimension — Auth API
// ===========================
require_once 'config.php';

setCorsHeaders();

try {
    $db = getDB();
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode(['error' => 'Database unavailable: ' . $e->getMessage()]);
    exit();
}

// ── Create tables ─────────────────────────────────────────────
$db->exec("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    avatar_initials VARCHAR(3),
    address TEXT,
    province VARCHAR(50),
    postal_code VARCHAR(10),
    email_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(64),
    reset_token VARCHAR(64),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active TINYINT(1) DEFAULT 1
)");

$db->exec("CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS user_wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    product_name VARCHAR(100),
    product_price DECIMAL(10,2),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)");

function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

function getAuthUser($db) {
    $token = $_COOKIE['gd_session'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $token = str_replace('Bearer ', '', $token);
    if (!$token) return null;
    $stmt = $db->prepare(
        "SELECT u.* FROM users u
         JOIN user_sessions s ON u.id = s.user_id
         WHERE s.session_token = ?
         AND s.expires_at > NOW()
         AND u.is_active = 1"
    );
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

function sendVerificationEmail($email, $name, $token) {
    $link    = SITE_URL . '/verify.html?token=' . $token;
    $subject = 'Verify your Gen Dimension account';
    $body    = "Dear $name,\n\n"
             . "Welcome to Gen Dimension! Please verify your email:\n\n"
             . "$link\n\n"
             . "This link expires in 24 hours.\n\n"
             . "Gen Dimension Team\n"
             . "hello@gendimension.co.za";
    mail($email, $subject, $body,
        "From: hello@gendimension.co.za\r\n"
        . "Reply-To: hello@gendimension.co.za");
}

function sendWelcomeEmail($email, $name) {
    $subject = "Welcome to Gen Dimension, $name!";
    $body    = "Dear $name,\n\n"
             . "Your account has been verified. Welcome to Gen Dimension!\n\n"
             . "You can now:\n"
             . "- Track your orders\n"
             . "- Save items to your wishlist\n"
             . "- Manage your delivery addresses\n"
             . "- View your order history\n\n"
             . "Shop now: " . SITE_URL . "\n\n"
             . "Questions? WhatsApp: https://wa.me/" . WHATSAPP_NUMBER . "\n\n"
             . "Thato Mathopa & Vongani Costa Chauke\n"
             . "Gen Dimension";
    mail($email, $subject, $body,
        "From: hello@gendimension.co.za\r\n"
        . "Reply-To: hello@gendimension.co.za");
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── REGISTER ──────────────────────────────────────────────────
if ($method === 'POST' && $action === 'register') {
    $data      = json_decode(file_get_contents('php://input'), true);
    $firstName = trim($data['firstName'] ?? '');
    $lastName  = trim($data['lastName']  ?? '');
    $email     = trim($data['email']     ?? '');
    $phone     = trim($data['phone']     ?? '');
    $password  = $data['password']       ?? '';

    if (!$firstName || !$lastName || !$email || !$password) {
        echo json_encode(['error' => 'All fields are required']); exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['error' => 'Invalid email address']); exit();
    }
    if (strlen($password) < 8) {
        echo json_encode(['error' => 'Password must be at least 8 characters']); exit();
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'An account with this email already exists']); exit();
    }

    $hash     = password_hash($password, PASSWORD_BCRYPT);
    $initials = strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1));
    $verToken = generateToken();

    $stmt = $db->prepare(
        "INSERT INTO users
         (first_name, last_name, email, phone, password_hash, avatar_initials, verification_token)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$firstName, $lastName, $email, $phone, $hash, $initials, $verToken]);

    sendVerificationEmail($email, $firstName, $verToken);

    echo json_encode([
        'success' => true,
        'message' => 'Account created! Please check your email to verify.',
    ]);
    exit();
}

// ── VERIFY EMAIL ──────────────────────────────────────────────
if ($method === 'GET' && $action === 'verify') {
    $token = $_GET['token'] ?? '';
    $stmt  = $db->prepare("SELECT * FROM users WHERE verification_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        echo json_encode(['error' => 'Invalid or expired token']); exit();
    }
    $db->prepare(
        "UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?"
    )->execute([$user['id']]);
    sendWelcomeEmail($user['email'], $user['first_name']);
    echo json_encode(['success' => true, 'message' => 'Email verified! You can now log in.']);
    exit();
}

// ── LOGIN ─────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $email    = trim($data['email']    ?? '');
    $password = $data['password']      ?? '';
    $remember = $data['remember']      ?? false;

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        echo json_encode(['error' => 'Incorrect email or password']); exit();
    }
    if (!$user['email_verified']) {
        echo json_encode(['error' => 'Please verify your email before logging in.']); exit();
    }

    $sessionToken = generateToken();
    $expires      = $remember
        ? date('Y-m-d H:i:s', strtotime('+30 days'))
        : date('Y-m-d H:i:s', strtotime('+24 hours'));

    $db->prepare(
        "INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
    )->execute([$user['id'], $sessionToken, $expires]);

    $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

    $cookieExpiry = $remember ? time() + (30 * 24 * 3600) : 0;
    setcookie('gd_session', $sessionToken, [
        'expires'  => $cookieExpiry,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);

    echo json_encode([
        'success' => true,
        'token'   => $sessionToken,
        'user'    => [
            'id'        => $user['id'],
            'firstName' => $user['first_name'],
            'lastName'  => $user['last_name'],
            'email'     => $user['email'],
            'phone'     => $user['phone'],
            'initials'  => $user['avatar_initials'],
            'address'   => $user['address'],
            'province'  => $user['province'],
        ],
    ]);
    exit();
}

// ── LOGOUT ────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    $token = $_COOKIE['gd_session'] ?? '';
    if ($token) {
        $db->prepare("DELETE FROM user_sessions WHERE session_token = ?")->execute([$token]);
        setcookie('gd_session', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
    echo json_encode(['success' => true]);
    exit();
}

// ── GET CURRENT USER ──────────────────────────────────────────
if ($method === 'GET' && $action === 'me') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $stmt = $db->prepare("SELECT COUNT(*) as c FROM orders WHERE customer_email = ?");
    $stmt->execute([$user['email']]);
    $orderCount = (int) $stmt->fetch()['c'];

    echo json_encode([
        'success' => true,
        'user'    => [
            'id'          => $user['id'],
            'firstName'   => $user['first_name'],
            'lastName'    => $user['last_name'],
            'email'       => $user['email'],
            'phone'       => $user['phone'],
            'initials'    => $user['avatar_initials'],
            'address'     => $user['address'],
            'province'    => $user['province'],
            'postalCode'  => $user['postal_code'],
            'orderCount'  => $orderCount,
            'memberSince' => date('F Y', strtotime($user['created_at'])),
        ],
    ]);
    exit();
}

// ── UPDATE PROFILE ────────────────────────────────────────────
if ($method === 'PATCH' && $action === 'profile') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $db->prepare(
        "UPDATE users SET
            first_name = ?, last_name = ?, phone = ?,
            address = ?, province = ?, postal_code = ?,
            avatar_initials = ?
         WHERE id = ?"
    )->execute([
        $data['firstName']  ?? $user['first_name'],
        $data['lastName']   ?? $user['last_name'],
        $data['phone']      ?? $user['phone'],
        $data['address']    ?? $user['address'],
        $data['province']   ?? $user['province'],
        $data['postalCode'] ?? $user['postal_code'],
        strtoupper(
            substr($data['firstName'] ?? $user['first_name'], 0, 1) .
            substr($data['lastName']  ?? $user['last_name'],  0, 1)
        ),
        $user['id'],
    ]);
    echo json_encode(['success' => true]);
    exit();
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
if ($method === 'POST' && $action === 'forgot-password') {
    $data  = json_decode(file_get_contents('php://input'), true);
    $email = trim($data['email'] ?? '');
    $stmt  = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        $token   = generateToken();
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
        $db->prepare(
            "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?"
        )->execute([$token, $expires, $user['id']]);
        $link = SITE_URL . '/reset-password.html?token=' . $token;
        mail($email,
            'Reset your Gen Dimension password',
            "Hi {$user['first_name']},\n\n"
            . "Click to reset your password (expires in 1 hour):\n\n"
            . "$link\n\n"
            . "If you didn't request this, ignore this email.\n\n"
            . "Gen Dimension Team",
            "From: hello@gendimension.co.za"
        );
    }
    echo json_encode([
        'success' => true,
        'message' => 'If that email exists we sent a reset link.',
    ]);
    exit();
}

// ── RESET PASSWORD ────────────────────────────────────────────
if ($method === 'POST' && $action === 'reset-password') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $token    = $data['token']    ?? '';
    $password = $data['password'] ?? '';
    if (strlen($password) < 8) {
        echo json_encode(['error' => 'Password must be at least 8 characters']); exit();
    }
    $stmt = $db->prepare(
        "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()"
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        echo json_encode(['error' => 'Invalid or expired reset link']); exit();
    }
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $db->prepare(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?"
    )->execute([$hash, $user['id']]);
    echo json_encode(['success' => true, 'message' => 'Password updated! You can now log in.']);
    exit();
}

// ── WISHLIST — GET ────────────────────────────────────────────
if ($method === 'GET' && $action === 'wishlist') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $stmt = $db->prepare(
        "SELECT * FROM user_wishlist WHERE user_id = ? ORDER BY added_at DESC"
    );
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll());
    exit();
}

// ── WISHLIST — ADD ────────────────────────────────────────────
if ($method === 'POST' && $action === 'wishlist') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $data = json_decode(file_get_contents('php://input'), true);
    try {
        $db->prepare(
            "INSERT INTO user_wishlist (user_id, product_id, product_name, product_price)
             VALUES (?, ?, ?, ?)"
        )->execute([$user['id'], $data['productId'], $data['productName'], $data['productPrice']]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['error' => 'Already in wishlist']);
    }
    exit();
}

// ── WISHLIST — REMOVE ─────────────────────────────────────────
if ($method === 'DELETE' && $action === 'wishlist') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $productId = $_GET['productId'] ?? '';
    $db->prepare(
        "DELETE FROM user_wishlist WHERE user_id = ? AND product_id = ?"
    )->execute([$user['id'], $productId]);
    echo json_encode(['success' => true]);
    exit();
}

// ── USER ORDERS ───────────────────────────────────────────────
if ($method === 'GET' && $action === 'orders') {
    $user = getAuthUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']); exit();
    }
    $stmt = $db->prepare(
        "SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC"
    );
    $stmt->execute([$user['email']]);
    $orders = $stmt->fetchAll();
    foreach ($orders as &$o) {
        $o['items'] = json_decode($o['items'], true);
    }
    echo json_encode($orders);
    exit();
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
