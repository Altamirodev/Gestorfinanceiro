"use client";

import { useActionState, useState } from "react";
import { updateInstallment } from "@/app/actions";
import { PayToggle } from "@/components/pay-toggle";
import { formatBRL, formatDate } from "@/lib/finance";
import type { Installment } from "@/lib/types";

export function InstallmentRow({ installment: i, total, today, editable, income }: {
  installment: Installment; total: number; today: string; editable: boolean; income: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof updateInstallment>[0], fd: FormData) => {
    const res = await updateInstallment(prev, fd);
    if (res?.ok) setEditing(false);
    return res;
  }, undefined);
  const late = !i.paid_at && i.due_date < today;

  if (editing) {
    return (
      <li className="py-2">
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={i.id} />
          <span className="w-12 text-sm text-ink-2">{i.number}/{total}</span>
          <input className="input w-auto" type="date" name="due_date" defaultValue={i.due_date} required aria-label="Vencimento" />
          <input className="input tabular w-28" name="amount" inputMode="decimal" aria-label="Valor"
            defaultValue={Number(i.amount).toFixed(2).replace(".", ",")} required />
          <button className="btn-primary px-3 py-1.5" disabled={pending}>Salvar</button>
          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setEditing(false)}>Cancelar</button>
          {state?.error && <p className="w-full text-sm text-critical">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <span className="w-12 text-sm text-ink-2">{i.number}/{total}</span>
        <div>
          <p className={`text-sm ${late ? "font-medium text-critical" : ""}`}>
            {formatDate(i.due_date)}{late && (income ? " · atrasada" : " · vencida")}
          </p>
          {i.paid_at && <p className="text-xs text-ink-3">{income ? "recebido" : "pago"} em {new Date(i.paid_at).toLocaleDateString("pt-BR")}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="tabular text-sm">{formatBRL(i.amount)}</span>
        {editable && !i.paid_at && (
          <button type="button" className="text-xs text-ink-3 hover:text-ink" onClick={() => setEditing(true)}>Editar</button>
        )}
        <PayToggle id={i.id} paid={i.paid_at !== null} income={income} disabled={!editable} />
      </div>
    </li>
  );
}
