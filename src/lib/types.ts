export type Kind = "expense" | "income";
export type Role = "owner" | "editor" | "viewer";

export type Category = {
  id: string;
  name: string;
  kind: Kind;
  color: string;
};

export type EntrySummary = {
  id: string;
  kind: Kind;
  description: string;
  notes: string | null;
  category_id: string | null;
  created_at: string;
  installments_total: number;
  installments_paid: number;
  installments_open: number;
  total_amount: string;
  open_amount: string;
  next_due_date: string | null;
};

export type Installment = {
  id: string;
  entry_id: string;
  number: number;
  due_date: string;
  amount: string;
  paid_at: string | null;
};

export type InstallmentWithEntry = Installment & {
  entries: { description: string; kind: Kind; category_id: string | null } | null;
};

export const CATEGORY_COLORS = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#6250d6", "#e34948",
];
