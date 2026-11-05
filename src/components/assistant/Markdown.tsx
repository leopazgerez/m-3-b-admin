import { Fragment } from "react";
import { blocks, inline } from "@/lib/markdown";

function Inline({ text }: { text: string }) {
  return inline(text).map((s, i) =>
    s.t === "b" ? <strong key={i} className="font-semibold">{s.v}</strong>
    : s.t === "i" ? <em key={i}>{s.v}</em>
    : s.t === "code" ? <code key={i} className="rounded bg-black/5 px-1 font-mono text-[0.9em]">{s.v}</code>
    : <Fragment key={i}>{s.v}</Fragment>);
}

/** Assistant answers: the small Markdown subset in lib/markdown.ts. */
export default function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks(text).map((b, i) =>
        b.kind === "h" ? <p key={i} className="font-semibold"><Inline text={b.text} /></p>
        : b.kind === "p" ? <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l} /></Fragment>)}</p>
        : b.kind === "ul" ? <ul key={i} className="list-disc pl-5">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>
        : <ol key={i} className="list-decimal pl-5">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ol>)}
    </div>
  );
}
