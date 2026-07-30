<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require dirname(__DIR__) . '/includes/app.php';

header('Content-Type: application/json');
$user = current_user();
if (!$user) { http_response_code(401); echo json_encode(['error' => 'unauthorized']); exit; }

$st = db()->prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?');
$st->execute([(string) ($_GET['payment'] ?? ''), $user['id']]);
$payment = $st->fetch();
if (!$payment) { http_response_code(404); echo json_encode(['error' => 'not_found']); exit; }

$payment = sync_payment($payment);
echo json_encode(['status' => $payment['status']]);
