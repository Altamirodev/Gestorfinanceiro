"use client";

import { useActionState, useRef, useState } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions";
import { CATEGORY_COLORS, type Category } from "@/lib/types";

export function CategoryForm({ category, readOnly }: { category?: Category; readOnly?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof createCategory>[0], fd: FormData) => {
    const res = await (category ? updateCategory : createCategory)(prev, fd);
    if (res?.ok && !category) formRef.current?.reset();
    return res;
  }, undefined);

  return (
    <div>
      <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
        {category && <input type="hidden" name="id" value={category.id} />}
        <input type="hidden" name="color" value={color} />
        <fieldset disabled={readOnly} className="contents">
          <input className="input min-w-40 flex-1" name="name" defaultValue={category?.name} required maxLength={60}
            placeholder="Ex.: Casa da praia, Mercado do mês, Freelas" aria-label="Nome da categoria" />
          <select className="input w-auto" name="kind" defaultValue={category?.kind ?? "expense"} aria-label="Tipo">
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <div className="flex gap-1" role="radiogroup" aria-label="Cor">
            {CATEGORY_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={`size-6 rounded-full border-2 ${color === c ? "border-ink" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
          </div>
          {!readOnly && (
            <button className={category ? "btn-ghost px-3 py-1.5" : "btn-primary"} disabled={pending}>
              {category ? "Salvar" : "Adicionar"}
            </button>
          )}
        </fieldset>
        {category && !readOnly && (
          <button
            formAction={deleteCategory}
            formNoValidate
            className="px-2 text-sm text-critical hover:underline"
            onClick={(e) => { if (!confirm("Excluir a categoria? Os lançamentos ficarão sem categoria.")) e.preventDefault(); }}
          >
            Excluir
          </button>
        )}
      </form>
      {state?.error && <p role="alert" className="mt-1 text-sm text-critical">{state.error}</p>}
      {state?.ok && category && <p role="status" className="mt-1 text-xs text-good">Salvo.</p>}
    </div>
  );
}
