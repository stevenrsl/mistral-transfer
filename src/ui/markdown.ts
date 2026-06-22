/**
 * Minimal, safe Markdown → HTML renderer.
 *
 * Not CommonMark-complete on purpose: previews need a recognisable rendering,
 * not a full toolchain. Everything is HTML-escaped first, then a handful of
 * patterns are turned into tags. No HTML pass-through, no script vectors.
 */

const ESC = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function inline(text: string): string {
  let out = ESC(text);
  // links: [text](url) — url must be http(s)/mailto, no javascript:
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const safe = /^(https?:\/\/|mailto:|\/|#)/i.test(url);
    if (!safe) return `${label} (${url})`;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // fenced code block
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i++;
      }
      i++; // closing fence
      html += `<pre><code>${ESC(buf.join('\n'))}</code></pre>`;
      continue;
    }

    // heading
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      html += `<h${level}>${inline(heading[2]!)}</h${level}>`;
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('> ')) {
        buf.push((lines[i] ?? '').slice(2));
        i++;
      }
      html += `<blockquote>${inline(buf.join(' '))}</blockquote>`;
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i++;
      }
      html += `<ul>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`;
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      html += `<ol>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ol>`;
      continue;
    }

    // hr
    if (/^---+$/.test(line)) {
      html += '<hr>';
      i++;
      continue;
    }

    // paragraph
    if (line.trim() === '') {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !isBlockStart(lines[i] ?? '')) {
      buf.push(lines[i] ?? '');
      i++;
    }
    html += `<p>${inline(buf.join(' '))}</p>`;
  }

  return html;
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('```') ||
    /^#{1,6}\s/.test(line) ||
    line.startsWith('> ') ||
    /^[-*]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    /^---+$/.test(line)
  );
}
