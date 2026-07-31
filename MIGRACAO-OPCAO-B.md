# Opção B — Independência total da Lovable

Objetivo: rodar o projeto com **seu próprio Supabase** + **seu próprio host (Vercel)**,
sem depender da conta Lovable.

O código já está 100% no repositório (inclusive todas as migrations em
`supabase/migrations/`), então nada se perde se a conta Lovable sumir — desde que
você tenha feito o passo 1.

---

## 1. Garantir o código fora da Lovable (faça isso hoje)

1. No editor: **Plus (+) → GitHub → Conectar projeto → Create Repository**.
2. Confirme no GitHub que a pasta `supabase/migrations/` foi para o repo.

A partir daqui, o código é seu, independente da plataforma.

---

## 2. Criar seu próprio projeto Supabase

1. Crie conta em https://supabase.com e um projeto novo (região: São Paulo).
2. Anote:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key**
   - **service_role key** (Settings → API)
   - **Database password** (definida na criação)

---

## 3. Recriar o schema no seu Supabase

Com a Supabase CLI instalada (`npm i -g supabase`), na raiz do repo:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Isso aplica **todas** as migrations (tabelas, RLS, funções, triggers) no seu banco.

Alternativa sem CLI: abra o SQL Editor do seu Supabase e cole o conteúdo dos
arquivos de `supabase/migrations/` **na ordem cronológica do nome**.

---

## 4. Migrar os dados atuais

1. No Lovable: **Cloud → Advanced settings → Export data** (gera um dump do banco).
2. Restaure no seu Supabase:

```bash
psql "postgresql://postgres:SUA_SENHA@db.SEU_REF.supabase.co:5432/postgres" -f dump.sql
```

Observações:
- Usuários ficam no schema `auth`. Se o dump não trouxer `auth.users`, os alunos
  precisarão refazer o cadastro (o trigger `handle_new_user` recria perfil e lead).
- Questões, campanhas, tentativas e pagamentos estão no schema `public` e migram normalmente.

---

## 5. Configurar Auth no seu Supabase

- Authentication → Providers → **Email**: ativar, e **desativar "Confirm email"**
  (o projeto hoje funciona sem confirmação).
- Authentication → URL Configuration: **Site URL** = seu domínio final,
  e adicione o domínio em **Redirect URLs**.
- Recomendado: ativar **Leaked password protection**.

---

## 6. Deploy na Vercel

1. Vercel → **Add New → Project → Import** o repositório do GitHub.
2. Build command: `npm run build` · Output: detectado pelo preset (já configurado
   em `vite.config.ts` com `nitro: { preset: "vercel" }`).
3. Environment Variables (use `.env.example` como referência):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do **seu** Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do seu Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ref do seu projeto |
| `SUPABASE_URL` | mesma URL |
| `SUPABASE_PUBLISHABLE_KEY` | mesma anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role do seu Supabase (**secreta**) |
| `MERCADOPAGO_ACCESS_TOKEN` | seu token do Mercado Pago (**secreta**) |

Marque as duas últimas apenas como **server-side** (nunca com prefixo `VITE_`).

---

## 7. O que deixa de existir sem a Lovable

- **Lovable AI Gateway** (`LOVABLE_API_KEY`): hoje o app não depende dele para o
  funil de simulados. Se um dia usar IA, troque por uma chave direta (OpenAI/Gemini).
- **Editor e preview Lovable**: você passa a editar por IDE + git push.
- **Backups e gestão do banco**: passam a ser sua responsabilidade
  (Supabase → Database → Backups).

---

## 8. Checklist final

- [ ] Repositório no GitHub com migrations
- [ ] Supabase próprio criado e `db push` aplicado
- [ ] Dump restaurado e dados conferidos
- [ ] Auth configurado (email sem confirmação + URLs)
- [ ] Variáveis na Vercel preenchidas
- [ ] Deploy verde e login funcionando
- [ ] Pix testado com valor mínimo real
