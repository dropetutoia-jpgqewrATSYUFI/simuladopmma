<?php
declare(strict_types=1);

/** Camada de negocio: acesso, tentativas e pagamentos Pix. */

function campaigns(): array
{
    return db()->query("SELECT * FROM campaigns WHERE status = 'active' ORDER BY is_paid, display_order, name")->fetchAll();
}

function campaign_by_slug(string $slug): ?array
{
    $st = db()->prepare('SELECT * FROM campaigns WHERE slug = ?');
    $st->execute([$slug]);
    return $st->fetch() ?: null;
}

function completed_attempt(string $userId, string $campaignId): ?array
{
    $st = db()->prepare("SELECT * FROM attempts WHERE user_id = ? AND campaign_id = ? AND status = 'completed' ORDER BY finished_at DESC LIMIT 1");
    $st->execute([$userId, $campaignId]);
    return $st->fetch() ?: null;
}

function has_paid_credit(string $userId, string $campaignId, string $kind): bool
{
    $st = db()->prepare("SELECT COUNT(*) FROM payments WHERE status = 'approved' AND kind = ? AND campaign_id = ?
        AND (user_id = ? OR fingerprint = ?)");
    $st->execute([$kind, $campaignId, $userId, fingerprint()]);
    return (int) $st->fetchColumn() > 0;
}

/**
 * Regras de acesso:
 * - simulado gratuito: liberado na primeira tentativa; apos concluir exige doacao para refazer
 * - simulado pago: exige compra aprovada ou liberacao manual do admin
 */
function access_status(array $user, array $campaign): array
{
    if ($user['role'] === 'admin') {
        return ['allowed' => true, 'reason' => 'admin'];
    }

    if ((int) $campaign['is_paid'] === 1) {
        $st = db()->prepare('SELECT status FROM simulado_access WHERE user_id = ? AND campaign_id = ?');
        $st->execute([$user['id'], $campaign['id']]);
        $status = $st->fetchColumn();
        if ($status === 'granted') { return ['allowed' => true, 'reason' => 'granted']; }
        if (has_paid_credit($user['id'], $campaign['id'], 'purchase')) {
            grant_access($user['id'], $campaign['id']);
            return ['allowed' => true, 'reason' => 'paid'];
        }
        return ['allowed' => false, 'reason' => 'purchase_required', 'amount_cents' => (int) $campaign['price_cents']];
    }

    $done = completed_attempt($user['id'], $campaign['id']);
    if (!$done) { return ['allowed' => true, 'reason' => 'first_attempt']; }

    $st = db()->prepare("SELECT COUNT(*) FROM payments WHERE status='approved' AND kind='donation' AND campaign_id=?
        AND (user_id = ? OR fingerprint = ?) AND created_at > ?");
    $st->execute([$campaign['id'], $user['id'], fingerprint(), $done['finished_at'] ?? '1970-01-01 00:00:00']);
    if ((int) $st->fetchColumn() > 0) { return ['allowed' => true, 'reason' => 'donation']; }

    return [
        'allowed' => false,
        'reason' => 'donation_required',
        'amount_cents' => (int) (setting('donation_min_cents', '500')),
        'last_attempt' => $done,
    ];
}

function grant_access(string $userId, string $campaignId): void
{
    $st = db()->prepare("INSERT INTO simulado_access (user_id, campaign_id, status, granted_at) VALUES (?,?, 'granted', NOW())
        ON DUPLICATE KEY UPDATE status='granted', granted_at=NOW()");
    $st->execute([$userId, $campaignId]);
}

function block_access(string $userId, string $campaignId): void
{
    $st = db()->prepare("INSERT INTO simulado_access (user_id, campaign_id, status) VALUES (?,?, 'blocked')
        ON DUPLICATE KEY UPDATE status='blocked', granted_at=NULL");
    $st->execute([$userId, $campaignId]);
}

function start_attempt(array $user, array $campaign): array
{
    $st = db()->prepare("SELECT * FROM attempts WHERE user_id=? AND campaign_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1");
    $st->execute([$user['id'], $campaign['id']]);
    $attempt = $st->fetch();
    if ($attempt) { return $attempt; }

    $qs = db()->prepare('SELECT id FROM questions WHERE campaign_id = ? AND is_active = 1 ORDER BY sort_order, public_code');
    $qs->execute([$campaign['id']]);
    $ids = $qs->fetchAll(PDO::FETCH_COLUMN);
    if (!$ids) { throw new RuntimeException('Este simulado ainda nao tem questoes cadastradas.'); }

    $attemptId = uid();
    db()->prepare('INSERT INTO attempts (id, user_id, campaign_id, total_questions, fingerprint) VALUES (?,?,?,?,?)')
        ->execute([$attemptId, $user['id'], $campaign['id'], count($ids), fingerprint()]);

    $ins = db()->prepare('INSERT INTO attempt_answers (attempt_id, question_id, position) VALUES (?,?,?)');
    foreach ($ids as $i => $qid) { $ins->execute([$attemptId, $qid, $i]); }

    $st->execute([$user['id'], $campaign['id']]);
    return $st->fetch();
}

function attempt_by_id(string $id, string $userId): ?array
{
    $st = db()->prepare('SELECT * FROM attempts WHERE id = ? AND user_id = ?');
    $st->execute([$id, $userId]);
    return $st->fetch() ?: null;
}

function current_question(string $attemptId): ?array
{
    $st = db()->prepare('SELECT a.*, q.discipline, q.topic, q.base_text, q.statement, q.difficulty, q.public_code
        FROM attempt_answers a JOIN questions q ON q.id = a.question_id
        WHERE a.attempt_id = ? AND a.answered_at IS NULL ORDER BY a.position LIMIT 1');
    $st->execute([$attemptId]);
    return $st->fetch() ?: null;
}

function answer_question(array $attempt, string $questionId, bool $answer): array
{
    $st = db()->prepare('SELECT * FROM questions WHERE id = ?');
    $st->execute([$questionId]);
    $q = $st->fetch();
    if (!$q) { throw new RuntimeException('Questao invalida.'); }

    $annulled = ($q['answer_status'] ?? 'valid') === 'annulled';
    $correct = $annulled ? true : ((bool) $q['correct_answer'] === $answer);

    db()->prepare('UPDATE attempt_answers SET answer = ?, is_correct = ?, answered_at = NOW() WHERE attempt_id = ? AND question_id = ? AND answered_at IS NULL')
        ->execute([$answer ? 1 : 0, $correct ? 1 : 0, $attempt['id'], $questionId]);

    $remaining = db()->prepare('SELECT COUNT(*) FROM attempt_answers WHERE attempt_id = ? AND answered_at IS NULL');
    $remaining->execute([$attempt['id']]);
    $left = (int) $remaining->fetchColumn();

    $score = db()->prepare('SELECT COALESCE(SUM(is_correct),0) FROM attempt_answers WHERE attempt_id = ?');
    $score->execute([$attempt['id']]);
    $total = (int) $score->fetchColumn();

    if ($left === 0) {
        db()->prepare("UPDATE attempts SET status='completed', score=?, finished_at=NOW() WHERE id=?")
            ->execute([$total, $attempt['id']]);
    } else {
        db()->prepare('UPDATE attempts SET score=?, current_index = total_questions - ? WHERE id=?')
            ->execute([$total, $left, $attempt['id']]);
    }

    return [
        'correct' => $correct,
        'annulled' => $annulled,
        'expected' => (bool) $q['correct_answer'],
        'feedback' => $correct ? ($q['feedback_correct'] ?: '') : ($q['feedback_wrong'] ?: ''),
        'key_point' => $q['key_point'] ?: '',
        'finished' => $left === 0,
    ];
}

function attempt_report(string $attemptId): array
{
    $st = db()->prepare('SELECT q.discipline, COUNT(*) total, COALESCE(SUM(a.is_correct),0) hits
        FROM attempt_answers a JOIN questions q ON q.id = a.question_id
        WHERE a.attempt_id = ? GROUP BY q.discipline ORDER BY q.discipline');
    $st->execute([$attemptId]);
    return $st->fetchAll();
}

/* ------------------ Mercado Pago Pix ------------------ */

function mp_token(): string { return (string) setting('mp_access_token', ''); }

function mp_request(string $method, string $path, ?array $body = null, array $headers = []): array
{
    $ch = curl_init('https://api.mercadopago.com' . $path);
    $h = array_merge(['Authorization: Bearer ' . mp_token(), 'Content-Type: application/json'], $headers);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($body !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body)); }
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true) ?: [];
    return ['status' => $code, 'data' => $data];
}

function create_pix(array $user, array $campaign, string $kind, int $amountCents): array
{
    if (mp_token() === '') { throw new RuntimeException('Pagamentos Pix ainda nao foram configurados pelo administrador.'); }
    $paymentId = uid();
    $res = mp_request('POST', '/v1/payments', [
        'transaction_amount' => round($amountCents / 100, 2),
        'description' => ($kind === 'donation' ? 'Apoio - ' : 'Acesso - ') . $campaign['name'],
        'payment_method_id' => 'pix',
        'external_reference' => $paymentId,
        'payer' => [
            'email' => $user['email'],
            'first_name' => explode(' ', trim($user['name']))[0] ?: 'Aluno',
        ],
    ], ['X-Idempotency-Key: ' . $paymentId]);

    if ($res['status'] >= 300 || empty($res['data']['id'])) {
        throw new RuntimeException('Nao foi possivel gerar o Pix agora. Tente novamente em instantes.');
    }

    $tx = $res['data']['point_of_interaction']['transaction_data'] ?? [];
    db()->prepare('INSERT INTO payments (id, user_id, campaign_id, kind, provider_payment_id, amount_cents, status, qr_code, qr_code_base64, ticket_url, fingerprint)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            $paymentId, $user['id'], $campaign['id'], $kind, (string) $res['data']['id'], $amountCents,
            (string) ($res['data']['status'] ?? 'pending'), $tx['qr_code'] ?? null, $tx['qr_code_base64'] ?? null,
            $tx['ticket_url'] ?? null, fingerprint(),
        ]);

    $st = db()->prepare('SELECT * FROM payments WHERE id = ?');
    $st->execute([$paymentId]);
    return $st->fetch();
}

function sync_payment(array $payment): array
{
    if ($payment['status'] === 'approved' || !$payment['provider_payment_id'] || mp_token() === '') { return $payment; }
    $res = mp_request('GET', '/v1/payments/' . $payment['provider_payment_id']);
    $status = (string) ($res['data']['status'] ?? $payment['status']);
    if ($status !== $payment['status']) {
        db()->prepare('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?')
            ->execute([$status, $status === 'approved' ? date('Y-m-d H:i:s') : null, $payment['id']]);
        $payment['status'] = $status;
    }
    if ($status === 'approved' && $payment['kind'] === 'purchase' && $payment['user_id'] && $payment['campaign_id']) {
        grant_access($payment['user_id'], $payment['campaign_id']);
    }
    return $payment;
}
