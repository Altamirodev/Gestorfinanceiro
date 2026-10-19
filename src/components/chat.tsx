"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string; sources?: { url: string; title: string }[]; error?: string };

const SUGGESTIONS = [
  "Faça um relatório do meu mês atual",
  "Quais alertas eu deveria ver agora?",
  "Me dê 3 dicas para aliviar os próximos meses",
  "Qual a taxa Selic atual e como ela afeta minhas parcelas?",
];

const STORAGE_KEY = "gf-chat-v1";

export function Chat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("Pensando…");

    const update = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 8000) })),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao falar com o assistente.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const l of lines) {
          if (!l) continue;
          const ev = JSON.parse(l) as { t: string; v: unknown };
          if (ev.t === "text") {
            setStatus(null);
            update((m) => ({ ...m, content: m.content + (ev.v as string) }));
          } else if (ev.t === "status") setStatus(ev.v as string);
          else if (ev.t === "sources") update((m) => ({ ...m, sources: ev.v as Msg["sources"] }));
          else if (ev.t === "error") update((m) => ({ ...m, error: ev.v as string }));
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) update((m) => ({ ...m, error: (err as Error).message }));
    } finally {
      setBusy(false);
      setStatus(null);
      abortRef.current = null;
    }
  }

  if (!configured) {
    return (
      <div className="card p-6 text-sm text-ink-2">
        O assistente ainda não está configurado. Adicione a variável <code>ANTHROPIC_API_KEY</code> (veja o guia em
        <code> docs/GUIA.md</code>).
      </div>
    );
  }

  return (
    <div className="card flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-ink-2">Como posso ajudar com suas finanças hoje?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn-ghost text-left text-xs" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-accent-ink">
                {m.content}
              </p>
            ) : (
              <div className="max-w-full text-sm leading-relaxed">
                {m.content && (
                  <div className="prose-chat">
                    <Markdown remarkPlugins={[remarkGfm]}
                      components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>
                      {m.content}
                    </Markdown>
                  </div>
                )}
                {idx === messages.length - 1 && status && <p className="animate-pulse text-ink-3">{status}</p>}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-border pt-2">
                    <p className="text-xs font-medium text-ink-3">Fontes</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.error && <p role="alert" className="mt-1 rounded-lg bg-critical-bg px-3 py-2 text-critical">{m.error}</p>}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          className="input max-h-40 min-h-10 flex-1 resize-none"
          rows={1}
          value={input}
          maxLength={4000}
          placeholder="Pergunte algo sobre suas finanças…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {busy ? (
          <button type="button" className="btn-ghost" onClick={() => abortRef.current?.abort()}>Parar</button>
        ) : (
          <button className="btn-primary" disabled={!input.trim()}>Enviar</button>
        )}
        {messages.length > 0 && !busy && (
          <button type="button" className="btn-ghost hidden sm:inline-flex" onClick={() => setMessages([])}>Limpar</button>
        )}
      </form>
    </div>
  );
}
