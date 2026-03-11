"use client";

import { useCallback, useEffect, useState } from "react";

const BRAND_ID = "winespies";

const ITEM_TYPES = [
  { value: "copywriting", label: "Copywriting" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "brief", label: "Brief" },
  { value: "reference_ad", label: "Reference Ad" },
  { value: "swipe", label: "Swipe" },
];

interface LibraryItem {
  id: string;
  type: string;
  title?: string;
  content: string;
  tags?: string[];
  addedAt: string;
}

interface SwipeFilesPanelProps {
  onChanged?: () => void;
}

export default function SwipeFilesPanel({ onChanged }: SwipeFilesPanelProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    type: "swipe" as string,
    title: "",
    content: "",
    tagsStr: "",
  });

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ brand: BRAND_ID });
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("q", search);
    fetch(`/api/context-library?${params}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [typeFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tagsStr.split(/[\s,]+/).filter(Boolean);
    fetch("/api/context-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: BRAND_ID,
        type: form.type,
        title: form.title || undefined,
        content: form.content,
        tags: tags.length ? tags : undefined,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setForm({ type: "swipe", title: "", content: "", tagsStr: "" });
        fetchItems();
        onChanged?.();
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this item?")) return;
    fetch(`/api/context-library?brand=${BRAND_ID}&id=${id}`, { method: "DELETE" }).then(
      (r) => {
        if (r.ok) {
          fetchItems();
          onChanged?.();
        }
      }
    );
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Swipe Files</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface min-w-[180px]"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface"
        >
          <option value="">All types</option>
          {ITEM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-border bg-surface p-5 mb-6">
        <h3 className="font-medium text-sm mb-3">Add to library</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-muted mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Title (optional)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tagsStr}
              onChange={(e) => setForm((f) => ({ ...f, tagsStr: e.target.value }))}
              placeholder="hero, cta, Q1"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Add to library
            </button>
          </div>
        </div>
      </form>

      {/* Items list */}
      {loading ? (
        <p className="text-muted text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm">No items yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-medium text-sm">{item.title || "(untitled)"}</span>
                  <span className="ml-2 text-xs text-muted px-2 py-0.5 bg-accent-light rounded-full">
                    {item.type.replace("_", " ")}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {new Date(item.addedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap line-clamp-3 mb-2">
                {item.content}
              </p>
              {item.tags?.length ? (
                <p className="text-xs text-muted mb-2">{item.tags.join(", ")}</p>
              ) : null}
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs text-danger hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
