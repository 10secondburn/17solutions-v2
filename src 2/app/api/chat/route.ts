import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { buildSystemPrompt, CaseSummary } from '@/lib/system-prompt';
import { getCurrentStep } from '@/lib/step-engine';
import casesData from '@/data/cases.json';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentStep, brandName, selectedSDGs, mode } = await req.json();

    // Build case summaries for context injection
    const caseSummaries: CaseSummary[] = casesData.map((c: any) => ({
      title: c.name,
      brand: c.brand,
      agency: c.agency || 'Unknown',
      year: c.year || 2024,
      award: c.award || '',
      sdgTags: c.sdgs,
      type: c.type || '',
      industry: c.industry || '',
      context: c.context,
      insight: c.insight,
      idea: c.solution,
      businessResults: c.results,
    }));

    // Get current step info
    const step = getCurrentStep(currentStep || 1);

    // Build the system prompt with smart case injection
    const systemPrompt = buildSystemPrompt(
      caseSummaries,
      currentStep || 1,
      selectedSDGs || []
    );

    // Build step-specific context
    const stepContext = buildStepContext(step, currentStep, brandName, selectedSDGs, mode);

    const fullSystemPrompt = `${systemPrompt}\n\n${stepContext}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Use Claude Sonnet with tuned parameters
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.7,
      system: fullSystemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return as readable stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '\n\n[Connection interrupted. Please try again.]' })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('API Route Error:', error);
    const errorMessage = error?.message?.includes('authentication')
      ? 'Invalid API key. Please check your ANTHROPIC_API_KEY in .env.local'
      : error?.message?.includes('rate')
      ? 'Rate limit reached. Please wait a moment and try again.'
      : `Server error: ${error?.message || 'Unknown error'}`;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function buildStepContext(
  step: any,
  currentStep: number,
  brandName: string,
  selectedSDGs: number[],
  mode: string
): string {
  const sdgList = selectedSDGs?.length ? selectedSDGs.join(', ') : 'Not yet selected';
  const brand = brandName || 'Not yet specified';

  let context = `## CURRENT SESSION STATE
- **Current Step:** ${step.name} (Step ${step.number} of 11)
- **Brand:** ${brand}
- **Selected SDGs:** ${sdgList}
- **Mode:** ${mode === 'inspiration' ? 'Inspiration Mode' : 'Creative Path'}

## YOUR TASK FOR THIS RESPONSE
${step.systemPromptAddition}

`;

  // Add step-specific quality directives
  switch (currentStep) {
    case 1:
      context += `**Quality directive:** Research the brand thoroughly. Be factual and precise about their positioning. Don't guess — if unsure, say so. The SDG hypothesis should show strategic thinking, not obvious associations.`;
      break;
    case 2:
      context += `**Quality directive:** Each SDG mapping must show genuine strategic insight. Avoid generic connections. Show why THIS brand has a unique angle on THIS SDG. Think like a strategist who knows both the brand's business model and the SDG landscape deeply.`;
      break;
    case 3:
      context += `**Quality directive:** Your recommendation must be bold and defensible. Explain why this SDG territory is richer than the alternatives. Consider: where is the brand most authentic? Where is the biggest untapped narrative? Where can they credibly lead?`;
      break;
    case 4:
      context += `**Quality directive:** Be forensic. Dig into what the brand actually does vs. what they claim. Find the tension — that's where the creative opportunity lives. The "Hidden SDG Work" section should surprise the user with something they didn't know about the brand.`;
      break;
    case 5:
      context += `**Quality directive:** Avoid the obvious. A car brand's target isn't "drivers." Think laterally: who is affected by the SDG challenge in ways nobody talks about? The best target groups create immediate narrative tension with the brand.`;
      break;
    case 6:
      context += `**Quality directive:** Find statistics that make people stop scrolling. Numbers that create cognitive dissonance. The insight should connect the data to the brand's world in a way that makes the problem impossible to ignore. Cite real sources.`;
      break;
    case 7:
      context += `**Quality directive:** This is the creative heart. Write headlines a creative director at Droga5 would fight to present. Each springboard should be instantly memorable, make you think differently, and have a clear strategic backbone. The Provocation Wildcard should genuinely make the user uncomfortable — in a productive way. Reference the case library for creative inspiration.`;
      break;
    case 8:
      context += `**Quality directive:** Partnership ideas should make the user say "I never would have thought of that, but it makes perfect sense." Think across industries, cultures, and scales. The unexpected but strategically credible combination is the goal.`;
      break;
    case 9:
      context += `**Quality directive:** Write this like a case study that wins at Cannes Lions. The concept should be cinematic, specific, and immediately executable. The execution elements should be concrete enough to brief a production team. Reference comparable award-winning cases from the library to show the creative benchmark.`;
      break;
    case 10:
      context += `**Quality directive:** Write like you're presenting to the CFO after winning over the CMO. Hard numbers, conservative projections, clear logic. Every claim must be defensible in a boardroom.`;
      break;
    case 11:
      context += `**Quality directive:** Be precise with estimates but transparent about assumptions. If you need budget inputs, ask. Use comparable campaigns as benchmarks. The final number should feel both ambitious and credible.`;
      break;
  }

  // Inspiration mode override
  if (mode === 'inspiration') {
    context += `\n\n**MODE OVERRIDE: INSPIRATION MODE**
Instead of the creative process, deliver real-world SDG innovation cases from the reference library. Structure each case as:
1. Case Title & SDG Tags
2. Context
3. Insight
4. Idea & Execution
5. Business Results
6. Why this matters for the brand being analyzed

Present 2-3 cases per response, selected for relevance to the current brand and SDG context. Always offer to return to the Creative Path.`;
  }

  return context;
}
