<?php
// ===========================
// Gen Dimension — Newsletter API
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// Admin-only methods
if (in_array($method, ['GET', 'DELETE'])) {
    requireAdminAuth();
}

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

// ── POST — Subscribe ──────────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $email = trim($data['email'] ?? '');

    if (!$email) jsonError('Email is required');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email address');

    // Check duplicate
    $check = $db->prepare("SELECT id FROM newsletter WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonOk(['success' => false, 'error' => 'Already subscribed']);
    }

    $stmt = $db->prepare("INSERT INTO newsletter (email) VALUES (?)");
    $stmt->execute([$email]);

    // Welcome email to subscriber
    $body = "Welcome to the Gen Dimension Edit!\n\n"
          . "Thank you for subscribing! You'll be the first to know about "
          . "new arrivals, design tips, and exclusive offers from Gen Dimension.\n\n"
          . "Visit us: " . SITE_URL . "\n\n"
          . "Unsubscribe: reply with UNSUBSCRIBE\n\n"
          . "Gen Dimension Team";

    sendMail($email, 'Welcome to the Gen Dimension Edit', $body);

    jsonOk(['success' => true]);
}

// ── GET — Fetch all subscribers (admin) ───────────────────────────
if ($method === 'GET') {
    $stmt = $db->query("SELECT id, email, subscribed_at FROM newsletter ORDER BY subscribed_at DESC");
    jsonOk($stmt->fetchAll());
}

// ── DELETE — Remove subscriber ────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonError('Missing subscriber ID');

    $stmt = $db->prepare("DELETE FROM newsletter WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonError('Subscriber not found', 404);

    jsonOk(['success' => true]);
}

jsonError('Method not allowed', 405);
