// Regras de cálculo puras (sem banco), fáceis de testar.

export type PlannedInstallment = {
  number: number;
  due_date: string; // AAAA-MM-DD
  amount: number; // em reais, 2 casas
  paid: boolean;
};

/** Converte "1.234,56", "1234.56" ou "1234,5" em centavos inteiros. */
export function parseMoneyToCents(input: string): number | null {
  const raw = input.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(",")) {
    // formato brasileiro: ponto é milhar, vírgula é decimal
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [int, dec = ""] = normalized.split(".");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

/** Divide um total em N parcelas; a diferença de centavos vai para a 1ª. */
export function splitCents(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
}

/** Soma meses a uma data AAAA-MM-DD mantendo o dia (ajusta para o fim do mês). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12; // 0-11
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function planInstallments(opts: {
  amountCents: number;
  amountMode: "per_installment" | "total";
  count: number;
  alreadyPaid: number;
  firstDueDate: string;
}): PlannedInstallment[] {
  const { amountCents, amountMode, count, alreadyPaid, firstDueDate } = opts;
  const amounts =
    amountMode === "total" ? splitCents(amountCents, count) : Array(count).fill(amountCents);
  return amounts.map((cents, i) => ({
    number: i + 1,
    due_date: addMonths(firstDueDate, i),
    amount: cents / 100,
    paid: i < alreadyPaid,
  }));
}

export function todayISO(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatBRL(value: number | string): string {
  return brl.format(Number(value));
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
export function formatMonth(yyyyMm: string): string {
  return monthFmt.format(new Date(`${yyyyMm}-01T00:00:00Z`)).replace(".", "");
}
