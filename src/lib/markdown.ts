// The small Markdown subset the assistant answers with: **bold**, *italic*, `code`, lists and headings.
// Parsed into plain data (no HTML strings) so React renders it escaped. Unclosed marks stay as text (streaming).

export type Inline = { t: "text" | "b" | "i" | "code"; v: string };
export type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

const INLINE = /\*\*(?!\s)([^*\n]+?)\*\*|`([^`\n]+)`|\*(?![\s*])([^*\n]+?)(?<!\s)\*/g;

export function inline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: "b", v: m[1] } : m[2] !== undefined ? { t: "code", v: m[2] } : { t: "i", v: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

export function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const prev = out[out.length - 1];
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) out.push({ kind: "p", lines: [] }); // paragraph break; empty ones dropped below
    else if (heading) out.push({ kind: "h", text: heading[1] });
    else if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const item = (bullet ?? numbered)![1];
      if (prev?.kind === kind) prev.items.push(item);
      else out.push({ kind, items: [item] });
    } else if (prev?.kind === "p") prev.lines.push(line);
    else out.push({ kind: "p", lines: [line] });
  }
  return out.filter((b) => b.kind !== "p" || b.lines.length > 0);
}
