import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  FileStack,
  Search,
  Plus,
  Upload,
  Zap,
  Shield,
  Cpu,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Family = {
  code: string;
  name: string;
  formats: string;
  count: number;
  highlight?: boolean;
  description?: string;
};

const FAMILIES: Family[] = [
  { code: "DOC", name: "Documents", formats: "PDF, DOCX, TXT, ODT, RTF, EPUB", count: 24 },
  { code: "IMG", name: "Images", formats: "PNG, JPG, WEBP, AVIF, HEIC, SVG", count: 42 },
  {
    code: "PDF",
    name: "PDF Mega Suite",
    formats: "Merge, split, compress, sign",
    count: 12,
    highlight: true,
    description: "Merge, split, compress, and sign. Full OCR support for 40+ languages.",
  },
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
  PDF: FileStack,
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

const POPULAR = [
  "PDF → Word",
  "PNG → JPG",
  "MP4 → GIF",
  "HEIC → PNG",
  "YouTube → MP3",
  "WEBP → PNG",
  "CSV → Excel",
];

function Index() {
  const [tab, setTab] = useState<"file" | "url" | "text">("file");
  const [query, setQuery] = useState("");

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

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="text-lg font-semibold tracking-tight">FileFlow</span>
            <div className="hidden gap-6 text-sm font-medium text-ink-muted md:flex">
              <a href="#tools" className="transition-colors hover:text-ink">
                Tools
              </a>
              <a href="#api" className="transition-colors hover:text-ink">
                API
              </a>
              <a href="#pricing" className="transition-colors hover:text-ink">
                Free
              </a>
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
            Fast, secure, and precise processing for documents, images, and media directly in your
            browser.
          </p>

          {/* Converter Widget */}
          <div className="w-full rounded-2xl bg-muted p-2 shadow-sm ring-1 ring-ink/5">
            <div className="mb-2 flex w-fit gap-1 rounded-lg bg-ink/10 p-1">
              {(["file", "url", "text"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? "rounded-md bg-card px-4 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-ink/5"
                      : "rounded-md px-4 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
                  }
                >
                  {t === "file" ? "File" : t === "url" ? "URL" : "Text"}
                </button>
              ))}
            </div>

            <div className="group relative">
              {tab === "file" && (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-ink/10 bg-card p-12 transition-colors group-hover:border-brand/40">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-ink/5">
                    <Plus className="size-5 text-ink-subtle" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">Drop files here or click to browse</p>
                    <p className="mt-1 text-xs text-ink-subtle">Maximum file size: 2GB</p>
                  </div>
                </div>
              )}
              {tab === "url" && (
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-ink/10 bg-card p-12">
                  <Link2 className="size-6 text-ink-subtle" />
                  <input
                    type="url"
                    placeholder="Paste a URL (YouTube, TikTok, article, image...)"
                    className="w-full max-w-md rounded-md bg-muted px-3 py-2 text-sm outline-none ring-1 ring-ink/5 focus:ring-brand/40"
                  />
                </div>
              )}
              {tab === "text" && (
                <div className="rounded-xl border-2 border-dashed border-ink/10 bg-card p-6">
                  <textarea
                    rows={5}
                    placeholder="Paste text, markdown, JSON, XML, YAML..."
                    className="w-full resize-none rounded-md bg-muted p-3 text-sm outline-none ring-1 ring-ink/5 focus:ring-brand/40"
                  />
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink/[0.04] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                  Detected
                </span>
                <span className="rounded bg-ink/10 px-2 py-0.5 font-mono text-sm text-ink-muted">
                  Waiting for file...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-muted">to</span>
                <button className="flex items-center gap-2 rounded bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-ink/5 hover:bg-muted">
                  Select Format
                  <ChevronDown className="size-3.5 text-ink-subtle" />
                </button>
                <button className="flex items-center gap-1.5 rounded bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground opacity-60">
                  <Upload className="size-3.5" />
                  Convert
                </button>
              </div>
            </div>
          </div>

          {/* Popular Chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="py-1.5 text-xs font-medium text-ink-subtle">Popular:</span>
            {POPULAR.map((chip) => (
              <button
                key={chip}
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
              <span className="font-medium text-ink">Instant</span> processing on dedicated hardware
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-brand" />
            <span className="text-ink-muted">
              <span className="font-medium text-ink">Encrypted</span> transfer, files auto-deleted
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Cpu className="size-4 text-brand" />
            <span className="text-ink-muted">
              <span className="font-medium text-ink">200+</span> format pairs, one workbench
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
                Browse 200+ format pairs across specialized processing engines. Upload once, pick
                any valid target.
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
              if (f.highlight) {
                return (
                  <div
                    key={f.code}
                    className="group flex flex-col justify-between rounded-xl bg-card p-5 ring-1 ring-brand/30 lg:col-span-2"
                  >
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded bg-brand ring-1 ring-ink/5">
                          <Icon className="size-4 text-brand-foreground" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
                          Professional Grade
                        </span>
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-ink">
                        {f.name}
                      </h3>
                      <p className="max-w-[40ch] text-sm text-ink-muted">{f.description}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <span className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-ink-subtle ring-1 ring-ink/5">
                        {f.count} TOOLS
                      </span>
                      <span className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-ink-subtle ring-1 ring-ink/5">
                        OCR READY
                      </span>
                    </div>
                  </div>
                );
              }
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
            No subscriptions, no paywalls, no "Pro" tier hiding features behind a credit card.
            Upload, convert, download — as many times as you want.
          </p>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/5 md:grid-cols-4">
            {[
              { k: "$0", v: "Forever" },
              { k: "∞", v: "Conversions" },
              { k: "2 GB", v: "Max file size" },
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
            Files are encrypted in transit and auto-deleted after processing.
          </p>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-ink/5 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 grid grid-cols-2 gap-12 md:grid-cols-3 lg:grid-cols-5">
            <div className="col-span-2">
              <span className="text-lg font-semibold tracking-tight">OmniConvert</span>
              <p className="mt-4 max-w-[35ch] text-sm text-ink-muted">
                The universal toolkit for file processing. All tools run on dedicated high-speed
                servers with encrypted transfers.
              </p>
            </div>
            <FooterCol
              title="Image Tools"
              links={["PNG to JPG", "SVG to PNG", "HEIC to PNG", "WEBP to PNG"]}
            />
            <FooterCol
              title="Document Tools"
              links={["PDF to Word", "Excel to CSV", "Word to PDF", "PDF Compress"]}
            />
            <FooterCol
              title="Company"
              links={["Privacy Policy", "Terms of Service", "API Docs", "Support"]}
            />
          </div>
          <div className="flex flex-col items-start justify-between gap-4 border-t border-ink/5 pt-8 md:flex-row md:items-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
              © 2026 OmniConvert Utility Engine
            </p>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
              <span className="size-1.5 animate-pulse rounded-full bg-brand" />
              Server Status: Optimal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="mb-6 text-sm font-semibold text-ink">{title}</h4>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-sm text-ink-muted hover:text-ink">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
