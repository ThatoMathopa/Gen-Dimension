<?php
// ===========================
// Gen Dimension — Admin Auth
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// ── POST — Login ──────────────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $pass = $data['password'] ?? '';

    if ($pass === ADMIN_PASSWORD) {
        $_SESSION['gd_admin'] = true;
        jsonOk(['success' => true]);
    } else {
        jsonError('Incorrect password', 401);
    }
}

// ── GET — Check session ───────────────────────────────────────────
if ($method === 'GET') {
    jsonOk(['authenticated' => !empty($_SESSION['gd_admin'])]);
}

// ── DELETE — Logout ───────────────────────────────────────────────
if ($method === 'DELETE') {
    session_destroy();
    jsonOk(['success' => true]);
}

jsonError('Method not allowed', 405);
