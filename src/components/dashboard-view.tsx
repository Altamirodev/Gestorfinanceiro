import Link from "next/link";
import { MonthlyChart } from "@/components/monthly-chart";
import { PayToggle } from "@/components/pay-toggle";
import { Stat } from "@/components/stat";
import type { Overview } from "@/lib/dashboard";
import { formatBRL, formatDate, formatMonth } from "@/lib/finance";

export function DashboardView({ overview: o, hasCategories, editable }: { overview: Overview; hasCategories: boolean; editable: boolean }) {
  const catMax = Math.max(1, ...o.byCategory.map((c) => c.amount));
  const empty = o.upcoming.length === 0 && o.byMonth.every((m) => m.amount === 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-ink-2">Hoje é {formatDate(o.today)} · {formatMonth(o.month)}</p>
        </div>
        {editable && <Link href="/lancamentos/novo" className="btn-primary">+ Novo lançamento</Link>}
      </header>

      {!hasCategories && (
        <div className="card border-accent/40 p-4 text-sm">
          <p className="font-medium">Comece criando suas categorias</p>
          <p className="mt-1 text-ink-2">
            Use os nomes que fazem sentido para você (ex.: “Casa”, “Carro do dia a dia”, “Escola das crianças”).{" "}
            <Link className="text-accent underline" href="/categorias">Criar categorias</Link>
          </p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Vencidas"
          value={formatBRL(o.overdue.amount)}
          hint={`${o.overdue.count} parcela(s)`}
          tone={o.overdue.count > 0 ? "critical" : "default"}
        />
        <Stat
          label="Próximos 7 dias"
          value={formatBRL(o.next7.amount)}
          hint={`${o.next7.count} parcela(s)`}
          tone={o.next7.count > 0 ? "warning" : "default"}
        />
        <Stat label="A pagar neste mês" value={formatBRL(o.monthToPay)} hint={`Já pago: ${formatBRL(o.monthPaid)}`} />
        <Stat
          label="Receitas do mês"
          value={formatBRL(o.monthIncome)}
          hint={`Saldo previsto: ${formatBRL(o.monthIncome - o.monthToPay - o.monthPaid)}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-4 lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">A pagar por mês</h2>
            <p className="tabular text-sm text-ink-2">Total em aberto: {formatBRL(o.totalOpen)}</p>
          </div>
          {empty ? (
            <p className="py-16 text-center text-sm text-ink-3">Nenhuma parcela em aberto ainda.</p>
          ) : (
            <>
              <MonthlyChart data={o.byMonth} />
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-ink-2">Ver como tabela</summary>
                <table className="tabular mt-2 w-full">
                  <tbody>
                    {o.byMonth.map((m) => (
                      <tr key={m.month} className="border-t border-border">
                        <td className="py-1 text-ink-2">{formatMonth(m.month)}</td>
                        <td className="py-1 text-right">{formatBRL(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Gastos do mês por categoria</h2>
          {o.byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">Sem despesas neste mês.</p>
          ) : (
            <ul className="space-y-3">
              {o.byCategory.map((c) => (
                <li key={c.categoryId ?? "none"}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="tabular text-ink-2">{formatBRL(c.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(c.amount / catMax) * 100}%`, background: c.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Vencimentos por data</h2>
        <p className="mb-4 text-sm text-ink-2">Parcelas vencidas e dos próximos 30 dias.</p>
        {o.upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">Nada a pagar nos próximos 30 dias. 🎉</p>
        ) : (
          <ol className="space-y-4">
            {o.upcoming.map((g) => {
              const late = g.date < o.today;
              const isToday = g.date === o.today;
              return (
                <li key={g.date}>
                  <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
                    <p className={`text-sm font-semibold ${late ? "text-critical" : ""}`}>
                      {formatDate(g.date)}
                      {late && " · vencida"}
                      {isToday && " · hoje"}
                    </p>
                    {g.total > 0 && <p className="tabular text-sm font-medium">{formatBRL(g.total)}</p>}
                  </div>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 py-1.5">
                        <Link href={`/lancamentos/${i.entryId}`} className="min-w-0 flex-1 hover:underline">
                          <p className="truncate text-sm">{i.description}</p>
                          <p className="text-xs text-ink-3">
                            Parcela {i.number}/{i.totalInEntry}
                            {i.kind === "income" && " · receita"}
                          </p>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                          <span className={`tabular text-sm ${i.kind === "income" ? "text-good" : ""}`}>
                            {i.kind === "income" ? "+" : ""}
                            {formatBRL(i.amount)}
                          </span>
                          <PayToggle id={i.id} paid={i.paid} income={i.kind === "income"} disabled={!editable} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
