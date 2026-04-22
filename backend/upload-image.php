<?php
// ===========================
// Gen Dimension — Product Image Upload
// POST  multipart/form-data: product_id, image (file)
// DELETE application/json:   { product_id }
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();
requireAdminAuth();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

$uploadDir     = __DIR__ . '/../images/products/';
$uploadUrlBase = 'images/products/';

// Create upload directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// ── POST — Upload image ────────────────────────────────────────────
if ($method === 'POST') {
    $productId = intval($_POST['product_id'] ?? 0);
    if (!$productId) jsonError('Missing product_id');

    $file = $_FILES['image'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        $errMap = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form size limit.',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on server.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        ];
        $msg = $errMap[$file['error'] ?? 0] ?? 'Upload error.';
        jsonError($msg);
    }

    // Validate MIME type via file content (not the browser-supplied type)
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mime     = $finfo->file($file['tmp_name']);
    $allowed  = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];
    if (!isset($allowed[$mime])) {
        jsonError('Invalid file type. Allowed: JPG, PNG, WebP, GIF.');
    }

    // Max 5 MB
    if ($file['size'] > 5 * 1024 * 1024) {
        jsonError('File too large. Maximum 5 MB.');
    }

    // Delete any existing image for this product
    $existing = $db->prepare("SELECT image FROM products WHERE id = ?");
    $existing->execute([$productId]);
    $oldUrl = $existing->fetchColumn();
    if ($oldUrl && strpos($oldUrl, $uploadUrlBase) === 0) {
        $oldPath = __DIR__ . '/../' . $oldUrl;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    // Build unique filename: {productId}_{random}.{ext}
    $ext      = $allowed[$mime];
    $filename = $productId . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $dest     = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        jsonError('Failed to save file. Check server folder permissions.');
    }

    $url = $uploadUrlBase . $filename;

    // Update the product record
    $stmt = $db->prepare("UPDATE products SET image = ? WHERE id = ?");
    $stmt->execute([$url, $productId]);

    jsonOk(['success' => true, 'url' => $url]);
}

// ── DELETE — Remove image ──────────────────────────────────────────
if ($method === 'DELETE') {
    $raw       = file_get_contents('php://input');
    $data      = json_decode($raw, true);
    $productId = intval($data['product_id'] ?? 0);
    if (!$productId) jsonError('Missing product_id');

    // Delete the file from disk
    $existing = $db->prepare("SELECT image FROM products WHERE id = ?");
    $existing->execute([$productId]);
    $oldUrl = $existing->fetchColumn();
    if ($oldUrl && strpos($oldUrl, $uploadUrlBase) === 0) {
        $oldPath = __DIR__ . '/../' . $oldUrl;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }

    // Clear the image field in DB
    $stmt = $db->prepare("UPDATE products SET image = '' WHERE id = ?");
    $stmt->execute([$productId]);

    jsonOk(['success' => true]);
}

jsonError('Method not allowed', 405);
