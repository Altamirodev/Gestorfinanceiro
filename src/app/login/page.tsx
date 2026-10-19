import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Gestor Financeiro" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">Gestor Financeiro</h1>
        <p className="mt-1 text-sm text-ink-2">Entre para acessar seu orçamento.</p>
        <LoginForm />
      </div>
    </main>
  );
}
