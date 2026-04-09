<?php
// ===========================
// Gen Dimension — PayFast ITN Handler
// ===========================
require_once 'config.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed';
    exit();
}

// ── Logging ───────────────────────────────────────────────────────
$logFile = __DIR__ . '/logs/payfast-itn.log';

function itnLog($message) {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
}

itnLog('ITN received. POST data: ' . json_encode($_POST));

// ── IP allowlist (skipped in sandbox mode) ────────────────────────
if (!PAYFAST_SANDBOX) {
    $validIPs = [
        '197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147',
        '196.33.227.144', '196.33.227.145', '196.33.227.146', '196.33.227.147',
    ];
    $remoteIP = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($remoteIP, $validIPs, true)) {
        itnLog("BLOCKED: invalid IP {$remoteIP}");
        http_response_code(400);
        echo 'Invalid IP';
        exit();
    }
}

// ── Signature verification ────────────────────────────────────────
$params = [];
foreach ($_POST as $key => $val) {
    if ($key === 'signature') continue;
    $params[$key] = stripslashes(trim($val));
}
$paramStr = http_build_query($params);
if (PAYFAST_PASSPHRASE !== '') {
    $paramStr .= '&passphrase=' . urlencode(PAYFAST_PASSPHRASE);
}
$expectedSig = md5($paramStr);
$receivedSig = $_POST['signature'] ?? '';

if (!hash_equals($expectedSig, $receivedSig)) {
    itnLog("SIGNATURE MISMATCH. Expected: {$expectedSig}, Got: {$receivedSig}");
    http_response_code(400);
    echo 'Invalid signature';
    exit();
}

// ── Extract fields ────────────────────────────────────────────────
$paymentId     = trim($_POST['m_payment_id']  ?? '');
$paymentStatus = trim($_POST['payment_status'] ?? '');
$amountGross   = (float)($_POST['amount_gross'] ?? 0);

if (!$paymentId) {
    itnLog('ERROR: Missing m_payment_id');
    http_response_code(400);
    echo 'Missing payment ID';
    exit();
}

// ── Only process COMPLETE payments ───────────────────────────────
if ($paymentStatus !== 'COMPLETE') {
    itnLog("Skipping non-COMPLETE status: {$paymentStatus} for order {$paymentId}");
    http_response_code(200);
    echo 'OK';
    exit();
}

// ── Database lookup ───────────────────────────────────────────────
try {
    $db = getDB();
} catch (Exception $e) {
    itnLog('ERROR: DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo 'DB error';
    exit();
}

$stmt = $db->prepare(
    "SELECT id, customer_name, customer_email, total FROM orders WHERE id = ?"
);
$stmt->execute([$paymentId]);
$order = $stmt->fetch();

if (!$order) {
    itnLog("ERROR: Order not found: {$paymentId}");
    http_response_code(200);
    echo 'OK';
    exit();
}

// ── Verify amount within R0.01 tolerance ─────────────────────────
$expectedTotal = (float)$order['total'];
if (abs($amountGross - $expectedTotal) > 0.01) {
    itnLog(
        "AMOUNT MISMATCH for {$paymentId}: "
        . "expected R{$expectedTotal}, got R{$amountGross}"
    );
    http_response_code(200);
    echo 'OK';
    exit();
}

// ── Update order: paid + processing ──────────────────────────────
$update = $db->prepare(
    "UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?"
);
$update->execute([$paymentId]);

itnLog("Order {$paymentId} marked paid. Amount: R{$amountGross}");

// ── Customer confirmation email ───────────────────────────────────
$name   = $order['customer_name'];
$email  = $order['customer_email'];
$amount = number_format($amountGross, 2);

$custBody = "Dear {$name},\n\n"
    . "Your payment of R{$amount} has been confirmed!\n\n"
    . "Order ID: {$paymentId}\n\n"
    . "We will now prepare your order for delivery.\n"
    . "Expected contact within 24 hours.\n\n"
    . "WhatsApp: https://wa.me/" . WHATSAPP_NUMBER . "\n\n"
    . "Gen Dimension Team\n"
    . SITE_URL;

sendMail($email, "Payment Confirmed — Gen Dimension Order {$paymentId}", $custBody);

// ── Admin notification ────────────────────────────────────────────
$adminBody = "Payment Confirmed — ITN Notification\n\n"
    . "Order ID: {$paymentId}\n"
    . "Customer: {$name} ({$email})\n"
    . "Amount:   R{$amount}\n"
    . "Status:   COMPLETE\n"
    . "Time:     " . date('Y-m-d H:i:s') . "\n\n"
    . "Order is now in processing status.";

sendMail(ADMIN_EMAIL, "Payment Confirmed — Order {$paymentId}", $adminBody);

itnLog("Emails sent for order {$paymentId}");

http_response_code(200);
echo 'OK';
