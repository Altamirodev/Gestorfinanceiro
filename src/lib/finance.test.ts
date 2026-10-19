import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, addMonths, parseMoneyToCents, planInstallments, splitCents } from "./finance.ts";

test("parseMoneyToCents aceita formatos brasileiros e internacionais", () => {
  assert.equal(parseMoneyToCents("1.234,56"), 123456);
  assert.equal(parseMoneyToCents("R$ 99,9"), 9990);
  assert.equal(parseMoneyToCents("1234.5"), 123450);
  assert.equal(parseMoneyToCents("100"), 10000);
  assert.equal(parseMoneyToCents("abc"), null);
  assert.equal(parseMoneyToCents("1,234"), null);
  assert.equal(parseMoneyToCents(""), null);
});

test("splitCents não perde centavos", () => {
  assert.deepEqual(splitCents(10000, 3), [3334, 3333, 3333]);
  assert.equal(splitCents(99999, 7).reduce((a, b) => a + b, 0), 99999);
});

test("addMonths ajusta para o fim do mês", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-11-15", 3), "2027-02-15");
  assert.equal(addMonths("2026-12-10", 0), "2026-12-10");
});

test("addDays atravessa meses", () => {
  assert.equal(addDays("2026-10-30", 3), "2026-11-02");
});

test("planInstallments marca as já pagas", () => {
  const plan = planInstallments({
    amountCents: 30000,
    amountMode: "total",
    count: 3,
    alreadyPaid: 1,
    firstDueDate: "2026-10-05",
  });
  assert.deepEqual(plan, [
    { number: 1, due_date: "2026-10-05", amount: 100, paid: true },
    { number: 2, due_date: "2026-11-05", amount: 100, paid: false },
    { number: 3, due_date: "2026-12-05", amount: 100, paid: false },
  ]);
});
