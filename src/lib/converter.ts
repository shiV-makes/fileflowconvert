// Client-side conversion engine. Everything runs in the browser.
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { marked } from "marked";
import TurndownService from "turndown";
import QRCode from "qrcode";
import mammoth from "mammoth";

export type Kind =
  | "image"
  | "svg"
  | "pdf"
  | "docx"
  | "spreadsheet"
  | "text"
  | "markdown"
  | "html"
  | "json"
  | "csv"
  | "tsv"
  | "xml"
  | "yaml"
  | "audio"
  | "video"
  | "zip"
  | "unknown";

export type Target = {
  ext: string;
  label: string;
};

const IMG_EXT = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];
const TEXTISH_EXT = ["txt", "log", "rtf"];

export function detectKind(file: File): { kind: Kind; label: string } {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  const type = file.type;
  if (ext === "svg" || type === "image/svg+xml") return { kind: "svg", label: "SVG" };
  if (type.startsWith("image/") || IMG_EXT.includes(ext))
    return { kind: "image", label: ext.toUpperCase() || "IMAGE" };
  if (ext === "pdf" || type === "application/pdf") return { kind: "pdf", label: "PDF" };
  if (ext === "docx") return { kind: "docx", label: "DOCX" };
  if (["xlsx", "xls", "ods"].includes(ext)) return { kind: "spreadsheet", label: ext.toUpperCase() };
  if (ext === "json") return { kind: "json", label: "JSON" };
  if (ext === "csv") return { kind: "csv", label: "CSV" };
  if (ext === "tsv") return { kind: "tsv", label: "TSV" };
  if (ext === "md" || ext === "markdown") return { kind: "markdown", label: "MD" };
  if (ext === "html" || ext === "htm") return { kind: "html", label: "HTML" };
  if (ext === "xml") return { kind: "xml", label: "XML" };
  if (ext === "yaml" || ext === "yml") return { kind: "yaml", label: "YAML" };
  if (ext === "zip" || type === "application/zip") return { kind: "zip", label: "ZIP" };
  if (type.startsWith("audio/")) return { kind: "audio", label: ext.toUpperCase() || "AUDIO" };
  if (type.startsWith("video/")) return { kind: "video", label: ext.toUpperCase() || "VIDEO" };
  if (TEXTISH_EXT.includes(ext) || type.startsWith("text/"))
    return { kind: "text", label: ext.toUpperCase() || "TEXT" };
  return { kind: "unknown", label: ext.toUpperCase() || "FILE" };
}

export function targetsFor(kind: Kind): Target[] {
  const t = (ext: string, label?: string): Target => ({ ext, label: label ?? ext.toUpperCase() });
  switch (kind) {
    case "image":
      return [t("png"), t("jpg"), t("webp"), t("bmp"), t("pdf"), t("zip")];
    case "svg":
      return [t("png"), t("jpg"), t("webp"), t("pdf")];
    case "pdf":
      return [t("txt"), t("html"), t("md"), t("zip")];
    case "docx":
      return [t("html"), t("md"), t("txt"), t("pdf")];
    case "spreadsheet":
      return [t("csv"), t("tsv"), t("json"), t("html"), t("xlsx")];
    case "json":
      return [t("csv"), t("tsv"), t("xlsx"), t("yaml"), t("xml"), t("txt")];
    case "csv":
      return [t("json"), t("tsv"), t("xlsx"), t("html"), t("md"), t("txt")];
    case "tsv":
      return [t("json"), t("csv"), t("xlsx"), t("html"), t("txt")];
    case "markdown":
      return [t("html"), t("txt"), t("pdf")];
    case "html":
      return [t("md"), t("txt"), t("pdf")];
    case "text":
      return [t("html"), t("md"), t("pdf"), t("zip"), t("png", "QR")];
    case "xml":
      return [t("json"), t("txt")];
    case "yaml":
      return [t("json"), t("txt")];
    case "zip":
      return [t("zip", "Passthrough")];
    case "audio":
    case "video":
      return [t("zip", "ZIP wrap")];
    default:
      return [t("zip", "ZIP wrap")];
  }
}

