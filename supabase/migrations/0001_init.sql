-- Gestor Financeiro — esquema inicial
-- Rode este arquivo no Supabase: Dashboard -> SQL Editor -> New query -> colar -> Run.
--
-- Modelo de acesso: todo dado pertence a um "espaço" (workspace). Cada usuário
-- ganha um espaço pessoal ao se cadastrar. Para compartilhar no futuro, basta
-- adicionar outra pessoa em workspace_members com o papel desejado:
--   owner  = dono (tudo, inclusive gerenciar membros)
--   editor = cria/edita/exclui lançamentos e categorias
--   viewer = só visualiza
-- As regras de acesso são aplicadas pelo próprio banco (Row Level Security),
-- então mesmo que alguém tenha a chave pública, só enxerga o que pode.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Categorias com a SUA nomenclatura (ex.: "Casa da praia", "Mercado do mês").
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  color text not null default '#2a78d6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- Um lançamento (compra, conta, financiamento, salário...).
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  description text not null check (char_length(description) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_workspace_idx on public.entries (workspace_id);

-- Cada parcela de um lançamento. Totais, pagas e a vencer são calculados daqui.
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  number int not null check (number >= 1),
  due_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  paid_at timestamptz,
  unique (entry_id, number)
);
create index installments_workspace_due_idx on public.installments (workspace_id, due_date);

-- Visão consolidada: um lançamento com suas contagens de parcelas.
create view public.entry_summaries with (security_invoker = true) as
select
  e.id,
  e.workspace_id,
  e.kind,
  e.description,
  e.notes,
  e.category_id,
  e.created_at,
  count(i.id)::int as installments_total,
  count(i.id) filter (where i.paid_at is not null)::int as installments_paid,
  count(i.id) filter (where i.paid_at is null)::int as installments_open,
  coalesce(sum(i.amount), 0)::numeric(14, 2) as total_amount,
  coalesce(sum(i.amount) filter (where i.paid_at is null), 0)::numeric(14, 2) as open_amount,
  min(i.due_date) filter (where i.paid_at is null) as next_due_date
from public.entries e
left join public.installments i on i.entry_id = e.id
group by e.id;

-- ---------------------------------------------------------------------------
-- Funções auxiliares de permissão
-- (security definer evita recursão nas políticas de workspace_members)
-- ---------------------------------------------------------------------------

create or replace function public.has_workspace_role(ws uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

revoke all on function public.has_workspace_role(uuid, text[]) from public;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.installments enable row level security;

-- workspaces
create policy "membros veem o espaço" on public.workspaces for select to authenticated
  using (public.has_workspace_role(id, array['owner', 'editor', 'viewer']));
create policy "dono altera o espaço" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner']));
create policy "dono exclui o espaço" on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, array['owner']));

-- workspace_members
create policy "membros veem membros" on public.workspace_members for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'editor', 'viewer']));
create policy "dono adiciona membros" on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']));
create policy "dono altera membros" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']));
create policy "dono remove membros" on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']) and user_id <> auth.uid());

-- categories, entries, installments: leitura para todos os membros, escrita para owner/editor
do $$
declare t text;
begin
  foreach t in array array['categories', 'entries', 'installments'] loop
    execute format(
      'create policy "membros leem" on public.%I for select to authenticated
         using (public.has_workspace_role(workspace_id, array[''owner'',''editor'',''viewer'']))', t);
    execute format(
      'create policy "editores inserem" on public.%I for insert to authenticated
         with check (public.has_workspace_role(workspace_id, array[''owner'',''editor'']))', t);
    execute format(
      'create policy "editores alteram" on public.%I for update to authenticated
         using (public.has_workspace_role(workspace_id, array[''owner'',''editor'']))
         with check (public.has_workspace_role(workspace_id, array[''owner'',''editor'']))', t);
    execute format(
      'create policy "editores excluem" on public.%I for delete to authenticated
         using (public.has_workspace_role(workspace_id, array[''owner'',''editor'']))', t);
  end loop;
end $$;

-- Garante que parcela e lançamento pertencem ao mesmo espaço,
-- e que a categoria escolhida é do mesmo espaço do lançamento.
create or replace function public.check_same_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'installments' then
    if not exists (select 1 from public.entries e where e.id = new.entry_id and e.workspace_id = new.workspace_id) then
      raise exception 'parcela e lançamento devem estar no mesmo espaço';
    end if;
  elsif tg_table_name = 'entries' and new.category_id is not null then
    if not exists (select 1 from public.categories c where c.id = new.category_id and c.workspace_id = new.workspace_id) then
      raise exception 'categoria inválida para este espaço';
    end if;
  end if;
  return new;
end;
$$;

create trigger installments_same_ws before insert or update on public.installments
  for each row execute function public.check_same_workspace();
create trigger entries_same_ws before insert or update on public.entries
  for each row execute function public.check_same_workspace();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Criação atômica de lançamento + parcelas (tudo ou nada).
-- security invoker: as políticas RLS acima continuam valendo.
-- p_installments: [{"number":1,"due_date":"2026-01-10","amount":100.00,"paid":false}, ...]
-- ---------------------------------------------------------------------------

create or replace function public.create_entry_with_installments(
  p_workspace_id uuid,
  p_kind text,
  p_description text,
  p_notes text,
  p_category_id uuid,
  p_installments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_id uuid;
begin
  if jsonb_typeof(p_installments) <> 'array' or jsonb_array_length(p_installments) not between 1 and 600 then
    raise exception 'informe entre 1 e 600 parcelas';
  end if;

  insert into public.entries (workspace_id, kind, description, notes, category_id)
  values (p_workspace_id, p_kind, p_description, nullif(p_notes, ''), p_category_id)
  returning id into v_entry_id;

  insert into public.installments (entry_id, workspace_id, number, due_date, amount, paid_at)
  select
    v_entry_id,
    p_workspace_id,
    (x ->> 'number')::int,
    (x ->> 'due_date')::date,
    (x ->> 'amount')::numeric(14, 2),
    case when (x ->> 'paid')::boolean then now() else null end
  from jsonb_array_elements(p_installments) as x;

  return v_entry_id;
end;
$$;

revoke all on function public.create_entry_with_installments(uuid, text, text, text, uuid, jsonb) from public;
grant execute on function public.create_entry_with_installments(uuid, text, text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Espaço pessoal criado automaticamente no cadastro
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  insert into public.workspaces (name, created_by) values ('Pessoal', new.id) returning id into v_ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Permissões de tabela (RLS continua filtrando as linhas).
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.workspaces, public.workspace_members,
  public.categories, public.entries, public.installments to authenticated;
grant select on public.entry_summaries to authenticated;
