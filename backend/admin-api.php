<?php
// ===========================
// Gen Dimension — Admin API
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();
requireAdminAuth();

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

$action = $_GET['action'] ?? '';

// ── Stats ─────────────────────────────────────────────────────────
if ($action === 'stats') {
    $total      = (int) $db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $revenue    = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")->fetchColumn();
    $new        = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='new'")->fetchColumn();
    $processing = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='processing'")->fetchColumn();
    $done       = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='done'")->fetchColumn();
    $nlCount    = (int) $db->query("SELECT COUNT(*) FROM newsletter")->fetchColumn();
    $ctCount    = (int) $db->query("SELECT COUNT(*) FROM contacts")->fetchColumn();

    jsonOk([
        'total'           => $total,
        'revenue'         => $revenue,
        'new'             => $new,
        'processing'      => $processing,
        'done'            => $done,
        'newsletterCount' => $nlCount,
        'contactsCount'   => $ctCount,
    ]);
}

// ── Dashboard — combined data ─────────────────────────────────────
if ($action === 'dashboard') {
    $total      = (int) $db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $revenue    = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")->fetchColumn();
    $new        = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='new'")->fetchColumn();
    $processing = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='processing'")->fetchColumn();
    $done       = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='done'")->fetchColumn();
    $nlCount    = (int) $db->query("SELECT COUNT(*) FROM newsletter")->fetchColumn();

    // Last 5 orders
    $recentOrders = $db->query(
        "SELECT id, customer_name, customer_email, total, status, payment_status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 5"
    )->fetchAll();

    // Last 3 contacts
    $recentContacts = $db->query(
        "SELECT id, name, email, subject, created_at
         FROM contacts ORDER BY created_at DESC LIMIT 3"
    )->fetchAll();

    jsonOk([
        'stats' => [
            'total'      => $total,
            'revenue'    => $revenue,
            'new'        => $new,
            'processing' => $processing,
            'done'       => $done,
        ],
        'recentOrders'   => $recentOrders,
        'recentContacts' => $recentContacts,
        'newsletterCount' => $nlCount,
    ]);
}

// ── Contacts — all submissions ────────────────────────────────────
if ($action === 'contacts') {
    $rows = $db->query(
        "SELECT id, name, email, subject, message, created_at
         FROM contacts ORDER BY created_at DESC"
    )->fetchAll();
    jsonOk($rows);
}

// ── Export Orders CSV ─────────────────────────────────────────────
if ($action === 'export-orders') {
    $date = date('Y-m-d');
    header('Content-Type: text/csv; charset=UTF-8');
    header("Content-Disposition: attachment; filename=\"gendimension-orders-{$date}.csv\"");
    // Remove JSON header set by setCorsHeaders
    header_remove('Content-Type');
    header('Content-Type: text/csv; charset=UTF-8');

    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM

    fputcsv($out, [
        'Order ID', 'Name', 'Email', 'Phone', 'Items',
        'Products Total', 'Delivery Province', 'Delivery Fee', 'Grand Total',
        'Address', 'Notes', 'Payment Method', 'Payment Status', 'Status', 'Date',
    ]);

    $stmt = $db->query("SELECT * FROM orders ORDER BY created_at DESC");
    while ($row = $stmt->fetch()) {
        $items = json_decode($row['items'], true) ?: [];
        $itemStr = implode(' | ', array_map(
            fn($i) => "{$i['name']} x{$i['qty']} @ R" . number_format($i['price'], 2),
            $items
        ));

        $grandTotal    = (float)($row['total']        ?? 0);
        $deliveryFee   = (float)($row['delivery_fee'] ?? 0);
        $productsTotal = $grandTotal - $deliveryFee;

        fputcsv($out, [
            $row['id'],
            $row['customer_name'],
            $row['customer_email'],
            $row['customer_phone'],
            $itemStr,
            number_format($productsTotal, 2),
            $row['delivery_province'] ?? 'Gauteng',
            number_format($deliveryFee, 2),
            number_format($grandTotal, 2),
            $row['delivery_address'],
            $row['notes'],
            $row['payment_method'],
            $row['payment_status'],
            $row['status'],
            $row['created_at'],
        ]);
    }

    fclose($out);
    exit();
}

// ── Export Newsletter CSV ─────────────────────────────────────────
if ($action === 'export-newsletter') {
    $date = date('Y-m-d');
    header_remove('Content-Type');
    header('Content-Type: text/csv; charset=UTF-8');
    header("Content-Disposition: attachment; filename=\"gendimension-newsletter-{$date}.csv\"");

    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

    fputcsv($out, ['ID', 'Email', 'Subscribed At']);

    $stmt = $db->query("SELECT id, email, subscribed_at FROM newsletter ORDER BY subscribed_at DESC");
    while ($row = $stmt->fetch()) {
        fputcsv($out, [$row['id'], $row['email'], $row['subscribed_at']]);
    }

    fclose($out);
    exit();
}

// ── Users ─────────────────────────────────────────────────────
if ($action === 'users') {
    $users = $db->query(
        "SELECT u.id, u.first_name, u.last_name, u.email,
                u.phone, u.province, u.email_verified,
                u.created_at, u.last_login,
                COUNT(o.id) as order_count
         FROM users u
         LEFT JOIN orders o ON u.email = o.customer_email
         GROUP BY u.id
         ORDER BY u.created_at DESC"
    )->fetchAll();
    jsonOk($users);
}

jsonError('Unknown action', 400);
