"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-1 text-base font-semibold text-tavi-navy">{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-tavi-navy/70">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 text-sm font-semibold text-tavi-navy">{children}</h4>
          ),
          p: ({ children }) => <p className="leading-6">{children}</p>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-6">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-tavi-navy">{children}</strong>,
          em: ({ children }) => <em className="text-tavi-navy/80">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-tavi-indigo/40 pl-3 text-tavi-navy/75">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-white/80 p-3 font-mono text-xs text-tavi-navy shadow-inner">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[0.8em] text-tavi-navy">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
          hr: () => <div className="my-3 h-px bg-tavi-navy/10" />,
          a: ({ children, href }) => (
            <a
              href={href}
              className="font-medium text-tavi-indigo underline decoration-tavi-indigo/40 underline-offset-2"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border border-tavi-border bg-white/70">
              <table className="min-w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-tavi-pale-blue/80">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-tavi-border px-3 py-2 font-semibold text-tavi-navy">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-tavi-border/70 px-3 py-2 align-top text-tavi-navy/80">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
