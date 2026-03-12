import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getBrandDataDir, ensureBrandDataDir } from "@/lib/brands";
import {
  type Review,
  type ReviewsData,
  type ReviewSource,
  REVIEWS_FILENAME,
} from "@/lib/reviews";

function getFilePath(brandId: string): string {
  return path.join(getBrandDataDir(brandId), REVIEWS_FILENAME);
}

function defaultData(): ReviewsData {
  return { updatedAt: new Date().toISOString(), reviews: [] };
}

export function readReviews(brandId: string): ReviewsData {
  const filePath = getFilePath(brandId);
  if (!fs.existsSync(filePath)) return defaultData();
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    const data = JSON.parse(raw) as ReviewsData;
    if (!Array.isArray(data?.reviews)) return defaultData();
    return {
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      slackChannelId: data.slackChannelId,
      reviews: data.reviews,
    };
  } catch {
    return defaultData();
  }
}

export function writeReviews(brandId: string, data: ReviewsData): void {
  ensureBrandDataDir(brandId);
  const next: ReviewsData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    getFilePath(brandId),
    JSON.stringify(next, null, 2),
    "utf-8"
  );
}

/** Merge incoming reviews: by id or slackMessageTs, avoid duplicates; new ones get ids. */
export function mergeReviews(
  brandId: string,
  incoming: Omit<Review, "id">[],
  options?: { slackChannelId?: string }
): { added: number; total: number } {
  const data = readReviews(brandId);
  const existingByTs = new Set(
    data.reviews.map((r) => r.slackMessageTs).filter(Boolean)
  );
  const existingIds = new Set(data.reviews.map((r) => r.id));
  let added = 0;
  for (const r of incoming) {
    if (r.slackMessageTs && existingByTs.has(r.slackMessageTs)) continue;
    let id = nanoid();
    while (existingIds.has(id)) id = nanoid();
    existingIds.add(id);
    if (r.slackMessageTs) existingByTs.add(r.slackMessageTs);
    data.reviews.push({
      ...r,
      id,
      title: r.title || undefined,
      author: r.author || undefined,
      rating: r.rating ?? undefined,
    });
    added++;
  }
  if (options?.slackChannelId) data.slackChannelId = options.slackChannelId;
  writeReviews(brandId, data);
  return { added, total: data.reviews.length };
}

/** Infer source from text (e.g. "Trustpilot" or "App Store" in message). */
export function inferSource(text: string): ReviewSource {
  const lower = text.toLowerCase();
  if (lower.includes("trustpilot")) return "trustpilot";
  if (lower.includes("app store") || lower.includes("appstore")) return "app_store";
  return "unknown";
}

/** Parse Slack message text into title + content; optionally infer source. */
export function parseSlackMessage(
  text: string,
  messageTs: string
): Omit<Review, "id"> {
  const source = inferSource(text);
  const trimmed = text.trim();
  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  const useFirstLineAsTitle =
    firstLine.length > 0 &&
    firstLine.length <= 120 &&
    !firstLine.startsWith("http");
  const title = useFirstLineAsTitle ? firstLine : undefined;
  const content = useFirstLineAsTitle
    ? trimmed.slice(firstLine.length).trimStart()
    : trimmed;
  return {
    source,
    title: title || undefined,
    content: content || trimmed,
    createdAt: new Date().toISOString(),
    slackMessageTs: messageTs,
  };
}
