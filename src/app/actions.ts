"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseMoneyToCents, planInstallments } from "@/lib/finance";
import { canEdit, getSession } from "@/lib/session";
import { CATEGORY_COLORS } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean } | undefined;

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

async function editorSession() {
  const session = await getSession();
  if (!canEdit(session.workspace.role)) throw new Error("Você só tem permissão de leitura.");
  return session;
}

function friendly(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Já existe um registro com esse nome.";
  return "Não foi possível salvar. Tente novamente.";
}

function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- categorias

const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(60),
  kind: z.enum(["expense", "income"]),
  color: z.string().refine((c) => CATEGORY_COLORS.includes(c), "Cor inválida"),
});

export async function createCategory(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase.from("categories").insert({ ...parsed.data, workspace_id: workspace.id });
  if (error) return { error: friendly(error) };
  refreshAll();
  return { ok: true };
}

export async function updateCategory(_: FormState, formData: FormData): Promise<FormState> {
  const id = uuid.safeParse(formData.get("id"));
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) return { error: parsed.error?.issues[0].message ?? "Dados inválidos" };
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("workspace_id", workspace.id);
  if (error) return { error: friendly(error) };
  refreshAll();
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  const id = uuid.parse(formData.get("id"));
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("workspace_id", workspace.id);
  if (error) throw new Error(friendly(error));
  refreshAll();
}

// ---------------------------------------------------------------- lançamentos

const entrySchema = z
  .object({
    kind: z.enum(["expense", "income"]),
    description: z.string().trim().min(1, "Descreva o lançamento").max(200),
    notes: z.string().trim().max(2000).optional().default(""),
    category_id: z.union([uuid, z.literal("")]).optional().default(""),
    amount: z.string().min(1, "Informe o valor"),
    amount_mode: z.enum(["per_installment", "total"]),
    installments: z.coerce.number().int().min(1, "Mínimo 1 parcela").max(600, "Máximo 600 parcelas"),
    already_paid: z.coerce.number().int().min(0).default(0),
    first_due_date: isoDate,
  })
  .refine((v) => v.already_paid <= v.installments, {
    message: "Parcelas pagas não pode ser maior que o total",
    path: ["already_paid"],
  });

export async function createEntry(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const cents = parseMoneyToCents(v.amount);
  if (!cents || cents <= 0) return { error: "Valor inválido. Use, por exemplo, 1.234,56" };
  if (v.amount_mode === "total" && cents < v.installments) {
    return { error: "Valor total menor que o número de parcelas." };
  }

  const plan = planInstallments({
    amountCents: cents,
    amountMode: v.amount_mode,
    count: v.installments,
    alreadyPaid: v.already_paid,
    firstDueDate: v.first_due_date,
  });

  const { supabase, workspace } = await editorSession();
  const { data, error } = await supabase.rpc("create_entry_with_installments", {
    p_workspace_id: workspace.id,
    p_kind: v.kind,
    p_description: v.description,
    p_notes: v.notes,
    p_category_id: v.category_id || null,
    p_installments: plan,
  });
  if (error) return { error: friendly(error) };

  refreshAll();
  redirect(`/lancamentos/${data}`);
}

const entryUpdateSchema = z.object({
  id: uuid,
  kind: z.enum(["expense", "income"]),
  description: z.string().trim().min(1, "Descreva o lançamento").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  category_id: z.union([uuid, z.literal("")]).optional().default(""),
});

export async function updateEntry(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = entryUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...v } = parsed.data;
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase
    .from("entries")
    .update({ ...v, notes: v.notes || null, category_id: v.category_id || null })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) return { error: friendly(error) };
  refreshAll();
  return { ok: true };
}

export async function deleteEntry(formData: FormData) {
  const id = uuid.parse(formData.get("id"));
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase.from("entries").delete().eq("id", id).eq("workspace_id", workspace.id);
  if (error) throw new Error(friendly(error));
  refreshAll();
  redirect("/lancamentos");
}

// ---------------------------------------------------------------- parcelas

export async function setInstallmentPaid(id: string, paid: boolean) {
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase
    .from("installments")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("id", uuid.parse(id))
    .eq("workspace_id", workspace.id);
  if (error) throw new Error(friendly(error));
  refreshAll();
}

const installmentSchema = z.object({
  id: uuid,
  due_date: isoDate,
  amount: z.string().min(1),
});

export async function updateInstallment(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = installmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const cents = parseMoneyToCents(parsed.data.amount);
  if (!cents || cents <= 0) return { error: "Valor inválido" };
  const { supabase, workspace } = await editorSession();
  const { error } = await supabase
    .from("installments")
    .update({ due_date: parsed.data.due_date, amount: cents / 100 })
    .eq("id", parsed.data.id)
    .eq("workspace_id", workspace.id);
  if (error) return { error: friendly(error) };
  refreshAll();
  return { ok: true };
}

// ---------------------------------------------------------------- auth

export async function signOut() {
  const { supabase } = await getSession();
  await supabase.auth.signOut();
  redirect("/login");
}
