import { parseMultistatus } from './parser';
import { encodePath, ensureTrailingSlash, joinPath, stripTrailingSlash } from './path';
import {
  WebDAVError,
  type Credentials,
  type UploadProgress,
  type WebDAVResource,
} from './types';

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <displayname/>
    <resourcetype/>
    <getcontentlength/>
    <getcontenttype/>
    <getlastmodified/>
    <getetag/>
  </prop>
</propfind>`;

export interface UploadHandle {
  promise: Promise<void>;
  abort: () => void;
}

export class WebDAVClient {
  readonly baseUrl: string;
  private readonly auth: string;

  constructor(creds: Credentials) {
    // Normalize: always end with a slash so concatenation is unambiguous.
    this.baseUrl = ensureTrailingSlash(creds.baseUrl.trim());
    this.auth = `Basic ${btoa(`${creds.username}:${creds.password}`)}`;
  }

  /** URL builder for a logical path. Caller passes the *decoded* path. */
  private url(path: string): string {
    const cleaned = stripTrailingSlash(path).replace(/^\/+/, '');
    return cleaned ? `${this.baseUrl}${encodePath(cleaned)}` : this.baseUrl;
  }

  private async request(
    method: string,
    path: string,
    init: RequestInit & { trailingSlash?: boolean } = {},
  ): Promise<Response> {
    const { trailingSlash, ...rest } = init;
    let url = this.url(path);
    if (trailingSlash && !url.endsWith('/')) url += '/';

    const headers = new Headers(rest.headers);
    headers.set('Authorization', this.auth);

    let response: Response;
    try {
      response = await fetch(url, { ...rest, headers });
    } catch (err) {
      throw new WebDAVError(
        `Network error: ${(err as Error).message}`,
        0,
        method,
        url,
      );
    }

    if (!response.ok) {
      throw new WebDAVError(
        `${response.status} ${response.statusText}`,
        response.status,
        method,
        url,
      );
    }
    return response;
  }

  async list(path = ''): Promise<WebDAVResource[]> {
    const response = await this.request('PROPFIND', path, {
      method: 'PROPFIND',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '1',
      },
      body: PROPFIND_BODY,
      trailingSlash: true,
    });

    const xml = await response.text();
    const items = parseMultistatus(xml, this.baseUrl);

    const normalisedPath = stripTrailingSlash(path.replace(/^\/+/, ''));
    return items.filter((item) => item.path !== normalisedPath);
  }

  async download(path: string, signal?: AbortSignal): Promise<Blob> {
    const init: RequestInit = { method: 'GET' };
    if (signal) init.signal = signal;
    const response = await this.request('GET', path, init);
    return response.blob();
  }

  async openStream(path: string, signal?: AbortSignal): Promise<Response> {
    const init: RequestInit = { method: 'GET' };
    if (signal) init.signal = signal;
    return this.request('GET', path, init);
  }

  async mkcol(path: string): Promise<void> {
    await this.request('MKCOL', path, { method: 'MKCOL', trailingSlash: true });
  }

  async delete(path: string): Promise<void> {
    await this.request('DELETE', path, { method: 'DELETE' });
  }

  async move(source: string, destination: string, overwrite = false): Promise<void> {
    const destUrl = this.url(destination);
    await this.request('MOVE', source, {
      method: 'MOVE',
      headers: {
        Destination: destUrl,
        Overwrite: overwrite ? 'T' : 'F',
      },
    });
  }

  async copy(source: string, destination: string, overwrite = false): Promise<void> {
    const destUrl = this.url(destination);
    await this.request('COPY', source, {
      method: 'COPY',
      headers: {
        Destination: destUrl,
        Overwrite: overwrite ? 'T' : 'F',
      },
    });
  }

  /**
   * PUT a file or a Blob with progress reporting and abort support.
   *
   * We use XHR rather than fetch because Safari/Firefox still lack a stable
   * `ReadableStream` request body, which is what fetch would need for chunk
   * progress. XHR gives us a clean `progress` event on uploads everywhere.
   *
   * Pass `contentRange` and `totalSize` for chunked PUTs (RFC 7233 semantics).
   */
  put(
    path: string,
    body: Blob,
    options: {
      contentType?: string;
      onProgress?: (p: UploadProgress) => void;
      signal?: AbortSignal;
      contentRange?: { start: number; end: number; total: number };
    } = {},
  ): UploadHandle {
    const url = this.url(path);
    const xhr = new XMLHttpRequest();

    const promise = new Promise<void>((resolve, reject) => {
      let startTime = 0;

      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Authorization', this.auth);
      xhr.setRequestHeader('Content-Type', options.contentType ?? body.type ?? 'application/octet-stream');
      if (options.contentRange) {
        const { start, end, total } = options.contentRange;
        xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      }

      xhr.upload.addEventListener('loadstart', () => {
        startTime = performance.now();
      });

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable || !options.onProgress) return;
        const elapsed = Math.max(performance.now() - startTime, 1);
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          ratio: event.total ? event.loaded / event.total : 0,
          speed: (event.loaded / elapsed) * 1000,
        });
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new WebDAVError(
              `${xhr.status} ${xhr.statusText}`,
              xhr.status,
              'PUT',
              url,
            ),
          );
        }
      });

      xhr.addEventListener('error', () => {
        reject(new WebDAVError('Network error', 0, 'PUT', url));
      });
      xhr.addEventListener('abort', () => {
        reject(new WebDAVError('Aborted', 0, 'PUT', url));
      });

      if (options.signal) {
        if (options.signal.aborted) {
          xhr.abort();
        } else {
          options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
        }
      }

      xhr.send(body);
    });

    return { promise, abort: () => xhr.abort() };
  }

  /**
   * Build the absolute URL for a resource — useful for previews that need to
   * hand the URL to an `<img>` / `<iframe>` element with proper credentials.
   */
  urlFor(path: string): string {
    return this.url(path);
  }

  /** Make a child path under a parent. */
  static childPath(parent: string, name: string): string {
    return joinPath(parent, name);
  }
}
