"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createEntry } from "@/app/actions";
import { formatBRL, formatDate, parseMoneyToCents, planInstallments } from "@/lib/finance";
import type { Category, Kind } from "@/lib/types";

export function EntryForm({ categories, today }: { categories: Category[]; today: string }) {
  const [state, action, pending] = useActionState(createEntry, undefined);
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"per_installment" | "total">("per_installment");
  const [count, setCount] = useState(1);
  const [paid, setPaid] = useState(0);
  const [first, setFirst] = useState(today);

  const preview = useMemo(() => {
    const cents = parseMoneyToCents(amount);
    if (!cents || count < 1 || count > 600 || paid > count || !first) return null;
    return planInstallments({ amountCents: cents, amountMode: mode, count, alreadyPaid: paid, firstDueDate: first });
  }, [amount, mode, count, paid, first]);

  const total = preview?.reduce((a, b) => a + b.amount, 0) ?? 0;
  const visibleCats = categories.filter((c) => c.kind === kind);

  return (
    <form action={action} className="card space-y-5 p-5">
      <fieldset>
        <legend className="label">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((k) => (
            <label
              key={k}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
                kind === k ? "border-accent bg-accent/10 font-medium text-ink" : "border-border text-ink-2"
              }`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === "expense" ? "Despesa / conta a pagar" : "Receita / entrada de dinheiro"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <input className="input" id="description" name="description" required maxLength={200}
          placeholder="Ex.: Geladeira nova (Magazine), IPVA 2027, Mensalidade da academia" />
      </div>

      <div>
        <label className="label" htmlFor="category_id">Categoria</label>
        <select className="input" id="category_id" name="category_id" defaultValue="">
          <option value="">Sem categoria</option>
          {visibleCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {visibleCats.length === 0 && (
          <p className="mt-1 text-xs text-ink-3">
            Nenhuma categoria de {kind === "expense" ? "despesa" : "receita"}.{" "}
            <Link href="/categorias" className="text-accent underline">Criar</Link>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">Valor (R$)</label>
          <input className="input tabular" id="amount" name="amount" inputMode="decimal" required
            placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="amount_mode">Esse valor é</label>
          <select className="input" id="amount_mode" name="amount_mode" value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="per_installment">De cada parcela</option>
            <option value="total">O total (dividir nas parcelas)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="installments">Número total de parcelas</label>
          <input className="input tabular" id="installments" name="installments" type="number" min={1} max={600}
            value={count} onChange={(e) => setCount(Number(e.target.value))} required />
        </div>
        <div>
          <label className="label" htmlFor="already_paid">Parcelas já pagas</label>
          <input className="input tabular" id="already_paid" name="already_paid" type="number" min={0} max={count}
            value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="first_due_date">Vencimento da 1ª parcela</label>
          <input className="input" id="first_due_date" name="first_due_date" type="date" required
            value={first} onChange={(e) => setFirst(e.target.value)} />
          <p className="mt-1 text-xs text-ink-3">As demais vencem no mesmo dia dos meses seguintes.</p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Observações (opcional)</label>
        <textarea className="input min-h-20" id="notes" name="notes" maxLength={2000} />
      </div>

      {preview && (
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-medium">
            {count}x · total {formatBRL(total)} · {paid} paga(s) · {count - paid} a vencer
          </p>
          <p className="mt-1 text-ink-2">
            1ª em {formatDate(preview[0].due_date)} ({formatBRL(preview[0].amount)})
            {count > 1 && <> · última em {formatDate(preview[count - 1].due_date)}</>}
          </p>
        </div>
      )}

      {state?.error && <p role="alert" className="rounded-lg bg-critical-bg px-3 py-2 text-sm text-critical">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Link href="/lancamentos" className="btn-ghost">Cancelar</Link>
        <button className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}
