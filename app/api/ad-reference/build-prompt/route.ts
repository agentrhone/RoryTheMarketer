import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const label = formData.get("label") as string || "";
    const type = formData.get("type") as string || "";
    const angle = formData.get("angle") as string || "";
    const nanoBanana = formData.get("nanoBanana") as string || "";
    const brand = formData.get("brand") as string || "";

    if (!imageFile) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString("base64");

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };
    const mediaType = mimeMap[ext] || "image/png";

    const contextParts: string[] = [];
    if (label) contextParts.push(`Ad label: ${label}`);
    if (type) contextParts.push(`Ad type: ${type}`);
    if (angle) contextParts.push(`Angle: ${angle}`);
    if (nanoBanana) contextParts.push(`Core promise (Nano Banana): ${nanoBanana}`);
    if (brand) contextParts.push(`Brand: ${brand}`);

    const userContext = contextParts.length > 0
      ? `\n\nContext about this ad:\n${contextParts.join("\n")}`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2000,
      system: `You are an ad creative analyst. Analyze static advertisement images and produce structured output for an ad template system. Return ONLY valid JSON with no markdown formatting or code blocks.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze this static advertisement image and produce structured output.${userContext}

Return a JSON object with these fields:

{
  "visualNotes": "Detailed visual layout description as bullet points using markdown. Describe: background, product/bottle position, logo placement, trust badges, score/rating treatment, price block layout, CTA button style, promo lines, typography, and color scheme. Use this format:\n- **Background:** ...\n- **Product position:** ...\netc.",
  "primaryText": "The ad's primary/body copy. Read it from the image if visible, or compose compelling copy based on the visible elements. Should be 2-4 short paragraphs suitable for Meta ad primary text.",
  "headline": "Short punchy headline (read from image or compose). Max ~10 words.",
  "description": "Meta description line. One sentence summary of the offer/product.",
  "promptGuidance": "3-5 bullet points on what to preserve when generating variations from this template. Focus on: key visual elements, messaging hierarchy, trust signals, price anchoring, and CTA style. Use markdown bullet format:\n1. **Element:** explanation\n2. ..."
}

Return ONLY the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
    }

    // Parse JSON from response, stripping any markdown code fences
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      visualNotes: result.visualNotes || "",
      primaryText: result.primaryText || "",
      headline: result.headline || "",
      description: result.description || "",
      promptGuidance: result.promptGuidance || "",
    });
  } catch (err) {
    console.error("Error building prompt:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to analyze image" },
      { status: 500 },
    );
  }
}
