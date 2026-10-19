import { redirect } from "next/navigation";
import { EntryForm } from "@/components/entry-form";
import { todayISO } from "@/lib/finance";
import { getCategories } from "@/lib/queries";
import { canEdit, getSession } from "@/lib/session";

export default async function NewEntryPage() {
  const { workspace } = await getSession();
  if (!canEdit(workspace.role)) redirect("/lancamentos");
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Novo lançamento</h1>
      <EntryForm categories={categories} today={todayISO()} />
    </div>
  );
}
