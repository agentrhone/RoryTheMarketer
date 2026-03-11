import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getBrandDataDir, ensureBrandDataDir } from "@/lib/brands";
import {
  type ContextLibraryData,
  type ContextLibraryItem,
  type ContextLibraryItemType,
  CONTEXT_LIBRARY_FILENAME,
} from "@/lib/context-library";

function getFilePath(brandId: string): string {
  return path.join(getBrandDataDir(brandId), CONTEXT_LIBRARY_FILENAME);
}

function defaultData(): ContextLibraryData {
  return { updatedAt: new Date().toISOString(), items: [] };
}

export function readContextLibrary(brandId: string): ContextLibraryData {
  const filePath = getFilePath(brandId);
  if (!fs.existsSync(filePath)) return defaultData();
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    const data = JSON.parse(raw) as ContextLibraryData;
    if (!Array.isArray(data?.items)) return defaultData();
    return { updatedAt: data.updatedAt ?? "", items: data.items };
  } catch {
    return defaultData();
  }
}

export function writeContextLibrary(
  brandId: string,
  data: ContextLibraryData
): void {
  ensureBrandDataDir(brandId);
  const filePath = getFilePath(brandId);
  const next: ContextLibraryData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf-8");
}

export function addContextLibraryItem(
  brandId: string,
  item: {
    type: ContextLibraryItemType;
    title?: string;
    content: string;
    meta?: Record<string, unknown>;
    tags?: string[];
  }
): ContextLibraryItem {
  const data = readContextLibrary(brandId);
  const newItem: ContextLibraryItem = {
    id: nanoid(),
    type: item.type,
    title: item.title,
    content: item.content,
    meta: item.meta,
    tags: item.tags,
    addedAt: new Date().toISOString(),
  };
  data.items.push(newItem);
  writeContextLibrary(brandId, data);
  return newItem;
}

export function updateContextLibraryItem(
  brandId: string,
  id: string,
  updates: Partial<Pick<ContextLibraryItem, "title" | "content" | "meta" | "tags">>
): ContextLibraryItem | null {
  const data = readContextLibrary(brandId);
  const index = data.items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  data.items[index] = { ...data.items[index], ...updates };
  writeContextLibrary(brandId, data);
  return data.items[index];
}

export function deleteContextLibraryItem(
  brandId: string,
  id: string
): boolean {
  const data = readContextLibrary(brandId);
  const prev = data.items.length;
  data.items = data.items.filter((i) => i.id !== id);
  if (data.items.length === prev) return false;
  writeContextLibrary(brandId, data);
  return true;
}

export function getContextLibraryItemsByIds(
  brandId: string,
  ids: string[]
): ContextLibraryItem[] {
  const data = readContextLibrary(brandId);
  const set = new Set(ids);
  return data.items.filter((i) => set.has(i.id));
}
