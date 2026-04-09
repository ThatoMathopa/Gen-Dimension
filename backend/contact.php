<?php
// ===========================
// Gen Dimension — Contact API
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// Listing contact submissions is admin-only
if ($method === 'GET') {
    requireAdminAuth();
}

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

// ── POST — Save contact submission ────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $name    = trim($data['name']    ?? '');
    $email   = trim($data['email']   ?? '');
    $subject = trim($data['subject'] ?? '');
    $message = trim($data['message'] ?? '');

    if (!$name || !$email || !$message) {
        jsonError('Name, email and message are required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address');
    }

    $stmt = $db->prepare(
        "INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$name, $email, $subject, $message]);

    $timestamp = date('Y-m-d H:i:s');

    // Admin notification email
    $adminBody = "New Contact Form Submission — Gen Dimension\n\n"
        . "Name:    {$name}\n"
        . "Email:   {$email}\n"
        . "Subject: {$subject}\n"
        . "Date:    {$timestamp}\n\n"
        . "Message:\n{$message}\n\n"
        . "Reply directly to: {$email}";

    sendMail(ADMIN_EMAIL, "New Contact Form: {$subject}", $adminBody, $email);

    // Auto-reply to customer
    $replyBody = "Dear {$name},\n\n"
        . "Thank you for reaching out to Gen Dimension! We have received your message "
        . "and will get back to you within 24 hours.\n\n"
        . "For a faster response, WhatsApp us: https://wa.me/" . WHATSAPP_NUMBER . "\n\n"
        . "Gen Dimension Team\n"
        . SITE_URL;

    sendMail($email, 'We received your message — Gen Dimension', $replyBody);

    jsonOk(['success' => true]);
}

// ── GET — Fetch all contacts (admin) ──────────────────────────────
if ($method === 'GET') {
    $stmt = $db->query(
        "SELECT id, name, email, subject, message, created_at
         FROM contacts ORDER BY created_at DESC"
    );
    jsonOk($stmt->fetchAll());
}

jsonError('Method not allowed', 405);
