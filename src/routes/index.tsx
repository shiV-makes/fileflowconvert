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
  { code: "DOC", name: "Documents", formats: "PDF, DOCX, TXT, ODT, RTF, EPUB", count: 24 },
  { code: "IMG", name: "Images", formats: "PNG, JPG, WEBP, AVIF, HEIC, SVG", count: 42 },
  { code: "VID", name: "Video", formats: "MP4, MOV, MKV, WEBM, AVI", count: 28 },
  { code: "AUD", name: "Audio", formats: "MP3, WAV, FLAC, M4A, OGG", count: 18 },
  { code: "ARC", name: "Archives", formats: "ZIP, 7Z, RAR, TAR, GZ", count: 10 },
  { code: "DAT", name: "Code & Data", formats: "JSON, XML, CSV, YAML, SQL", count: 16 },
  { code: "3D", name: "CAD / 3D", formats: "STL, OBJ, FBX, GLTF, PLY", count: 14 },
  { code: "XLS", name: "Spreadsheets", formats: "XLSX, XLS, CSV, TSV, ODS", count: 12 },
  { code: "PPT", name: "Presentations", formats: "PPTX, PPT, ODP, PDF", count: 9 },
  { code: "EPB", name: "eBooks", formats: "EPUB, MOBI, AZW3, PDF", count: 11 },
  { code: "TTF", name: "Fonts", formats: "TTF, OTF, WOFF, WOFF2", count: 8 },
  { code: "OCR", name: "OCR", formats: "Image → text, 40+ languages", count: 6 },
  { code: "AI", name: "AI Image Tools", formats: "Upscale, background, colorize", count: 7 },
  { code: "URL", name: "URL Tools", formats: "URL → PDF, screenshot, markdown", count: 8 },
  { code: "YT", name: "Video Extractors", formats: "YouTube, TikTok, Vimeo, IG", count: 12 },
  { code: "QR", name: "QR & Barcodes", formats: "QR, UPC, EAN, Code128", count: 5 },
  { code: "TXT", name: "Text Tools", formats: "Text ↔ Speech, MD ↔ HTML", count: 9 },
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

function Index() {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => (file ? detectKind(file) : null), [file]);
  const targets = useMemo(() => (detected ? targetsFor(detected.kind) : []), [detected]);

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

  const pickFile = (f: File | null) => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setError(null);
    setFile(f);
    if (f) {
      const t = targetsFor(detectKind(f).kind);
      setTarget(t[0]?.ext ?? "");
    } else {
      setTarget("");
    }
  };

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list || !list[0]) return;
    pickFile(list[0]);
  }, []);

  const convert = async () => {
    if (!file || !detected || !target) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { blob, filename } = await runConvert(file, detected.kind, target);
      const url = URL.createObjectURL(blob);
      setResult({ url, name: filename, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  const canConvert = !!file && !!target && !busy;

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
            Real conversions running right in your browser. No uploads, no accounts, no waiting.
          </p>

          {/* Converter Widget */}
          <div className="w-full rounded-2xl bg-muted p-2 shadow-sm ring-1 ring-ink/5">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {!file && (
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
                  handleFiles(e.dataTransfer.files);
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
                  <p className="font-medium text-ink">Drop a file here or click to browse</p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Images, PDF, DOCX, XLSX, JSON, CSV, MD, HTML, YAML, XML — all local
                  </p>
                </div>
              </button>
            )}

            {file && (
              <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-ink/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-ink/5">
                      <FileText className="size-4 text-ink" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                      <p className="text-xs text-ink-subtle">
                        {(file.size / 1024).toFixed(1)} KB · Detected {detected?.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => pickFile(null)}
                    className="rounded p-1.5 text-ink-subtle hover:bg-muted hover:text-ink"
                    aria-label="Remove file"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {targets.length === 0 ? (
                  <p className="rounded bg-muted px-3 py-2 text-left text-xs text-ink-muted ring-1 ring-ink/5">
                    No client-side conversion available for this file type yet. Try an image, JSON,
                    CSV, or text file.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded bg-muted p-2 ring-1 ring-ink/5">
                    <span className="pl-2 text-xs text-ink-muted">Convert to</span>
                    <div className="relative">
                      <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="appearance-none rounded bg-card py-1.5 pl-3 pr-8 text-sm font-medium text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-ink/30"
                      >
                        {targets.map((t: Target) => (
                          <option key={t.ext} value={t.ext}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-ink-subtle" />
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={convert}
                        disabled={!canConvert}
                        className="flex items-center gap-1.5 rounded bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Zap className="size-3.5" />
                        )}
                        {busy ? "Converting..." : "Convert"}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="rounded bg-destructive/10 px-3 py-2 text-left text-xs text-destructive ring-1 ring-destructive/20">
                    {error}
                  </p>
                )}

                {result && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-brand/5 p-3 ring-1 ring-brand/20">
                    <div className="flex min-w-0 items-center gap-2 text-left">
                      <CheckCircle2 className="size-4 shrink-0 text-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{result.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {(result.size / 1024).toFixed(1)} KB · Ready
                        </p>
                      </div>
                    </div>
                    <a
                      href={result.url}
                      download={result.name}
                      className="flex shrink-0 items-center gap-1.5 rounded bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90"
                    >
                      <Download className="size-3.5" />
                      Download
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