// ---------- helpers ----------

async function encodeCanvas(canvas: HTMLCanvasElement, target: string): Promise<Blob> {
  const mime =
    target === "png"
      ? "image/png"
      : target === "jpg" || target === "jpeg"
        ? "image/jpeg"
        : target === "webp"
          ? "image/webp"
          : target === "bmp"
            ? "image/bmp"
            : "image/png";
  const quality = mime === "image/jpeg" || mime === "image/webp" ? 0.92 : undefined;
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed"))), mime, quality),
  );
}

function drawBitmapToCanvas(bitmap: ImageBitmap, target: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  if (target === "jpg" || target === "jpeg" || target === "bmp") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

async function svgToCanvas(file: File): Promise<HTMLCanvasElement> {
  const text = await file.text();
  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("SVG load failed"));
      img.src = url;
    });
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToPdf(canvas: HTMLCanvasElement): Blob {
  const orientation = canvas.width >= canvas.height ? "l" : "p";
  const pdf = new jsPDF({ orientation, unit: "px", format: [canvas.width, canvas.height] });
  const data = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(data, "JPEG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}

function textToPdf(text: string): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const lines = pdf.splitTextToSize(text, width);
  pdf.setFont("helvetica");
  pdf.setFontSize(11);
  const lineHeight = 14;
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = margin;
  for (const line of lines) {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  }
  return pdf.output("blob");
}

function jsonToRows(data: unknown): (string | number | boolean | null)[][] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [[]];
    if (data.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
      const headers = Array.from(
        data.reduce<Set<string>>((s, r) => {
          Object.keys(r as object).forEach((k) => s.add(k));
          return s;
        }, new Set()),
      );
      return [headers, ...data.map((r) => headers.map((h) => flat((r as Record<string, unknown>)[h])))];
    }
    if (data.every((r) => Array.isArray(r))) return data as (string | number | boolean | null)[][];
  }
  return [["value"], [flat(data)]];
}

function flat(v: unknown): string | number | boolean | null {
  if (v == null) return null;
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

function rowsToCsv(rows: (string | number | boolean | null)[][], delim = ","): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return new RegExp(`["${delim === "," ? "," : "\\t"}\\n]`).test(s)
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return rows.map((r) => r.map(esc).join(delim)).join("\n");
}

function rowsToJson(rows: (string | number | boolean | null)[][]): unknown[] {
  if (!rows.length) return [];
  const [headers, ...body] = rows;
  return body
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((r) => Object.fromEntries((headers as string[]).map((h, i) => [h, r[i] ?? ""])));
}

