import Link from "next/link";
import { formatBRL, formatDate } from "@/lib/finance";
import { getCategories } from "@/lib/queries";
import { canEdit, getSession } from "@/lib/session";
import type { EntrySummary } from "@/lib/types";

type Search = Promise<{ q?: string; cat?: string; status?: string; kind?: string }>;

export default async function EntriesPage({ searchParams }: { searchParams: Search }) {
  const { q = "", cat = "", status = "open", kind = "" } = await searchParams;
  const { supabase, workspace } = await getSession();
  const categories = await getCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  let query = supabase
    .from("entry_summaries")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("next_due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("description", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  if (cat === "none") query = query.is("category_id", null);
  else if (cat) query = query.eq("category_id", cat);
  if (status === "open") query = query.gt("installments_open", 0);
  if (status === "done") query = query.eq("installments_open", 0);
  if (kind === "expense" || kind === "income") query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) throw error;
  const entries = data as EntrySummary[];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
        {canEdit(workspace.role) && <Link href="/lancamentos/novo" className="btn-primary">+ Novo lançamento</Link>}
      </header>

      <form className="card grid gap-3 p-3 sm:grid-cols-5" role="search">
        <input className="input sm:col-span-2" name="q" defaultValue={q} placeholder="Buscar pela descrição" />
        <select className="input" name="cat" defaultValue={cat} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          <option value="none">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" name="status" defaultValue={status} aria-label="Situação">
          <option value="open">Com parcelas a vencer</option>
          <option value="done">Quitados</option>
          <option value="all">Todos</option>
        </select>
        <div className="flex gap-2">
          <select className="input" name="kind" defaultValue={kind} aria-label="Tipo">
            <option value="">Despesas e receitas</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
          </select>
          <button className="btn-ghost">Filtrar</button>
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-3">Nenhum lançamento encontrado.</div>
      ) : (
        <ul className="card divide-y divide-border">
          {entries.map((e) => {
            const c = e.category_id ? catMap.get(e.category_id) : undefined;
            const pct = e.installments_total ? (e.installments_paid / e.installments_total) * 100 : 0;
            return (
              <li key={e.id}>
                <Link href={`/lancamentos/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-surface-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-medium">
                      {e.description}
                      {e.kind === "income" && (
                        <span className="ml-2 rounded bg-good-bg px-1.5 py-0.5 text-xs text-good">receita</span>
                      )}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: c?.color ?? "#8a8983" }} />
                      {c?.name ?? "Sem categoria"}
                      {e.next_due_date && <> · próxima em {formatDate(e.next_due_date)}</>}
                    </p>
                  </div>
                  <div className="w-40">
                    <p className="text-xs text-ink-2">
                      {e.installments_paid} pagas · {e.installments_open} a vencer · {e.installments_total} total
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                      <div className="h-1.5 rounded-full bg-good" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="tabular w-36 text-right">
                    <p className="text-sm font-medium">{formatBRL(e.open_amount)}</p>
                    <p className="text-xs text-ink-3">de {formatBRL(e.total_amount)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
