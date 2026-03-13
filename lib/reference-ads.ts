import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type ReferenceAdFrontmatter = {
  id: string;
  label: string;
  brand: string;
  platform: string;
  format: string;
  objective?: string;
  angle?: string;
  nanoBanana?: string;
  imageFile?: string;
  promptTemplateId: string;
  promptOverrides?: Record<string, unknown>;
  notes?: string;
};

export type ReferenceAd = {
  meta: ReferenceAdFrontmatter;
  primaryText: string;
  headline: string;
  description: string;
  visualNotes: string;
  rawMarkdown: string;
};

function getStaticAdsDir(): string {
  // Example ads live under context/Examples/Ads/Static (per project notes)
  return path.join(process.cwd(), "context", "Examples", "Ads", "Static");
}

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(
    `^### ${heading}\\s*\\n([\\s\\S]*?)(?=^### |^## |\\Z)`,
    "m",
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function extractAdCreativeDetails(markdown: string): string {
  const pattern = new RegExp(
    `^## Ad Creative Details\\s*\\n([\\s\\S]*?)(?=^## |\\Z)`,
    "m",
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

export function listReferenceAds(): ReferenceAdFrontmatter[] {
  const dir = getStaticAdsDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md") || f.toLowerCase().endsWith(".markdown"));

  const results: ReferenceAdFrontmatter[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data as Partial<ReferenceAdFrontmatter>;
    if (!fm.id) continue;
    results.push({
      id: fm.id,
      label: fm.label ?? fm.id,
      brand: fm.brand ?? "",
      platform: fm.platform ?? "",
      format: fm.format ?? "",
      objective: fm.objective,
      angle: fm.angle,
      nanoBanana: fm.nanoBanana,
      imageFile: fm.imageFile,
      promptTemplateId: fm.promptTemplateId ?? "nano-banana-meta-static",
      promptOverrides: fm.promptOverrides ?? {},
      notes: fm.notes,
    });
  }

  return results;
}

export function getReferenceAdById(id: string): ReferenceAd | null {
  const dir = getStaticAdsDir();
  if (!fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md") || f.toLowerCase().endsWith(".markdown"));

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data as Partial<ReferenceAdFrontmatter>;

    if (!fm.id || fm.id !== id) continue;

    const meta: ReferenceAdFrontmatter = {
      id: fm.id,
      label: fm.label ?? id,
      brand: fm.brand ?? "",
      platform: fm.platform ?? "",
      format: fm.format ?? "",
      objective: fm.objective,
      angle: fm.angle,
      nanoBanana: fm.nanoBanana,
      imageFile: fm.imageFile,
      promptTemplateId: fm.promptTemplateId ?? "nano-banana-meta-static",
      promptOverrides: fm.promptOverrides ?? {},
      notes: fm.notes,
    };

    const content = parsed.content ?? "";
    const primaryText = extractSection(content, "PRIMARY TEXT");
    const headline = extractSection(content, "HEADLINE");
    const description = extractSection(content, "DESCRIPTION");
    const visualNotes = extractAdCreativeDetails(content);

    return {
      meta,
      primaryText,
      headline,
      description,
      visualNotes,
      rawMarkdown: raw,
    };
  }

  return null;
}

