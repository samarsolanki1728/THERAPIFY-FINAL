import React from "react";

/**
 * Lightweight, safe Markdown renderer tailored for Therapify AI responses.
 * Formats paragraphs, bold, italics, bullet points, numbered lists, and links.
 */
export default function MarkdownRenderer({ content = "" }) {
  if (!content) return null;

  // Split text by lines
  const lines = content.split("\n");
  const elements = [];
  let currentList = null;
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      if (listType === "ul") {
        elements.push(
          <ul
            key={`list-${elements.length}`}
            className="my-2 space-y-1.5 list-disc list-inside text-sm leading-relaxed"
          >
            {currentList.map((item, idx) => (
              <li key={idx} className="pl-1">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      } else if (listType === "ol") {
        elements.push(
          <ol
            key={`list-${elements.length}`}
            className="my-2 space-y-1.5 list-decimal list-inside text-sm leading-relaxed"
          >
            {currentList.map((item, idx) => (
              <li key={idx} className="pl-1">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
      listType = null;
    }
  };

  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.trimEnd();

    // Empty line
    if (!line.trim()) {
      flushList();
      return;
    }

    // Bullet point: - or *
    const bulletMatch = line.match(/^(\*|-)\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
        currentList = [];
      }
      currentList.push(bulletMatch[2]);
      return;
    }

    // Numbered list: 1. or 2.
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        currentList = [];
      }
      currentList.push(numMatch[2]);
      return;
    }

    // Regular line, flush any active list
    flushList();

    // Headings (e.g. ### Heading)
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      elements.push(
        <h4
          key={`h-${lineIdx}`}
          className="font-medium text-foreground text-sm tracking-wide mt-3 mb-1"
        >
          {renderInline(headingMatch[2])}
        </h4>
      );
      return;
    }

    // Paragraph
    elements.push(
      <p key={`p-${lineIdx}`} className="text-sm leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Parse inline bold (**bold**), italic (*italic*), and links ([title](url))
 */
function renderInline(text) {
  // Regex to split by bold, italic, or links
  const tokens = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Markdown link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`link-${keyCounter++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(
        <strong key={`bold-${keyCounter++}`} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
    if (italicMatch) {
      tokens.push(
        <em key={`italic-${keyCounter++}`} className="italic">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text up to next special char
    const nextSpecial = remaining.search(/(\*\*|\[|\*|_)/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Just a literal special character that didn't match a full token
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

