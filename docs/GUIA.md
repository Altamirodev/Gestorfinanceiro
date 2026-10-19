# Guia de colocação no ar (sem precisar saber programar)

Este guia explica, passo a passo, o que você precisa criar para o app funcionar na internet,
por que cada peça existe e quanto custa. Leva cerca de 30–40 minutos na primeira vez.

## Visão geral: as 4 peças

| Peça | Serviço | Para que serve | Custo para uso pessoal |
|---|---|---|---|
| Código | **GitHub** (você já tem) | Guarda o código do app | Grátis |
| Banco de dados + login | **Supabase** | Guarda seus lançamentos com segurança e cuida de login/senha | Grátis (plano Free) |
| Hospedagem | **Vercel** | Deixa o app acessível em um endereço `https://...` | Grátis (plano Hobby) |
| Inteligência artificial | **Anthropic (Claude)** | O assistente de dicas, alertas, relatórios e pesquisas | Pago por uso, normalmente poucos reais/mês para uso pessoal |

> **Observação sobre o Supabase Free:** projetos gratuitos são "pausados" após 7 dias sem nenhum acesso.
> Basta entrar no painel do Supabase e clicar em *Restore*. Se usar o app toda semana, isso não acontece.

---

## Passo 1 — Supabase (banco de dados e login)

1. Acesse <https://supabase.com> e crie uma conta (pode entrar com o GitHub).
2. Clique em **New project**.
   - **Name:** `gestor-financeiro`
   - **Database password:** clique em *Generate a password* e **guarde em um gerenciador de senhas**.
   - **Region:** `South America (São Paulo)` — deixa o app mais rápido e mantém os dados no Brasil.
3. Espere o projeto ficar pronto (1–2 min).
4. No menu lateral, abra **SQL Editor → New query**, cole **todo** o conteúdo do arquivo
   [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) e clique em **Run**.
   Deve aparecer "Success. No rows returned".
5. Em **Authentication → URL Configuration**:
   - **Site URL:** o endereço do app na Vercel (você terá no Passo 3; volte aqui depois). Ex.: `https://gestor-financeiro.vercel.app`
   - **Redirect URLs:** adicione `https://SEU-APP.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
6. Em **Project Settings → API** (ou **API Keys**), copie:
   - **Project URL** → será o `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable key** → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ⚠️ **Não** use a chave `service_role` / `secret` em lugar nenhum deste app.

## Passo 2 — Anthropic (assistente de IA)

1. Acesse <https://console.anthropic.com> e crie uma conta.
2. Em **Billing**, adicione um cartão e um crédito pequeno (ex.: US$ 5–10).
3. Em **Billing → Limits**, defina um **limite mensal de gastos** (ex.: US$ 10). Isso evita qualquer surpresa.
4. Em **API Keys → Create Key**, dê o nome `gestor-financeiro` e copie a chave (começa com `sk-ant-`).
   Ela só aparece uma vez. Essa chave é **secreta**: nunca cole em e-mail, chat ou no código.

## Passo 3 — Vercel (hospedagem)

1. Acesse <https://vercel.com> e entre com sua conta do GitHub.
2. **Add New → Project** → escolha o repositório `gestorfinanceiro` → **Import**.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre as três:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable do Supabase |
   | `ANTHROPIC_API_KEY` | chave `sk-ant-...` da Anthropic |

4. Clique em **Deploy**. Ao final, a Vercel mostra o endereço do app (ex.: `https://gestor-financeiro.vercel.app`).
5. Volte ao Supabase (Passo 1, item 5) e preencha o **Site URL** e o **Redirect URL** com esse endereço.

> Por padrão a Vercel publica a branch principal (`main`). Enquanto o código estiver em outra branch,
> você pode escolher a branch em **Settings → Git → Production Branch** ou fazer o *merge* do Pull Request.

## Passo 4 — Primeiro acesso e "trancar a porta"

1. Abra o endereço do app, clique em **Primeiro acesso? Criar conta**, use seu e-mail e uma senha forte (12+ caracteres).
2. Confirme pelo link que chega no seu e-mail.
3. **Importante — desative novos cadastros**: no Supabase, vá em
   **Authentication → Sign In / Providers → Email** (ou **Auth Settings**) e **desligue "Allow new users to sign up"**.
   Assim, ninguém além de você consegue criar conta no seu app. Quando for compartilhar, você convida a pessoa
   por **Authentication → Users → Invite user**.
4. Ative a verificação em duas etapas (2FA) nas contas de **GitHub, Supabase, Vercel e Anthropic**.
   Essas contas são as "chaves do cofre".

Pronto! Comece por **Categorias** (crie os nomes do seu jeito) e depois **Novo lançamento**.

---

## Segurança: o que já está feito e o que é com você

**Já está no app:**
- **Row Level Security (RLS)** no banco: cada consulta é filtrada pelo próprio banco de acordo com quem está logado.
  Mesmo que alguém descubra a chave pública, não consegue ler nem alterar os seus dados.
  (Isso foi testado: um segundo usuário não enxerga nem altera dados do primeiro, e um "leitor" não consegue editar.)
- **Senhas** são guardadas pelo Supabase com hash (ninguém, nem você, consegue vê-las).
- **Chave da IA só no servidor**: o navegador nunca recebe a `ANTHROPIC_API_KEY`.
- **HTTPS** obrigatório (Vercel) + cabeçalhos de segurança (anti-clickjacking, HSTS, etc.).
- **Validação** de todos os formulários no servidor antes de gravar no banco.
- O app não aparece em buscadores (`noindex`).

**É com você:**
- Desligar novos cadastros (Passo 4.3) e usar 2FA nas contas (Passo 4.4).
- Nunca compartilhar as chaves secretas (`ANTHROPIC_API_KEY`, `service_role`, senha do banco).
- Definir o limite de gastos na Anthropic (Passo 2.3).
- **Backup:** o plano Free do Supabase não tem backup diário automático para download. Periodicamente,
  em **Table Editor**, exporte as tabelas `entries`, `installments` e `categories` em CSV
  (ou passe para o plano Pro, ~US$ 25/mês, que tem backups diários).

**Privacidade da IA:** ao usar o assistente, um resumo dos seus lançamentos (descrições, valores, datas e
categorias) é enviado à Anthropic para gerar a resposta. Pelos termos comerciais da API, a Anthropic, por padrão, não usa esses dados para
treinar modelos. Evite colocar dados sensíveis (CPF, número de cartão, senhas) nas descrições.

---

## Rodar no seu computador (opcional)

Precisa do [Node.js 22+](https://nodejs.org).

```bash
npm install
cp .env.example .env.local   # e preencha os valores
npm run dev                  # abre em http://localhost:3000
```

Verificações: `npm test` (cálculos), `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Próximos passos (quando quiser compartilhar)

O banco **já foi desenhado para múltiplos perfis**: todo dado pertence a um "espaço" e cada pessoa tem um papel nele:

| Papel | Pode |
|---|---|
| `owner` (dono) | tudo, inclusive adicionar/remover pessoas |
| `editor` | criar, editar e excluir lançamentos e categorias |
| `viewer` (leitor) | apenas visualizar |

Falta apenas a tela para convidar pessoas e escolher o papel (e, se desejar, trocar de espaço — ex.: "Pessoal" e
"Casa"). Até lá, dá para adicionar alguém manualmente: convide a pessoa pelo Supabase e insira uma linha em
`workspace_members` com o papel desejado.

Outras ideias: lançamentos recorrentes sem fim (ex.: aluguel), alertas por e-mail/WhatsApp,
importação de extrato/fatura (OFX/CSV), metas de orçamento por categoria.
