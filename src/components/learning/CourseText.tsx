import { Fragment, type ReactNode } from "react";

// Render the teacher editor's lightweight markup as React text/elements.
// Raw HTML is never interpreted, including inside emphasis or code blocks.
function inline(text: string, depth = 0): ReactNode {
  if (depth > 4) return text;
  return text
    .split(/(\*\*[^\n]+?\*\*|__[^\n]+?__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{inline(part.slice(2, -2), depth + 1)}</strong>;
      if (part.startsWith("__") && part.endsWith("__"))
        return <u key={i}>{inline(part.slice(2, -2), depth + 1)}</u>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{inline(part.slice(1, -1), depth + 1)}</em>;
      if (part.startsWith("_") && part.endsWith("_"))
        return <u key={i}>{inline(part.slice(1, -1), depth + 1)}</u>;
      if (part.startsWith("`") && part.endsWith("`"))
        return (
          <code className="rounded bg-slate-100 px-1" key={i}>
            {part.slice(1, -1)}
          </code>
        );
      return <Fragment key={i}>{part}</Fragment>;
    });
}
export function CourseText({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      key = i;
    if (!line.trim()) {
      blocks.push(<div key={key} className="h-3" />);
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3 key={key} className="py-3 text-xl font-semibold">
          {inline(heading[1])}
        </h3>,
      );
      continue;
    }
    const ordered = /^\d+\.\s+/.test(line),
      unordered = /^[-*]\s+/.test(line);
    if (ordered || unordered) {
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items: ReactNode[] = [];
      do {
        items.push(<li key={i}>{inline(lines[i].replace(pattern, ""))}</li>);
        i++;
      } while (i < lines.length && pattern.test(lines[i]));
      i--;
      blocks.push(
        ordered ? (
          <ol
            key={key}
            start={parseInt(line, 10)}
            className="list-decimal space-y-2 pl-6"
          >
            {items}
          </ol>
        ) : (
          <ul key={key} className="list-disc space-y-2 pl-6">
            {items}
          </ul>
        ),
      );
    } else
      blocks.push(
        <p key={key} className="whitespace-pre-wrap">
          {inline(line)}
        </p>,
      );
  }
  return (
    <div className="break-words text-base leading-8 text-slate-700">
      {blocks}
    </div>
  );
}