function rowsToHtml(rows: (string | number | boolean | null)[][]): string {
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const [head, ...body] = rows;
  const th = (head ?? []).map((h) => `<th>${esc(h)}</th>`).join("");
  const tr = body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:sans-serif}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f5f5f5}</style><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function rowsToMd(rows: (string | number | boolean | null)[][]): string {
  if (!rows.length) return "";
  const [head, ...body] = rows;
  const h = (head ?? []).map((s) => String(s ?? ""));
  const sep = h.map(() => "---");
  const lines = [`| ${h.join(" | ")} |`, `| ${sep.join(" | ")} |`];
  for (const r of body) lines.push(`| ${r.map((c) => String(c ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return lines.join("\n");
}

function parseDelim(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function htmlToText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

// XML <-> JSON (simple)
function xmlToJson(xml: string): unknown {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
  const walk = (n: Element): unknown => {
    const obj: Record<string, unknown> = {};
    for (const a of Array.from(n.attributes)) obj[`@${a.name}`] = a.value;
    const children = Array.from(n.children);
    if (children.length === 0) {
      const text = n.textContent?.trim() ?? "";
      if (!n.attributes.length) return text;
      obj["#text"] = text;
      return obj;
    }
    for (const c of children) {
      const v = walk(c);
      if (obj[c.tagName] === undefined) obj[c.tagName] = v;
      else {
        const existing = obj[c.tagName];
        obj[c.tagName] = Array.isArray(existing) ? [...existing, v] : [existing, v];
      }
    }
    return obj;
  };
  return { [doc.documentElement.tagName]: walk(doc.documentElement) };
}

function jsonToYaml(data: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (data === null || data === undefined) return "null";
  if (typeof data === "string") return /[:#\n]/.test(data) ? JSON.stringify(data) : data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    return data.map((v) => `${pad}- ${jsonToYaml(v, indent + 1).replace(/^\s+/, "")}`).join("\n");
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as object);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        const rendered = jsonToYaml(v, indent + 1);
        const isObj = v && typeof v === "object";
        return isObj ? `${pad}${k}:\n${rendered}` : `${pad}${k}: ${rendered}`;
      })
      .join("\n");
  }
  return String(data);
}

// ---------- main convert ----------

export type ConvertResult = { blob: Blob; filename: string };

const baseName = (n: string) => {
  const i = n.lastIndexOf(".");
  return i > 0 ? n.slice(0, i) : n;
};

export async function convert(file: File, kind: Kind, targetExt: string): Promise<ConvertResult> {
  const base = baseName(file.name);
  const name = (ext: string) => `${base}.${ext}`;

  // ---- Images ----
  if (kind === "image") {
    if (targetExt === "pdf") {
      const bmp = await createImageBitmap(file);
      const canvas = drawBitmapToCanvas(bmp, "jpg");
      return { blob: canvasToPdf(canvas), filename: name("pdf") };
    }
    if (targetExt === "zip") return zipSingle(file, name("zip"));
    const bmp = await createImageBitmap(file);
    const canvas = drawBitmapToCanvas(bmp, targetExt);
    return { blob: await encodeCanvas(canvas, targetExt), filename: name(targetExt) };
  }

  if (kind === "svg") {
    const canvas = await svgToCanvas(file);
    if (targetExt === "pdf") return { blob: canvasToPdf(canvas), filename: name("pdf") };
    return { blob: await encodeCanvas(canvas, targetExt), filename: name(targetExt) };
  }

  // ---- PDF ----
  if (kind === "pdf") {
    if (targetExt === "zip") return zipSingle(file, name("zip"));
    const pdfjs = await import("pdfjs-dist");
    // Use a fake worker so we don't need to configure the worker URL.
    (pdfjs.GlobalWorkerOptions as { workerSrc: string }).workerSrc = "";
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf, disableWorker: true } as never).promise;
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const line = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ");
      text += line + "\n\n";
    }
    if (targetExt === "txt") return { blob: new Blob([text], { type: "text/plain" }), filename: name("txt") };
    if (targetExt === "md") return { blob: new Blob([text], { type: "text/markdown" }), filename: name("md") };
    if (targetExt === "html") {
      const html = `<!doctype html><meta charset="utf-8"><pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
      return { blob: new Blob([html], { type: "text/html" }), filename: name("html") };
    }
  }

  // ---- DOCX ----
  if (kind === "docx") {
    const buf = await file.arrayBuffer();
    if (targetExt === "html") {
      const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
      return { blob: new Blob([`<!doctype html><meta charset="utf-8">${value}`], { type: "text/html" }), filename: name("html") };
    }
    if (targetExt === "md") {
      const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
      const md = new TurndownService().turndown(value);
      return { blob: new Blob([md], { type: "text/markdown" }), filename: name("md") };
    }
    if (targetExt === "txt" || targetExt === "pdf") {
      const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
      if (targetExt === "pdf") return { blob: textToPdf(value), filename: name("pdf") };
      return { blob: new Blob([value], { type: "text/plain" }), filename: name("txt") };
    }
  }

  // ---- Spreadsheets (XLSX/XLS/ODS) ----
  if (kind === "spreadsheet") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (targetExt === "csv") return { blob: new Blob([XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv" }), filename: name("csv") };
    if (targetExt === "tsv") return { blob: new Blob([XLSX.utils.sheet_to_csv(sheet, { FS: "\t" })], { type: "text/tab-separated-values" }), filename: name("tsv") };
    if (targetExt === "json") return { blob: new Blob([JSON.stringify(XLSX.utils.sheet_to_json(sheet), null, 2)], { type: "application/json" }), filename: name("json") };
    if (targetExt === "html") return { blob: new Blob([`<!doctype html><meta charset="utf-8">${XLSX.utils.sheet_to_html(sheet)}`], { type: "text/html" }), filename: name("html") };
    if (targetExt === "xlsx") {
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
      return { blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename: name("xlsx") };
    }
  }

  // ---- Structured data: JSON / CSV / TSV / XML / YAML ----
  if (kind === "json") {
    const data = JSON.parse(await file.text());
    if (targetExt === "yaml") return { blob: new Blob([jsonToYaml(data)], { type: "text/yaml" }), filename: name("yaml") };
    if (targetExt === "xml") {
      const xml = jsonToXml(data);
      return { blob: new Blob([xml], { type: "application/xml" }), filename: name("xml") };
    }
    const rows = jsonToRows(data);
    if (targetExt === "csv") return { blob: new Blob([rowsToCsv(rows, ",")], { type: "text/csv" }), filename: name("csv") };
    if (targetExt === "tsv") return { blob: new Blob([rowsToCsv(rows, "\t")], { type: "text/tab-separated-values" }), filename: name("tsv") };
    if (targetExt === "xlsx") return rowsToXlsx(rows, name("xlsx"));
    if (targetExt === "txt") return { blob: new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" }), filename: name("txt") };
  }

  if (kind === "csv" || kind === "tsv") {
    const srcDelim = kind === "tsv" ? "\t" : ",";
    const rows = parseDelim(await file.text(), srcDelim);
    if (targetExt === "json") return { blob: new Blob([JSON.stringify(rowsToJson(rows), null, 2)], { type: "application/json" }), filename: name("json") };
    if (targetExt === "csv") return { blob: new Blob([rowsToCsv(rows, ",")], { type: "text/csv" }), filename: name("csv") };
    if (targetExt === "tsv") return { blob: new Blob([rowsToCsv(rows, "\t")], { type: "text/tab-separated-values" }), filename: name("tsv") };
    if (targetExt === "xlsx") return rowsToXlsx(rows, name("xlsx"));
    if (targetExt === "html") return { blob: new Blob([rowsToHtml(rows)], { type: "text/html" }), filename: name("html") };
    if (targetExt === "md") return { blob: new Blob([rowsToMd(rows)], { type: "text/markdown" }), filename: name("md") };
    if (targetExt === "txt") return { blob: new Blob([rows.map((r) => r.join("\t")).join("\n")], { type: "text/plain" }), filename: name("txt") };
  }

  if (kind === "xml") {
    const data = xmlToJson(await file.text());
    if (targetExt === "json") return { blob: new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename: name("json") };
    return { blob: new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" }), filename: name("txt") };
  }

  if (kind === "yaml") {
    // best-effort YAML → JSON (only supports subset). Users can round-trip our own YAML output.
    const data = yamlToJson(await file.text());
    if (targetExt === "json") return { blob: new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename: name("json") };
    return { blob: new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" }), filename: name("txt") };
  }

  // ---- Markdown / HTML / plain text ----
  if (kind === "markdown") {
    const text = await file.text();
    if (targetExt === "html") {
      const html = await marked.parse(text);
      return { blob: new Blob([`<!doctype html><meta charset="utf-8">${html}`], { type: "text/html" }), filename: name("html") };
    }
    if (targetExt === "txt") return { blob: new Blob([text], { type: "text/plain" }), filename: name("txt") };
    if (targetExt === "pdf") return { blob: textToPdf(text), filename: name("pdf") };
  }

  if (kind === "html") {
    const text = await file.text();
    if (targetExt === "md") return { blob: new Blob([new TurndownService().turndown(text)], { type: "text/markdown" }), filename: name("md") };
    if (targetExt === "txt") return { blob: new Blob([htmlToText(text)], { type: "text/plain" }), filename: name("txt") };
    if (targetExt === "pdf") return { blob: textToPdf(htmlToText(text)), filename: name("pdf") };
  }

  if (kind === "text") {
    const text = await file.text();
    if (targetExt === "html") {
      const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return { blob: new Blob([`<!doctype html><meta charset="utf-8"><pre>${esc}</pre>`], { type: "text/html" }), filename: name("html") };
    }
    if (targetExt === "md") return { blob: new Blob([text], { type: "text/markdown" }), filename: name("md") };
    if (targetExt === "pdf") return { blob: textToPdf(text), filename: name("pdf") };
    if (targetExt === "zip") return zipSingle(file, name("zip"));
    if (targetExt === "png") {
      const dataUrl = await QRCode.toDataURL(text || " ", { width: 512, margin: 2 });
      const res = await fetch(dataUrl);
      return { blob: await res.blob(), filename: `${base}.qr.png` };
    }
  }

  // ---- Zip wrap / passthrough ----
  if (targetExt === "zip") return zipSingle(file, name("zip"));

  throw new Error(`No converter for ${kind} → ${targetExt}`);
}

async function zipSingle(file: File, filename: string): Promise<ConvertResult> {
  const zip = new JSZip();
  zip.file(file.name, await file.arrayBuffer());
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename };
}

function rowsToXlsx(rows: (string | number | boolean | null)[][], filename: string): ConvertResult {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return {
    blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename,
  };
}

function jsonToXml(data: unknown, root = "root"): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const build = (v: unknown, tag: string): string => {
    if (v === null || v === undefined) return `<${tag}/>`;
    if (Array.isArray(v)) return v.map((i) => build(i, tag)).join("");
    if (typeof v === "object") {
      const inner = Object.entries(v as object)
        .map(([k, val]) => build(val, k.replace(/[^\w:-]/g, "_")))
        .join("");
      return `<${tag}>${inner}</${tag}>`;
    }
    return `<${tag}>${esc(String(v))}</${tag}>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>${build(data, root)}`;
}

function yamlToJson(text: string): unknown {
  // minimal parser: supports our own jsonToYaml output (indented mappings + `- ` sequences + scalars)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  let i = 0;
  const parseBlock = (indent: number): unknown => {
    if (i >= lines.length) return null;
    const first = lines[i];
    const currentIndent = first.match(/^ */)![0].length;
    if (currentIndent < indent) return null;
    if (first.trim().startsWith("- ")) {
      const arr: unknown[] = [];
      while (i < lines.length) {
        const line = lines[i];
        const ind = line.match(/^ */)![0].length;
        if (ind < indent) break;
        if (!line.trim().startsWith("- ")) break;
        const rest = line.trim().slice(2);
        if (rest.includes(": ")) {
          // treat as inline object start
          lines[i] = " ".repeat(ind + 2) + rest;
          arr.push(parseBlock(ind + 2));
        } else {
          arr.push(scalar(rest));
          i++;
        }
      }
      return arr;
    }
    const obj: Record<string, unknown> = {};
    while (i < lines.length) {
      const line = lines[i];
      const ind = line.match(/^ */)![0].length;
      if (ind < indent) break;
      if (ind > indent) break;
      const m = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (!m) {
        i++;
        continue;
      }
      const key = m[1];
      const val = m[2];
      i++;
      if (val === "") obj[key] = parseBlock(indent + 2);
      else obj[key] = scalar(val);
    }
    return obj;
  };
  const scalar = (s: string): unknown => {
    if (s === "null") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s.startsWith('"') && s.endsWith('"')) return JSON.parse(s);
    return s;
  };
  return parseBlock(0);
}
