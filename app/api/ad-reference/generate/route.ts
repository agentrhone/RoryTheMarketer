import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBrand } from "@/lib/brands";
import { getContextBundle, formatContextForPrompt } from "@/lib/context-bundle";
import { getReferenceAdById } from "@/lib/reference-ads";
import { buildMetaStaticNanoBananaPrompt } from "@/lib/ad-prompt-templates";

const client = new Anthropic();

export const maxDuration = 60;

/** Extract JSON array from model output; strip markdown code blocks if present. */
function extractJsonArray(text: string): unknown {
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const arrayStart = raw.indexOf("[");
  if (arrayStart !== -1) {
    const arrayEnd = raw.lastIndexOf("]");
    if (arrayEnd > arrayStart) raw = raw.slice(arrayStart, arrayEnd + 1);
  }
  return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const brandId = (body.brand as string | undefined) ?? undefined;
  const referenceId = (body.referenceId as string | undefined) ?? undefined;
  const wineDetails = (body.wineDetails as
    | {
        headline?: string;
        score?: string;
        pullQuote?: string;
        retailPrice?: string;
        salePrice?: string;
        promoCode?: string;
        ctaText?: string;
        additionalNotes?: string;
      }
    | undefined) ?? undefined;

  if (!brandId || !getBrand(brandId)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }

  if (!referenceId) {
    return NextResponse.json(
      { error: "referenceId is required" },
      { status: 400 },
    );
  }

  const referenceAd = getReferenceAdById(referenceId);
  if (!referenceAd) {
    return NextResponse.json(
      { error: `Reference ad not found for id ${referenceId}` },
      { status: 404 },
    );
  }

  if (referenceAd.meta.brand && referenceAd.meta.brand !== brandId) {
    return NextResponse.json(
      {
        error: `Reference ad ${referenceId} is configured for brand ${referenceAd.meta.brand}, not ${brandId}`,
      },
      { status: 400 },
    );
  }

  try {
    const bundle = getContextBundle(brandId);
    const contextText = formatContextForPrompt(bundle);

    const { system, user, numberOfVariations } = buildMetaStaticNanoBananaPrompt({
      brandName: brandId,
      contextText,
      referenceAd,
      wineDetailsOverride: wineDetails,
    });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let parsed: unknown;
    try {
      parsed = extractJsonArray(text);
    } catch {
      return NextResponse.json(
        {
          error: "Model response was not valid JSON",
          raw: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        {
          error: "Expected an array of variations from model",
          raw: parsed,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      referenceId,
      brand: brandId,
      expectedVariations: numberOfVariations,
      variations: parsed,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ad copy generation failed";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

