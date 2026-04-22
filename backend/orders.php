<?php
// ===========================
// Gen Dimension — Orders API
// ===========================
require_once 'config.php';
session_start();
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

// Admin-only methods
if (in_array($method, ['GET', 'PATCH', 'DELETE'])) {
    requireAdminAuth();
}

try {
    $db = getDB();
} catch (Exception $e) {
    jsonError('Database unavailable: ' . $e->getMessage(), 503);
}

// ── GET ───────────────────────────────────────────────────────────
if ($method === 'GET') {

    // Stats
    if (isset($_GET['stats'])) {
        $total      = (int) $db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $revenue    = (float) $db->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid'")->fetchColumn();
        $new        = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='new'")->fetchColumn();
        $processing = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='processing'")->fetchColumn();
        $done       = (int) $db->query("SELECT COUNT(*) FROM orders WHERE status='done'")->fetchColumn();
        $unpaid     = (int) $db->query("SELECT COUNT(*) FROM orders WHERE payment_status='unpaid'")->fetchColumn();

        jsonOk([
            'total'      => $total,
            'revenue'    => $revenue,
            'new'        => $new,
            'processing' => $processing,
            'done'       => $done,
            'unpaid'     => $unpaid,
        ]);
    }

    // Single order by ID
    if (isset($_GET['id'])) {
        $stmt = $db->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([trim($_GET['id'])]);
        $order = $stmt->fetch();
        if (!$order) jsonError('Order not found', 404);
        $order['items'] = json_decode($order['items'], true);
        jsonOk($order);
    }

    // List with optional search + status filter
    $where  = [];
    $params = [];

    if (!empty($_GET['search'])) {
        $q        = '%' . $_GET['search'] . '%';
        $where[]  = "(id LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)";
        $params[] = $q;
        $params[] = $q;
        $params[] = $q;
    }

    if (!empty($_GET['status'])) {
        $where[]  = "status = ?";
        $params[] = $_GET['status'];
    }

    $sql  = "SELECT * FROM orders";
    if ($where) $sql .= " WHERE " . implode(" AND ", $where);
    $sql .= " ORDER BY created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    foreach ($orders as &$o) {
        $o['items'] = json_decode($o['items'], true);
    }
    unset($o);

    jsonOk($orders);
}

// ── POST — Create order ───────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) jsonError('Invalid JSON body');

    $customer        = $data['customer'] ?? [];
    $name            = trim($customer['name']    ?? '');
    $email           = trim($customer['email']   ?? '');
    $phone           = trim($customer['phone']   ?? '');
    $address         = trim($customer['address'] ?? '');
    $notes           = trim($customer['notes']   ?? '');
    $items           = $data['items']            ?? [];
    $total           = (float)($data['total']            ?? 0);
    $productSubtotal = (float)($data['productSubtotal']  ?? $total);
    $deliveryFee     = (float)($data['deliveryFee']       ?? 150);
    $deliveryProvince= trim($data['deliveryProvince']     ?? 'Gauteng');
    $method_p        = trim($data['paymentMethod']        ?? 'pending');

    if (!$name || !$email || !$phone || !$address) {
        jsonError('Missing required fields: name, email, phone, address');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email address');
    }
    if (empty($items)) {
        jsonError('Order must contain at least one item');
    }
    if ($total <= 0) {
        jsonError('Invalid order total');
    }

    // Generate unique order ID: GD- + 6 random uppercase chars
    do {
        $chars   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $orderId = 'GD-';
        for ($i = 0; $i < 6; $i++) {
            $orderId .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $exists = $db->prepare("SELECT COUNT(*) FROM orders WHERE id = ?");
        $exists->execute([$orderId]);
    } while ($exists->fetchColumn() > 0);

    $stmt = $db->prepare(
        "INSERT INTO orders
         (id, customer_name, customer_email, customer_phone,
          delivery_address, items, total, notes,
          payment_method, payment_status, status,
          delivery_province, delivery_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'new', ?, ?)"
    );
    $stmt->execute([
        $orderId,
        $name,
        $email,
        $phone,
        $address,
        json_encode($items),
        $total,
        $notes,
        $method_p,
        $deliveryProvince,
        $deliveryFee,
    ]);

    // Build item summary for emails
    $itemLines = array_map(fn($i) => "  {$i['name']} x{$i['qty']} — R" . number_format($i['price'], 2), $items);
    $itemStr   = implode("\n", $itemLines);

    // Admin notification email
    $adminBody = "New Order Received — Gen Dimension\n\n"
        . "Order ID: {$orderId}\n"
        . "Name: {$name}\n"
        . "Email: {$email}\n"
        . "Phone: {$phone}\n"
        . "Address: {$address}\n"
        . "Notes: {$notes}\n\n"
        . "Items:\n{$itemStr}\n\n"
        . "Delivery Province: {$deliveryProvince}\n"
        . "Delivery Fee: R" . number_format($deliveryFee, 2) . "\n"
        . "Products Total: R" . number_format($productSubtotal, 2) . "\n"
        . "Grand Total: R" . number_format($total, 2) . "\n"
        . "Payment Method: {$method_p}\n"
        . "Date: " . date('Y-m-d H:i:s') . "\n\n"
        . "View admin: " . SITE_URL . "/admin.html";

    sendMail(ADMIN_EMAIL, "New Order {$orderId} — Gen Dimension", $adminBody);

    // Customer confirmation email
    $courierNote = ($deliveryProvince !== 'Gauteng')
        ? "We use The Courier Guy for deliveries outside Gauteng.\nTracking details will be sent once your order is dispatched.\n"
        : "";

    $custBody = "Thank you for your order, {$name}!\n\n"
        . "Order ID: {$orderId}\n\n"
        . "Items:\n{$itemStr}\n\n"
        . "Products Total: R" . number_format($productSubtotal, 2) . "\n"
        . "Delivery to: {$deliveryProvince}\n"
        . "Delivery fee: R" . number_format($deliveryFee, 2) . "\n"
        . "Grand Total: R" . number_format($total, 2) . "\n\n"
        . "Delivery Address: {$address}\n\n"
        . $courierNote
        . "We will contact you within 24 hours to confirm delivery details.\n"
        . "For faster response, WhatsApp us: https://wa.me/" . WHATSAPP_NUMBER . "\n\n"
        . "Gen Dimension Team\n"
        . SITE_URL;

    sendMail($email, "Order Confirmed — {$orderId} | Gen Dimension", $custBody);

    jsonOk(['success' => true, 'orderId' => $orderId]);
}

// ── PATCH — Update status ─────────────────────────────────────────
if ($method === 'PATCH') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $id     = trim($data['id']     ?? '');
    $status = trim($data['status'] ?? '');

    $valid = ['new', 'processing', 'done', 'cancelled'];
    if (!$id) jsonError('Missing order ID');
    if (!in_array($status, $valid)) jsonError('Invalid status. Valid: ' . implode(', ', $valid));

    $stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([$status, $id]);

    if ($stmt->rowCount() === 0) jsonError('Order not found', 404);

    jsonOk(['success' => true]);
}

// ── DELETE — Remove order ─────────────────────────────────────────
if ($method === 'DELETE') {
    $id = trim($_GET['id'] ?? '');
    if (!$id) jsonError('Missing order ID');

    $stmt = $db->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonError('Order not found', 404);

    jsonOk(['success' => true]);
}

jsonError('Method not allowed', 405);
