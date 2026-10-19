import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOverview, type DueItem } from "./dashboard.ts";

const base = { entryId: "e", number: 1, totalInEntry: 1, categoryId: "c1", kind: "expense" as const, paid: false };
const items: DueItem[] = [
  { ...base, id: "1", description: "Atrasada", dueDate: "2026-10-01", amount: 50 },
  { ...base, id: "2", description: "Semana", dueDate: "2026-10-22", amount: 100 },
  { ...base, id: "3", description: "Paga", dueDate: "2026-10-10", amount: 30, paid: true },
  { ...base, id: "4", description: "Próximo mês", dueDate: "2026-11-15", amount: 200, categoryId: null },
  { ...base, id: "5", description: "Salário", dueDate: "2026-10-05", amount: 5000, kind: "income", paid: true },
];

test("buildOverview calcula alertas e totais", () => {
  const o = buildOverview(items, [{ id: "c1", name: "Casa", kind: "expense", color: "#2a78d6" }], "2026-10-19");
  assert.deepEqual(o.overdue, { count: 1, amount: 50 });
  assert.deepEqual(o.next7, { count: 1, amount: 100 });
  assert.equal(o.monthToPay, 150);
  assert.equal(o.monthPaid, 30);
  assert.equal(o.monthIncome, 5000);
  assert.equal(o.totalOpen, 350);
  assert.equal(o.byMonth.length, 12);
  assert.deepEqual(o.byMonth.slice(0, 2), [
    { month: "2026-10", amount: 150 },
    { month: "2026-11", amount: 200 },
  ]);
  assert.deepEqual(o.byCategory.map((c) => [c.name, c.amount]), [["Casa", 180]]);
  assert.deepEqual(o.upcoming.map((g) => g.date), ["2026-10-01", "2026-10-22", "2026-11-15"]);
});
