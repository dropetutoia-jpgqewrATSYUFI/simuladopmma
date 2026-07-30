<?php
function layout_head(string $title, string $prefix = ''): void
{
    $siteName = setting('site_name', 'Simulados PMMA');
    ?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?> · <?= h($siteName) ?></title>
<meta name="description" content="Simulados estilo Cebraspe para o concurso da PMMA 2026.">
<link rel="stylesheet" href="<?= h($prefix) ?>assets/style.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="<?= h($prefix) ?>index.php"><span class="brand-mark">E360</span><strong><?= h($siteName) ?></strong></a>
  <nav>
    <?php if ($u = current_user()): ?>
      <a href="<?= h($prefix) ?>painel.php">Meu painel</a>
      <?php if ($u['role'] === 'admin'): ?><a href="<?= h($prefix) ?>admin/index.php">Admin</a><?php endif; ?>
      <a class="ghost" href="<?= h($prefix) ?>logout.php">Sair</a>
    <?php endif; ?>
  </nav>
</header>
<main class="wrap"><?php
}

function layout_foot(string $prefix = ''): void
{
    $wa = setting('whatsapp', '');
    ?></main>
<footer class="site-foot">
  <div class="brand"><span class="brand-mark">E360</span><strong><?= h(setting('site_name', 'Simulados PMMA')) ?></strong></div>
  <p><?= h(setting('company', '')) ?><?php if (setting('cnpj')): ?> · CNPJ: <?= h(setting('cnpj')) ?><?php endif; ?></p>
  <p><?php if (setting('support_email')): ?><a href="mailto:<?= h(setting('support_email')) ?>"><?= h(setting('support_email')) ?></a><?php endif; ?>
     <?php if ($wa): ?> · WhatsApp <?= h($wa) ?><?php endif; ?></p>
  <p class="muted small">Conteudo independente, sem vinculo com bancas ou orgaos oficiais.</p>
</footer>
<?php if ($wa): ?>
<a class="wa-bubble" target="_blank" rel="noopener" href="https://wa.me/<?= h($wa) ?>" aria-label="Falar no WhatsApp">
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20 3.9A10 10 0 0 0 3.5 16.2L2 22l6-1.6A10 10 0 1 0 20 3.9Zm-8 16.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.6.9 1-3.5-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.5-.6c.1-.2.1-.3 0-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.1-.3 3.4a11 11 0 0 0 4.6 4.4c1.6.7 2.6.7 3.4.5.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2Z"/></svg>
</a>
<?php endif; ?>
</body>
</html><?php
}
