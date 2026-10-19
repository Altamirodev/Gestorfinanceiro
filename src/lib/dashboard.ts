import { addDays, addMonths } from "./finance.ts";
import type { Category, InstallmentWithEntry } from "./types.ts";

export type DueItem = {
  id: string;
  entryId: string;
  description: string;
  number: number;
  totalInEntry: number;
  dueDate: string;
  amount: number;
  categoryId: string | null;
  kind: "expense" | "income";
  paid: boolean;
};

export type Overview = {
  today: string;
  month: string; // AAAA-MM
  overdue: { count: number; amount: number };
  next7: { count: number; amount: number };
  monthToPay: number; // despesas em aberto no mês (sem as vencidas de meses anteriores)
  monthPaid: number; // despesas do mês já pagas
  monthIncome: number; // receitas previstas no mês (pagas ou não)
  totalOpen: number; // todas as despesas em aberto
  byMonth: { month: string; amount: number }[]; // próximos 12 meses, despesas em aberto
  byCategory: { categoryId: string | null; name: string; color: string; amount: number }[]; // despesas do mês
  upcoming: { date: string; items: DueItem[]; total: number }[]; // vencidas + próximos 30 dias
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function toDueItems(rows: InstallmentWithEntry[], countByEntry: Map<string, number>): DueItem[] {
  return rows.map((r) => ({
    id: r.id,
    entryId: r.entry_id,
    description: r.entries?.description ?? "(sem descrição)",
    number: r.number,
    totalInEntry: countByEntry.get(r.entry_id) ?? r.number,
    dueDate: r.due_date,
    amount: Number(r.amount),
    categoryId: r.entries?.category_id ?? null,
    kind: r.entries?.kind ?? "expense",
    paid: r.paid_at !== null,
  }));
}

export function buildOverview(items: DueItem[], categories: Category[], today: string): Overview {
  const month = today.slice(0, 7);
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const expenses = items.filter((i) => i.kind === "expense");
  const openExp = expenses.filter((i) => !i.paid);

  const overdue = openExp.filter((i) => i.dueDate < today);
  const next7 = openExp.filter((i) => i.dueDate >= today && i.dueDate <= in7);

  const months = Array.from({ length: 12 }, (_, k) => addMonths(`${month}-01`, k).slice(0, 7));
  const byMonthMap = new Map(months.map((m) => [m, 0]));
  for (const i of openExp) {
    const m = i.dueDate.slice(0, 7);
    if (byMonthMap.has(m)) byMonthMap.set(m, byMonthMap.get(m)! + i.amount);
  }

  const catTotals = new Map<string | null, number>();
  for (const i of expenses.filter((e) => e.dueDate.startsWith(month))) {
    catTotals.set(i.categoryId, (catTotals.get(i.categoryId) ?? 0) + i.amount);
  }
  const byCategory = [...catTotals.entries()]
    .map(([id, amount]) => {
      const c = id ? catMap.get(id) : undefined;
      return { categoryId: id, name: c?.name ?? "Sem categoria", color: c?.color ?? "#8a8983", amount: r2(amount) };
    })
    .sort((a, b) => b.amount - a.amount);

  const upcomingItems = items
    .filter((i) => !i.paid && (i.dueDate < today || i.dueDate <= in30))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
  const groups = new Map<string, DueItem[]>();
  for (const i of upcomingItems) groups.set(i.dueDate, [...(groups.get(i.dueDate) ?? []), i]);

  const sum = (arr: DueItem[]) => r2(arr.reduce((a, b) => a + b.amount, 0));
  const monthExp = expenses.filter((i) => i.dueDate.startsWith(month));

  return {
    today,
    month,
    overdue: { count: overdue.length, amount: sum(overdue) },
    next7: { count: next7.length, amount: sum(next7) },
    monthToPay: sum(monthExp.filter((i) => !i.paid)),
    monthPaid: sum(monthExp.filter((i) => i.paid)),
    monthIncome: sum(items.filter((i) => i.kind === "income" && i.dueDate.startsWith(month))),
    totalOpen: sum(openExp),
    byMonth: months.map((m) => ({ month: m, amount: r2(byMonthMap.get(m)!) })),
    byCategory,
    upcoming: [...groups.entries()].map(([date, list]) => ({
      date,
      items: list,
      total: sum(list.filter((i) => i.kind === "expense")),
    })),
  };
}
