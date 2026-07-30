<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

$user = require_login();

$st = db()->prepare("SELECT a.*, c.name FROM attempts a JOIN campaigns c ON c.id = a.campaign_id
    WHERE a.user_id = ? ORDER BY a.started_at DESC LIMIT 10");
$st->execute([$user['id']]);
$history = $st->fetchAll();

$done = 0; $hits = 0; $qtd = 0;
foreach ($history as $h) {
    if ($h['status'] === 'completed') { $done++; $hits += (int) $h['score']; $qtd += (int) $h['total_questions']; }
}

layout_head('Meu painel');
?>
<h1 class="page-title">Ola, <?= h(explode(' ', $user['name'])[0]) ?></h1>
<p class="muted">Escolha um simulado e comece a treinar. Suas tentativas ficam salvas no historico.</p>

<div class="stats">
  <div class="stat"><span><?= $done ?></span>Simulados concluidos</div>
  <div class="stat"><span><?= $qtd ? round($hits / $qtd * 100) : 0 ?>%</span>Aproveitamento</div>
  <div class="stat"><span><?= $hits ?></span>Acertos totais</div>
</div>

<h2 class="section-title">Simulados disponiveis</h2>
<div class="cards">
<?php foreach (campaigns() as $c):
    $access = access_status($user, $c);
    $paid = (int) $c['is_paid'] === 1; ?>
  <article class="card sim-card">
    <div class="row">
      <span class="badge <?= $paid ? 'gold' : 'blue' ?>"><?= $paid ? money((int) $c['price_cents']) : 'Gratuito' ?></span>
      <?php if (!$access['allowed']): ?><span class="badge lock"><?= $access['reason'] === 'purchase_required' ? 'Bloqueado' : 'Apoiar e refazer' ?></span><?php endif; ?>
    </div>
    <h3><?= h($c['name']) ?></h3>
    <p class="muted"><?= h($c['description'] ?: '') ?></p>
    <p class="small muted"><?= (int) $c['total_questions'] ?> questoes · Certo ou Errado</p>
    <?php if ($access['allowed']): ?>
      <a class="btn" href="simulado.php?slug=<?= h($c['slug']) ?>">Comecar</a>
    <?php else: ?>
      <a class="btn gold" href="pagar.php?slug=<?= h($c['slug']) ?>">
        <?= $access['reason'] === 'purchase_required' ? 'Liberar por ' . money((int) $access['amount_cents']) : 'Apoiar com Pix e refazer' ?>
      </a>
    <?php endif; ?>
  </article>
<?php endforeach; ?>
</div>

<?php if ($history): ?>
<h2 class="section-title">Historico</h2>
<table class="table">
  <tr><th>Simulado</th><th>Status</th><th>Acertos</th><th>Data</th><th></th></tr>
  <?php foreach ($history as $h): ?>
  <tr>
    <td><?= h($h['name']) ?></td>
    <td><?= $h['status'] === 'completed' ? 'Concluido' : 'Em andamento' ?></td>
    <td><?= (int) $h['score'] ?>/<?= (int) $h['total_questions'] ?></td>
    <td><?= h(date('d/m/Y H:i', strtotime($h['started_at']))) ?></td>
    <td><?php if ($h['status'] === 'completed'): ?><a href="resultado.php?attempt=<?= h($h['id']) ?>">Ver resultado</a><?php endif; ?></td>
  </tr>
  <?php endforeach; ?>
</table>
<?php endif; ?>
<?php layout_foot(); ?>
