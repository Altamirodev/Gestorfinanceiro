import "server-only";
import { buildOverview, toDueItems } from "@/lib/dashboard";
import { addMonths, todayISO } from "@/lib/finance";
import { getSession } from "@/lib/session";
import type { Category, InstallmentWithEntry } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const { supabase, workspace } = await getSession();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind, color")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (error) throw error;
  return data as Category[];
}

/** Parcelas em aberto (qualquer data) + tudo dos últimos 3 meses, com o resumo do painel. */
export async function getOverview() {
  const { supabase, workspace } = await getSession();
  const today = todayISO();
  const since = addMonths(`${today.slice(0, 7)}-01`, -3);

  const [installments, counts, categories] = await Promise.all([
    supabase
      .from("installments")
      .select("id, entry_id, number, due_date, amount, paid_at, entries(description, kind, category_id)")
      .eq("workspace_id", workspace.id)
      .or(`paid_at.is.null,due_date.gte.${since}`)
      .order("due_date")
      .limit(5000),
    supabase.from("entry_summaries").select("id, installments_total").eq("workspace_id", workspace.id),
    getCategories(),
  ]);
  if (installments.error) throw installments.error;
  if (counts.error) throw counts.error;

  const countByEntry = new Map(counts.data.map((c) => [c.id as string, c.installments_total as number]));
  const items = toDueItems(installments.data as unknown as InstallmentWithEntry[], countByEntry);
  return { overview: buildOverview(items, categories, today), items, categories };
}
