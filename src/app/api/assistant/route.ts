import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ASSISTANT_MODEL, SYSTEM_PROMPT, buildSnapshot } from "@/lib/assistant";
import { getOverview } from "@/lib/queries";
import { getSession } from "@/lib/session";
import type { EntrySummary } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1].role === "user", "A última mensagem deve ser do usuário"),
});

const MAX_CONTINUATIONS = 3;

// Protocolo de resposta: uma linha JSON por evento.
//   {"t":"text","v":"..."} | {"t":"status","v":"..."} | {"t":"sources","v":[{title,url}]} | {"t":"error","v":"..."}
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Assistente não configurado (falta ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requisição inválida." }, { status: 400 });

  const { supabase, workspace } = await getSession();
  const [{ overview, items, categories }, entries] = await Promise.all([
    getOverview(),
    supabase.from("entry_summaries").select("*").eq("workspace_id", workspace.id).limit(1000),
  ]);
  const snapshot = buildSnapshot(overview, items, (entries.data ?? []) as EntrySummary[], categories);

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t: string, v: unknown) => controller.enqueue(encoder.encode(JSON.stringify({ t, v }) + "\n"));
      const sources = new Map<string, string>();

      try {
        for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
          const response = client.beta.messages.stream(
            {
              model: ASSISTANT_MODEL,
              max_tokens: 16000,
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
              output_config: { effort: "medium" },
              system: [
                { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
                { type: "text", text: snapshot },
              ],
              tools: [
                {
                  type: "web_search_20260209",
                  name: "web_search",
                  max_uses: 5,
                  user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
                },
              ],
              messages,
            },
            { signal: request.signal },
          );

          for await (const event of response) {
            if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
              send("status", "Pesquisando na web…");
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") send("text", event.delta.text);
              else if (event.delta.type === "citations_delta" && event.delta.citation.type === "web_search_result_location") {
                sources.set(event.delta.citation.url, event.delta.citation.title ?? event.delta.citation.url);
              }
            }
          }

          const final = await response.finalMessage();
          if (final.stop_reason === "refusal") {
            send("error", "Não consegui responder a esse pedido. Tente reformular a pergunta.");
            break;
          }
          if (final.stop_reason === "max_tokens") {
            send("text", "\n\n_(resposta interrompida por ser longa demais — peça a continuação)_");
            break;
          }
          if (final.stop_reason !== "pause_turn") break;
          // A busca na web pausou o turno: devolvemos o conteúdo e o servidor continua de onde parou.
          messages.push({ role: "assistant", content: final.content });
        }

        if (sources.size) send("sources", [...sources].map(([url, title]) => ({ url, title })));
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("assistant error", err);
          const msg =
            err instanceof Anthropic.RateLimitError
              ? "Muitas solicitações agora. Aguarde um instante e tente de novo."
              : err instanceof Anthropic.AuthenticationError
                ? "Chave da API da Anthropic inválida. Verifique a configuração."
                : "O assistente está indisponível no momento. Tente novamente.";
          send("error", msg);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
