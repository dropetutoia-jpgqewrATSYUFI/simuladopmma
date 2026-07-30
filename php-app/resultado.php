<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

$user = require_login();
$attempt = attempt_by_id((string) ($_GET['attempt'] ?? ''), $user['id']);
if (!$attempt) { http_response_code(404); exit('Tentativa nao encontrada.'); }

$st = db()->prepare('SELECT * FROM campaigns WHERE id = ?');
$st->execute([$attempt['campaign_id']]);
$campaign = $st->fetch();

$report = attempt_report($attempt['id']);
$total = (int) $attempt['total_questions'];
$score = (int) $attempt['score'];
$pct = $total ? round($score / $total * 100) : 0;
$level = $pct >= 80 ? 'Excelente' : ($pct >= 60 ? 'Bom caminho' : ($pct >= 40 ? 'Precisa reforcar' : 'Comece pelo basico'));

layout_head('Resultado');
?>
<h1 class="page-title">Seu resultado</h1>
<p class="muted"><?= h($campaign['name'] ?? '') ?></p>

<div class="result-hero card">
  <div class="ring" style="--pct: <?= $pct ?>">
    <span><?= $pct ?>%</span>
  </div>
  <div>
    <h2><?= h($level) ?></h2>
    <p><strong><?= $score ?></strong> acertos em <strong><?= $total ?></strong> questoes.</p>
  </div>
</div>

<h2 class="section-title">Desempenho por materia</h2>
<div class="cards">
<?php foreach ($report as $r): $p = $r['total'] ? round($r['hits'] / $r['total'] * 100) : 0; ?>
  <div class="card mini">
    <strong><?= h($r['discipline'] ?: 'Geral') ?></strong>
    <div class="progress small"><span style="width: <?= $p ?>%"></span></div>
    <span class="muted small"><?= (int) $r['hits'] ?>/<?= (int) $r['total'] ?> · <?= $p ?>%</span>
  </div>
<?php endforeach; ?>
</div>

<div class="card offer">
  <h2>Quer acelerar a aprovacao?</h2>
  <p>Foque nas materias com menor aproveitamento e treine com as provas completas de 120 questoes.</p>
  <div class="row">
    <a class="btn" href="painel.php">Voltar ao inicio</a>
    <?php if ($wa = setting('whatsapp')): ?>
      <a class="btn gold" target="_blank" rel="noopener" href="https://wa.me/<?= h($wa) ?>?text=<?= rawurlencode('Quero saber mais sobre o preparatorio PMMA 2026') ?>">Falar no WhatsApp</a>
    <?php endif; ?>
  </div>
</div>
<?php layout_foot(); ?>
