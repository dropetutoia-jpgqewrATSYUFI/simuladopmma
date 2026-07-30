<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

$user = require_login();
$campaign = campaign_by_slug($_GET['slug'] ?? '');
if (!$campaign) { http_response_code(404); exit('Simulado nao encontrado.'); }

$access = access_status($user, $campaign);
if (!$access['allowed']) { header('Location: pagar.php?slug=' . urlencode($campaign['slug'])); exit; }

$feedback = null;
$error = null;

try {
    $attempt = start_attempt($user, $campaign);
} catch (Throwable $e) {
    layout_head('Simulado');
    echo '<div class="alert error">' . h($e->getMessage()) . '</div><a class="btn ghost" href="painel.php">Voltar</a>';
    layout_foot();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    try {
        $feedback = answer_question($attempt, (string) $_POST['question_id'], ($_POST['answer'] ?? '') === 'C');
        if ($feedback['finished']) { header('Location: resultado.php?attempt=' . $attempt['id']); exit; }
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$q = current_question($attempt['id']);
if (!$q) { header('Location: resultado.php?attempt=' . $attempt['id']); exit; }

$answered = (int) db()->query('SELECT COUNT(*) FROM attempt_answers WHERE attempt_id = ' . db()->quote($attempt['id']) . ' AND answered_at IS NOT NULL')->fetchColumn();
$total = (int) $attempt['total_questions'];
$pct = $total ? round($answered / $total * 100) : 0;

layout_head($campaign['name']);
?>
<div class="quiz-head">
  <div>
    <span class="tag"><?= h($campaign['name']) ?></span>
    <h1 class="page-title">Questao <?= $answered + 1 ?> de <?= $total ?></h1>
  </div>
  <div class="score">Acertos: <strong><?= (int) $attempt['score'] ?></strong></div>
</div>
<div class="progress"><span style="width: <?= $pct ?>%"></span></div>

<?php if ($error): ?><div class="alert error"><?= h($error) ?></div><?php endif; ?>

<?php if ($feedback): ?>
<div class="alert <?= $feedback['annulled'] ? 'warn' : ($feedback['correct'] ? 'ok' : 'error') ?> feedback">
  <strong><?= $feedback['annulled'] ? 'Item anulado — ponto garantido' : ($feedback['correct'] ? 'Voce acertou!' : 'Resposta incorreta') ?></strong>
  <?php if (!$feedback['annulled']): ?><p class="small">Gabarito: <?= $feedback['expected'] ? 'CERTO' : 'ERRADO' ?></p><?php endif; ?>
  <?php if ($feedback['feedback']): ?><p><?= nl2br(h($feedback['feedback'])) ?></p><?php endif; ?>
  <?php if ($feedback['key_point']): ?><p class="keypoint"><strong>Ponto-chave:</strong> <?= nl2br(h($feedback['key_point'])) ?></p><?php endif; ?>
</div>
<?php endif; ?>

<article class="card question">
  <div class="row">
    <span class="badge blue"><?= h($q['discipline'] ?: 'Geral') ?></span>
    <?php if ($q['topic']): ?><span class="badge"><?= h($q['topic']) ?></span><?php endif; ?>
  </div>
  <?php if ($q['base_text']): ?><div class="base-text"><?= nl2br(h($q['base_text'])) ?></div><?php endif; ?>
  <p class="statement"><?= nl2br(h($q['statement'])) ?></p>
  <form method="post" class="answers">
    <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
    <input type="hidden" name="question_id" value="<?= h($q['question_id']) ?>">
    <button class="btn ok" name="answer" value="C" type="submit">CERTO</button>
    <button class="btn danger" name="answer" value="E" type="submit">ERRADO</button>
  </form>
</article>
<p class="small muted"><a href="painel.php">Salvar e voltar ao painel</a></p>
<?php layout_foot(); ?>
