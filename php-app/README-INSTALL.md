# Simulados PMMA — Edital360 (versão PHP instalável)

Pacote PHP puro (sem framework) que reproduz o sistema: cadastro/login, simulado gratuito de 40 questões,
simulados pagos de 120 questões, Pix via Mercado Pago com confirmação automática, leads e painel administrativo.

## Requisitos do servidor
- PHP 8.0 ou superior com extensões `pdo_mysql`, `curl` e `mbstring`
- MySQL 5.7+ ou MariaDB 10.3+
- HTTPS recomendado (obrigatório para pagamentos em produção)

## Instalação em 5 passos
1. Envie o conteúdo desta pasta para o servidor (ex.: `public_html/`) via FTP ou gerenciador de arquivos.
2. Crie um banco de dados MySQL vazio no painel da hospedagem e anote host, nome, usuário e senha.
3. Dê permissão de escrita na pasta `data/` e na raiz (o instalador grava `config.php`). Normalmente `755` já basta.
4. Acesse `https://seudominio.com/install.php` e siga o assistente:
   - Passo 1: verificação do servidor
   - Passo 2: dados do MySQL (testa a conexão na hora)
   - Passo 3: nome do site, WhatsApp, dados da empresa, Access Token do Mercado Pago e criação do administrador
   - Passo 4: criação das tabelas e importação das 301 questões
5. **Apague o arquivo `install.php`** após concluir.

## Estrutura
```
index.php        Landing + login/cadastro
painel.php       Catálogo de simulados e histórico do aluno
simulado.php     Execução do quiz com correção imediata
resultado.php    Resultado com diagnóstico por matéria
pagar.php        Pix (compra ou apoio) com verificação automática
api/pix_status.php  Consulta de status do pagamento
admin/index.php  Painel administrativo (CMS)
includes/        Núcleo: conexão, regras de negócio e layout
data/            schema.sql, seed.json e o arquivo de lock
assets/style.css Tema dark premium
```

## Regras de acesso já implementadas
- Simulado gratuito: liberado na primeira tentativa de cada conta; após concluir, exige apoio via Pix para refazer.
- Simulados pagos: bloqueados no cadastro e liberados automaticamente quando o Pix é aprovado (ou manualmente pelo admin).
- Administradores acessam tudo sem pagar.
- Reincidência é detectada por conta e por impressão digital do dispositivo (IP + navegador).

## Painel administrativo
Abas: Visão geral, Usuários (seleção múltipla, exclusão em massa, redefinir senha, promover admin),
Liberar acesso, Pagamentos (sincronizar com Mercado Pago), Leads (exportar CSV, exclusão em massa),
Questões e Configurações (dados do site + token do Mercado Pago).

## Mercado Pago
Informe o **Access Token** de produção (`APP_USR-...`). A Public Key é opcional.
O sistema consulta o status do pagamento a cada 3 segundos e libera o acesso somente após o status `approved`.

## Segurança
- Senhas com `password_hash` (bcrypt), sessões regeneradas no login e proteção CSRF em todos os formulários.
- Consultas com PDO preparado; o gabarito nunca é enviado ao navegador antes da resposta.
- Após instalar, remova `install.php` e mantenha `config.php` fora do controle público de versão.
