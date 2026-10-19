"use client";

import { useOptimistic, useTransition } from "react";
import { setInstallmentPaid } from "@/app/actions";

export function PayToggle({ id, paid, income, disabled }: { id: string; paid: boolean; income?: boolean; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(paid);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await setInstallmentPaid(id, !optimistic);
        })
      }
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
        optimistic
          ? "border-good/40 bg-good-bg text-good"
          : "border-border bg-surface text-ink-2 hover:border-accent hover:text-accent"
      }`}
    >
      {optimistic ? (income ? "✓ Recebido" : "✓ Pago") : income ? "Recebi" : "Paguei"}
    </button>
  );
}
