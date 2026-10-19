"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);
      if (error) return setMessage({ type: "error", text: "E-mail ou senha incorretos." });
      router.replace("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setPending(false);
      if (error) return setMessage({ type: "error", text: error.message });
      setMessage({ type: "info", text: "Conta criada! Confirme pelo link enviado ao seu e-mail." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={mode === "signup" ? 12 : undefined}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
        />
        {mode === "signup" && <p className="mt-1 text-xs text-ink-3">Mínimo de 12 caracteres.</p>}
      </div>
      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "error" ? "bg-critical-bg text-critical" : "bg-good-bg text-good"
          }`}
        >
          {message.text}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
      </button>
      <button
        type="button"
        className="w-full text-center text-sm text-ink-2 hover:text-ink"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
