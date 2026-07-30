<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
require dirname(__DIR__) . '/includes/app.php';

$admin = require_admin();
$tab = $_GET['tab'] ?? 'dashboard';
$notice = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'delete_users') {
            $ids = array_filter((array) ($_POST['ids'] ?? []));
            $ids = array_values(array_diff($ids, [$admin['id']]));
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                db()->prepare("DELETE FROM users WHERE id IN ($in)")->execute($ids);
                db()->prepare("DELETE FROM leads WHERE user_id IN ($in)")->execute($ids);
                $notice = count($ids) . ' usuario(s) removido(s).';
            }
        } elseif ($action === 'reset_password') {
            $new = (string) $_POST['new_password'];
            if (strlen($new) < 6) { throw new RuntimeException('Senha muito curta.'); }
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($new, PASSWORD_DEFAULT), $_POST['user_id']]);
            $notice = 'Senha redefinida.';
        } elseif ($action === 'set_role') {
            db()->prepare("UPDATE users SET role = ? WHERE id = ?")
                ->execute([$_POST['role'] === 'admin' ? 'admin' : 'user', $_POST['user_id']]);
            $notice = 'Permissao atualizada.';
        } elseif ($action === 'grant') {
            grant_access($_POST['user_id'], $_POST['campaign_id']);
            $notice = 'Acesso liberado.';
        } elseif ($action === 'block') {
            block_access($_POST['user_id'], $_POST['campaign_id']);
            $notice = 'Acesso bloqueado.';
        } elseif ($action === 'delete_leads') {
            $ids = array_filter((array) ($_POST['ids'] ?? []));
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                db()->prepare("DELETE FROM leads WHERE id IN ($in)")->execute($ids);
                $notice = count($ids) . ' lead(s) removido(s).';
            }
        } elseif ($action === 'save_settings') {
            foreach (['site_name', 'site_url', 'whatsapp', 'support_email', 'company', 'cnpj', 'mp_public_key'] as $k) {
                set_setting($k, trim((string) ($_POST[$k] ?? '')));
            }
            set_setting('donation_min_cents', (string) max(100, (int) round(((float) str_replace(',', '.', $_POST['donation_min'] ?? '5')) * 100)));
            $token = trim((string) ($_POST['mp_access_token'] ?? ''));
            if ($token !== '') {
                if (!str_starts_with($token, 'APP_USR-') && !str_starts_with($token, 'TEST-')) {
                    throw new RuntimeException('Token invalido: use o Access Token (APP_USR-...), nao a Public Key.');
                }
                set_setting('mp_access_token', $token);
            }
            $notice = 'Configuracoes salvas.';
        } elseif ($action === 'sync_payments') {
            $rows = db()->query("SELECT * FROM payments WHERE status IN ('pending','in_process') ORDER BY created_at DESC LIMIT 50")->fetchAll();
            foreach ($rows as $p) { sync_payment($p); }
            $notice = 'Pagamentos sincronizados.';
        }
    } catch (Throwable $e) {
        $notice = 'Erro: ' . $e->getMessage();
    }
    if (!str_starts_with((string) $notice, 'Erro')) {
        $_SESSION['flash'] = $notice;
        header('Location: index.php?tab=' . urlencode($tab));
        exit;
    }
}

if (!empty($_SESSION['flash'])) { $notice = $_SESSION['flash']; unset($_SESSION['flash']); }

/* Export CSV de leads */
if (($_GET['export'] ?? '') === 'leads') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=leads.csv');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['nome', 'email', 'whatsapp', 'origem', 'data']);
    foreach (db()->query('SELECT name,email,whatsapp,source,created_at FROM leads ORDER BY created_at DESC') as $r) {
        fputcsv($out, $r);
    }
    exit;
}

