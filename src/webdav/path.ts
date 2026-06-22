/**
 * WebDAV path helpers.
 *
 * WebDAV paths must be percent-encoded segment by segment — `encodeURI` is too
 * lax (preserves `#`, `?`, `[`, `]`) and `encodeURIComponent` is too strict
 * (escapes `/`). We handle that here, plus a few normalisations the parser and
 * UI rely on.
 */

export function joinPath(...parts: string[]): string {
  const cleaned = parts
    .flatMap((p) => p.split('/'))
    .filter((segment) => segment.length > 0 && segment !== '.');
  return cleaned.join('/');
}

export function parentOf(path: string): string {
  const stripped = stripTrailingSlash(path);
  const i = stripped.lastIndexOf('/');
  return i < 0 ? '' : stripped.slice(0, i);
}

export function basenameOf(path: string): string {
  const stripped = stripTrailingSlash(path);
  const i = stripped.lastIndexOf('/');
  return i < 0 ? stripped : stripped.slice(i + 1);
}

export function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/** Percent-encode a single path segment but not the segment separator `/`. */
export function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

/** Encode every segment of a logical path while keeping `/` intact. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeSegment).join('/');
}

/** Decode a percent-encoded path (every segment). */
export function decodePath(path: string): string {
  return path
    .split('/')
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join('/');
}

/**
 * Given the server base URL (which itself may contain a path prefix like
 * `/remote.php/dav/files/alice/`) and an `href` returned by the server, return
 * the logical, decoded path relative to that base.
 */
export function relativeFromHref(baseUrl: string, href: string): string {
  let pathname: string;
  try {
    pathname = new URL(href, baseUrl).pathname;
  } catch {
    pathname = href;
  }

  const basePath = new URL(baseUrl).pathname;
  let rel = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;

  rel = rel.replace(/^\/+/, '');
  rel = stripTrailingSlash(rel);
  return decodePath(rel);
}
