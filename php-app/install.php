<?php
/**
 * Instalador do Simulados PMMA - Edital360 (versao PHP)
 * Basta subir a pasta no servidor e acessar /install.php
 */
session_start();
$root = __DIR__;
$configFile = $root . '/config.php';
$lockFile = $root . '/data/install.lock';

if (file_exists($lockFile) && !isset($_GET['force'])) {
    die('<p style="font-family:sans-serif">Sistema ja instalado. Apague <code>data/install.lock</code> para reinstalar ou <a href="index.php">acesse o site</a>.</p>');
}

$step = isset($_GET['step']) ? (int) $_GET['step'] : 1;
$errors = [];

function h($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }

function requirements(): array
{
    return [
        'PHP >= 8.0' => version_compare(PHP_VERSION, '8.0.0', '>='),
        'Extensao PDO MySQL' => extension_loaded('pdo_mysql'),
        'Extensao cURL' => extension_loaded('curl'),
        'Extensao mbstring' => extension_loaded('mbstring'),
        'Pasta gravavel (data/)' => is_writable(__DIR__ . '/data'),
        'Raiz gravavel (config.php)' => is_writable(__DIR__),
    ];
}

/* ---------- STEP 2: banco ---------- */
if ($step === 2 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $db = [
        'host' => trim($_POST['db_host'] ?? 'localhost'),
        'port' => trim($_POST['db_port'] ?? '3306'),
        'name' => trim($_POST['db_name'] ?? ''),
        'user' => trim($_POST['db_user'] ?? ''),
        'pass' => (string) ($_POST['db_pass'] ?? ''),
    ];
    try {
        $pdo = new PDO("mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4", $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $_SESSION['install_db'] = $db;
        header('Location: install.php?step=3');
        exit;
    } catch (Throwable $e) {
        $errors[] = 'Nao consegui conectar: ' . $e->getMessage();
    }
}

/* ---------- STEP 3: site + admin ---------- */
if ($step === 3 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $site = [
        'site_name' => trim($_POST['site_name'] ?? 'Simulados PMMA'),
        'site_url' => rtrim(trim($_POST['site_url'] ?? ''), '/'),
        'whatsapp' => preg_replace('/\D/', '', $_POST['whatsapp'] ?? ''),
        'support_email' => trim($_POST['support_email'] ?? ''),
        'company' => trim($_POST['company'] ?? ''),
        'cnpj' => trim($_POST['cnpj'] ?? ''),
        'mp_token' => trim($_POST['mp_token'] ?? ''),
        'mp_public_key' => trim($_POST['mp_public_key'] ?? ''),
        'donation_min_cents' => max(100, (int) round(((float) str_replace(',', '.', $_POST['donation_min'] ?? '5')) * 100)),
        'admin_name' => trim($_POST['admin_name'] ?? 'Administrador'),
        'admin_email' => trim($_POST['admin_email'] ?? ''),
        'admin_pass' => (string) ($_POST['admin_pass'] ?? ''),
    ];
    if (!filter_var($site['admin_email'], FILTER_VALIDATE_EMAIL)) { $errors[] = 'E-mail do administrador invalido.'; }
    if (strlen($site['admin_pass']) < 6) { $errors[] = 'A senha do administrador precisa ter ao menos 6 caracteres.'; }
    if ($site['mp_token'] !== '' && str_starts_with($site['mp_token'], 'APP_USR-') === false && str_starts_with($site['mp_token'], 'TEST-') === false) {
        $errors[] = 'O Access Token do Mercado Pago deve comecar com APP_USR- ou TEST-.';
    }
    if (!$errors) {
        $_SESSION['install_site'] = $site;
        header('Location: install.php?step=4');
        exit;
    }
}

/* ---------- STEP 4: executar ---------- */
if ($step === 4 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $db = $_SESSION['install_db'] ?? null;
    $site = $_SESSION['install_site'] ?? null;
    if (!$db || !$site) {
        header('Location: install.php?step=2');
        exit;
    }
    try {
        $pdo = new PDO("mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4", $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $schema = file_get_contents($root . '/data/schema.sql');
        foreach (array_filter(array_map('trim', explode(';--END--', $schema))) as $sql) {
            if ($sql !== '') { $pdo->exec($sql); }
        }

        // Seed de simulados e questoes
        $seed = json_decode(file_get_contents($root . '/data/seed.json'), true);
        $importQuestions = !empty($_POST['import_questions']);
        $cs = $pdo->prepare('INSERT INTO campaigns (id, slug, name, description, is_paid, price_cents, status, total_questions, display_order)
            VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)');
        foreach ($seed['campaigns'] as $c) {
            $cs->execute([
                $c['id'], $c['slug'], $c['name'], $c['description'],
                $c['is_paid'] ? 1 : 0, (int) $c['price_cents'], $c['status'] ?: 'active',
                (int) ($c['total_questions'] ?? 0), (int) ($c['display_order'] ?? 0),
            ]);
        }
        $imported = 0;
        if ($importQuestions) {
            $qs = $pdo->prepare('INSERT INTO questions (id, campaign_id, public_code, discipline, topic, base_text, statement, correct_answer, feedback_correct, feedback_wrong, key_point, difficulty, answer_status, sort_order, is_active)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE statement=VALUES(statement)');
            foreach ($seed['questions'] as $q) {
                $qs->execute([
                    $q['id'], $q['campaign_id'], $q['public_code'], $q['discipline'], $q['topic'],
                    $q['base_text'], $q['statement'], $q['correct_answer'] ? 1 : 0,
                    $q['feedback_correct'], $q['feedback_wrong'], $q['key_point'],
                    $q['difficulty'] ?: 'medio', $q['answer_status'] ?: 'valid',
                    (int) ($q['sort_order'] ?? 0), !empty($q['is_active']) ? 1 : 0,
                ]);
                $imported++;
            }
        }

        // Administrador
        $uid = bin2hex(random_bytes(16));
        $st = $pdo->prepare('INSERT INTO users (id, name, email, whatsapp, password_hash, role) VALUES (?,?,?,?,?,\'admin\')
            ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=\'admin\'');
        $st->execute([$uid, $site['admin_name'], strtolower($site['admin_email']), $site['whatsapp'], password_hash($site['admin_pass'], PASSWORD_DEFAULT)]);

        // Configuracoes
        $settings = [
            'site_name' => $site['site_name'],
            'site_url' => $site['site_url'],
            'whatsapp' => $site['whatsapp'],
            'support_email' => $site['support_email'],
            'company' => $site['company'],
            'cnpj' => $site['cnpj'],
            'mp_access_token' => $site['mp_token'],
            'mp_public_key' => $site['mp_public_key'],
            'donation_min_cents' => (string) $site['donation_min_cents'],
        ];
        $ss = $pdo->prepare('INSERT INTO settings (`key`, `value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)');
        foreach ($settings as $k => $v) { $ss->execute([$k, $v]); }

        // config.php
        $tpl = "<?php\nreturn " . var_export([
            'db' => $db,
            'app_key' => bin2hex(random_bytes(16)),
        ], true) . ";\n";
        file_put_contents($configFile, $tpl);
        @chmod($configFile, 0640);
        file_put_contents($lockFile, date('c'));

        unset($_SESSION['install_db'], $_SESSION['install_site']);
        $_SESSION['install_done'] = ['questions' => $imported];
        header('Location: install.php?step=5');
        exit;
    } catch (Throwable $e) {
        $errors[] = 'Falha na instalacao: ' . $e->getMessage();
    }
}
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instalador · Simulados PMMA</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="install">
<div class="wrap">
  <header class="inst-head">
    <div class="brand"><span class="brand-mark">E360</span> <strong>Instalador</strong></div>
    <ol class="steps">
      <?php foreach ([1 => 'Requisitos', 2 => 'Banco de dados', 3 => 'Configuracao', 4 => 'Instalar', 5 => 'Pronto'] as $i => $label): ?>
        <li class="<?= $i === $step ? 'on' : ($i < $step ? 'done' : '') ?>"><span><?= $i ?></span><?= h($label) ?></li>
      <?php endforeach; ?>
    </ol>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert error"><?= h($e) ?></div><?php endforeach; ?>

  <?php if ($step === 1): ?>
    <div class="card">
      <h1>Verificacao do servidor</h1>
      <table class="req">
        <?php $ok = true; foreach (requirements() as $label => $pass): $ok = $ok && $pass; ?>
          <tr><td><?= h($label) ?></td><td class="<?= $pass ? 'yes' : 'no' ?>"><?= $pass ? 'OK' : 'FALTA' ?></td></tr>
        <?php endforeach; ?>
      </table>
      <?php if ($ok): ?>
        <a class="btn" href="install.php?step=2">Continuar</a>
      <?php else: ?>
        <p class="muted">Ajuste os itens marcados como FALTA (permissoes de pasta ou extensoes do PHP) e recarregue a pagina.</p>
        <a class="btn ghost" href="install.php?step=1">Verificar novamente</a>
      <?php endif; ?>
    </div>

  <?php elseif ($step === 2): ?>
    <form class="card" method="post" action="install.php?step=2">
      <h1>Dados do MySQL</h1>
      <p class="muted">Crie um banco vazio no painel da sua hospedagem e informe os dados abaixo.</p>
      <div class="grid2">
        <label>Host <input name="db_host" value="<?= h($_POST['db_host'] ?? 'localhost') ?>" required></label>
        <label>Porta <input name="db_port" value="<?= h($_POST['db_port'] ?? '3306') ?>" required></label>
      </div>
      <label>Nome do banco <input name="db_name" value="<?= h($_POST['db_name'] ?? '') ?>" required></label>
      <div class="grid2">
        <label>Usuario <input name="db_user" value="<?= h($_POST['db_user'] ?? '') ?>" required></label>
        <label>Senha <input type="password" name="db_pass" value=""></label>
      </div>
      <button class="btn" type="submit">Testar conexao e continuar</button>
    </form>

  <?php elseif ($step === 3): ?>
    <form class="card" method="post" action="install.php?step=3">
      <h1>Configuracao do site</h1>
      <div class="grid2">
        <label>Nome do site <input name="site_name" value="<?= h($_POST['site_name'] ?? 'Simulados PMMA - Edital360') ?>" required></label>
        <label>URL do site <input name="site_url" placeholder="https://seudominio.com" value="<?= h($_POST['site_url'] ?? '') ?>"></label>
      </div>
      <div class="grid2">
        <label>WhatsApp (so numeros) <input name="whatsapp" value="<?= h($_POST['whatsapp'] ?? '5598991884014') ?>"></label>
        <label>E-mail de suporte <input name="support_email" value="<?= h($_POST['support_email'] ?? 'suporte@edital360.com') ?>"></label>
      </div>
      <div class="grid2">
        <label>Razao social <input name="company" value="<?= h($_POST['company'] ?? 'CONNEX TECNOLOGIA E SERVICOS DIGITAIS INOVA SIMPLES (I.S.)') ?>"></label>
        <label>CNPJ <input name="cnpj" value="<?= h($_POST['cnpj'] ?? '59.102.026/0001-93') ?>"></label>
      </div>
      <h2>Pagamentos Pix (Mercado Pago)</h2>
      <p class="muted">Opcional agora: da para preencher depois no painel administrativo.</p>
      <label>Access Token (APP_USR-...) <input name="mp_token" value="<?= h($_POST['mp_token'] ?? '') ?>"></label>
      <div class="grid2">
        <label>Public Key <input name="mp_public_key" value="<?= h($_POST['mp_public_key'] ?? '') ?>"></label>
        <label>Doacao minima (R$) <input name="donation_min" value="<?= h($_POST['donation_min'] ?? '5') ?>"></label>
      </div>
      <h2>Conta de administrador</h2>
      <div class="grid2">
        <label>Nome <input name="admin_name" value="<?= h($_POST['admin_name'] ?? '') ?>" required></label>
        <label>E-mail <input type="email" name="admin_email" value="<?= h($_POST['admin_email'] ?? '') ?>" required></label>
      </div>
      <label>Senha <input type="password" name="admin_pass" required minlength="6"></label>
      <button class="btn" type="submit">Continuar</button>
    </form>

  <?php elseif ($step === 4): ?>
    <form class="card" method="post" action="install.php?step=4">
      <h1>Tudo pronto para instalar</h1>
      <p class="muted">Vou criar as tabelas, importar os simulados e cadastrar o administrador.</p>
      <label class="check"><input type="checkbox" name="import_questions" value="1" checked> Importar o banco de questoes que ja acompanha o pacote (301 questoes)</label>
      <button class="btn" type="submit">Instalar agora</button>
    </form>

  <?php else: ?>
    <div class="card">
      <h1>Instalacao concluida</h1>
      <p>Questoes importadas: <strong><?= (int) ($_SESSION['install_done']['questions'] ?? 0) ?></strong></p>
      <p class="muted">Por seguranca, apague o arquivo <code>install.php</code> do servidor.</p>
      <a class="btn" href="index.php">Abrir o site</a>
      <a class="btn ghost" href="admin/index.php">Abrir o painel admin</a>
    </div>
  <?php endif; ?>
</div>
</body>
</html>
