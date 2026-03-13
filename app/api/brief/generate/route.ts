import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBrand } from "@/lib/brands";
import { getContextBundle, formatContextForPrompt } from "@/lib/context-bundle";
import { getContextLibraryItemsByIds, readContextLibrary } from "@/lib/context-library-storage";

const client = new Anthropic();

export const maxDuration = 60;

function buildSwipeCopyContext(brandId: string, swipeFileIds?: string[]): string {
  if (swipeFileIds?.length) {
    const items = getContextLibraryItemsByIds(brandId, swipeFileIds);
    if (items.length === 0) return "";
    return items
      .map((i) => `[${i.type}] ${i.title ?? ""}\n${i.content}`)
      .join("\n\n---\n\n");
  }
  const lib = readContextLibrary(brandId);
  const recent = lib.items.slice(-5);
  if (recent.length === 0) return "";
  return recent
    .map((i) => `[${i.type}] ${i.title ?? ""}\n${i.content}`)
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brand: brandId, persona, briefType, objective, notes, swipeFileIds } = body as {
    brand?: string;
    persona?: string;
    briefType?: string;
    objective?: string;
    notes?: string;
    swipeFileIds?: string[];
  };

  if (!brandId || !getBrand(brandId)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }

  const bundle = getContextBundle(brandId);
  const contextText = formatContextForPrompt(bundle);
  const swipeCopy = buildSwipeCopyContext(brandId, swipeFileIds);

  const systemPrompt = `You are an expert marketing strategist and creative brief writer. You write briefs that are clear, actionable, and grounded in brand context.

Here is the brand context you must follow:

${contextText}

${swipeCopy ? `Here are reference copy examples (swipe files) to inform tone and style:\n\n${swipeCopy}` : ""}

Write briefs in a structured format with clear sections. Be specific and actionable. Match the brand voice exactly.`;

  const userPrompt = [
    briefType ? `Brief type: ${briefType}` : "Write a creative brief",
    persona ? `Target persona: ${persona}` : "",
    objective ? `Objective: ${objective}` : "",
    notes ? `Additional notes: ${notes}` : "",
  ].filter(Boolean).join("\n");

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return NextResponse.json({ brief: text });
}
