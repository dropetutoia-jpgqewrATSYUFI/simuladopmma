<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

$user = require_login();
$campaign = campaign_by_slug($_GET['slug'] ?? '');
if (!$campaign) { http_response_code(404); exit('Simulado nao encontrado.'); }

$access = access_status($user, $campaign);
if ($access['allowed']) { header('Location: simulado.php?slug=' . urlencode($campaign['slug'])); exit; }

$kind = $access['reason'] === 'purchase_required' ? 'purchase' : 'donation';
$amount = (int) $access['amount_cents'];
$error = null;
$payment = null;

$st = db()->prepare("SELECT * FROM payments WHERE user_id=? AND campaign_id=? AND kind=? AND status IN ('pending','in_process')
    ORDER BY created_at DESC LIMIT 1");
$st->execute([$user['id'], $campaign['id'], $kind]);
$payment = $st->fetch() ?: null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    try {
        $payment = create_pix($user, $campaign, $kind, $amount);
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

layout_head('Pagamento Pix');
?>
<h1 class="page-title"><?= $kind === 'purchase' ? 'Liberar acesso' : 'Apoiar e refazer' ?></h1>
<p class="muted"><?= h($campaign['name']) ?> · <?= money($amount) ?></p>

<?php if ($error): ?><div class="alert error"><?= h($error) ?></div><?php endif; ?>

<?php if (!$payment): ?>
  <div class="card">
    <p><?= $kind === 'purchase'
        ? 'Pague uma unica vez via Pix e o acesso e liberado automaticamente assim que o pagamento cair.'
        : 'Voce ja concluiu este simulado. Faca uma contribuicao via Pix para liberar uma nova tentativa.' ?></p>
    <form method="post">
      <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
      <button class="btn gold" type="submit">Gerar Pix de <?= money($amount) ?></button>
    </form>
  </div>
<?php else: ?>
  <div class="card pix" data-payment="<?= h($payment['id']) ?>">
    <div class="pix-grid">
      <?php if ($payment['qr_code_base64']): ?>
        <img class="qr" alt="QR Code Pix" src="data:image/png;base64,<?= h($payment['qr_code_base64']) ?>">
      <?php endif; ?>
      <div>
        <p class="radar"><span></span> Aguardando pagamento...</p>
        <label>Pix copia e cola
          <textarea id="pixcode" readonly rows="4"><?= h($payment['qr_code']) ?></textarea>
        </label>
        <button class="btn ghost" type="button" onclick="navigator.clipboard.writeText(document.getElementById('pixcode').value)">Copiar codigo</button>
        <button class="btn" type="button" id="check">Ja paguei, verificar</button>
        <p class="small muted">A confirmacao vem direto do Mercado Pago. O acesso libera sozinho assim que o pagamento for aprovado.</p>
      </div>
    </div>
    <div id="status"></div>
  </div>
  <script>
  (function () {
    var id = document.querySelector('.pix').dataset.payment;
    var box = document.getElementById('status');
    function poll() {
      fetch('api/pix_status.php?payment=' + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'approved') {
            box.innerHTML = '<div class="alert ok">Pagamento aprovado! Acesso liberado, redirecionando...</div>';
            setTimeout(function () { location.href = 'simulado.php?slug=<?= h($campaign['slug']) ?>'; }, 1500);
          } else {
            setTimeout(poll, 3000);
          }
        })
        .catch(function () { setTimeout(poll, 5000); });
    }
    poll();
    document.getElementById('check').addEventListener('click', poll);
  })();
  </script>
<?php endif; ?>
<p class="small muted"><a href="painel.php">Voltar ao painel</a></p>
<?php layout_foot(); ?>
