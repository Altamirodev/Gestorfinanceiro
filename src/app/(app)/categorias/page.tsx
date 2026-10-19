import { CategoryForm } from "@/components/category-form";
import { getCategories } from "@/lib/queries";
import { canEdit, getSession } from "@/lib/session";

export default async function CategoriesPage() {
  const [{ workspace }, categories] = await Promise.all([getSession(), getCategories()]);
  const editable = canEdit(workspace.role);
  const groups = [
    { kind: "expense" as const, title: "Despesas" },
    { kind: "income" as const, title: "Receitas" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-ink-2">
          Classifique seus gastos com a sua própria nomenclatura — do jeito que você pensa no seu dinheiro.
        </p>
      </header>

      {editable && (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Nova categoria</h2>
          <CategoryForm />
        </section>
      )}

      {groups.map((g) => {
        const list = categories.filter((c) => c.kind === g.kind);
        return (
          <section key={g.kind} className="card p-4">
            <h2 className="mb-2 font-semibold">{g.title}</h2>
            {list.length === 0 ? (
              <p className="text-sm text-ink-3">Nenhuma categoria ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((c) => (
                  <li key={c.id} className="py-2">
                    <CategoryForm category={c} readOnly={!editable} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
