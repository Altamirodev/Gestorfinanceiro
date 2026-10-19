import { Chat } from "@/components/chat";

export const metadata = { title: "Assistente · Gestor Financeiro" };

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Assistente IA</h1>
        <p className="text-sm text-ink-2">
          Dicas, alertas e relatórios com base nos seus lançamentos. Pode pesquisar na web quando precisar.
        </p>
      </header>
      <Chat configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </div>
  );
}
