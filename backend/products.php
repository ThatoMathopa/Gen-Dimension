<?php
// ===========================
// Gen Dimension — Products API
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// Admin-only methods
if (in_array($method, ['POST', 'DELETE'])) {
    requireAdminAuth();
}

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

// ── GET — list all products ───────────────────────────────────────
if ($method === 'GET') {
    $stmt = $db->query(
        "SELECT id, name, category, price, description, image FROM products ORDER BY id ASC"
    );
    jsonOk($stmt->fetchAll());
}

// ── POST — add new product ────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $name        = trim($data['name']        ?? '');
    $category    = trim($data['category']    ?? '');
    $price       = floatval($data['price']   ?? 0);
    $description = trim($data['description'] ?? '');
    $image       = trim($data['image']       ?? '');

    if (!$name) jsonError('Product name is required');
    if ($price <= 0) jsonError('Price must be greater than zero');

    $stmt = $db->prepare(
        "INSERT INTO products (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$name, $category, $price, $description, $image]);

    jsonOk(['success' => true, 'id' => (int) $db->lastInsertId()]);
}

// ── DELETE — remove product ───────────────────────────────────────
if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonError('Product ID required');

    $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);
    jsonOk(['success' => true]);
}

jsonError('Method not allowed', 405);
