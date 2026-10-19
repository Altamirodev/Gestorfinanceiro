"use client";

import { useActionState } from "react";
import { updateEntry } from "@/app/actions";
import type { Category, EntrySummary } from "@/lib/types";

export function EntryEditForm({ entry, categories, editable }: { entry: EntrySummary; categories: Category[]; editable: boolean }) {
  const [state, action, pending] = useActionState(updateEntry, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="kind" value={entry.kind} />
      <fieldset disabled={!editable} className="space-y-3">
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <input className="input" id="description" name="description" defaultValue={entry.description} required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="category_id">Categoria</label>
          <select className="input" id="category_id" name="category_id" defaultValue={entry.category_id ?? ""}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.kind === entry.kind).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">Observações</label>
          <textarea className="input min-h-20" id="notes" name="notes" defaultValue={entry.notes ?? ""} maxLength={2000} />
        </div>
        {state?.error && <p role="alert" className="text-sm text-critical">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-good">Salvo.</p>}
        {editable && <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</button>}
      </fieldset>
    </form>
  );
}
