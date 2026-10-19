# Gestor Financeiro

Controle financeiro pessoal: lançamentos com parcelas, categorias com a sua própria nomenclatura,
painel de vencimentos por data e um assistente de IA que dá dicas, alertas, relatórios e pesquisa na web.

**Para colocar no ar, siga o [Guia passo a passo](docs/GUIA.md).**

## Funcionalidades

- **Lançamentos** (despesas e receitas) com descrição, observações, categoria e parcelas:
  informe o valor (por parcela ou total), o número de parcelas, quantas já foram pagas e o 1º vencimento.
  O app mostra parcelas **totais, pagas e a vencer** e permite marcar cada uma como paga.
- **Categorias pessoais**: você cria os nomes e as cores (nada de lista genérica).
- **Painel**: vencidas, próximos 7 dias, a pagar no mês, receitas e saldo previsto,
  gráfico de quanto há a pagar por mês (12 meses), gastos por categoria e lista de vencimentos por data.
- **Assistente IA** (Claude): relatórios, alertas e dicas com base nos seus dados; pesquisa na web
  com fontes citadas quando a pergunta precisa de informação atual.
- **Pronto para compartilhar**: espaços com papéis `owner` / `editor` / `viewer` aplicados no banco (RLS).

## Tecnologia

| Camada | Escolha |
|---|---|
| App web | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| Banco e login | Supabase (PostgreSQL com Row Level Security + Supabase Auth) |
| IA | Claude (API da Anthropic) com busca na web |
| Hospedagem | Vercel |

## Estrutura

```
supabase/migrations/   esquema do banco, regras de acesso (RLS) e funções
src/app/               telas (painel, lançamentos, categorias, assistente, login) e ações do servidor
src/app/api/assistant/ rota do assistente de IA (streaming)
src/components/        componentes de interface
src/lib/               cálculos (parcelas, datas, painel), acesso a dados e prompt do assistente
docs/GUIA.md           guia de hospedagem, configuração e segurança
```

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
npm test && npm run typecheck && npm run lint
```
