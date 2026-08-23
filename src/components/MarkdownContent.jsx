import { createLowlight, all as lowlightAll } from "lowlight";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { protectHtmlInMarkdown } from "../lib/markdown";

// Full highlight.js grammar set (~190 languages) via lowlight.
const lowlight = createLowlight(lowlightAll);

// detect: false — bare fences used to be mislabeled (e.g. vbnet). Language
// comes from the fence info string (```python); untagged blocks stay plain.
const rehypePlugins = [[rehypeHighlight, { lowlight, detect: false, ignoreMissing: true }]];

const baseComponents = {
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block">
      <img src={src} alt={alt || "Screenshot"} className="screenshot-thumb" {...props} />
    </a>
  ),
  pre: ({ children, ...props }) => (
    <pre className="hljs-pre" {...props}>
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    // Fenced blocks get language-*; inline code has no language class.
    const match = /language-([\w+-]+)/.exec(className || "");
    const lang = match?.[1];
    if (lang) {
      return (
        <code className={className} data-language={lang} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

/**
 * Shared markdown renderer for chat results: GFM, HTML-tag protection,
 * and syntax highlighting for fenced code (python, js, bash, …).
 */
export default function MarkdownContent({ children, className = "markdown-content", components }) {
  const source = useMemo(
    () => protectHtmlInMarkdown(typeof children === "string" ? children : String(children ?? "")),
    [children],
  );

  const mergedComponents = useMemo(
    () => (components ? { ...baseComponents, ...components } : baseComponents),
    [components],
  );

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={mergedComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
