import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code2,
  Box,
  BookOpen,
  Table as TableIcon,
  Presentation,
  Type as TypeIcon,
  Sparkles,
  ScanText,
  QrCode,
  Link2,
  Youtube,
  Search,
  Plus,
  Download,
  Zap,
  Shield,
  Cpu,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Family = {
  code: string;
  name: string;
  formats: string;
  count: number;
};

const FAMILIES: Family[] = [
  { code: "DOC", name: "Documents", formats: "PDF, DOCX, TXT, HTML, MD", count: 12 },
  { code: "IMG", name: "Images", formats: "PNG, JPG, WEBP, BMP, SVG", count: 20 },
  { code: "DAT", name: "Code & Data", formats: "JSON, XML, CSV, TSV, YAML", count: 16 },
  { code: "XLS", name: "Spreadsheets", formats: "XLSX, XLS, ODS, CSV, TSV", count: 12 },
  { code: "QR", name: "QR Codes", formats: "Text → QR PNG", count: 2 },
  { code: "ARC", name: "Archives", formats: "ZIP wrap any file", count: 4 },
];

const ICONS: Record<string, typeof FileText> = {
  DOC: FileText,
  IMG: ImageIcon,
  VID: Video,
  AUD: Music,
  ARC: Archive,
  DAT: Code2,
  "3D": Box,
  XLS: TableIcon,
  PPT: Presentation,
  EPB: BookOpen,
  TTF: TypeIcon,
  OCR: ScanText,
  AI: Sparkles,
  URL: Link2,
  YT: Youtube,
  QR: QrCode,
  TXT: TypeIcon,
};

import { convert as runConvert, detectKind, targetsFor, type Target } from "@/lib/converter";


const POPULAR = ["PNG → JPG", "JPG → PDF", "PDF → TXT", "DOCX → HTML", "XLSX → CSV", "JSON → YAML"];

type FileItem = {
  id: string;
  file: File;
  kind: ReturnType<typeof detectKind>;
  status: "queued" | "converting" | "done" | "error";
  result?: { url: string; name: string; size: number };
  error?: string;
};

let idSeq = 0;
const nextId = () => `f${++idSeq}_${Date.now()}`;

