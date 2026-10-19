import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEntry } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { EntryEditForm } from "@/components/entry-edit-form";
import { InstallmentRow } from "@/components/installment-row";
import { Stat } from "@/components/stat";
import { formatBRL, todayISO } from "@/lib/finance";
import { getCategories } from "@/lib/queries";
import { canEdit, getSession } from "@/lib/session";
import type { EntrySummary, Installment } from "@/lib/types";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, workspace } = await getSession();
  const editable = canEdit(workspace.role);

  const [summary, installments, categories] = await Promise.all([
    supabase.from("entry_summaries").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("installments").select("id, entry_id, number, due_date, amount, paid_at").eq("entry_id", id).order("number"),
    getCategories(),
  ]);
  if (summary.error) throw summary.error;
  if (!summary.data) notFound();
  const e = summary.data as EntrySummary;
  const rows = (installments.data ?? []) as Installment[];
  const today = todayISO();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/lancamentos" className="text-sm text-ink-2 hover:text-ink">← Lançamentos</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{e.description}</h1>
        {e.kind === "income" && <p className="text-sm text-good">Receita</p>}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Parcelas totais" value={String(e.installments_total)} />
        <Stat label={e.kind === "income" ? "Recebidas" : "Pagas"} value={String(e.installments_paid)} tone={e.installments_open === 0 ? "good" : "default"} />
        <Stat label="A vencer" value={String(e.installments_open)} hint={formatBRL(e.open_amount)} />
        <Stat label="Valor total" value={formatBRL(e.total_amount)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-4 lg:col-span-3">
          <h2 className="mb-3 font-semibold">Parcelas</h2>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <InstallmentRow key={r.id} installment={r} total={rows.length} today={today} editable={editable} income={e.kind === "income"} />
            ))}
          </ul>
        </section>

        <section className="card space-y-4 p-4 lg:col-span-2">
          <h2 className="font-semibold">Dados do lançamento</h2>
          <EntryEditForm entry={e} categories={categories} editable={editable} />
          {editable && (
            <form action={deleteEntry} className="border-t border-border pt-4">
              <input type="hidden" name="id" value={e.id} />
              <ConfirmButton className="btn-danger w-full" message="Excluir este lançamento e todas as parcelas?">
                Excluir lançamento
              </ConfirmButton>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
