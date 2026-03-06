import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages, currentStep, brandName, selectedSDGs, mode } = await req.json();
    const systemPrompt = buildSystemPrompt(currentStep, brandName, selectedSDGs, mode);
    const context = buildStepContext(currentStep, mode);
    const fullSystem = context ? `${systemPrompt}\n\n---\n\n**Current Step Context:**\n${context}` : systemPrompt;

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      temperature: 0.7,
      system: fullSystem,
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && "text" in event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Stream error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `\n\n[Error: ${msg}]` })}\n\n`));
          controller.close();
        }
      },
    });
    return new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("401") || msg.includes("api_key") ? 401 : msg.includes("429") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), { status });
  }
}

function buildStepContext(step: number, mode: string): string {
  let c = `You are at Step ${step} of 12. `;
  if (mode === "inspiration") c += "Mode: Inspiration — focus on existing cases and proven approaches. ";
  const directives: Record<number, string> = {
    1: "Research the brand thoroughly. Be factual. The SDG hypothesis should show strategic thinking.",
    2: "Each SDG mapping must show genuine strategic insight. Avoid generic connections.",
    3: "Your recommendation must be bold and defensible. Explain why this SDG territory is richer.",
    4: "Be forensic. Dig into what the brand actually does vs. claims. Find the tension.",
    5: "Avoid the obvious. Think laterally: who is affected by the SDG challenge in unexpected ways?",
    6: "Find statistics that make people stop scrolling. Numbers that create cognitive dissonance.",
    7: "Write headlines a creative director at Droga5 would fight to present. Include a Provocation Wildcard.",
    8: "Partnership ideas should make people say 'I never would have thought of that, but it makes perfect sense.'",
    9: "Write this like a Cannes Lions winning case study. Cinematic, specific, immediately executable.",
    10: "Write like presenting to the CFO after winning over the CMO. Hard numbers, conservative projections.",
    11: "Be precise with estimates but transparent about assumptions. Use comparable campaigns as benchmarks.",
    12: "FINAL CASE BOARD — Cannes Lions entry board. Summarize the ENTIRE journey. Punchy, visual-ready, presentation-grade. End with a powerful campaign tagline."
  };
  c += directives[step] || "";
  return c;
}
