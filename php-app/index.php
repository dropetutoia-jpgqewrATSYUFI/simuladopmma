<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/app.php';
require __DIR__ . '/includes/layout.php';

if (current_user()) { header('Location: painel.php'); exit; }

$error = null;
$mode = $_POST['mode'] ?? 'login';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');

    if ($mode === 'signup') {
        $name = trim($_POST['name'] ?? '');
        $whatsapp = preg_replace('/\D/', '', $_POST['whatsapp'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6 || strlen((string) $whatsapp) < 10) {
            $error = 'Preencha nome, e-mail valido, WhatsApp com DDD e senha de 6+ caracteres.';
        } else {
            $st = db()->prepare('SELECT id FROM users WHERE email = ?');
            $st->execute([$email]);
            if ($st->fetch()) {
                $error = 'Ja existe uma conta com esse e-mail. Faca login.';
            } else {
                $id = uid();
                db()->prepare('INSERT INTO users (id,name,email,whatsapp,password_hash) VALUES (?,?,?,?,?)')
                    ->execute([$id, $name, $email, $whatsapp, password_hash($pass, PASSWORD_DEFAULT)]);
                db()->prepare('INSERT INTO leads (user_id,name,email,whatsapp,source) VALUES (?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), whatsapp=VALUES(whatsapp)')
                    ->execute([$id, $name, $email, $whatsapp, 'cadastro']);
                foreach (campaigns() as $c) {
                    if ((int) $c['is_paid'] === 1) { block_access($id, $c['id']); }
                }
                session_regenerate_id(true);
                $_SESSION['uid'] = $id;
                header('Location: painel.php');
                exit;
            }
        }
    } else {
        $st = db()->prepare('SELECT * FROM users WHERE email = ?');
        $st->execute([$email]);
        $user = $st->fetch();
        if ($user && password_verify($pass, $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['uid'] = $user['id'];
            header('Location: painel.php');
            exit;
        }
        $error = 'E-mail ou senha incorretos.';
    }
}

$totalAttempts = (int) db()->query("SELECT COUNT(*) FROM attempts WHERE status='completed'")->fetchColumn();

layout_head('Entrar');
?>
<section class="hero-split">
  <div class="hero-copy">
    <span class="tag">Estilo Cebraspe · De acordo com o edital</span>
    <h1>Simulados para PMMA — Concurso 2026</h1>
    <p class="lead">Simulado gratuito · 40 questoes · 8 materias. Corrija na hora, veja o comentario de cada item e descubra onde perde pontos.</p>
    <ul class="bullets">
      <li>Correcao imediata com ponto-chave por questao</li>
      <li>Diagnostico por materia ao final</li>
      <li>Provas completas de 120 questoes para treinar tempo</li>
    </ul>
    <?php if ($totalAttempts > 0): ?><p class="muted small"><strong><?= $totalAttempts ?></strong> simulados ja finalizados na plataforma.</p><?php endif; ?>
  </div>

  <div class="card auth-card">
    <div class="tabs">
      <button type="button" class="tab <?= $mode === 'login' ? 'on' : '' ?>" data-tab="login">Entrar</button>
      <button type="button" class="tab <?= $mode === 'signup' ? 'on' : '' ?>" data-tab="signup">Criar conta</button>
    </div>
    <?php if ($error): ?><div class="alert error"><?= h($error) ?></div><?php endif; ?>

    <form method="post" data-form="login" class="<?= $mode === 'login' ? '' : 'hidden' ?>">
      <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="mode" value="login">
      <label>E-mail <input type="email" name="email" required></label>
      <label>Senha <input type="password" name="password" required></label>
      <button class="btn" type="submit">Entrar</button>
    </form>

    <form method="post" data-form="signup" class="<?= $mode === 'signup' ? '' : 'hidden' ?>">
      <input type="hidden" name="_csrf" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="mode" value="signup">
      <label>Nome completo <input name="name" required></label>
      <label>E-mail <input type="email" name="email" required></label>
      <label>WhatsApp (com DDD) <input name="whatsapp" placeholder="(98) 99999-9999" required></label>
      <label>Senha <input type="password" name="password" minlength="6" required></label>
      <button class="btn" type="submit">Criar conta e comecar</button>
    </form>
  </div>
</section>
<script>
document.querySelectorAll('.tab').forEach(function (t) {
  t.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
    t.classList.add('on');
    document.querySelectorAll('[data-form]').forEach(function (f) {
      f.classList.toggle('hidden', f.dataset.form !== t.dataset.tab);
    });
  });
});
</script>
<?php layout_foot(); ?>
