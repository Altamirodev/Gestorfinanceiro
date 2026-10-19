import { signOut } from "@/app/actions";
import { NavLinks } from "@/components/nav-links";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await getSession();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-6">
          <div>
            <p className="font-semibold">Gestor Financeiro</p>
            <p className="text-xs text-ink-3">{workspace.name}</p>
          </div>
          <form action={signOut} className="md:hidden">
            <button className="text-sm text-ink-2 hover:text-ink">Sair</button>
          </form>
        </div>
        <NavLinks />
        <div className="hidden px-5 py-6 md:absolute md:bottom-0 md:block">
          <p className="truncate text-xs text-ink-3" title={user.email}>{user.email}</p>
          <form action={signOut}>
            <button className="mt-1 text-sm text-ink-2 hover:text-ink">Sair</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