$metrics = [
    'users' => (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn(),
    'attempts' => (int) db()->query("SELECT COUNT(*) FROM attempts WHERE status='completed'")->fetchColumn(),
    'leads' => (int) db()->query('SELECT COUNT(*) FROM leads')->fetchColumn(),
    'revenue' => (int) db()->query("SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE status='approved'")->fetchColumn(),
];

$tabs = [
    'dashboard' => 'Visao geral',
    'users' => 'Usuarios',
    'access' => 'Liberar acesso',
    'payments' => 'Pagamentos',
    'leads' => 'Leads',
    'questions' => 'Questoes',
    'settings' => 'Configuracoes',
];
$csrf = csrf_token();
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · <?= h(setting('site_name', 'Simulados PMMA')) ?></title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body class="admin">
<aside class="side">
  <a class="brand" href="../index.php"><span class="brand-mark">E360</span><strong>Admin</strong></a>
  <nav>
    <?php foreach ($tabs as $key => $label): ?>
      <a class="<?= $tab === $key ? 'on' : '' ?>" href="index.php?tab=<?= h($key) ?>"><?= h($label) ?></a>
    <?php endforeach; ?>
  </nav>
  <a class="side-foot" href="../logout.php">Sair</a>
</aside>
<main class="admin-main">
  <?php if ($notice): ?><div class="alert <?= str_starts_with($notice, 'Erro') ? 'error' : 'ok' ?>"><?= h($notice) ?></div><?php endif; ?>

  <?php if ($tab === 'dashboard'): ?>
    <h1>Visao geral</h1>
    <div class="stats">
      <div class="stat"><span><?= $metrics['users'] ?></span>Usuarios</div>
      <div class="stat"><span><?= $metrics['attempts'] ?></span>Simulados concluidos</div>
      <div class="stat"><span><?= $metrics['leads'] ?></span>Leads</div>
      <div class="stat"><span><?= money($metrics['revenue']) ?></span>Receita aprovada</div>
    </div>
    <h2 class="section-title">Ultimas tentativas</h2>
    <table class="table">
      <tr><th>Aluno</th><th>Simulado</th><th>Acertos</th><th>Status</th><th>Data</th></tr>
      <?php foreach (db()->query('SELECT a.*, u.name uname, c.name cname FROM attempts a JOIN users u ON u.id=a.user_id JOIN campaigns c ON c.id=a.campaign_id ORDER BY a.started_at DESC LIMIT 15') as $r): ?>
        <tr><td><?= h($r['uname']) ?></td><td><?= h($r['cname']) ?></td><td><?= (int) $r['score'] ?>/<?= (int) $r['total_questions'] ?></td>
        <td><?= $r['status'] === 'completed' ? 'Concluido' : 'Em andamento' ?></td><td><?= h(date('d/m/Y H:i', strtotime($r['started_at']))) ?></td></tr>
      <?php endforeach; ?>
    </table>

  <?php elseif ($tab === 'users'): ?>
    <h1>Usuarios</h1>
    <form method="post">
      <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="delete_users">
      <table class="table">
        <tr><th><input type="checkbox" onclick="document.querySelectorAll('.chk').forEach(c=>c.checked=this.checked)"></th><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Perfil</th><th>Acoes</th></tr>
        <?php foreach (db()->query('SELECT * FROM users ORDER BY created_at DESC LIMIT 300') as $u): ?>
          <tr>
            <td><input class="chk" type="checkbox" name="ids[]" value="<?= h($u['id']) ?>"></td>
            <td><?= h($u['name']) ?></td><td><?= h($u['email']) ?></td><td><?= h($u['whatsapp']) ?></td>
            <td><?= h($u['role']) ?></td>
            <td class="inline">
              <button class="link" form="role-<?= h($u['id']) ?>" type="submit"><?= $u['role'] === 'admin' ? 'Tornar aluno' : 'Tornar admin' ?></button>
            </td>
          </tr>
        <?php endforeach; ?>
      </table>
      <button class="btn danger" type="submit" onclick="return confirm('Excluir os usuarios selecionados?')">Excluir selecionados</button>
    </form>
    <?php foreach (db()->query('SELECT id, role FROM users LIMIT 300') as $u): ?>
      <form id="role-<?= h($u['id']) ?>" method="post" class="hidden">
        <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="action" value="set_role">
        <input type="hidden" name="user_id" value="<?= h($u['id']) ?>">
        <input type="hidden" name="role" value="<?= $u['role'] === 'admin' ? 'user' : 'admin' ?>">
      </form>
    <?php endforeach; ?>

    <h2 class="section-title">Redefinir senha</h2>
    <form method="post" class="card inline-form">
      <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="reset_password">
      <select name="user_id" required>
        <?php foreach (db()->query('SELECT id,name,email FROM users ORDER BY name') as $u): ?>
          <option value="<?= h($u['id']) ?>"><?= h($u['name']) ?> — <?= h($u['email']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="new_password" placeholder="Nova senha" minlength="6" required>
      <button class="btn" type="submit">Redefinir</button>
    </form>

  <?php elseif ($tab === 'access'): ?>
    <h1>Liberar acesso</h1>
    <?php $cs = campaigns(); ?>
    <table class="table">
      <tr><th>Aluno</th><?php foreach ($cs as $c): ?><th><?= h($c['name']) ?></th><?php endforeach; ?></tr>
      <?php foreach (db()->query('SELECT * FROM users ORDER BY created_at DESC LIMIT 200') as $u): ?>
        <tr>
          <td><?= h($u['name']) ?><br><span class="small muted"><?= h($u['email']) ?></span></td>
          <?php foreach ($cs as $c):
            $s = db()->prepare('SELECT status FROM simulado_access WHERE user_id=? AND campaign_id=?');
            $s->execute([$u['id'], $c['id']]);
            $status = $s->fetchColumn() ?: ((int) $c['is_paid'] ? 'blocked' : 'free'); ?>
            <td>
              <span class="badge <?= $status === 'granted' ? 'blue' : 'lock' ?>"><?= h($status) ?></span>
              <form method="post" class="inline">
                <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
                <input type="hidden" name="action" value="<?= $status === 'granted' ? 'block' : 'grant' ?>">
                <input type="hidden" name="user_id" value="<?= h($u['id']) ?>">
                <input type="hidden" name="campaign_id" value="<?= h($c['id']) ?>">
                <button class="link" type="submit"><?= $status === 'granted' ? 'Bloquear' : 'Liberar' ?></button>
              </form>
            </td>
          <?php endforeach; ?>
        </tr>
      <?php endforeach; ?>
    </table>

  <?php elseif ($tab === 'payments'): ?>
    <h1>Pagamentos</h1>
    <form method="post" class="inline">
      <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="sync_payments">
      <button class="btn" type="submit">Sincronizar pendentes com o Mercado Pago</button>
    </form>
    <table class="table">
      <tr><th>Data</th><th>Aluno</th><th>Tipo</th><th>Valor</th><th>Status</th><th>ID MP</th></tr>
      <?php foreach (db()->query('SELECT p.*, u.name uname FROM payments p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100') as $p): ?>
        <tr><td><?= h(date('d/m/Y H:i', strtotime($p['created_at']))) ?></td><td><?= h($p['uname']) ?></td>
        <td><?= $p['kind'] === 'donation' ? 'Apoio' : 'Compra' ?></td><td><?= money((int) $p['amount_cents']) ?></td>
        <td><span class="badge <?= $p['status'] === 'approved' ? 'blue' : 'lock' ?>"><?= h($p['status']) ?></span></td>
        <td class="small"><?= h($p['provider_payment_id']) ?></td></tr>
      <?php endforeach; ?>
    </table>

  <?php elseif ($tab === 'leads'): ?>
    <h1>Leads</h1>
    <a class="btn ghost" href="index.php?tab=leads&export=leads">Exportar CSV</a>
    <form method="post">
      <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="delete_leads">
      <table class="table">
        <tr><th><input type="checkbox" onclick="document.querySelectorAll('.chk').forEach(c=>c.checked=this.checked)"></th><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Origem</th><th>Data</th></tr>
        <?php foreach (db()->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500') as $l): ?>
          <tr><td><input class="chk" type="checkbox" name="ids[]" value="<?= (int) $l['id'] ?>"></td>
          <td><?= h($l['name']) ?></td><td><?= h($l['whatsapp']) ?></td><td><?= h($l['email']) ?></td>
          <td><?= h($l['source']) ?></td><td><?= h(date('d/m/Y H:i', strtotime($l['created_at']))) ?></td></tr>
        <?php endforeach; ?>
      </table>
      <button class="btn danger" type="submit" onclick="return confirm('Excluir os leads selecionados?')">Excluir selecionados</button>
    </form>

  <?php elseif ($tab === 'questions'): ?>
    <h1>Questoes</h1>
    <table class="table">
      <tr><th>Simulado</th><th>Questoes ativas</th></tr>
      <?php foreach (db()->query('SELECT c.name, COUNT(q.id) total FROM campaigns c LEFT JOIN questions q ON q.campaign_id=c.id AND q.is_active=1 GROUP BY c.id ORDER BY c.display_order') as $r): ?>
        <tr><td><?= h($r['name']) ?></td><td><?= (int) $r['total'] ?></td></tr>
      <?php endforeach; ?>
    </table>
    <h2 class="section-title">Amostra</h2>
    <table class="table">
      <tr><th>Codigo</th><th>Materia</th><th>Enunciado</th><th>Gabarito</th></tr>
      <?php foreach (db()->query('SELECT * FROM questions ORDER BY sort_order LIMIT 40') as $q): ?>
        <tr><td><?= h($q['public_code']) ?></td><td><?= h($q['discipline']) ?></td>
        <td class="small"><?= h(mb_substr($q['statement'], 0, 140)) ?>...</td>
        <td><?= (int) $q['correct_answer'] ? 'CERTO' : 'ERRADO' ?></td></tr>
      <?php endforeach; ?>
    </table>

  <?php else: ?>
    <h1>Configuracoes</h1>
    <form method="post" class="card">
      <input type="hidden" name="_csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="action" value="save_settings">
      <div class="grid2">
        <label>Nome do site <input name="site_name" value="<?= h(setting('site_name')) ?>"></label>
        <label>URL do site <input name="site_url" value="<?= h(setting('site_url')) ?>"></label>
      </div>
      <div class="grid2">
        <label>WhatsApp <input name="whatsapp" value="<?= h(setting('whatsapp')) ?>"></label>
        <label>E-mail de suporte <input name="support_email" value="<?= h(setting('support_email')) ?>"></label>
      </div>
      <div class="grid2">
        <label>Razao social <input name="company" value="<?= h(setting('company')) ?>"></label>
        <label>CNPJ <input name="cnpj" value="<?= h(setting('cnpj')) ?>"></label>
      </div>
      <h2>Mercado Pago</h2>
      <label>Access Token <input name="mp_access_token" placeholder="<?= setting('mp_access_token') ? 'Token configurado — preencha para substituir' : 'APP_USR-...' ?>"></label>
      <div class="grid2">
        <label>Public Key <input name="mp_public_key" value="<?= h(setting('mp_public_key')) ?>"></label>
        <label>Doacao minima (R$) <input name="donation_min" value="<?= h(number_format(((int) setting('donation_min_cents', '500')) / 100, 2, ',', '')) ?>"></label>
      </div>
      <button class="btn" type="submit">Salvar</button>
    </form>
  <?php endif; ?>
</main>
</body>
</html>
