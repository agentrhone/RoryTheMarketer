import { GoogleGenAI } from "@google/genai";
import type { WineDetails } from "@/lib/ad-builder";

let _genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!_genAI) {
    _genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _genAI;
}

interface GenerateAdImageInput {
  referenceImageBase64: string;
  referenceImageMimeType: string;
  bottleImageBase64: string;
  bottleImageMimeType: string;
  backgroundImageBase64?: string;
  backgroundImageMimeType?: string;
  wineDetails: WineDetails;
  styleName: string;
}

interface GenerateAdImageResult {
  imageBase64: string;
  mimeType: string;
}

function buildPrompt(details: WineDetails, styleName: string): string {
  const lines: string[] = [
    `Create a professional 1080x1080 pixel square wine offer advertisement.`,
    ``,
    `STYLE REFERENCE: Match the layout, typography style, color scheme, and overall aesthetic of the provided reference image labeled "${styleName}". Use it as the design template.`,
    ``,
    `PRODUCT IMAGE: Use the provided bottle image as the hero product shot. Place it prominently in the composition. Keep the bottle image faithful to the original — do not alter the label, shape, or colors.`,
    ``,
    `TEXT ELEMENTS TO INCLUDE:`,
    `- Headline: "${details.headline}"`,
  ];

  if (details.score) {
    lines.push(`- Score/Rating: "${details.score}"`);
  }
  if (details.pullQuote) {
    lines.push(`- Pull Quote: "${details.pullQuote}"`);
  }
  if (details.retailPrice) {
    lines.push(
      `- Original/Retail Price: "${details.retailPrice}" (show as crossed out or secondary)`
    );
  }
  if (details.salePrice) {
    lines.push(
      `- Sale Price: "${details.salePrice}" (make this prominent and eye-catching)`
    );
  }
  if (details.promoCode) {
    lines.push(`- Promo Code: "${details.promoCode}"`);
  }
  if (details.ctaText) {
    lines.push(`- Call to Action: "${details.ctaText}"`);
  }

  lines.push(
    ``,
    `REQUIREMENTS:`,
    `- Exactly 1080x1080 pixels, square format`,
    `- All text must be clearly legible and spelled correctly`,
    `- Professional, polished design suitable for social media advertising`,
    `- Do not add any text or elements beyond what is specified above`,
    `- Text should be rendered crisp and clean, not blurry`
  );

  if (details.additionalNotes) {
    lines.push(``, `ADDITIONAL INSTRUCTIONS: ${details.additionalNotes}`);
  }

  return lines.join("\n");
}

export async function generateAdImage(
  input: GenerateAdImageInput
): Promise<GenerateAdImageResult> {
  const prompt = buildPrompt(input.wineDetails, input.styleName);

  const contents = [
    {
      text: prompt,
    },
    {
      text: `Reference style image ("${input.styleName}"):`,
    },
    {
      inlineData: {
        data: input.referenceImageBase64,
        mimeType: input.referenceImageMimeType,
      },
    },
    {
      text: "Product bottle image:",
    },
    {
      inlineData: {
        data: input.bottleImageBase64,
        mimeType: input.bottleImageMimeType,
      },
    },
  ];

  if (input.backgroundImageBase64 && input.backgroundImageMimeType) {
    contents.push(
      {
        text: "Background image (use as the background/scene for the ad):",
      },
      {
        inlineData: {
          data: input.backgroundImageBase64,
          mimeType: input.backgroundImageMimeType,
        },
      }
    );
  }

  const response = await getGenAI().models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: [{ role: "user", parts: contents }],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No response from Gemini");
  }

  for (const part of parts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data!,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("Gemini did not return an image");
}