function Index() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [batchZip, setBatchZip] = useState<{ url: string; name: string; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Intersection of possible targets across all files. If empty, "zip" is always safe.
  const commonTargets = useMemo<Target[]>(() => {
    if (items.length === 0) return [];
    const lists = items.map((it) => targetsFor(it.kind.kind));
    const first = lists[0];
    const inter = first.filter((t) => lists.every((l) => l.some((x) => x.ext === t.ext)));
    if (inter.length === 0) return [{ ext: "zip", label: "ZIP (bundle originals)" }];
    if (!inter.some((t) => t.ext === "zip")) inter.push({ ext: "zip", label: "ZIP" });
    return inter;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAMILIES;
    return FAMILIES.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.formats.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q),
    );
  }, [query]);

  const clearResults = () => {
    items.forEach((it) => it.result && URL.revokeObjectURL(it.result.url));
    if (batchZip) URL.revokeObjectURL(batchZip.url);
    setBatchZip(null);
  };

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || !list.length) return;
    const incoming: FileItem[] = Array.from(list).map((file) => ({
      id: nextId(),
      file,
      kind: detectKind(file),
      status: "queued" as const,
    }));
    setItems((prev) => {
      prev.forEach((it) => it.result && URL.revokeObjectURL(it.result.url));
      return [
        ...prev.map((p) => ({ ...p, status: "queued" as const, result: undefined, error: undefined })),
        ...incoming,
      ];
    });
    if (batchZip) URL.revokeObjectURL(batchZip.url);
    setBatchZip(null);
  }, [batchZip]);

  useMemo(() => {
    if (commonTargets.length && !commonTargets.some((t) => t.ext === target)) {
      setTarget(commonTargets[0].ext);
    }
    if (commonTargets.length === 0 && target) setTarget("");
  }, [commonTargets, target]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id);
      if (it?.result) URL.revokeObjectURL(it.result.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    clearResults();
    setItems([]);
    setTarget("");
  };

  const convertAll = async () => {
    if (!items.length || !target) return;
    setBusy(true);
    clearResults();

    const JSZipMod = (await import("jszip")).default;
    const zip = new JSZipMod();
    const done: FileItem[] = [];
    for (const it of items) {
      setItems((prev) =>
        prev.map((p) => (p.id === it.id ? { ...p, status: "converting", error: undefined, result: undefined } : p)),
      );
      try {
        const { blob, filename } = await runConvert(it.file, it.kind.kind, target);
        const url = URL.createObjectURL(blob);
        const okItem: FileItem = {
          ...it,
          status: "done",
          result: { url, name: filename, size: blob.size },
        };
        done.push(okItem);
        setItems((prev) => prev.map((p) => (p.id === it.id ? okItem : p)));
        zip.file(filename, blob);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Conversion failed";
        const failed: FileItem = { ...it, status: "error", error: msg };
        setItems((prev) => prev.map((p) => (p.id === it.id ? failed : p)));
      }
    }

    if (done.length > 1) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = `fileflow-batch-${done.length}-files.zip`;
      setBatchZip({ url: URL.createObjectURL(zipBlob), name: zipName, size: zipBlob.size });
    }
    setBusy(false);
  };

  const canConvert = items.length > 0 && !!target && !busy;

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="text-lg font-semibold tracking-tight">FileFlow</span>
            <div className="hidden gap-6 text-sm font-medium text-ink-muted md:flex">
              <a href="#tools" className="transition-colors hover:text-ink">Tools</a>
              <a href="#pricing" className="transition-colors hover:text-ink">Free</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero / Universal Converter */}
      <section className="border-b border-ink/5 bg-card py-16 md:py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <h1 className="mb-6 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Convert any file format instantly
          </h1>
          <p className="mb-12 max-w-[48ch] text-pretty text-lg text-ink-muted">
            Batch convert files right in your browser. No uploads, no accounts, no waiting.
          </p>

          {/* Converter Widget */}
          <div className="w-full rounded-2xl bg-muted p-2 shadow-sm ring-1 ring-ink/5">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />

            {items.length === 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={
                  "flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-card p-12 transition-colors " +
                  (dragOver ? "border-brand/60 bg-brand/5" : "border-ink/10 hover:border-brand/40")
                }
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-ink/5">
                  <Plus className="size-5 text-ink-subtle" />
                </div>
                <div>
                  <p className="font-medium text-ink">Drop files here or click to browse</p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Select multiple files — convert them all to the same format at once
                  </p>
                </div>
              </button>
            )}

            {items.length > 0 && (
              <div
                className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-ink/5"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-left text-xs font-medium text-ink-muted">
                    {items.length} file{items.length === 1 ? "" : "s"} queued
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-ink-muted hover:bg-muted hover:text-ink"
                    >
                      <Plus className="size-3" /> Add more
                    </button>
                    <button
                      onClick={clearAll}
                      className="rounded px-2 py-1 text-xs font-medium text-ink-muted hover:bg-muted hover:text-ink"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-3 rounded bg-muted/60 px-3 py-2 ring-1 ring-ink/5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-card ring-1 ring-ink/5">
                          {it.status === "converting" ? (
                            <Loader2 className="size-3.5 animate-spin text-ink-subtle" />
                          ) : it.status === "done" ? (
                            <CheckCircle2 className="size-3.5 text-brand" />
                          ) : it.status === "error" ? (
                            <X className="size-3.5 text-destructive" />
                          ) : (
                            <FileText className="size-3.5 text-ink" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-xs font-medium text-ink">{it.file.name}</p>
                          <p className="truncate text-[10px] text-ink-subtle">
                            {(it.file.size / 1024).toFixed(1)} KB · {it.kind.label}
                            {it.error ? ` · ${it.error}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {it.result && (
                          <a
                            href={it.result.url}
                            download={it.result.name}
                            className="rounded p-1.5 text-ink-subtle hover:bg-card hover:text-ink"
                            aria-label={`Download ${it.result.name}`}
                          >
                            <Download className="size-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => removeItem(it.id)}
                          className="rounded p-1.5 text-ink-subtle hover:bg-card hover:text-ink"
                          aria-label="Remove file"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2 rounded bg-muted p-2 ring-1 ring-ink/5">
                  <span className="pl-2 text-xs text-ink-muted">Convert all to</span>
                  <div className="relative">
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="appearance-none rounded bg-card py-1.5 pl-3 pr-8 text-sm font-medium text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-ink/30"
                    >
                      {commonTargets.map((t) => (
                        <option key={t.ext} value={t.ext}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-ink-subtle" />
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={convertAll}
                      disabled={!canConvert}
                      className="flex items-center gap-1.5 rounded bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
                      {busy ? "Converting..." : `Convert ${items.length}`}
                    </button>
                  </div>
                </div>

                {commonTargets.length === 1 && commonTargets[0].ext === "zip" && (
                  <p className="rounded bg-muted px-3 py-2 text-left text-xs text-ink-muted ring-1 ring-ink/5">
                    Mixed file types — the only shared target is a ZIP bundle. Upload files of the
                    same family to see more targets.
                  </p>
                )}

                {batchZip && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-brand/5 p-3 ring-1 ring-brand/20">
                    <div className="flex min-w-0 items-center gap-2 text-left">
                      <Archive className="size-4 shrink-0 text-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{batchZip.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {(batchZip.size / 1024).toFixed(1)} KB · All conversions bundled
                        </p>
                      </div>
                    </div>
                    <a
                      href={batchZip.url}
                      download={batchZip.name}
                      className="flex shrink-0 items-center gap-1.5 rounded bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90"
                    >
                      <Download className="size-3.5" />
                      Download all
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Popular Chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="py-1.5 text-xs font-medium text-ink-subtle">Popular:</span>
            {POPULAR.map((chip) => (
              <button
                key={chip}
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-ink/10 hover:text-ink"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-ink/5 bg-surface py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 text-sm md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Zap className="size-4 text-brand" />
            <span className="text-ink-muted">
              <span className="font-medium text-ink">Instant</span> conversions in your browser
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-brand" />
            <span className="text-ink-muted">
              <span className="font-medium text-ink">Private</span> — files never leave your device
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Cpu className="size-4 text-brand" />
            <span className="text-ink-muted">
              <span className="font-medium text-ink">No accounts</span>, no limits, no ads
            </span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="tools" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-[56ch]">
              <h2 className="mb-2 text-2xl font-semibold text-ink">Conversion Families</h2>
              <p className="text-pretty text-ink-muted">
                Images, PDF, DOCX, spreadsheets, structured data, and text — all converted in
                your browser with no upload.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any conversion..."
                className="w-full rounded-lg bg-card py-2 pl-9 pr-4 text-sm ring-1 ring-ink/5 transition-shadow focus:outline-none focus:ring-ink/20"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-subtle" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((f) => {
              const Icon = ICONS[f.code] ?? FileText;
              return (
                <div
                  key={f.code}
                  className="group rounded-xl bg-card p-5 ring-1 ring-ink/5 transition-shadow hover:ring-ink/20"
                >
                  <div className="mb-4 flex size-8 items-center justify-center rounded bg-muted ring-1 ring-ink/5">
                    <Icon className="size-4 text-ink" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-ink">{f.name}</h3>
                  <p className="text-xs text-ink-subtle">{f.formats}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                    {f.count} tools
                  </p>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl bg-card p-8 text-center text-sm text-ink-muted ring-1 ring-ink/5">
                No conversions match "{query}".
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Free forever */}
      <section id="pricing" className="border-t border-ink/5 bg-muted/40 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand ring-1 ring-brand/20">
            <span className="size-1.5 rounded-full bg-brand" />
            100% Free · No Signup
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Every tool. Every format. Free forever.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-pretty text-ink-muted">
            No subscriptions, no paywalls, no "Pro" tier. Upload, convert, download — as many times
            as you want.
          </p>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/5 md:grid-cols-4">
            {[
              { k: "$0", v: "Forever" },
              { k: "∞", v: "Conversions" },
              { k: "100%", v: "In your browser" },
              { k: "0", v: "Accounts needed" },
            ].map((s) => (
              <div key={s.v} className="bg-card p-5">
                <div className="text-2xl font-semibold text-ink">{s.k}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-ink-subtle">
            Files are processed locally and never uploaded to any server.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/5 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-ink">FileFlow</span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
              © 2026 FileFlow Utility Engine
            </p>
          </div>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            Server Status: Optimal
          </span>
        </div>
      </footer>
    </div>
  );
}
